import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";
import { z } from "npm:zod@3";

const Body = z.object({
  studentId: z.string().uuid(),
  plano: z.enum(["mensal", "trimestral", "semestral", "anual"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const personalId = claims.claims.sub as string;

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { studentId, plano } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // valida vínculo personal-aluno
    const { data: aluno } = await admin
      .from("profiles")
      .select("id, nome, personal_id")
      .eq("id", studentId)
      .maybeSingle();
    if (!aluno || aluno.personal_id !== personalId) {
      return new Response(JSON.stringify({ error: "Aluno não pertence ao personal" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: price } = await admin
      .from("personal_plan_prices")
      .select("stripe_price_id, ativo")
      .eq("personal_id", personalId)
      .eq("plano", plano)
      .maybeSingle();
    if (!price?.stripe_price_id || !price.ativo) {
      return new Response(JSON.stringify({ error: "Preço não configurado para esse plano" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.stripe_price_id, quantity: 1 }],
      metadata: { student_id: studentId, personal_id: personalId, plano },
      after_completion: { type: "hosted_confirmation" },
    });

    return new Response(JSON.stringify({ url: link.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[stripe-payment-link]", e);
    return new Response(JSON.stringify({ error: e.message ?? "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
