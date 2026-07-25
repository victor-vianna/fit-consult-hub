export type BillingPlan = "mensal" | "trimestral" | "semestral" | "anual";
export type StripePaymentMethod = "card" | "pix" | "boleto" | "none";

export interface StripeProcessingFeeRule {
  percent: number;
  fixed: number;
}

export interface StripeProcessingFeeConfig {
  card: StripeProcessingFeeRule;
  pix: StripeProcessingFeeRule;
  boleto: StripeProcessingFeeRule;
}

export const DEFAULT_STRIPE_PROCESSING_FEES: StripeProcessingFeeConfig = {
  card: { percent: 3.99, fixed: 0.39 },
  pix: { percent: 1.19, fixed: 0 },
  boleto: { percent: 0, fixed: 3.45 },
};

export const PLAN_MONTHS: Record<BillingPlan, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercentBR(value: number) {
  return `${(Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

export function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function calculatePlatformFee(grossValue: number, feePercent: number) {
  const gross = roundCurrency(grossValue);
  const platformFee = roundCurrency(gross * ((Number.isFinite(feePercent) ? feePercent : 0) / 100));
  return {
    gross,
    platformFee,
    netBeforeStripeFees: roundCurrency(gross - platformFee),
  };
}

export function normalizeStripePaymentMethod(
  method?: string | null,
  isStripePayment = false,
): StripePaymentMethod {
  const value = String(method ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (!isStripePayment && !value.includes("stripe")) return "none";
  if (value.includes("pix")) return "pix";
  if (value.includes("boleto")) return "boleto";
  if (value.includes("cartao") || value.includes("card") || value.includes("stripe")) return "card";

  return isStripePayment ? "card" : "none";
}

export function calculateStripeProcessingFee(
  grossValue: number,
  method: StripePaymentMethod,
  config: StripeProcessingFeeConfig,
) {
  if (method === "none") {
    return {
      method,
      percent: 0,
      fixed: 0,
      amount: 0,
    };
  }

  const rule = config[method] ?? config.card;
  const gross = roundCurrency(grossValue);
  const amount = roundCurrency(gross * ((Number.isFinite(rule.percent) ? rule.percent : 0) / 100) + rule.fixed);

  return {
    method,
    percent: rule.percent,
    fixed: rule.fixed,
    amount,
  };
}

export function calculateNetAfterFees(params: {
  grossValue: number;
  platformFeePercent: number;
  stripeMethod: StripePaymentMethod;
  stripeFeeConfig: StripeProcessingFeeConfig;
}) {
  const platform = calculatePlatformFee(params.grossValue, params.platformFeePercent);
  const stripeFee = calculateStripeProcessingFee(
    params.grossValue,
    params.stripeMethod,
    params.stripeFeeConfig,
  );

  return {
    gross: platform.gross,
    platformFee: platform.platformFee,
    stripeFee,
    totalFees: roundCurrency(platform.platformFee + stripeFee.amount),
    netAfterFees: roundCurrency(platform.gross - platform.platformFee - stripeFee.amount),
  };
}

export function formatTotalStripeFeeRule(
  platformFeePercent: number,
  stripeFee: { method: StripePaymentMethod; percent: number; fixed: number },
) {
  const processingPercent = stripeFee.method === "none" ? 0 : stripeFee.percent;
  const fixed = stripeFee.method === "none" ? 0 : stripeFee.fixed;
  const percentLabel = formatPercentBR(platformFeePercent + processingPercent);

  return fixed > 0 ? `${percentLabel} + ${formatCurrencyBRL(fixed)}` : percentLabel;
}

export function calculatePlanDiscount(
  plan: BillingPlan,
  planValue: number,
  monthlyValue: number,
) {
  const months = PLAN_MONTHS[plan] ?? 1;
  const fullValue = roundCurrency((Number.isFinite(monthlyValue) ? monthlyValue : 0) * months);
  const discountValue = roundCurrency(Math.max(fullValue - (Number.isFinite(planValue) ? planValue : 0), 0));

  return {
    fullValue,
    discountValue,
    discountPercent: fullValue > 0 ? roundCurrency((discountValue / fullValue) * 100) : 0,
  };
}
