# Plano: Otimizar e Modernizar o Painel Admin

## Diagnóstico atual

- **Mobile quebrado**: `AdminSidebar` é fixo (`w-64`/`w-20`), sem drawer/off-canvas. No mobile ocupa metade da tela.
- **Sem rotas**: navegação por `useState` — não dá para compartilhar link, voltar pelo browser, nem abrir aba.
- **Performance**: `DashboardOverview` faz **7+ queries em série** (incluindo loop de 6 meses para churn = 12 queries sequenciais). Carrega sempre tudo, sem cache.
- **Cores hardcoded** violando design system: `bg-green-100`, `text-blue-700`, `border-orange-200`, etc. em todas as 10 seções → quebra dark mode e identidade visual.
- **Sem KPIs visuais**: gráficos de churn estão como cards numéricos, não como gráfico de linha/área.
- **Header redundante**: logo "FitConsult Admin" no header + "Admin Panel" na sidebar.
- **Sem busca global**, sem atalhos, sem ações rápidas no dashboard.
- **Layout das seções pesado**: cards com `border-2` em tudo, hierarquia visual fraca.

## Escopo desta rodada

### 1. Arquitetura de navegação
- Migrar para **rotas reais**: `/admin`, `/admin/usuarios`, `/admin/personals`, etc. usando `react-router` (já no projeto).
- Substituir `AdminSidebar` por **shadcn `Sidebar`** com `SidebarProvider` + `collapsible="icon"`.
- Mobile: sidebar vira **off-canvas drawer** (comportamento nativo do shadcn sidebar). `SidebarTrigger` no header sempre visível.

### 2. Header enxuto e mobile-friendly
- Remover duplicação (sidebar tem branding; header tem ações).
- Header: `SidebarTrigger` + título da seção atual + busca global (cmd+k) + ThemeToggle + avatar/menu (perfil, sair).
- Em mobile: título compacto, ações em menu de overflow.

### 3. Dashboard (DashboardOverview) — reescrita
- **Paralelizar queries** com `Promise.all` (de ~12 sequenciais → 2 etapas paralelas).
- Substituir loop de churn por chamada única à RPC `calcular_churn_mensal` (já existe) em paralelo para 6 meses.
- Usar **`@tanstack/react-query`** para cache + revalidação (já instalado).
- KPIs em **4 cards limpos** usando tokens semânticos (`bg-card`, `text-primary`, `text-muted-foreground`) — fim do `bg-green-100`.
- Adicionar **gráfico de churn** (recharts, já instalado) — área chart 6 meses.
- Adicionar **gráfico de receita** (linha) últimos 6 meses.
- Seção "Ações rápidas": criar personal, ver pendências de pagamento, enviar notificação.
- Skeleton loaders no lugar do spinner.

### 4. Design system consistente em todas as seções
- Remover **todas** as classes `bg-{cor}-{n}`, `text-{cor}-{n}`, `border-{cor}-{n}` hardcoded.
- Adicionar tokens semânticos no `index.css` se faltarem: `--success`, `--warning`, `--info` (com variantes foreground/muted) — usar HSL.
- Substituir `border-2` por `border` + `shadow-sm` para hierarquia mais leve.
- Padrão de KPI card reutilizável: `<KpiCard title icon value trend />`.

### 5. Tabelas das seções — mobile responsivo
- Listas atuais (Usuários, Personals, Pagamentos, Assinaturas, Planos) usam tabelas que estouram no mobile.
- Adicionar layout duplo: **tabela em ≥md, cards empilhados em <md**.
- Garantir alvos de toque ≥44px (regra do projeto).
- Busca + filtros sticky no topo.

### 6. Performance geral
- React Query nas seções pesadas (DashboardOverview, Analytics, Relatorios, Pagamentos).
- Lazy-load das seções com `React.lazy` + `Suspense` (rotas), evitando carregar 4.891 linhas no primeiro render.
- Memoizar formatters (`formatCurrency`) com módulo de utils.

## Detalhes técnicos

- **Rotas novas**: adicionar children routes em `App.tsx` sob `/admin` envolvendo `AdminLayout` (Sidebar+Header+Outlet). Manter `AuthGuard` exigindo role admin.
- **Sidebar**: novo `AppSidebar` com `NavLink`/`useLocation` para `isActive`. `collapsible="icon"`. `SidebarTrigger` no `<header>` (fora da sidebar) para garantir visibilidade no mobile.
- **Tokens novos no `index.css`** (light + dark):
  - `--success`, `--success-foreground`, `--success-muted`
  - `--warning`, `--warning-foreground`, `--warning-muted`
  - `--info`, `--info-foreground`, `--info-muted`
  - registrar no `tailwind.config.ts`.
- **KpiCard component** em `src/components/Admin/KpiCard.tsx` — props: `title`, `value`, `icon`, `tone` ('default'|'success'|'info'|'warning'), `hint`, `trend?`.
- **Chart components**: `ChurnChart`, `RevenueChart` em `src/components/Admin/Charts/` usando recharts com cores via `hsl(var(--primary))`.
- **DataTable responsivo**: criar `src/components/Admin/ResponsiveTable.tsx` com prop `mobileCard` para render em telas pequenas.
- **React Query**: queries com `queryKey: ['admin','dashboard']`, `staleTime: 60_000`.

## Arquivos previstos

**Criar:**
- `src/components/Admin/AdminLayout.tsx`
- `src/components/Admin/AppSidebar.tsx` (substitui AdminSidebar)
- `src/components/Admin/AdminHeader.tsx`
- `src/components/Admin/KpiCard.tsx`
- `src/components/Admin/Charts/ChurnChart.tsx`
- `src/components/Admin/Charts/RevenueChart.tsx`
- `src/components/Admin/ResponsiveTable.tsx`
- `src/components/Admin/hooks/useAdminDashboard.ts`

**Editar:**
- `src/App.tsx` (rotas filhas do `/admin`)
- `src/pages/Admin.tsx` (vira shell mínimo redirecionando para layout)
- `src/components/Admin/AdminDashboard.tsx` (substituído pelo Layout)
- `src/components/Admin/Sections/DashboardOverview.tsx` (reescrita)
- `src/components/Admin/Sections/{Usuarios,Personals,Assinaturas,Pagamentos,Planos}Manager.tsx` (limpeza de cores + responsivo)
- `src/components/Admin/Sections/{Analytics,Relatorios,Notificacoes,Configuracoes}Section.tsx` (limpeza de cores)
- `src/index.css` (+ tokens semânticos)
- `tailwind.config.ts` (+ cores semânticas)

**Remover:**
- `src/components/Admin/AdminSidebar.tsx` (substituído)

## Fora do escopo
- Não alterar lógica de negócio das seções (CRUD de usuários, pagamentos, etc.) — só apresentação.
- Não mexer em RLS / edge functions / dados.
- Não adicionar novas features de admin (relatórios novos, exports) — focar em melhorar o que existe.
