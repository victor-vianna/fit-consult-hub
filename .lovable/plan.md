# Onda C — Cancelamento, Portal Stripe, Link WhatsApp e Toggle de Acesso por Pagamento

## 1. Edge functions
- **`stripe-customer-portal`**: cria sessão do Customer Portal Stripe a partir do `stripe_customer_id` do aluno (lê de `subscriptions`). Retorna `url` para redirecionar.
- **`stripe-cancel-subscription`**: marca `cancel_at_period_end=true` na subscription Stripe e atualiza `subscriptions.cancela_no_fim_do_ciclo=true`.
- **`stripe-payment-link`**: gera um Payment Link Stripe (one-off ou checkout reutilizável) para um `stripe_price_id` específico de um aluno; retorna a URL pronta para colar no WhatsApp.

## 2. Toggle "Controlar acesso por pagamento"
Nova flag em duas camadas:

### Aluno (controlado pelo Personal)
- Coluna `controle_acesso_por_pagamento` (boolean, default false) em `personal_settings` — quando ON, **todos os alunos** desse personal só acessam se tiverem `subscriptions` com `status_pagamento='pago'` e `data_expiracao > now()`.
- Override por aluno: nova coluna `controle_acesso_por_pagamento` em `profiles` (nullable boolean) — se setada, sobrepõe a regra do personal.

### Personal (controlado pelo Admin)
- Nova tabela `admin_settings` (singleton row) com `controle_acesso_personal_por_pagamento` (boolean). Quando ON, personals só acessam a plataforma se tiverem `assinaturas` com `status='ativo'`.

### Função SQL
- `pode_acessar_plataforma(_user_id uuid) returns boolean` — security definer, encapsula a lógica:
  - Admin: sempre true
  - Personal: se admin ativou a flag, exige assinatura ativa em `assinaturas`
  - Aluno: se override aluno setado usa ele, senão usa a flag do personal; se ON exige `subscriptions` paga e não vencida

## 3. UI

### Personal — Financeiro
- Switch "Bloquear alunos sem pagamento ativo" no `PersonalPlanPricingForm` (ou em card próprio) → grava em `personal_settings.controle_acesso_por_pagamento`.

### Aluno individual — `AccessControlPanel`
- Switch adicional "Controle automático por pagamento" → grava override em `profiles.controle_acesso_por_pagamento`. Mostra status calculado (pago/vencido) ao lado.

### Admin — Configurações
- Switch "Bloquear personals sem assinatura ativa" → grava em `admin_settings`.

### Aluno — `StudentSubscriptionView`
- Card de assinatura ativa ganha botões:
  - "Gerenciar pagamento" → chama `stripe-customer-portal`
  - "Cancelar assinatura" → confirm dialog → chama `stripe-cancel-subscription`
- Mostra badge "Será cancelada em {data}" quando `cancela_no_fim_do_ciclo=true`.

### Personal — Detalhes do Aluno
- Botão "Gerar link de pagamento (WhatsApp)" no card de assinatura → modal escolhe plano → chama `stripe-payment-link` → copia URL ou abre WhatsApp com mensagem pré-preenchida.

## 4. AuthGuard
Substituir o check atual de `is_active` por chamada a `pode_acessar_plataforma()` via RPC. Mantém redirect para `/acesso-suspenso`, com mensagem específica quando bloqueio é por pagamento ("Regularize sua assinatura para acessar").

## 5. Fluxo de teste
1. Personal liga toggle → alunos sem subscription paga são redirecionados a `/acesso-suspenso` com CTA para planos
2. Aluno paga via checkout → webhook atualiza → acesso liberado
3. Aluno cancela no portal → mantém acesso até `data_expiracao`, depois bloqueia
4. Admin liga toggle → personals sem `assinaturas` ativa caem na tela de bloqueio

## Detalhes técnicos
- Migration cria: `admin_settings`, colunas `controle_acesso_por_pagamento` em `personal_settings` e `profiles`, função `pode_acessar_plataforma`.
- RLS de `admin_settings`: SELECT para todos autenticados, UPDATE/INSERT só admin.
- Edge functions usam `STRIPE_SECRET_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (já configurados).
- Hook novo `usePlatformAccess()` consome o RPC e centraliza no AuthGuard.