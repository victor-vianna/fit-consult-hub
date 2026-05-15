# Integração de Pagamentos — Assinaturas Recorrentes

## Visão geral

Cada personal conecta sua própria conta Stripe (modelo **Stripe Connect Express**) e recebe os pagamentos dos seus alunos diretamente. A plataforma intermedia o checkout, mas o dinheiro vai direto para a conta bancária do personal — você não fica como custodiante.

Os preços dos 4 planos (mensal/trimestral/semestral/anual) são definidos por cada personal. O aluno pode pagar de duas formas: auto-checkout dentro da área do aluno OU via link de cobrança gerado pelo personal. A cobrança é **recorrente automática** (Stripe Subscriptions) — o cartão é cobrado no vencimento sem ação do aluno.

## Por que Stripe (e não a integração nativa Lovable Payments)

A integração built-in do Lovable (`enable_stripe_payments`) é single-tenant: todo o dinheiro entra numa única conta. Como você precisa de **multi-tenant** (cada personal recebe direto), precisamos da integração **bring-your-own-key + Stripe Connect**, que é mais flexível.

Custo Stripe Brasil: ~3,99% + R$ 0,39 por transação aprovada no cartão. Você (plataforma) pode opcionalmente cobrar uma `application_fee` (taxa de uso da plataforma) em cima de cada cobrança — ex.: 1-3%.

## Fluxo do personal (onboarding)

```
Painel Personal → aba "Pagamentos"
  → "Conectar conta Stripe" (botão)
  → redireciona para onboarding Stripe Connect Express
     (Stripe coleta CPF/CNPJ, dados bancários, KYC)
  → volta para o app com conta conectada
  → cadastra preços dos 4 planos (mensal/trim/sem/anual em R$)
```

## Fluxo do aluno (auto-checkout)

```
Área do Aluno → aba "Meu Plano"
  → vê os 4 planos do seu personal com preços
  → clica "Assinar Plano Mensal"
  → redireciona para Stripe Checkout (cartão)
  → após pagamento, webhook atualiza subscriptions + payment_history
  → volta para app com plano ativo
  → renovação automática a cada ciclo (Stripe cobra sozinho)
  → aluno pode cancelar pelo app (cancela no Stripe via API)
```

## Fluxo do personal (link de cobrança)

```
Painel Personal → ficha do aluno → "Cobrar"
  → escolhe plano (mensal/trim/sem/anual)
  → gera link Stripe Checkout
  → envia por WhatsApp (botão integrado)
```

## Mudanças no banco

**Nova tabela `personal_stripe_accounts`:**
- `personal_id` (PK), `stripe_account_id`, `onboarding_completed`, `charges_enabled`, `payouts_enabled`
- RLS: personal só vê/edita o próprio registro

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
| `stripe-connect-onboard` | Cria conta Connect Express e devolve URL de onboarding |
| `stripe-connect-status` | Verifica se a conta do personal já está apta a receber |
| `stripe-create-prices` | Cria/atualiza Products + Prices no Stripe quando personal salva valores |
| `stripe-create-checkout` | Cria Checkout Session (modo subscription) com `application_fee_percent` e `transfer_data.destination` para o personal |
| `stripe-cancel-subscription` | Cancela assinatura ativa (no fim do ciclo ou imediato) |
| `stripe-portal` | Abre portal Stripe para o aluno gerenciar cartão/cancelar |
| `stripe-webhook` | Recebe eventos: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` — atualiza `subscriptions` e `payment_history` |

## Mudanças no frontend

**Novos componentes:**
- `PersonalStripeOnboardingCard.tsx` — botão conectar/status no painel do personal
- `PersonalPlanPricingForm.tsx` — formulário dos 4 valores
- `AlunoCheckoutPlanos.tsx` — aba "Meu Plano" com os 4 cards de preço
- `GerarLinkCobrancaDialog.tsx` — personal gera link e envia por WhatsApp

**Atualizar:**
- `StudentSubscriptionView.tsx` — mostrar próxima cobrança, botão cancelar, botão "gerenciar cartão" (Stripe Portal)
- `useSubscriptions.ts` — funções `iniciarCheckout()`, `cancelarAssinatura()`, `abrirPortal()`

**Reaproveitar:** `subscriptions` e `payment_history` continuam sendo a fonte de verdade — o webhook só preenche os dados.

## Secrets necessários

- `STRIPE_SECRET_KEY` — chave secreta da plataforma (sua conta Stripe principal, modo live ou test)
- `STRIPE_WEBHOOK_SECRET` — para validar assinatura dos webhooks
- `STRIPE_CONNECT_CLIENT_ID` — para Stripe Connect

Você precisará criar/usar uma conta Stripe da plataforma e me passar essas chaves quando chegarmos nessa etapa.

## Ordem de implementação (em ondas)

1. **Onda A — Schema + Onboarding**: tabelas, edge functions de onboarding/status, UI do personal para conectar conta
2. **Onda B — Preços + Checkout**: cadastro de preços, criação de Products/Prices no Stripe, checkout do aluno, webhook
3. **Onda C — Gestão**: cancelamento, portal Stripe, link de cobrança via WhatsApp, notificações de pagamento (sucesso/falha)

## Pontos de atenção

- **PIX**: Stripe Brasil ainda tem suporte limitado a PIX recorrente. Para começar, suportamos cartão. PIX avulso pode ser adicionado depois.
- **Modo teste**: tudo será desenvolvido em sandbox Stripe primeiro. Cartões de teste funcionam sem dinheiro real.
- **Bloqueio por inadimplência**: já existe lógica de retenção 7 dias (`access-control-and-retention-logic`) — vamos integrá-la com `invoice.payment_failed` para bloquear acesso automaticamente.
- **Compatibilidade**: o registro manual de pagamento (atual) continua funcionando para personals que ainda não conectaram Stripe.

## O que NÃO está incluído (escopo futuro)

- Split de pagamento entre múltiplos destinatários
- Cupons de desconto
- Trial gratuito automatizado
- Boleto bancário
- Invoicing (cobrança avulsa fora dos 4 planos)
