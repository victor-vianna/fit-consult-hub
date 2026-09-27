export const MANUAL_PAYMENT_METHOD_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência bancária" },
  { value: "cartao_externo", label: "Cartão fora da Stripe" },
  { value: "boleto_externo", label: "Boleto fora da Stripe" },
  { value: "outro", label: "Outro meio" },
] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHOD_OPTIONS)[number]["value"];
export type PaymentOrigin = "stripe" | "manual";

export type PaymentOriginEvidence = {
  payment_origin?: string | null;
  metodo_pagamento?: string | null;
  stripe_account_id?: string | null;
  stripe_invoice_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  stripe_balance_transaction_id?: string | null;
  stripe_application_fee_id?: string | null;
  stripe_application_fee_amount?: number | null;
  stripe_payment_method_type?: string | null;
  stripe_processing_fee_amount?: number | null;
  stripe_net_amount?: number | null;
};

const normalizePaymentMethod = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const hasValue = (value: unknown) => value !== null && value !== undefined && value !== "";

export function resolvePaymentOrigin(payment: PaymentOriginEvidence): PaymentOrigin {
  const method = normalizePaymentMethod(payment.metodo_pagamento);
  const hasStripeMethod =
    method === "stripe" ||
    method === "connect" ||
    method === "stripe_connect" ||
    method.startsWith("stripe_");
  const hasStripeEvidence = [
    payment.stripe_account_id,
    payment.stripe_invoice_id,
    payment.stripe_payment_intent_id,
    payment.stripe_charge_id,
    payment.stripe_balance_transaction_id,
    payment.stripe_application_fee_id,
    payment.stripe_application_fee_amount,
    payment.stripe_payment_method_type,
    payment.stripe_processing_fee_amount,
    payment.stripe_net_amount,
  ].some(hasValue);

  return payment.payment_origin === "stripe" || hasStripeMethod || hasStripeEvidence
    ? "stripe"
    : "manual";
}

export function normalizeManualPaymentMethod(method?: string | null): ManualPaymentMethod | null {
  const normalized = normalizePaymentMethod(method);
  const aliased =
    normalized === "cartao"
      ? "cartao_externo"
      : normalized === "boleto"
      ? "boleto_externo"
      : normalized;

  const match = MANUAL_PAYMENT_METHOD_OPTIONS.find((option) => option.value === aliased);
  return match?.value ?? null;
}

export function formatPaymentMethodLabel(method?: string | null) {
  const original = normalizePaymentMethod(method);
  const normalized = original.replace(/^stripe_/, "");

  if (original === "stripe_pending") return "Link Stripe";
  if (!normalized || normalized === "—" || normalized === "â€”") return "Não informado";
  if (normalized === "pix") return "PIX";
  if (normalized === "dinheiro") return "Dinheiro";
  if (normalized === "transferencia") return "Transferência bancária";
  if (normalized === "cartao_externo") return "Cartão fora da Stripe";
  if (normalized === "boleto_externo") return "Boleto fora da Stripe";
  if (normalized === "outro") return "Outro meio";
  if (normalized === "nao_informado") return "Não informado";
  if (normalized === "card" || normalized === "cartao") return "Cartão";
  if (normalized === "boleto") return "Boleto";
  if (normalized === "connect" || normalized === "stripe") return "Stripe";

  return String(method ?? "").replace(/^stripe_/i, "");
}
