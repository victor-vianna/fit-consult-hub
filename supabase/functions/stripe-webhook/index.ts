import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

type Plano = "mensal" | "trimestral" | "semestral" | "anual";

function calcExpiracao(plano: Plano, from: Date): Date {
  const d = new Date(from);
  switch (plano) {
    case "mensal": d.setMonth(d.getMonth() + 1); break;
    case "trimestral": d.setMonth(d.getMonth() + 3); break;
    case "semestral": d.setMonth(d.getMonth() + 6); break;
    case "anual": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

function normalizeRequirements(values?: string[] | null) {
  return Array.isArray(values) ? values : [];
}

async function constructStripeEvent(
  stripe: Stripe,
  rawBody: string,
  signature: string,
) {
  const secrets = [
    Deno.env.get("STRIPE_WEBHOOK_SECRET"),
    Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET"),
  ].filter((secret): secret is string => !!secret);

  if (secrets.length === 0) {
    throw new Error("Nenhum webhook secret Stripe configurado");
  }

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

async function syncAccount(
  admin: ReturnType<typeof createClient>,
  stripeAccount: Stripe.Account,
  fallbackPersonalId?: string | null,
) {
  const personalId = fallbackPersonalId || stripeAccount.metadata?.personal_id;
  if (!personalId) return;

  await admin.from("personal_stripe_accounts").upsert({
    personal_id: personalId,
    stripe_account_id: stripeAccount.id,
    account_type: (stripeAccount as any).type || "standard",
    country: stripeAccount.country ?? null,
    default_currency: stripeAccount.default_currency ?? null,
    charges_enabled: !!stripeAccount.charges_enabled,
    payouts_enabled: !!stripeAccount.payouts_enabled,
    details_submitted: !!stripeAccount.details_submitted,
    card_payments_active: stripeAccount.capabilities?.card_payments === "active",
    transfers_active: stripeAccount.capabilities?.transfers === "active",
    requirements_currently_due: normalizeRequirements(stripeAccount.requirements?.currently_due),
    requirements_past_due: normalizeRequirements(stripeAccount.requirements?.past_due),
    disabled_reason: stripeAccount.requirements?.disabled_reason ?? null,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "stripe_account_id" });
}

async function upsertSubscription(
  admin: ReturnType<typeof createClient>,
  stripe: Stripe,
  subId: string,
  stripeAccountId: string | null,
  fallback: {
    studentId?: string;
    personalId?: string;
    plano?: Plano;
    customerId?: string | null;
    checkoutSessionId?: string | null;
    valor?: number | null;
  } = {},
) {
  const sub = stripeAccountId
    ? await stripe.subscriptions.retrieve(subId, {}, { stripeAccount: stripeAccountId })
    : await stripe.subscriptions.retrieve(subId);
  const metadata = sub.metadata || {};
  const studentId = fallback.studentId || metadata.student_id;
  const personalId = fallback.personalId || metadata.personal_id;
  const plano = (fallback.plano || metadata.plano) as Plano | undefined;
  const customerId = fallback.customerId || (typeof sub.customer === "string" ? sub.customer : sub.customer?.id);

  if (!studentId || !personalId || !plano) return null;

  const currentEnd = (sub as any).current_period_end
    ? new Date((sub as any).current_period_end * 1000)
    : calcExpiracao(plano, new Date());
  const valor = fallback.valor ?? ((sub.items.data[0]?.price.unit_amount ?? 0) / 100);

  let existingQuery = admin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subId);
  existingQuery = stripeAccountId
    ? existingQuery.eq("stripe_account_id", stripeAccountId)
    : existingQuery.is("stripe_account_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  const payload = {
    student_id: studentId,
    personal_id: personalId,
    plano,
    valor,
    status_pagamento: "pago",
    data_pagamento: new Date().toISOString(),
    data_expiracao: currentEnd.toISOString(),
    stripe_subscription_id: subId,
    stripe_customer_id: customerId ?? null,
    stripe_account_id: stripeAccountId,
    stripe_checkout_session_id: fallback.checkoutSessionId ?? null,
    cancela_no_fim_do_ciclo: !!sub.cancel_at_period_end,
    cancelado_em: sub.status === "canceled" ? new Date().toISOString() : null,
  };

  if (existing) {
    const { data, error } = await admin
      .from("subscriptions")
      .update(payload)
      .eq("id", existing.id)
      .select("id, student_id, personal_id, plano")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await admin
    .from("subscriptions")
    .insert(payload)
    .select("id, student_id, personal_id, plano")
    .single();
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-12-18.acacia" as any,
  });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await constructStripeEvent(stripe, rawBody, signature);
  } catch (err: any) {
    console.error("webhook signature error:", err.message);
    return new Response(`signature error: ${err.message}`, { status: 400 });
  }

  const eventAccountId = (event as any).account as string | undefined;
  const insertedEvent = await admin.from("stripe_webhook_events").insert({
    id: event.id,
    stripe_account_id: eventAccountId ?? null,
    event_type: event.type,
    livemode: !!event.livemode,
    processing_status: "processing",
    processing_attempts: 1,
    last_attempt_at: new Date().toISOString(),
  });

  if (insertedEvent.error) {
    if (insertedEvent.error.code === "23505") {
      const { data: existing } = await admin
        .from("stripe_webhook_events")
        .select("processing_status, processing_attempts")
        .eq("id", event.id)
        .maybeSingle();

      if (!existing || existing.processing_status === "processed") {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      await admin
        .from("stripe_webhook_events")
        .update({
          processing_status: "processing",
          error_message: null,
          processing_attempts: Number(existing.processing_attempts ?? 1) + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    } else {
      console.error("webhook idempotency insert error:", insertedEvent.error);
      return new Response(JSON.stringify({ error: insertedEvent.error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const { data: existing } = await admin
          .from("personal_stripe_accounts")
          .select("personal_id")
          .eq("stripe_account_id", account.id)
          .maybeSingle();
        await syncAccount(admin, account, existing?.personal_id ?? null);
        break;
      }

      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const stripeAccountId = eventAccountId || s.metadata?.stripe_account_id;
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
        const plano = s.metadata?.plano as Plano | undefined;

        if (!subId) break;

        await upsertSubscription(admin, stripe, subId, stripeAccountId ?? null, {
          studentId: s.metadata?.student_id,
          personalId: s.metadata?.personal_id,
          plano,
          customerId,
          checkoutSessionId: s.id,
        });
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const stripeAccountId = eventAccountId || (inv as any).metadata?.stripe_account_id;
        const subId = typeof (inv as any).subscription === "string"
          ? (inv as any).subscription
          : (inv as any).subscription?.id;
        if (!subId) break;

        const row = await upsertSubscription(admin, stripe, subId, stripeAccountId ?? null, {
          valor: (inv.amount_paid ?? 0) / 100,
        });
        if (!row) break;

        let existingPaymentQuery = admin
          .from("payment_history")
          .select("id")
          .eq("stripe_invoice_id", inv.id);
        existingPaymentQuery = stripeAccountId
          ? existingPaymentQuery.eq("stripe_account_id", stripeAccountId)
          : existingPaymentQuery.is("stripe_account_id", null);
        const { data: existingPayment } = await existingPaymentQuery.maybeSingle();

        if (existingPayment) break;

        await admin.from("payment_history").insert({
          subscription_id: row.id,
          student_id: row.student_id,
          personal_id: row.personal_id,
          valor: (inv.amount_paid ?? 0) / 100,
          data_pagamento: new Date().toISOString(),
          metodo_pagamento: stripeAccountId ? "stripe_connect" : "stripe",
          stripe_account_id: stripeAccountId ?? null,
          stripe_invoice_id: inv.id,
          stripe_payment_intent_id: typeof (inv as any).payment_intent === "string"
            ? (inv as any).payment_intent
            : null,
          stripe_currency: inv.currency ?? null,
          observacoes: stripeAccountId ? "Pagamento via Stripe Connect" : "Pagamento via Stripe",
        });
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const stripeAccountId = eventAccountId || (inv as any).metadata?.stripe_account_id;
        const subId = typeof (inv as any).subscription === "string"
          ? (inv as any).subscription
          : (inv as any).subscription?.id;
        if (!subId) break;
        let updateQuery = admin.from("subscriptions")
          .update({ status_pagamento: "atrasado" })
          .eq("stripe_subscription_id", subId);
        updateQuery = stripeAccountId
          ? updateQuery.eq("stripe_account_id", stripeAccountId)
          : updateQuery.is("stripe_account_id", null);
        await updateQuery;
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const stripeAccountId = eventAccountId || sub.metadata?.stripe_account_id;
        const updates: any = {
          cancela_no_fim_do_ciclo: !!sub.cancel_at_period_end,
        };
        if ((sub as any).current_period_end) {
          updates.data_expiracao = new Date((sub as any).current_period_end * 1000).toISOString();
        }
        if (sub.status === "canceled") {
          updates.cancelado_em = new Date().toISOString();
          updates.status_pagamento = "atrasado";
        }
        let updateQuery = admin.from("subscriptions")
          .update(updates)
          .eq("stripe_subscription_id", sub.id);
        updateQuery = stripeAccountId
          ? updateQuery.eq("stripe_account_id", stripeAccountId)
          : updateQuery.is("stripe_account_id", null);
        await updateQuery;
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const stripeAccountId = eventAccountId || sub.metadata?.stripe_account_id;
        let updateQuery = admin.from("subscriptions").update({
          cancelado_em: new Date().toISOString(),
          status_pagamento: "atrasado",
          cancela_no_fim_do_ciclo: false,
        })
          .eq("stripe_subscription_id", sub.id);
        updateQuery = stripeAccountId
          ? updateQuery.eq("stripe_account_id", stripeAccountId)
          : updateQuery.is("stripe_account_id", null);
        await updateQuery;
        break;
      }
    }

    await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "processed",
        error_message: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "failed",
        error_message: err.message ?? "Erro desconhecido",
        last_error_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    console.error("webhook handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
