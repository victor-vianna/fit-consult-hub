

# Fase 5 -- Financeiro e Gestao

## Resumo

Expandir o dashboard financeiro para 12 meses de historico, adicionar comparacao ano-a-ano, e implementar logica de parcelamento para que a receita reflita o valor real recebido mes a mes.

---

## 1. Alteracao no Banco de Dados

Adicionar coluna `parcelas` na tabela `subscriptions` para registrar em quantas vezes o plano foi vendido:

```text
ALTER TABLE public.subscriptions
  ADD COLUMN parcelas INTEGER NOT NULL DEFAULT 1;
```

Isso permite que ao registrar um pagamento, o sistema saiba dividir o valor total em parcelas e agendar os recebimentos futuros.

---

## 2. Alteracoes no Hook `useFinancialDashboard.ts`

### 2.1 Expandir para 12 meses
- Buscar `payment_history` dos ultimos 13 meses (12 + mesmo mes do ano anterior para comparacao).
- Gerar array de 12 meses ao inves de 6.

### 2.2 Comparacao ano-a-ano
- Para cada mes, calcular tambem a receita do mesmo mes no ano anterior.
- Adicionar campo `receitaAnoAnterior` no tipo `MonthlyRevenue`.
- Adicionar metrica `receitaMesmoMesAnoAnterior` e `comparacaoAnual` ao `FinancialMetrics`.

### 2.3 Receita real (payment_history como fonte)
- A receita mensal ja e calculada a partir de `payment_history`, que registra o valor efetivamente recebido. Portanto, se um plano trimestral de R$300 e pago em 3x de R$100, cada parcela gera um registro separado em `payment_history` com valor R$100.
- Nenhuma mudanca de logica e necessaria aqui -- o calculo ja esta correto desde que os pagamentos sejam registrados corretamente.

---

## 3. Alteracoes no Hook `useSubscriptions.ts`

### Funcao `registerPayment` com suporte a parcelas

Atualizar para aceitar `parcelas` como parametro opcional:
- Se `parcelas > 1`, criar multiplos registros em `payment_history`, um para cada parcela, com datas mensais sequenciais e valor dividido.
- Exemplo: plano trimestral R$300 em 3x gera 3 registros de R$100 nos meses 1, 2 e 3.

---

## 4. Alteracoes no Componente `FinancialDashboard.tsx`

### 4.1 Grafico de 12 meses
- Titulo: "Receita dos Ultimos 12 Meses"
- Linha principal: receita do mes atual
- Linha secundaria (tracejada, cor mais clara): receita do mesmo mes no ano anterior
- Legenda clara indicando "Este ano" e "Ano anterior"

### 4.2 Card de comparacao anual
- Substituir o card "Mes Anterior" por "vs Ano Anterior"
- Mostrar valor do mesmo mes do ano passado
- Percentual de variacao (positivo/negativo)

### 4.3 Layout simplificado
- Manter os 4 cards de metricas (Receita do Mes, Previsao Mensal, Inadimplencia, vs Ano Anterior)
- Grafico de linha com 12 meses + comparacao ano anterior
- Grafico de barras com numero de pagamentos (12 meses)
- Lista de inadimplentes (sem mudanca)
- Resumo geral (sem mudanca)

---

## Detalhes Tecnicos

### Migracao SQL

```text
ALTER TABLE public.subscriptions
  ADD COLUMN parcelas INTEGER NOT NULL DEFAULT 1;
```

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useFinancialDashboard.ts` | Expandir para 12 meses, adicionar comparacao anual, novo tipo MonthlyRevenue |
| `src/hooks/useSubscriptions.ts` | Suporte a parcelas no registerPayment |
| `src/components/FinancialDashboard.tsx` | Grafico 12 meses com 2 linhas, card comparacao anual |

### Ordem de implementacao

1. Migracao SQL (coluna parcelas)
2. Atualizar `useFinancialDashboard.ts` (12 meses + comparacao anual)
3. Atualizar `useSubscriptions.ts` (registro de parcelas)
4. Atualizar `FinancialDashboard.tsx` (nova UI)

