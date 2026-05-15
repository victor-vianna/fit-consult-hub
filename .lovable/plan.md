# Integração de Pagamentos — Assinaturas Recorrentes (Billing Centralizado)

## Visão geral

Arquitetura **centralizada**: todos os pagamentos dos alunos são processados pela **conta Stripe da plataforma**. Não usamos Stripe Connect — não há contas conectadas por personal.

Cada personal define os preços dos 4 planos (mensal/trimestral/semestral/anual). O aluno paga via Stripe Checkout (cartão), e a cobrança é **recorrente automática** (Stripe Subscriptions). O repasse para o personal acontece fora do Stripe (controle interno via dashboard financeiro / pagamento manual periódico).

## Fluxo do personal

```
Painel Personal → aba "Pagamentos"
  → cadastra preços dos 4 planos (mensal/trim/sem/anual em R$)
  → (opcional) gera link de cobrança para enviar ao aluno via WhatsApp
  → acompanha assinaturas ativas, MRR e histórico de pagamentos
```

## Fluxo do aluno

```
Área do Aluno → aba "Meu Plano"
  → vê os 4 planos do seu personal com preços
  → clica "Assinar Plano X"
  → redireciona para Stripe Checkout (cartão)
  → após pagamento, webhook atualiza subscriptions + payment_history
  → renovação automática a cada ciclo
  → aluno pode cancelar pelo app ou via Stripe Portal
```

## Mudanças no banco

**Nova tabela `personal_plan_prices`:**
- `personal_id`, `plano` (enum mensal/trim/sem/anual), `valor`, `stripe_price_id`, `stripe_product_id`, `ativo`
- Um registro por (personal, plano). RLS: personal gerencia os seus; aluno lê os do seu personal.

**Adicionar à `subscriptions`:**
- `stripe_subscription_id`, `stripe_customer_id`, `cancelado_em`, `cancela_no_fim_do_ciclo` (bool)

**Adicionar à `payment_history`:**
- `stripe_payment_intent_id`, `stripe_invoice_id`

## Edge Functions necessárias

| Função | O que faz |
|---|---|
| `stripe-create-prices` | Cria/atualiza Products + Prices na conta da plataforma quando o personal salva valores. Metadata inclui `personal_id` para rastrear destinatário. |
| `stripe-create-checkout` | Cria Checkout Session (modo subscription). Metadata: `personal_id`, `student_id`, `plano`. |
| `stripe-cancel-subscription` | Cancela assinatura ativa (no fim do ciclo ou imediato) |
| `stripe-portal` | Abre portal Stripe para o aluno gerenciar cartão/cancelar |
| `stripe-webhook` | Recebe `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` — atualiza `subscriptions` e `payment_history` usando metadata para identificar personal/aluno. |

## Mudanças no frontend

**Novos componentes:**
- `PersonalPlanPricingForm.tsx` — formulário dos 4 valores
- `AlunoCheckoutPlanos.tsx` — aba "Meu Plano" com os 4 cards de preço
- `GerarLinkCobrancaDialog.tsx` — personal gera link e envia por WhatsApp

**Atualizar:**
- `StudentSubscriptionView.tsx` — mostrar próxima cobrança, botão cancelar, botão "gerenciar cartão" (Stripe Portal)
- `useSubscriptions.ts` — funções `iniciarCheckout()`, `cancelarAssinatura()`, `abrirPortal()`

## Secrets necessários

- `STRIPE_SECRET_KEY` — chave secreta da conta Stripe da plataforma (sk_test_... ou sk_live_...)
- `STRIPE_WEBHOOK_SECRET` — para validar assinatura dos webhooks (whsec_...)
- `VITE_STRIPE_PUBLISHABLE_KEY` — chave publicável usada no frontend (pk_test_... ou pk_live_...)

## Ordem de implementação

1. **Onda A — Schema + Preços**: tabelas, edge function `stripe-create-prices`, UI do personal para cadastrar valores
2. **Onda B — Checkout + Webhook**: checkout do aluno, webhook recebendo eventos, atualização de subscriptions/payment_history
3. **Onda C — Gestão**: cancelamento, portal Stripe, link de cobrança via WhatsApp, notificações de pagamento

## Pontos de atenção

- **Repasse ao personal**: como o dinheiro entra na conta da plataforma, o repasse a cada personal fica fora do Stripe — controle via relatório financeiro interno (já existente) e transferência manual periódica.
- **PIX**: começamos com cartão. PIX recorrente Stripe BR é limitado.
- **Modo teste**: tudo em sandbox Stripe primeiro. Cartões de teste funcionam sem dinheiro real.
- **Bloqueio por inadimplência**: integrar `invoice.payment_failed` com a lógica de retenção 7 dias existente.
- **Compatibilidade**: registro manual de pagamento continua funcionando.

## O que NÃO está incluído (escopo futuro)

- Stripe Connect / split automático
- Cupons de desconto
- Trial gratuito automatizado
- Boleto bancário
- Invoicing avulso
