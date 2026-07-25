import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | "cancel_at_period_end"
  | "resume_renewal"
  | "cancel_now"
  | "change_plan"
  | "customer_portal";

type Plano = "mensal" | "trimestral" | "semestral" | "anual";

const VALID_ACTIONS: Action[] = [
  "cancel_at_period_end",
  "resume_renewal",
  "cancel_now",
  "change_plan",
  "customer_portal",
];

const VALID_PLANOS: Plano[] = ["mensal", "trimestral", "semestral", "anual"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getOrigin(req: Request, body: any) {
  const raw = body?.return_url || req.headers.get("origin") || Deno.env.get("APP_URL") || "";
  return String(raw).replace(/\/$/, "");
}

function stripeOptions(stripeAccountId?: string | null) {
  return stripeAccountId ? { stripeAccount: stripeAccountId } : undefined;
}

async function logAction(
  admin: ReturnType<typeof createClient>,
  payload: {
    subscription_id: string;
    student_id: string;
    personal_id: string;
    actor_id: string;
    action: Action;
    status?: "succeeded" | "failed";
    motivo?: string | null;
    details?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("subscription_actions").insert({
    subscription_id: payload.subscription_id,
    student_id: payload.student_id,
    personal_id: payload.personal_id,
    actor_id: payload.actor_id,
    action: payload.action,
    status: payload.status ?? "succeeded",
    motivo: payload.motivo ?? null,
    details: payload.details ?? {},
  });

  if (error) {
    console.error("[stripe-manage-subscription] action log failed", error);
  }
}

async function updateLocalSubscription(
  admin: ReturnType<typeof createClient>,
  id: string,
  updates: Record<string, unknown>,
) {
  const { error } = await admin.from("subscriptions").update(updates).eq("id", id);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const actorId = claimsData.claims.sub as string;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as Action;
    const subscriptionId = body?.subscription_id as string | undefined;
    const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : null;

    if (!VALID_ACTIONS.includes(action)) return json({ error: "invalid action" }, 400);
    if (!subscriptionId) return json({ error: "subscription_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subscription, error: subErr } = await admin
      .from("subscriptions")
      .select(
        "id, student_id, personal_id, plano, valor, status_pagamento, data_expiracao, stripe_subscription_id, stripe_customer_id, stripe_account_id, cancela_no_fim_do_ciclo",
      )
      .eq("id", subscriptionId)
      .maybeSingle();

    if (subErr) throw subErr;
    if (!subscription) return json({ error: "Assinatura nao encontrada" }, 404);
    if (subscription.personal_id !== actorId) {
      return json({ error: "Voce nao pode gerenciar a assinatura de outro personal" }, 403);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia" as any,
    });

    if (action === "customer_portal") {
      if (!subscription.stripe_customer_id) {
        return json({ error: "Aluno sem cliente Stripe vinculado" }, 400);
      }

      const origin = getOrigin(req, body);
      const portal = await stripe.billingPortal.sessions.create(
        {
          customer: subscription.stripe_customer_id,
          return_url: origin || undefined,
        },
        stripeOptions(subscription.stripe_account_id),
      );

      await logAction(admin, {
        subscription_id: subscription.id,
        student_id: subscription.student_id,
        personal_id: subscription.personal_id,
        actor_id: actorId,
        action,
        motivo,
        details: { stripe_customer_id: subscription.stripe_customer_id },
      });

      return json({ ok: true, url: portal.url });
    }

    if (!subscription.stripe_subscription_id) {
      return json({
        error: "Esta assinatura foi criada manualmente e nao possui assinatura Stripe para gerenciar.",
      }, 400);
    }

    const options = stripeOptions(subscription.stripe_account_id);
    const retrieve = () =>
      options
        ? stripe.subscriptions.retrieve(subscription.stripe_subscription_id, {}, options)
        : stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

    if (action === "cancel_at_period_end") {
      const updated = options
        ? await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: true },
            options,
          )
        : await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
          });

      await updateLocalSubscription(admin, subscription.id, {
        cancela_no_fim_do_ciclo: true,
        updated_at: new Date().toISOString(),
      });

      await logAction(admin, {
        subscription_id: subscription.id,
        student_id: subscription.student_id,
        personal_id: subscription.personal_id,
        actor_id: actorId,
        action,
        motivo,
        details: {
          stripe_subscription_id: updated.id,
          current_period_end: (updated as any).current_period_end ?? null,
        },
      });

      return json({ ok: true, subscription: updated });
    }

    if (action === "resume_renewal") {
      const updated = options
        ? await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: false },
            options,
          )
        : await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: false,
          });

      await updateLocalSubscription(admin, subscription.id, {
        cancela_no_fim_do_ciclo: false,
        cancelado_em: null,
        updated_at: new Date().toISOString(),
      });

      await logAction(admin, {
        subscription_id: subscription.id,
        student_id: subscription.student_id,
        personal_id: subscription.personal_id,
        actor_id: actorId,
        action,
        motivo,
        details: {
          stripe_subscription_id: updated.id,
          current_period_end: (updated as any).current_period_end ?? null,
        },
      });

      return json({ ok: true, subscription: updated });
    }

    if (action === "cancel_now") {
      const canceled = options
        ? await stripe.subscriptions.cancel(
            subscription.stripe_subscription_id,
            { invoice_now: false, prorate: false },
            options,
          )
        : await stripe.subscriptions.cancel(subscription.stripe_subscription_id, {
            invoice_now: false,
            prorate: false,
          });

      await updateLocalSubscription(admin, subscription.id, {
        cancela_no_fim_do_ciclo: false,
        cancelado_em: new Date().toISOString(),
        status_pagamento: "atrasado",
        updated_at: new Date().toISOString(),
      });

      await logAction(admin, {
        subscription_id: subscription.id,
        student_id: subscription.student_id,
        personal_id: subscription.personal_id,
        actor_id: actorId,
        action,
        motivo,
        details: {
          stripe_subscription_id: canceled.id,
          status: canceled.status,
        },
      });

      return json({ ok: true, subscription: canceled });
    }

    if (action === "change_plan") {
      const plano = body?.plano as Plano;
      if (!VALID_PLANOS.includes(plano)) return json({ error: "plano invalido" }, 400);

      const { data: priceRow, error: priceErr } = await admin
        .from("personal_plan_prices")
        .select("id, plano, valor, stripe_price_id, stripe_account_id, ativo")
        .eq("personal_id", actorId)
        .eq("plano", plano)
        .eq("ativo", true)
        .maybeSingle();

      if (priceErr) throw priceErr;
      if (!priceRow?.stripe_price_id) {
        return json({ error: "Plano nao sincronizado com a Stripe" }, 400);
      }

      if (
        subscription.stripe_account_id &&
        priceRow.stripe_account_id &&
        priceRow.stripe_account_id !== subscription.stripe_account_id
      ) {
        return json({ error: "Plano sincronizado em outra conta Stripe" }, 400);
      }

      const current = await retrieve();
      const item = current.items.data[0];
      if (!item?.id) return json({ error: "Assinatura Stripe sem item atual" }, 400);

      const updated = options
        ? await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            {
              cancel_at_period_end: false,
              items: [{ id: item.id, price: priceRow.stripe_price_id }],
              metadata: {
                ...current.metadata,
                plano,
                price_row_id: priceRow.id,
              },
              proration_behavior: "none",
            },
            options,
          )
        : await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: false,
            items: [{ id: item.id, price: priceRow.stripe_price_id }],
            metadata: {
              ...current.metadata,
              plano,
              price_row_id: priceRow.id,
            },
            proration_behavior: "none",
          });

      const currentEnd = (updated as any).current_period_end
        ? new Date((updated as any).current_period_end * 1000).toISOString()
        : subscription.data_expiracao;

      await updateLocalSubscription(admin, subscription.id, {
        plano,
        valor: priceRow.valor,
        data_expiracao: currentEnd,
        cancela_no_fim_do_ciclo: false,
        updated_at: new Date().toISOString(),
      });

      await logAction(admin, {
        subscription_id: subscription.id,
        student_id: subscription.student_id,
        personal_id: subscription.personal_id,
        actor_id: actorId,
        action,
        motivo,
        details: {
          from_plano: subscription.plano,
          to_plano: plano,
          from_valor: subscription.valor,
          to_valor: priceRow.valor,
          proration_behavior: "none",
          stripe_subscription_id: updated.id,
        },
      });

      return json({ ok: true, subscription: updated });
    }

    return json({ error: "invalid action" }, 400);
  } catch (err: any) {
    console.error("[stripe-manage-subscription]", err);
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});
