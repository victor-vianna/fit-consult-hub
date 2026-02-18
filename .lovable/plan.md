

# Integracao de Alertas e Notificacoes no Dashboard do Personal

## Problema Identificado

O `NotificacoesDropdown` (sino de notificacoes) so existe no header generico do `AppLayout`, que fica escondido atras do header customizado da pagina Personal. Resultado: o personal **nao ve** o sino de notificacoes nem badges de mensagens nao lidas.

Alem disso, o dashboard nao mostra um indicador visual de mensagens de chat pendentes.

---

## O Que Ja Funciona

- `AlertasModal` ja tem botoes contextuais (Ver perfil, Mensagem, Ver treinos, Ver financeiro, Ver feedback, Responder) com navegacao por query params -- **isso ja esta implementado**.
- `NotificacoesDropdown` ja suporta tipos como `nova_mensagem`, `treino_concluido`, `feedback_semanal` com navegacao ao clicar.
- `useChatNaoLidas` ja existe como hook para contar mensagens de chat nao lidas.

---

## O Que Falta Implementar

### 1. Adicionar NotificacoesDropdown no header Desktop do Personal

No arquivo `src/pages/Personal.tsx`, na secao de header desktop (ao lado de PersonalSettingsDialog, ThemeToggle e botao Sair), adicionar o componente `NotificacoesDropdown` passando o `user.id`.

### 2. Adicionar NotificacoesDropdown no header Mobile do Personal

No arquivo `src/components/mobile/MobileHeaderPersonal.tsx`, adicionar o sino de notificacoes ao lado do ThemeToggle e PersonalSettingsDialog. Requer receber `userId` como nova prop (vindo do `user?.id` em Personal.tsx).

### 3. Card de Mensagens Nao Lidas no Dashboard

No `PersonalDashboardCards.tsx`, adicionar um card "Mensagens" na grid de stats (ao lado de "Treinos Hoje", "Treinos na Semana", "Alertas"). Esse card usa o hook `useChatNaoLidas` para exibir o total de mensagens de chat nao lidas, e ao clicar navega para `/alunos` (ou abre uma lista de conversas pendentes).

### 4. Remover header duplicado do AppLayout para Personal

O `AppLayout` renderiza um header com `NotificacoesDropdown` que fica duplicado/escondido quando a pagina Personal tem seu proprio header. Ajustar para que o header do AppLayout nao renderize quando a pagina ja tem header proprio (ou simplesmente esconder via CSS quando dentro do layout do Personal).

---

## Detalhes Tecnicos

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Personal.tsx` | Importar e renderizar `NotificacoesDropdown` no header desktop |
| `src/components/mobile/MobileHeaderPersonal.tsx` | Adicionar prop `userId` e renderizar `NotificacoesDropdown` |
| `src/components/dashboard/PersonalDashboardCards.tsx` | Adicionar card "Mensagens" com `useChatNaoLidas` |
| `src/components/AppLayout.tsx` | Esconder header generico quando envolvendo Personal (opcional, evitar duplicacao) |

### Ordem de implementacao

1. Integrar `NotificacoesDropdown` no header desktop (Personal.tsx)
2. Integrar `NotificacoesDropdown` no header mobile (MobileHeaderPersonal.tsx)
3. Adicionar card de mensagens no dashboard (PersonalDashboardCards.tsx)
4. Remover/ocultar header duplicado no AppLayout

