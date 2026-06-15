import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Plano = "mensal" | "trimestral" | "semestral" | "anual";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getApplicationFeePercent() {
  const raw = Deno.env.get("STRIPE_APPLICATION_FEE_PERCENT");
  if (!raw) throw new Error("STRIPE_APPLICATION_FEE_PERCENT nao configurado");
  const fee = Number(raw);
  if (!Number.isFinite(fee) || fee < 0 || fee >= 100) {
    throw new Error("STRIPE_APPLICATION_FEE_PERCENT deve ser maior/igual a 0 e menor que 100");
  }
  return Math.round(fee * 100) / 100;
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

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;

    const body = await req.json();
    const plano = body?.plano as Plano;
    const successUrl = body?.success_url as string | undefined;
    const cancelUrl = body?.cancel_url as string | undefined;

    if (!["mensal", "trimestral", "semestral", "anual"].includes(plano)) {
      return json({ error: "invalid plano" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, nome, email, personal_id")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) return json({ error: "profile not found" }, 404);
    if (!profile.personal_id) return json({ error: "no personal linked" }, 400);

    const { data: connectAccount, error: connectErr } = await admin
      .from("personal_stripe_accounts")
      .select("*")
      .eq("personal_id", profile.personal_id)
      .maybeSingle();

    if (connectErr || !connectAccount?.stripe_account_id) {
      return json({ error: "O personal ainda nao conectou uma conta Stripe para receber pagamentos." }, 400);
    }
    if (!connectAccount.charges_enabled || !connectAccount.payouts_enabled) {
      return json({
        error: "A conta Stripe do personal ainda nao esta liberada para cobrar e receber repasses.",
        requirements_currently_due: connectAccount.requirements_currently_due ?? [],
        disabled_reason: connectAccount.disabled_reason ?? null,
      }, 400);
    }

    const stripeAccountId = connectAccount.stripe_account_id as string;

    const { data: priceRow, error: priceErr } = await admin
      .from("personal_plan_prices")
      .select("*")
      .eq("personal_id", profile.personal_id)
      .eq("plano", plano)
      .eq("ativo", true)
      .maybeSingle();

    if (
      priceErr ||
      !priceRow?.stripe_price_id ||
      priceRow.stripe_account_id !== stripeAccountId
    ) {
      return json({
        error: "Plano nao sincronizado com a conta Stripe conectada do personal.",
      }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia" as any,
    });
    const applicationFeePercent = getApplicationFeePercent();
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";

    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("student_id", userId)
      .eq("stripe_account_id", stripeAccountId)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceRow.stripe_price_id, quantity: 1 }],
      ...(existingSub?.stripe_customer_id
        ? { customer: existingSub.stripe_customer_id }
        : { customer_email: userEmail || profile.email || undefined }),
      success_url: successUrl || `${origin}/aluno/perfil?checkout=success`,
      cancel_url: cancelUrl || `${origin}/aluno/perfil?checkout=cancel`,
      client_reference_id: userId,
      metadata: {
        student_id: userId,
        personal_id: profile.personal_id,
        plano,
        price_row_id: priceRow.id,
        stripe_account_id: stripeAccountId,
      },
      subscription_data: {
        application_fee_percent: applicationFeePercent,
        metadata: {
          student_id: userId,
          personal_id: profile.personal_id,
          plano,
          price_row_id: priceRow.id,
          stripe_account_id: stripeAccountId,
        },
      },
    }, { stripeAccount: stripeAccountId });

    return json({ url: session.url, id: session.id });
  } catch (err: any) {
    console.error("stripe-create-checkout error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
