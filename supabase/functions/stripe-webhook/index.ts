import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

type Plano = "mensal" | "trimestral" | "semestral" | "anual";
type PaymentStatus = "pago" | "pendente" | "atrasado" | "cancelado";
type JsonRecord = Record<string, unknown>;

type SubscriptionFallback = {
  studentId?: string | null;
  personalId?: string | null;
  plano?: Plano | null;
  customerId?: string | null;
  checkoutSessionId?: string | null;
  valor?: number | null;
  statusPagamento?: PaymentStatus | null;
  dataPagamento?: string | null;
  preservePaidGrace?: boolean;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stripeOptions(stripeAccountId?: string | null) {
  return stripeAccountId ? { stripeAccount: stripeAccountId } : undefined;
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

function centsToMoney(value?: number | null) {
  return typeof value === "number" ? value / 100 : null;
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

function mapSubscriptionPaymentStatus(status?: string | null): PaymentStatus | null {
  switch (status) {
    case "active":
    case "trialing":
      return "pago";
    case "incomplete":
      return "pendente";
    case "canceled":
      return "cancelado";
    case "past_due":
    case "unpaid":
    case "paused":
    case "incomplete_expired":
      return "atrasado";
    default:
      return null;
  }
}

function getStripePaidAt(invoice: Stripe.Invoice) {
  const paidAt = (invoice as any).status_transitions?.paid_at;
  return typeof paidAt === "number"
    ? new Date(paidAt * 1000).toISOString()
    : new Date().toISOString();
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
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

  const chargeId = getObjectId(charge) || getObjectId(invoiceAny.charge);
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

  return {
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId,
    stripe_balance_transaction_id: getObjectId(balanceTransaction),
    stripe_payment_method_type: paymentMethodType,
    stripe_processing_fee_amount: centsToMoney(balanceTransaction?.fee),
    stripe_net_amount: centsToMoney(balanceTransaction?.net),
    stripe_application_fee_id: getObjectId(charge?.application_fee),
    stripe_application_fee_amount:
      centsToMoney(invoiceAny.application_fee_amount) ??
      centsToMoney(charge?.application_fee_amount),
    stripe_currency: balanceTransaction?.currency || invoice.currency || null,
    metodo_pagamento: paymentMethodType
      ? `stripe_${paymentMethodType}`
      : stripeAccountId
      ? "stripe_connect"
      : "stripe",
  };
}

async function getSubscriptionSnapshot(
  stripe: Stripe,
  subscriptionId: string,
  stripeAccountId: string | null,
  fallback: SubscriptionFallback = {},
): Promise<JsonRecord> {
  const subscription = await stripe.subscriptions.retrieve(
    subscriptionId,
    {},
    stripeOptions(stripeAccountId),
  );
  const metadata = subscription.metadata || {};
  const periodEnd = (subscription as any).current_period_end;
  const status = fallback.statusPagamento ??
    mapSubscriptionPaymentStatus(subscription.status) ?? "pendente";

  if (!periodEnd) {
    throw new Error(`Assinatura Stripe ${subscriptionId} sem current_period_end`);
  }

  return {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: fallback.customerId || getObjectId(subscription.customer),
    stripe_checkout_session_id: fallback.checkoutSessionId || null,
    student_id: fallback.studentId || metadata.student_id || null,
    personal_id: fallback.personalId || metadata.personal_id || null,
    plano: fallback.plano || metadata.plano || null,
    valor: fallback.valor ?? centsToMoney(subscription.items.data[0]?.price.unit_amount) ?? 0,
    status_pagamento: status,
    data_pagamento: fallback.dataPagamento || null,
    data_expiracao: new Date(periodEnd * 1000).toISOString(),
    cancela_no_fim_do_ciclo: !!subscription.cancel_at_period_end,
    cancelado_em: subscription.status === "canceled"
      ? new Date(((subscription as any).canceled_at || periodEnd) * 1000).toISOString()
      : null,
    preserve_paid_grace: fallback.preservePaidGrace ?? status === "atrasado",
  };
}

async function getInvoiceForCharge(
  stripe: Stripe,
  charge: Stripe.Charge,
  stripeAccountId: string | null,
) {
  const invoiceId = getObjectId((charge as any).invoice);
  if (!invoiceId) return null;
  return await stripe.invoices.retrieve(
    invoiceId,
    {},
    stripeOptions(stripeAccountId),
  );
}

async function getChargeForFinancialObject(
  stripe: Stripe,
  object: any,
  stripeAccountId: string | null,
) {
  if (object?.object === "charge") return object as Stripe.Charge;

  const chargeId = getObjectId(object?.charge);
  if (chargeId) {
    return await stripe.charges.retrieve(chargeId, {}, stripeOptions(stripeAccountId));
  }

  const paymentIntentId = getObjectId(object?.payment_intent);
  if (paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      { expand: ["latest_charge"] },
      stripeOptions(stripeAccountId),
    );
    if (typeof paymentIntent.latest_charge === "object") {
      return paymentIntent.latest_charge as Stripe.Charge;
    }
    const latestChargeId = getObjectId(paymentIntent.latest_charge);
    if (latestChargeId) {
      return await stripe.charges.retrieve(
        latestChargeId,
        {},
        stripeOptions(stripeAccountId),
      );
    }
  }

  return null;
}

async function normalizeRevocation(
  stripe: Stripe,
  event: Stripe.Event,
  stripeAccountId: string | null,
  reason: "refund_full" | "refund_partial" | "chargeback",
) {
  const object = event.data.object as any;
  const charge = await getChargeForFinancialObject(stripe, object, stripeAccountId);
  if (!charge) {
    if (object?.metadata?.student_id) {
      throw new Error(`Evento ${event.type} do aluno sem charge resolvivel`);
    }
    return { kind: "ignored", priority: 0, reason: "unrelated_financial_event" };
  }

  const invoice = await getInvoiceForCharge(stripe, charge, stripeAccountId);
  const subscriptionId = getObjectId((invoice as any)?.subscription) ||
    charge.metadata?.stripe_subscription_id ||
    object?.metadata?.stripe_subscription_id;

  if (!subscriptionId) {
    if (charge.metadata?.student_id || object?.metadata?.student_id) {
      throw new Error(`Evento ${event.type} do aluno sem assinatura resolvivel`);
    }
    return { kind: "ignored", priority: 0, reason: "unrelated_financial_event" };
  }

  const snapshot = await getSubscriptionSnapshot(
    stripe,
    subscriptionId,
    stripeAccountId,
    {
      studentId: charge.metadata?.student_id || object?.metadata?.student_id,
      personalId: charge.metadata?.personal_id || object?.metadata?.personal_id,
      plano: (charge.metadata?.plano || object?.metadata?.plano) as Plano | undefined,
      statusPagamento: "atrasado",
      preservePaidGrace: false,
    },
  );

  return {
    ...snapshot,
    kind: "access_revoked",
    priority: 100,
    status_pagamento: "atrasado",
    preserve_paid_grace: false,
    access_revoked_reason: reason,
    revoked_amount: centsToMoney(object?.amount ?? (charge as any).amount_refunded),
    stripe_currency: object?.currency || charge.currency || null,
    stripe_charge_id: charge.id,
    stripe_invoice_id: invoice?.id || null,
  };
}

async function normalizeEvent(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<JsonRecord> {
  const eventAccountId = ((event as any).account as string | undefined) ?? null;

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      return {
        kind: "account_updated",
        priority: 10,
        personal_id: account.metadata?.personal_id || null,
        stripe_account_id: account.id,
        account_type: (account as any).type || "standard",
        country: account.country || null,
        default_currency: account.default_currency || null,
        charges_enabled: !!account.charges_enabled,
        payouts_enabled: !!account.payouts_enabled,
        details_submitted: !!account.details_submitted,
        card_payments_active: account.capabilities?.card_payments === "active",
        transfers_active: account.capabilities?.transfers === "active",
        requirements_currently_due: account.requirements?.currently_due || [],
        requirements_past_due: account.requirements?.past_due || [],
        disabled_reason: account.requirements?.disabled_reason || null,
      };
    }

    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = getObjectId(session.subscription);
      if (!subscriptionId) return { kind: "ignored", priority: 0, reason: "checkout_without_subscription" };

      const failed = event.type === "checkout.session.async_payment_failed";
      const paid = event.type === "checkout.session.async_payment_succeeded" ||
        session.payment_status === "paid";
      const snapshot = await getSubscriptionSnapshot(
        stripe,
        subscriptionId,
        eventAccountId || session.metadata?.stripe_account_id || null,
        {
          studentId: session.metadata?.student_id,
          personalId: session.metadata?.personal_id,
          plano: session.metadata?.plano as Plano | undefined,
          customerId: getObjectId(session.customer),
          checkoutSessionId: session.id,
          statusPagamento: failed ? "atrasado" : paid ? "pago" : "pendente",
          dataPagamento: paid ? new Date(event.created * 1000).toISOString() : null,
          preservePaidGrace: false,
        },
      );
      return {
        ...snapshot,
        kind: "subscription_sync",
        priority: failed ? 80 : paid ? 70 : 30,
        clear_revocation: false,
      };
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getObjectId((invoice as any).subscription);
      if (!subscriptionId) return { kind: "ignored", priority: 0, reason: "invoice_without_subscription" };

      const paidAt = getStripePaidAt(invoice);
      const snapshot = await getSubscriptionSnapshot(
        stripe,
        subscriptionId,
        eventAccountId || (invoice as any).metadata?.stripe_account_id || null,
        {
          valor: centsToMoney(invoice.amount_paid),
          statusPagamento: "pago",
          dataPagamento: paidAt,
          preservePaidGrace: false,
        },
      );

      let details: JsonRecord = {
        stripe_payment_intent_id: getObjectId((invoice as any).payment_intent),
        stripe_charge_id: getObjectId((invoice as any).charge),
        stripe_currency: invoice.currency || null,
        metodo_pagamento: eventAccountId ? "stripe_connect" : "stripe",
      };
      try {
        details = await retrieveStripePaymentDetails(stripe, invoice, eventAccountId);
      } catch (error) {
        console.error("stripe payment detail enrichment failed", error);
      }

      return {
        ...snapshot,
        ...details,
        kind: "payment_succeeded",
        priority: 70,
        status_pagamento: "pago",
        clear_revocation: true,
        paid_value: centsToMoney(invoice.amount_paid),
        stripe_invoice_id: invoice.id,
        data_pagamento: paidAt,
      };
    }

    case "invoice.payment_failed":
    case "invoice.voided":
    case "invoice.marked_uncollectible": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getObjectId((invoice as any).subscription);
      if (!subscriptionId) return { kind: "ignored", priority: 0, reason: "invoice_without_subscription" };
      const snapshot = await getSubscriptionSnapshot(
        stripe,
        subscriptionId,
        eventAccountId || (invoice as any).metadata?.stripe_account_id || null,
        {
          statusPagamento: "atrasado",
          preservePaidGrace: true,
        },
      );
      return {
        ...snapshot,
        kind: "payment_failed",
        priority: 80,
        status_pagamento: "atrasado",
        preserve_paid_grace: true,
        stripe_invoice_id: invoice.id,
        stripe_currency: invoice.currency || null,
      };
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.paused":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const deleted = event.type === "customer.subscription.deleted";
      const snapshot = await getSubscriptionSnapshot(
        stripe,
        subscription.id,
        eventAccountId || subscription.metadata?.stripe_account_id || null,
        {
          statusPagamento: deleted ? "cancelado" : mapSubscriptionPaymentStatus(subscription.status),
          preservePaidGrace: !deleted && ["past_due", "unpaid", "paused"].includes(subscription.status),
        },
      );
      return {
        ...snapshot,
        kind: "subscription_sync",
        priority: deleted || subscription.status === "canceled" ? 80 : 50,
        status_pagamento: deleted ? "cancelado" : snapshot.status_pagamento,
        preserve_paid_grace: !deleted && ["past_due", "unpaid", "paused"].includes(subscription.status),
      };
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const reason = (charge.amount_refunded ?? 0) < charge.amount
        ? "refund_partial"
        : "refund_full";
      return await normalizeRevocation(stripe, event, eventAccountId, reason);
    }

    case "refund.created":
    case "refund.updated":
    case "charge.refund.updated": {
      const object = event.data.object as any;
      const charge = await getChargeForFinancialObject(stripe, object, eventAccountId);
      const reason = charge && (charge.amount_refunded ?? 0) < charge.amount
        ? "refund_partial"
        : "refund_full";
      return await normalizeRevocation(stripe, event, eventAccountId, reason);
    }

    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed":
    case "charge.dispute.funds_withdrawn":
    case "charge.dispute.funds_reinstated":
      return await normalizeRevocation(stripe, event, eventAccountId, "chargeback");

    default:
      return { kind: "ignored", priority: 0, reason: "event_not_used_for_access" };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Invalid Stripe signature", code: "INVALID_SIGNATURE" }, 401);
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeSecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Webhook environment is not configured" }, 500);
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: "2024-12-18.acacia" as any,
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await constructStripeEvent(stripe, rawBody, signature);
  } catch (error) {
    console.error("webhook signature error", error);
    return json({ error: "Invalid Stripe signature", code: "INVALID_SIGNATURE" }, 401);
  }

  const eventAccountId = ((event as any).account as string | undefined) ?? null;
  const eventCreatedAt = new Date(event.created * 1000).toISOString();
  const payloadHash = await sha256(rawBody);
  let command: JsonRecord;

  try {
    command = await normalizeEvent(stripe, event);
  } catch (error) {
    console.error("webhook normalization error", error);
    command = {
      kind: "normalization_failed",
      priority: 0,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }

  const { data, error } = await admin.rpc("apply_stripe_webhook_event", {
    _event_id: event.id,
    _event_type: event.type,
    _event_created_at: eventCreatedAt,
    _stripe_account_id: eventAccountId,
    _livemode: !!event.livemode,
    _api_version: (event as any).api_version ?? null,
    _payload: event as unknown as JsonRecord,
    _payload_sha256: payloadHash,
    _request_id: req.headers.get("stripe-request-id") || req.headers.get("request-id"),
    _command: command,
  });

  if (error) {
    console.error("atomic webhook RPC error", error);
    return json({ error: error.message, code: "WEBHOOK_PERSISTENCE_FAILED" }, 500);
  }

  const result = data as { ok?: boolean; duplicate?: boolean; error?: string } | null;
  if (!result?.ok) {
    return json({
      error: result?.error || "Webhook processing failed",
      code: "WEBHOOK_PROCESSING_FAILED",
    }, 500);
  }

  return json({ received: true, duplicate: !!result.duplicate });
});
