import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

type Plano = "mensal" | "trimestral" | "semestral" | "anual";
type PaymentStatus = "pago" | "pendente" | "atrasado";
type SupabaseAdminClient = any;

function calcExpiracao(plano: Plano, from: Date): Date {
  const d = new Date(from);
  switch (plano) {
    case "mensal":
      d.setMonth(d.getMonth() + 1);
      break;
    case "trimestral":
      d.setMonth(d.getMonth() + 3);
      break;
    case "semestral":
      d.setMonth(d.getMonth() + 6);
      break;
    case "anual":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

function normalizeRequirements(values?: string[] | null) {
  return Array.isArray(values) ? values : [];
}

function stripeOptions(stripeAccountId?: string | null) {
  return stripeAccountId ? { stripeAccount: stripeAccountId } : undefined;
}

function centsToMoney(value?: number | null) {
  return typeof value === "number" ? value / 100 : null;
}

function getStripePaidAt(invoice: Stripe.Invoice) {
  const paidAt = (invoice as any).status_transitions?.paid_at;
  return typeof paidAt === "number"
    ? new Date(paidAt * 1000).toISOString()
    : new Date().toISOString();
}

function mapCheckoutPaymentStatus(status?: string | null): PaymentStatus {
  return status === "paid" ? "pago" : "pendente";
}

function mapSubscriptionPaymentStatus(
  status?: string | null,
): PaymentStatus | null {
  switch (status) {
    case "active":
    case "trialing":
      return "pago";
    case "incomplete":
      return "pendente";
    case "past_due":
    case "unpaid":
    case "paused":
    case "canceled":
    case "incomplete_expired":
      return "atrasado";
    default:
      return null;
  }
}

function normalizePaymentMethodType(value?: string | null) {
  const method = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (method.includes("pix")) return "pix";
  if (method.includes("boleto")) return "boleto";
  if (method.includes("card") || method.includes("cartao")) return "card";
  return method || null;
}

function getObjectId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

async function retrieveStripePaymentDetails(
  stripe: Stripe,
  invoice: Stripe.Invoice,
  stripeAccountId?: string | null,
) {
  const options = stripeOptions(stripeAccountId);
  const invoiceAny = invoice as any;
  const paymentIntentId = getObjectId(invoiceAny.payment_intent);
  let paymentIntent: any = null;
  let charge: any = null;

  if (paymentIntentId) {
    paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      { expand: ["payment_method", "latest_charge.balance_transaction"] },
      options,
    );
    charge = typeof paymentIntent.latest_charge === "object"
      ? paymentIntent.latest_charge
      : null;
  }

  const invoiceChargeId = getObjectId(invoiceAny.charge);
  const chargeId = getObjectId(charge) || invoiceChargeId;
  if (!charge && chargeId) {
    charge = await stripe.charges.retrieve(
      chargeId,
      { expand: ["balance_transaction"] },
      options,
    );
  }

  const paymentMethodType = normalizePaymentMethodType(
    charge?.payment_method_details?.type ||
      paymentIntent?.payment_method?.type ||
      paymentIntent?.payment_method_types?.[0] ||
      invoiceAny.payment_settings?.payment_method_types?.[0],
  );

  const balanceTransaction = typeof charge?.balance_transaction === "object"
    ? charge.balance_transaction
    : getObjectId(charge?.balance_transaction)
    ? await stripe.balanceTransactions.retrieve(
      getObjectId(charge.balance_transaction)!,
      {},
      options,
    )
    : null;

  const applicationFeeId = getObjectId(charge?.application_fee);
  const applicationFeeAmount =
    centsToMoney(invoiceAny.application_fee_amount) ??
      centsToMoney(charge?.application_fee_amount);

  return {
    paymentIntentId,
    chargeId,
    balanceTransactionId: getObjectId(balanceTransaction),
    paymentMethodType,
    processingFeeAmount: centsToMoney(balanceTransaction?.fee),
    netAmount: centsToMoney(balanceTransaction?.net),
    applicationFeeId,
    applicationFeeAmount,
    currency: balanceTransaction?.currency || invoice.currency || null,
  };
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
      return await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        secret,
      );
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

async function syncAccount(
  admin: SupabaseAdminClient,
  stripeAccount: Stripe.Account,
  fallbackPersonalId?: string | null,
) {
  const personalId = fallbackPersonalId || stripeAccount.metadata?.personal_id;
  if (!personalId) return;

  const { error } = await admin.from("personal_stripe_accounts").upsert({
    personal_id: personalId,
    stripe_account_id: stripeAccount.id,
    account_type: (stripeAccount as any).type || "standard",
    country: stripeAccount.country ?? null,
    default_currency: stripeAccount.default_currency ?? null,
    charges_enabled: !!stripeAccount.charges_enabled,
    payouts_enabled: !!stripeAccount.payouts_enabled,
    details_submitted: !!stripeAccount.details_submitted,
    card_payments_active:
      stripeAccount.capabilities?.card_payments === "active",
    transfers_active: stripeAccount.capabilities?.transfers === "active",
    requirements_currently_due: normalizeRequirements(
      stripeAccount.requirements?.currently_due,
    ),
    requirements_past_due: normalizeRequirements(
      stripeAccount.requirements?.past_due,
    ),
    disabled_reason: stripeAccount.requirements?.disabled_reason ?? null,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "stripe_account_id" });
  if (error) throw error;
}

async function upsertSubscription(
  admin: SupabaseAdminClient,
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
    statusPagamento?: PaymentStatus;
    dataPagamento?: string | null;
  } = {},
) {
  const sub = stripeAccountId
    ? await stripe.subscriptions.retrieve(subId, {}, {
      stripeAccount: stripeAccountId,
    })
    : await stripe.subscriptions.retrieve(subId);
  const metadata = sub.metadata || {};
  const studentId = fallback.studentId || metadata.student_id;
  const personalId = fallback.personalId || metadata.personal_id;
  const plano = (fallback.plano || metadata.plano) as Plano | undefined;
  const customerId = fallback.customerId ||
    (typeof sub.customer === "string" ? sub.customer : sub.customer?.id);

  if (!studentId || !personalId || !plano) return null;

  const currentEnd = (sub as any).current_period_end
    ? new Date((sub as any).current_period_end * 1000)
    : calcExpiracao(plano, new Date());
  const valor = fallback.valor ??
    ((sub.items.data[0]?.price.unit_amount ?? 0) / 100);

  let existingQuery = admin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subId);
  existingQuery = stripeAccountId
    ? existingQuery.eq("stripe_account_id", stripeAccountId)
    : existingQuery.is("stripe_account_id", null);
  const { data: existing, error: existingError } = await existingQuery
    .maybeSingle();
  if (existingError) throw existingError;

  const payload = {
    student_id: studentId,
    personal_id: personalId,
    plano,
    valor,
    status_pagamento: fallback.statusPagamento ?? "pago",
    data_pagamento: fallback.dataPagamento ?? null,
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
      const { data: existing, error: existingEventError } = await admin
        .from("stripe_webhook_events")
        .select("processing_status, processing_attempts")
        .eq("id", event.id)
        .maybeSingle();
      if (existingEventError) throw existingEventError;

      if (!existing || existing.processing_status === "processed") {
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const { error: retryUpdateError } = await admin
        .from("stripe_webhook_events")
        .update({
          processing_status: "processing",
          error_message: null,
          processing_attempts: Number(existing.processing_attempts ?? 1) + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", event.id);
      if (retryUpdateError) throw retryUpdateError;
    } else {
      console.error("webhook idempotency insert error:", insertedEvent.error);
      return new Response(
        JSON.stringify({ error: insertedEvent.error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const { data: existing, error } = await admin
          .from("personal_stripe_accounts")
          .select("personal_id")
          .eq("stripe_account_id", account.id)
          .maybeSingle();
        if (error) throw error;
        await syncAccount(admin, account, existing?.personal_id ?? null);
        break;
      }

      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const stripeAccountId = eventAccountId || s.metadata?.stripe_account_id;
        const subId = typeof s.subscription === "string"
          ? s.subscription
          : s.subscription?.id;
        const customerId = typeof s.customer === "string"
          ? s.customer
          : s.customer?.id;
        const plano = s.metadata?.plano as Plano | undefined;

        if (!subId) break;

        await upsertSubscription(
          admin,
          stripe,
          subId,
          stripeAccountId ?? null,
          {
            studentId: s.metadata?.student_id,
            personalId: s.metadata?.personal_id,
            plano,
            customerId,
            checkoutSessionId: s.id,
            statusPagamento: mapCheckoutPaymentStatus(s.payment_status),
            dataPagamento: s.payment_status === "paid"
              ? new Date().toISOString()
              : null,
          },
        );
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const stripeAccountId = eventAccountId ||
          (inv as any).metadata?.stripe_account_id;
        const subId = typeof (inv as any).subscription === "string"
          ? (inv as any).subscription
          : (inv as any).subscription?.id;
        if (!subId) break;

        const paidAt = getStripePaidAt(inv);
        const row = await upsertSubscription(
          admin,
          stripe,
          subId,
          stripeAccountId ?? null,
          {
            valor: (inv.amount_paid ?? 0) / 100,
            statusPagamento: "pago",
            dataPagamento: paidAt,
          },
        );
        if (!row) break;

        let existingPaymentQuery = admin
          .from("payment_history")
          .select("id")
          .eq("stripe_invoice_id", inv.id);
        existingPaymentQuery = stripeAccountId
          ? existingPaymentQuery.eq("stripe_account_id", stripeAccountId)
          : existingPaymentQuery.is("stripe_account_id", null);
        const { data: existingPayment, error: existingPaymentError } =
          await existingPaymentQuery.maybeSingle();
        if (existingPaymentError) throw existingPaymentError;

        if (existingPayment) break;

        let paymentDetails = {
          paymentIntentId: getObjectId((inv as any).payment_intent),
          chargeId: getObjectId((inv as any).charge),
          balanceTransactionId: null as string | null,
          paymentMethodType: null as string | null,
          processingFeeAmount: null as number | null,
          netAmount: null as number | null,
          applicationFeeId: null as string | null,
          applicationFeeAmount: centsToMoney(
            (inv as any).application_fee_amount,
          ),
          currency: inv.currency ?? null,
        };

        try {
          paymentDetails = await retrieveStripePaymentDetails(
            stripe,
            inv,
            stripeAccountId ?? null,
          );
        } catch (detailError) {
          console.error(
            "Falha ao buscar detalhes financeiros Stripe:",
            detailError,
          );
        }

        const methodLabel = paymentDetails.paymentMethodType
          ? `stripe_${paymentDetails.paymentMethodType}`
          : stripeAccountId
          ? "stripe_connect"
          : "stripe";

        const { error: paymentInsertError } = await admin.from(
          "payment_history",
        ).insert({
          subscription_id: row.id,
          student_id: row.student_id,
          personal_id: row.personal_id,
          valor: (inv.amount_paid ?? 0) / 100,
          data_pagamento: paidAt,
          metodo_pagamento: methodLabel,
          stripe_account_id: stripeAccountId ?? null,
          stripe_invoice_id: inv.id,
          stripe_application_fee_id: paymentDetails.applicationFeeId,
          stripe_application_fee_amount: paymentDetails.applicationFeeAmount,
          stripe_payment_intent_id: paymentDetails.paymentIntentId,
          stripe_charge_id: paymentDetails.chargeId,
          stripe_balance_transaction_id: paymentDetails.balanceTransactionId,
          stripe_payment_method_type: paymentDetails.paymentMethodType,
          stripe_processing_fee_amount: paymentDetails.processingFeeAmount,
          stripe_net_amount: paymentDetails.netAmount,
          stripe_currency: paymentDetails.currency,
          observacoes: stripeAccountId
            ? "Pagamento via Stripe Connect"
            : "Pagamento via Stripe",
        });
        if (paymentInsertError) throw paymentInsertError;
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const stripeAccountId = eventAccountId ||
          (inv as any).metadata?.stripe_account_id;
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
        const { error } = await updateQuery;
        if (error) throw error;
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const stripeAccountId = eventAccountId ||
          sub.metadata?.stripe_account_id;
        const updates: any = {
          cancela_no_fim_do_ciclo: !!sub.cancel_at_period_end,
        };
        const plano = sub.metadata?.plano as Plano | undefined;
        if (plano) updates.plano = plano;
        const unitAmount = sub.items.data[0]?.price?.unit_amount;
        if (typeof unitAmount === "number") {
          updates.valor = unitAmount / 100;
        }
        const paymentStatus = mapSubscriptionPaymentStatus(sub.status);
        if (paymentStatus) {
          updates.status_pagamento = paymentStatus;
        }
        if ((sub as any).current_period_end) {
          updates.data_expiracao = new Date(
            (sub as any).current_period_end * 1000,
          ).toISOString();
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
        const { error } = await updateQuery;
        if (error) throw error;
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const stripeAccountId = eventAccountId ||
          sub.metadata?.stripe_account_id;
        let updateQuery = admin.from("subscriptions").update({
          cancelado_em: new Date().toISOString(),
          status_pagamento: "atrasado",
          cancela_no_fim_do_ciclo: false,
        })
          .eq("stripe_subscription_id", sub.id);
        updateQuery = stripeAccountId
          ? updateQuery.eq("stripe_account_id", stripeAccountId)
          : updateQuery.is("stripe_account_id", null);
        const { error } = await updateQuery;
        if (error) throw error;
        break;
      }
    }

    const { error: processedUpdateError } = await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "processed",
        error_message: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    if (processedUpdateError) throw processedUpdateError;

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const { error: failedUpdateError } = await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "failed",
        error_message: err.message ?? "Erro desconhecido",
        last_error_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    if (failedUpdateError) {
      console.error("webhook failed-status update error:", failedUpdateError);
    }
    console.error("webhook handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
