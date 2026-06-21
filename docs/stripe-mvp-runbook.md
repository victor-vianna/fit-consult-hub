# Stripe MVP Runbook

Este roteiro define o fluxo de pagamento e acesso do MVP:

1. O personal configura Stripe Connect e planos em `/financeiro`.
2. O personal copia a pagina publica em `/personal > Personalizar`.
3. O aluno acessa `/p/:slug`, cria conta vinculada ao personal e escolhe um plano.
4. O checkout e criado por `stripe-create-checkout`.
5. O webhook `stripe-webhook` grava/atualiza a assinatura.
6. `pode_acessar_plataforma` libera ou bloqueia o acesso conforme pagamento ativo.

## Decisao De Integracao

Na tela da Stripe "Como voce deseja aceitar pagamentos?", escolha:

**Formulario de checkout pre-integrado**

Nao use Payment Links como fluxo principal. O projeto precisa de assinatura, metadata, webhook e vinculo aluno-personal. O Checkout Session cobre isso com menos manutencao.

Use `Componentes integrados` somente no futuro, quando a conversao justificar uma experiencia de pagamento totalmente customizada.

## Configuracao Local

O `.env` do Vite deve conter somente chaves publicas:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
```

Nunca coloque `STRIPE_SECRET_KEY`, webhook secret ou service role no frontend.

## Secrets Das Edge Functions

Configure os secrets no Supabase:

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
npx supabase secrets set STRIPE_APPLICATION_FEE_PERCENT=0
npx supabase secrets set STRIPE_CONNECT_ACCOUNT_TYPE=standard
npx supabase secrets set APP_URL=https://seu-dominio.com
```

Para o MVP com 1 personal, `standard` e o caminho mais simples. Troque para `express` somente se quiser controlar mais a experiencia de repasse e aceitar mais responsabilidade operacional sobre contas conectadas.

`STRIPE_APPLICATION_FEE_PERCENT=0` no inicio reduz variaveis enquanto voce valida. Depois use, por exemplo, `5` ou `10`.

## Aplicar Banco E Functions

```bash
npx supabase db push
npx supabase functions deploy stripe-connect-account
npx supabase functions deploy stripe-create-prices
npx supabase functions deploy stripe-create-checkout
npx supabase functions deploy stripe-webhook
npx supabase functions deploy stripe-customer-portal
npx supabase functions deploy stripe-cancel-subscription
```

## Configurar Stripe Dashboard

1. Ative o modo teste.
2. Complete o perfil da plataforma no Connect.
3. Configure a marca da plataforma em Branding.
4. Ative Customer Portal em Billing > Customer portal.
5. No Customer Portal, permita:
   - atualizar metodo de pagamento;
   - ver faturas;
   - cancelar assinatura ao fim do ciclo.
6. Em Payment methods, ative cartao e os meios que fizerem sentido para BRL.
7. Crie um webhook endpoint para:

```text
https://<project-ref>.functions.supabase.co/stripe-webhook
```

Eventos da conta da plataforma:

```text
checkout.session.completed
invoice.paid
invoice.payment_failed
customer.subscription.updated
customer.subscription.deleted
```

Eventos Connect/contas conectadas:

```text
account.updated
checkout.session.completed
invoice.paid
invoice.payment_failed
customer.subscription.updated
customer.subscription.deleted
```

Se a Stripe gerar secrets separados para endpoint normal e Connect, grave ambos em `STRIPE_WEBHOOK_SECRET` e `STRIPE_CONNECT_WEBHOOK_SECRET`.

## Configurar O Personal

1. Admin cria o personal.
2. Personal entra em `/auth`.
3. Personal acessa `/financeiro`.
4. Clica em `Conectar Stripe`.
5. Completa onboarding da Stripe.
6. Volta para `/financeiro` e confirma status `Pronto para receber`.
7. Define valores em `Precos dos Planos`.
8. Clica em `Salvar e sincronizar`.
9. Ativa `Controle de acesso por pagamento`.
10. Vai em `/personal > Personalizar`.
11. Confere `Pagina publica de venda`.
12. Copia o link `/p/:slug`.

## Fluxo Do Aluno

1. Aluno abre o link `/p/:slug`.
2. Escolhe um plano.
3. Cria conta em `/auth?personal=:slug&plan=:plano`.
4. O cadastro grava `personal_id` no profile.
5. Aluno vai para `/aluno?tab=plano`.
6. Ao assinar, `stripe-create-checkout` cria uma assinatura no Stripe conectado do personal.
7. O webhook grava `subscriptions`.
8. O acesso e liberado pelo banco.

Regra importante: nunca libere acesso apenas pelo `success_url` da Stripe. O retorno visual pode acontecer antes do webhook. A fonte de verdade e a tabela `subscriptions`.

## Testes Obrigatorios

Teste tudo em modo `test` antes de usar live:

1. Personal sem Stripe conectado nao deve conseguir vender.
2. Personal conectado, mas sem `charges_enabled/payouts_enabled`, deve ver bloqueio.
3. Plano salvo deve criar `stripe_product_id` e `stripe_price_id`.
4. Aluno novo via `/p/:slug` deve nascer com `personal_id`.
5. Checkout pago deve criar assinatura com `status_pagamento = pago`.
6. Aluno sem pagamento ativo deve cair em `/acesso-suspenso` com planos.
7. `invoice.payment_failed` deve marcar assinatura como atrasada.
8. Cancelamento no portal deve marcar `cancela_no_fim_do_ciclo`.
9. Webhook duplicado nao deve duplicar pagamento, por causa de `stripe_webhook_events`.

## Go-Live

Antes de modo producao:

1. Troque `sk_test` por `sk_live` nos Supabase secrets.
2. Troque `VITE_STRIPE_PUBLISHABLE_KEY` para `pk_live`.
3. Crie webhooks live e atualize `whsec`.
4. Confirme `APP_URL` com HTTPS real.
5. Complete verificacao da sua plataforma na Stripe.
6. Faca uma compra real pequena.
7. Confira `subscriptions`, `payment_history` e Customer Portal.

## Manutencao E Escala

Para manter simples:

1. Nao permita cadastro publico de personal ainda.
2. Use `/p/:slug` como origem principal de alunos.
3. Mantenha webhooks idempotentes.
4. Nao edite assinatura direto no banco, exceto ajustes administrativos controlados.
5. Quando escalar, crie uma tela admin para ver:
   - status Connect de cada personal;
   - webhooks falhos;
   - assinaturas vencidas;
   - alunos sem `personal_id`;
   - planos sem `stripe_price_id`.

## Referencias

- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Stripe Connect: https://docs.stripe.com/connect
- Stripe Webhooks: https://docs.stripe.com/webhooks
- Stripe Customer Portal: https://docs.stripe.com/customer-management
