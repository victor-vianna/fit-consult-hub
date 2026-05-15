import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Plano = 'mensal' | 'trimestral' | 'semestral' | 'anual'

const INTERVAL_MAP: Record<Plano, { interval: 'month' | 'year'; interval_count: number }> = {
  mensal: { interval: 'month', interval_count: 1 },
  trimestral: { interval: 'month', interval_count: 3 },
  semestral: { interval: 'month', interval_count: 6 },
  anual: { interval: 'year', interval_count: 1 },
}

const LABELS: Record<Plano, string> = {
  mensal: 'Plano Mensal',
  trimestral: 'Plano Trimestral',
  semestral: 'Plano Semestral',
  anual: 'Plano Anual',
}

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

    const body = await req.json()
    const prices = body?.prices as Array<{ plano: Plano; valor: number; ativo?: boolean }>

    if (!Array.isArray(prices) || prices.length === 0) {
      return new Response(JSON.stringify({ error: 'prices required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    for (const p of prices) {
      if (!INTERVAL_MAP[p.plano] || typeof p.valor !== 'number' || p.valor < 0) {
        return new Response(JSON.stringify({ error: 'invalid price entry' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-12-18.acacia' as any })
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: profile } = await admin
      .from('profiles').select('nome').eq('id', userId).single()
    const personalNome = profile?.nome || 'Personal'

    const { data: existing } = await admin
      .from('personal_plan_prices')
      .select('*')
      .eq('personal_id', userId)

    const existingMap = new Map((existing ?? []).map((r: any) => [r.plano, r]))
    const results: any[] = []

    for (const entry of prices) {
      const prev: any = existingMap.get(entry.plano)
      const valorCentavos = Math.round(entry.valor * 100)
      const ativo = entry.ativo ?? true

      let productId: string | null = prev?.stripe_product_id ?? null
      if (!productId) {
        const product = await stripe.products.create({
          name: `${LABELS[entry.plano]} — ${personalNome}`,
          metadata: { personal_id: userId, plano: entry.plano },
        })
        productId = product.id
      } else {
        await stripe.products.update(productId, {
          name: `${LABELS[entry.plano]} — ${personalNome}`,
          active: ativo,
        }).catch(() => {})
      }

      let priceId: string | null = prev?.stripe_price_id ?? null
      const valorMudou = !prev || Number(prev.valor) !== entry.valor

      if (valorMudou) {
        if (priceId) {
          await stripe.prices.update(priceId, { active: false }).catch(() => {})
        }
        const newPrice = await stripe.prices.create({
          product: productId!,
          unit_amount: valorCentavos,
          currency: 'brl',
          recurring: INTERVAL_MAP[entry.plano],
          metadata: { personal_id: userId, plano: entry.plano },
        })
        priceId = newPrice.id
      } else if (priceId) {
        await stripe.prices.update(priceId, { active: ativo }).catch(() => {})
      }

      const { data: upserted, error: upErr } = await admin
        .from('personal_plan_prices')
        .upsert({
          personal_id: userId,
          plano: entry.plano,
          valor: entry.valor,
          stripe_product_id: productId,
          stripe_price_id: priceId,
          ativo,
        }, { onConflict: 'personal_id,plano' })
        .select()
        .single()

      if (upErr) throw upErr
      results.push(upserted)
    }

    return new Response(JSON.stringify({ success: true, prices: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('stripe-create-prices error:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
