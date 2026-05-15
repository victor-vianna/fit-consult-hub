import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

type Plano = 'mensal' | 'trimestral' | 'semestral' | 'anual'

function calcExpiracao(plano: Plano, from: Date): Date {
  const d = new Date(from)
  switch (plano) {
    case 'mensal': d.setMonth(d.getMonth() + 1); break
    case 'trimestral': d.setMonth(d.getMonth() + 3); break
    case 'semestral': d.setMonth(d.getMonth() + 6); break
    case 'anual': d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-12-18.acacia' as any,
  })
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('missing signature', { status: 400 })

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
  } catch (err: any) {
    console.error('webhook signature error:', err.message)
    return new Response(`signature error: ${err.message}`, { status: 400 })
  }

  console.log('stripe event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const studentId = s.metadata?.student_id
        const personalId = s.metadata?.personal_id
        const plano = s.metadata?.plano as Plano | undefined
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id

        if (!studentId || !personalId || !plano || !subId) break

        const sub = await stripe.subscriptions.retrieve(subId)
        const currentEnd = (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000)
          : calcExpiracao(plano, new Date())
        const valor = (sub.items.data[0]?.price.unit_amount ?? 0) / 100

        // Upsert subscription by stripe_subscription_id
        const { data: existing } = await admin
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()

        if (existing) {
          await admin.from('subscriptions').update({
            status_pagamento: 'pago',
            data_pagamento: new Date().toISOString(),
            data_expiracao: currentEnd.toISOString(),
            stripe_customer_id: customerId,
            cancela_no_fim_do_ciclo: false,
            cancelado_em: null,
          }).eq('id', existing.id)
        } else {
          await admin.from('subscriptions').insert({
            student_id: studentId,
            personal_id: personalId,
            plano,
            valor,
            status_pagamento: 'pago',
            data_pagamento: new Date().toISOString(),
            data_expiracao: currentEnd.toISOString(),
            stripe_subscription_id: subId,
            stripe_customer_id: customerId,
          })
        }
        break
      }

      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice
        const subId = typeof (inv as any).subscription === 'string'
          ? (inv as any).subscription
          : (inv as any).subscription?.id
        if (!subId) break

        const { data: row } = await admin
          .from('subscriptions')
          .select('id, student_id, personal_id, plano')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()
        if (!row) break

        const sub = await stripe.subscriptions.retrieve(subId)
        const currentEnd = (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000)
          : calcExpiracao(row.plano as Plano, new Date())
        const valor = (inv.amount_paid ?? 0) / 100

        await admin.from('subscriptions').update({
          status_pagamento: 'pago',
          data_pagamento: new Date().toISOString(),
          data_expiracao: currentEnd.toISOString(),
        }).eq('id', row.id)

        await admin.from('payment_history').insert({
          subscription_id: row.id,
          student_id: row.student_id,
          personal_id: row.personal_id,
          valor,
          data_pagamento: new Date().toISOString(),
          metodo_pagamento: 'stripe',
          stripe_invoice_id: inv.id,
          stripe_payment_intent_id: typeof (inv as any).payment_intent === 'string'
            ? (inv as any).payment_intent : null,
          observacoes: 'Pagamento via Stripe',
        })
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const subId = typeof (inv as any).subscription === 'string'
          ? (inv as any).subscription
          : (inv as any).subscription?.id
        if (!subId) break
        await admin.from('subscriptions')
          .update({ status_pagamento: 'atrasado' })
          .eq('stripe_subscription_id', subId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const updates: any = {
          cancela_no_fim_do_ciclo: !!sub.cancel_at_period_end,
        }
        if ((sub as any).current_period_end) {
          updates.data_expiracao = new Date((sub as any).current_period_end * 1000).toISOString()
        }
        if (sub.status === 'canceled') {
          updates.cancelado_em = new Date().toISOString()
        }
        await admin.from('subscriptions')
          .update(updates)
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await admin.from('subscriptions').update({
          cancelado_em: new Date().toISOString(),
          status_pagamento: 'atrasado',
        }).eq('stripe_subscription_id', sub.id)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('webhook handler error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
