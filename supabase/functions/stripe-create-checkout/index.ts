import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Plano = 'mensal' | 'trimestral' | 'semestral' | 'anual'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = claimsData.claims.sub as string
    const userEmail = claimsData.claims.email as string | undefined

    const body = await req.json()
    const plano = body?.plano as Plano
    const successUrl = body?.success_url as string | undefined
    const cancelUrl = body?.cancel_url as string | undefined

    if (!['mensal', 'trimestral', 'semestral', 'anual'].includes(plano)) {
      return new Response(JSON.stringify({ error: 'invalid plano' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Get student profile + personal_id
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, nome, email, personal_id')
      .eq('id', userId)
      .single()

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!profile.personal_id) {
      return new Response(JSON.stringify({ error: 'no personal linked' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the price for this personal/plano
    const { data: priceRow, error: priceErr } = await admin
      .from('personal_plan_prices')
      .select('*')
      .eq('personal_id', profile.personal_id)
      .eq('plano', plano)
      .eq('ativo', true)
      .maybeSingle()

    if (priceErr || !priceRow?.stripe_price_id) {
      return new Response(JSON.stringify({ error: 'price not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-12-18.acacia' as any,
    })

    const origin = req.headers.get('origin') || req.headers.get('referer') || ''

    // Reuse customer if subscription exists
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('student_id', userId)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceRow.stripe_price_id, quantity: 1 }],
      ...(existingSub?.stripe_customer_id
        ? { customer: existingSub.stripe_customer_id }
        : { customer_email: userEmail || profile.email || undefined }),
      success_url: successUrl || `${origin}/aluno/perfil?checkout=success`,
      cancel_url: cancelUrl || `${origin}/aluno/perfil?checkout=cancel`,
      metadata: {
        student_id: userId,
        personal_id: profile.personal_id,
        plano,
      },
      subscription_data: {
        metadata: {
          student_id: userId,
          personal_id: profile.personal_id,
          plano,
        },
      },
    })

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('stripe-create-checkout error:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
