import {
  formatPaymentMethodLabel,
  normalizeManualPaymentMethod,
  resolvePaymentOrigin,
} from "../src/utils/paymentMethods.ts";
import {
  calculateNetAfterFees,
  DEFAULT_STRIPE_PROCESSING_FEES,
} from "../src/utils/billing.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

Deno.test("manual receipt remains manual even when its subscription is Stripe-linked", () => {
  assertEquals(
    resolvePaymentOrigin({ metodo_pagamento: "pix", payment_origin: "manual" }),
    "manual",
    "Manual PIX origin"
  );
});

Deno.test("Stripe evidence classifies the individual payment as Stripe", () => {
  assertEquals(
    resolvePaymentOrigin({
      metodo_pagamento: "card",
      stripe_invoice_id: "in_123",
    }),
    "stripe",
    "Stripe invoice origin"
  );
  assertEquals(
    resolvePaymentOrigin({ metodo_pagamento: "stripe_pix" }),
    "stripe",
    "Stripe method origin"
  );
});

Deno.test("external payment methods have clear labels", () => {
  assertEquals(formatPaymentMethodLabel("cartao_externo"), "Cartão fora da Stripe", "External card");
  assertEquals(formatPaymentMethodLabel("boleto_externo"), "Boleto fora da Stripe", "External boleto");
  assertEquals(formatPaymentMethodLabel("nao_informado"), "Não informado", "Unknown legacy method");
});

Deno.test("legacy card and boleto values map to editable external methods", () => {
  assertEquals(normalizeManualPaymentMethod("cartao"), "cartao_externo", "Legacy card");
  assertEquals(normalizeManualPaymentMethod("boleto"), "boleto_externo", "Legacy boleto");
  assertEquals(normalizeManualPaymentMethod(null), null, "Missing method requires selection");
});

Deno.test("manual payment keeps the full amount without Stripe or platform fees", () => {
  const result = calculateNetAfterFees({
    grossValue: 450,
    platformFeePercent: 0,
    stripeMethod: "none",
    stripeFeeConfig: DEFAULT_STRIPE_PROCESSING_FEES,
  });

  assertEquals(result.platformFee, 0, "Platform fee");
  assertEquals(result.stripeFee.amount, 0, "Stripe processing fee");
  assertEquals(result.netAfterFees, 450, "Net manual receipt");
});
