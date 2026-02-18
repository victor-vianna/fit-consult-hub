
# FASE 1 -- Estabilidade e Base do Produto

## Resumo

Quatro implementacoes focadas em estabilidade, retencao e seguranca juridica basica para o sistema FitConsult Hub.

---

## 1. Permitir 2 treinos separados no mesmo dia

### Situacao atual
O backend ja suporta multiplos treinos por dia -- a tabela `treinos_semanais` possui as colunas `nome_treino` e `ordem_no_dia`, e o hook `useTreinos` ja tem as mutations `criarTreinoNoDia`, `renomearTreino` e `deletarTreino`. O componente `MultiplosTreinosDia` ja existe.

### O que falta
- Na visao do **aluno** (`TreinosManager` com `readOnly=true`), quando ha multiplos treinos no mesmo dia, a UI precisa exibir cada treino separadamente com seu proprio botao de iniciar/cronometro.
- Cada treino precisa gerar sua propria sessao em `treino_sessoes` para historico independente.
- Na visao do **personal** (TreinosManager com `readOnly=false`), validar que o fluxo de criar segundo treino no dia funciona corretamente via o componente `MultiplosTreinosDia`.

### Alteracoes
- **`src/components/TreinosManager.tsx`**: Quando `readOnly=true` e um dia tem mais de 1 treino, renderizar cards separados para cada treino com nome visivel (ex: "Treino A", "Treino B"). Cada card abre seu proprio `WorkoutDayView` com cronometro independente.
- **`src/components/WorkoutDayView.tsx`**: Receber `nome_treino` como prop e exibir no header para diferenciar treinos do mesmo dia.
- **`src/components/CalendarioSemanal.tsx`**: Indicar visualmente quando um dia tem mais de 1 treino (ex: badge "2 treinos").

---

## 2. Obrigar refazer anamnese a cada 6 meses

### Situacao atual
O hook `useAnamneseCheckin` verifica se a anamnese existe, mas nao valida a data. A anamnese tem `created_at` no banco.

### Alteracoes
- **`src/hooks/useAnamneseCheckin.ts`**: Apos verificar que a anamnese existe, calcular se `created_at` e mais antigo que 180 dias (6 meses). Se sim, tratar como `anamnesePreenchida = false` e `mostrarModalAnamnese = true`, bloqueando acesso aos treinos.
- **`src/components/AnamneseObrigatorioModal.tsx`**: Adicionar mensagem diferenciada quando e renovacao ("Sua anamnese esta desatualizada. Atualize para continuar treinando.") vs primeira vez.
- **`src/components/AnamneseInicialForm.tsx`**: Quando for renovacao (ja existe anamnese anterior), pre-preencher os campos com os dados anteriores para facilitar a atualizacao. Isso ja acontece via `checkExistingAnamnese`.

### Logica
```text
Se anamnese existe E created_at > 180 dias atras:
  -> anamnesePreenchida = false
  -> mostrarModalAnamnese = true (com mensagem de renovacao)
  -> podeAcessarTreinos = false
```

---

## 3. Termo de Consentimento na Anamnese

### Alteracoes
- **`src/components/AnamneseInicialForm.tsx`**: Na ultima etapa (step 6), adicionar um checkbox obrigatorio com o texto: "Declaro que as informacoes fornecidas sao verdadeiras e assumo total responsabilidade pelos dados informados."
- Adicionar estado `termoAceito` (boolean, default false).
- Na validacao do step 6 (`validateStep`), verificar que `termoAceito === true`. Se nao, mostrar toast de erro.
- O botao "Concluir" fica desabilitado visualmente enquanto o checkbox nao estiver marcado.
- Nao requer alteracao no banco de dados -- e apenas uma validacao no frontend.

---

## 4. Melhorar Central de Alertas

### 4a. Alerta "Aluno nunca treinou"
Ja implementado parcialmente em `PersonalDashboardCards.tsx` -- alunos com `dias_inativo === 999` ja aparecem como "Novo" na tab Inativos.

### 4b. Alerta "Aluno esta ha X dias sem treinar"
Ja implementado -- `fetchAlunosInativos` calcula `dias_inativo` e filtra > 7 dias.

### 4c. Permitir excluir alertas manualmente
- **Banco de dados**: Criar tabela `alertas_descartados` com colunas: `id`, `personal_id`, `tipo_alerta` (text), `referencia_id` (uuid -- id do aluno/planilha/etc), `descartado_em` (timestamptz), `expira_em` (timestamptz, 10 dias apos).
- **RLS**: Personal pode gerenciar seus proprios descartes.
- **`src/components/dashboard/AlertasModal.tsx`**: Adicionar botao "X" (descartar) em cada alerta. Ao clicar, insere registro em `alertas_descartados`.
- **`src/components/dashboard/PersonalDashboardCards.tsx`**: Na hora de montar as listas de alertas, filtrar os que foram descartados (verificar `alertas_descartados` onde `expira_em > now()`).

### 4d. Alertas desaparecem apos 10 dias
- Ao descartar, calcular `expira_em = now() + 10 dias`.
- O filtro na query ja ignora alertas descartados enquanto `expira_em > now()`. Apos 10 dias, o alerta reaparece automaticamente se a condicao ainda for verdadeira (ex: aluno continua inativo).

---

## Detalhes Tecnicos

### Migracao SQL necessaria

```text
CREATE TABLE public.alertas_descartados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL,
  tipo_alerta TEXT NOT NULL,
  referencia_id UUID NOT NULL,
  descartado_em TIMESTAMPTZ DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.alertas_descartados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal gerencia seus descartes"
  ON public.alertas_descartados
  FOR ALL
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

CREATE INDEX idx_alertas_descartados_personal 
  ON public.alertas_descartados(personal_id, tipo_alerta, referencia_id);
```

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useAnamneseCheckin.ts` | Logica de 180 dias para renovacao |
| `src/components/AnamneseInicialForm.tsx` | Checkbox de termo na etapa 6 |
| `src/components/AnamneseObrigatorioModal.tsx` | Mensagem diferenciada para renovacao |
| `src/components/TreinosManager.tsx` | Renderizar treinos separados para o aluno |
| `src/components/WorkoutDayView.tsx` | Exibir nome do treino no header |
| `src/components/CalendarioSemanal.tsx` | Badge visual para dias com 2+ treinos |
| `src/components/dashboard/AlertasModal.tsx` | Botao de descartar alerta |
| `src/components/dashboard/PersonalDashboardCards.tsx` | Filtrar alertas descartados |

### Ordem de implementacao

1. Migracao SQL (tabela `alertas_descartados`)
2. Anamnese: renovacao 6 meses + termo de consentimento
3. Multiplos treinos: ajustes na visao do aluno
4. Central de alertas: descartar + expiracao 10 dias
