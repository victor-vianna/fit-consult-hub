import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "status" | "onboard" | "dashboard";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeRequirements(values?: string[] | null) {
  return Array.isArray(values) ? values : [];
}

function getConnectReturnOrigin(req: Request, body: any) {
  const requestOrigin = req.headers.get("origin") || body?.origin || "";
  const configuredOrigin = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || "";
  const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin);
  const origin = isLocalhost && configuredOrigin ? configuredOrigin : requestOrigin;
  return origin.replace(/\/$/, "");
}

async function syncAccount(
  admin: ReturnType<typeof createClient>,
  stripeAccount: Stripe.Account,
  personalId: string,
  accountType: string,
) {
  const cardPayments = stripeAccount.capabilities?.card_payments === "active";
  const transfers = stripeAccount.capabilities?.transfers === "active";

  const row = {
    personal_id: personalId,
    stripe_account_id: stripeAccount.id,
    account_type: accountType,
    country: stripeAccount.country ?? null,
    default_currency: stripeAccount.default_currency ?? null,
    charges_enabled: !!stripeAccount.charges_enabled,
    payouts_enabled: !!stripeAccount.payouts_enabled,
    details_submitted: !!stripeAccount.details_submitted,
    card_payments_active: cardPayments,
    transfers_active: transfers,
    requirements_currently_due: normalizeRequirements(stripeAccount.requirements?.currently_due),
    requirements_past_due: normalizeRequirements(stripeAccount.requirements?.past_due),
    disabled_reason: stripeAccount.requirements?.disabled_reason ?? null,
    last_synced_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("personal_stripe_accounts")
    .upsert(row, { onConflict: "personal_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
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

    const body = await req.json().catch(() => ({}));
    const action = (body?.action || "status") as Action;
    if (!["status", "onboard", "dashboard"].includes(action)) {
      return json({ error: "invalid action" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "personal")
      .maybeSingle();

    if (!role) return json({ error: "Apenas personal trainers podem configurar recebimentos" }, 403);

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, nome, email")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) return json({ error: "profile not found" }, 404);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia" as any,
    });

    const accountType = Deno.env.get("STRIPE_CONNECT_ACCOUNT_TYPE") || "standard";
    if (!["standard", "express"].includes(accountType)) {
      return json({ error: "STRIPE_CONNECT_ACCOUNT_TYPE deve ser standard ou express" }, 500);
    }

    const { data: existing } = await admin
      .from("personal_stripe_accounts")
      .select("*")
      .eq("personal_id", userId)
      .maybeSingle();

    let stripeAccountId = existing?.stripe_account_id as string | undefined;

    if (!stripeAccountId && action === "status") {
      return json({ connected: false, account: null });
    }

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: accountType as any,
        email: userEmail || profile.email || undefined,
        business_profile: {
          product_description: "Venda de consultoria fitness e acompanhamento online para alunos",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          personal_id: userId,
          platform: "fit-consult-hub",
        },
      });
      stripeAccountId = account.id;
      await syncAccount(admin, account, userId, accountType);
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    const synced = await syncAccount(admin, account, userId, accountType);

    if (action === "dashboard") {
      if (accountType === "express") {
        const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
        return json({ connected: true, account: synced, url: loginLink.url });
      }
      return json({
        connected: true,
        account: synced,
        url: "https://dashboard.stripe.com",
      });
    }

    if (action === "onboard") {
      const origin = getConnectReturnOrigin(req, body);
      if (!origin) return json({ error: "origin required" }, 400);

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/personal?section=financeiro&stripe_connect=refresh`,
        return_url: `${origin}/personal?section=financeiro&stripe_connect=return`,
        type: "account_onboarding",
      });

      return json({ connected: true, account: synced, url: accountLink.url });
    }

    return json({ connected: true, account: synced });
  } catch (err: any) {
    console.error("[stripe-connect-account]", err);
    return json({ error: err?.message || "Internal error" }, 500);
  }
});
