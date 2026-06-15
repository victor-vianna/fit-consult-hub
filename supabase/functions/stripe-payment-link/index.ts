import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { z } from "npm:zod@3";

const Body = z.object({
  studentId: z.string().uuid(),
  plano: z.enum(["mensal", "trimestral", "semestral", "anual"]),
});

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
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const personalId = claims.claims.sub as string;

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { studentId, plano } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: aluno } = await admin
      .from("profiles")
      .select("id, nome, email, personal_id")
      .eq("id", studentId)
      .maybeSingle();
    if (!aluno || aluno.personal_id !== personalId) {
      return json({ error: "Aluno nao pertence ao personal" }, 403);
    }

    const { data: connectAccount, error: connectErr } = await admin
      .from("personal_stripe_accounts")
      .select("*")
      .eq("personal_id", personalId)
      .maybeSingle();

    if (connectErr || !connectAccount?.stripe_account_id) {
      return json({ error: "Conecte sua conta Stripe antes de gerar links de pagamento." }, 400);
    }
    if (!connectAccount.charges_enabled || !connectAccount.payouts_enabled) {
      return json({ error: "A conta Stripe ainda nao esta liberada para cobrar e receber repasses." }, 400);
    }

    const stripeAccountId = connectAccount.stripe_account_id as string;

    const { data: price } = await admin
      .from("personal_plan_prices")
      .select("id, stripe_price_id, stripe_account_id, ativo")
      .eq("personal_id", personalId)
      .eq("plano", plano)
      .maybeSingle();
    if (!price?.stripe_price_id || !price.ativo || price.stripe_account_id !== stripeAccountId) {
      return json({ error: "Plano nao sincronizado com a conta Stripe conectada." }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia" as any,
    });
    const applicationFeePercent = getApplicationFeePercent();
    const origin = req.headers.get("origin") || "";

    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("student_id", studentId)
      .eq("stripe_account_id", stripeAccountId)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.stripe_price_id, quantity: 1 }],
      ...(existingSub?.stripe_customer_id
        ? { customer: existingSub.stripe_customer_id }
        : { customer_email: aluno.email || undefined }),
      success_url: `${origin}/aluno/perfil?checkout=success`,
      cancel_url: `${origin}/aluno/perfil?checkout=cancel`,
      client_reference_id: studentId,
      metadata: {
        student_id: studentId,
        personal_id: personalId,
        plano,
        price_row_id: price.id,
        stripe_account_id: stripeAccountId,
      },
      subscription_data: {
        application_fee_percent: applicationFeePercent,
        metadata: {
          student_id: studentId,
          personal_id: personalId,
          plano,
          price_row_id: price.id,
          stripe_account_id: stripeAccountId,
        },
      },
    }, { stripeAccount: stripeAccountId });

    return json({ url: session.url });
  } catch (e: any) {
    console.error("[stripe-payment-link]", e);
    return json({ error: e.message ?? "Erro" }, 500);
  }
});
