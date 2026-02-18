
# FASE 2 -- Organizacao e Produtividade

## Resumo

Duas implementacoes focadas em melhorar a edicao de modelos de treino e a organizacao da biblioteca de modelos.

---

## 1. Edicao de Modelos de Treino

### 1a. Editar nome do modelo
Ja implementado no `ModeloVisualizacaoModal.tsx` -- o personal pode clicar no icone de editar e alterar nome, descricao e categoria. Nenhuma alteracao necessaria.

### 1b. Editar duracao total do treino
- Adicionar coluna `duracao_total_minutos` (integer, nullable) na tabela `treino_modelos`.
- Atualizar `ModeloVisualizacaoModal.tsx` para exibir e permitir editar a duracao estimada (campo numerico com sufixo "min").
- Atualizar `useModelosTreino.ts` para incluir `duracao_total_minutos` no tipo `ModeloTreino` e na mutation `atualizarModelo`.
- Exibir a duracao tambem no `ModeloGrid.tsx` (card do modelo).

### 1c. Multiplos links de demonstracao por exercicio
- Atualmente, `treino_modelo_exercicios` tem apenas um campo `link_video` (text).
- Adicionar coluna `links_demonstracao` (JSONB, nullable) na tabela `treino_modelo_exercicios` para armazenar um array de links com label: `[{ "label": "Angulo frontal", "url": "https://..." }]`.
- Manter `link_video` para compatibilidade e migracao.
- Atualizar `ModeloVisualizacaoModal.tsx` para exibir multiplos links quando disponiveis e permitir editar/adicionar links no modo edicao.
- Atualizar `useModelosTreino.ts` (`ModeloTreinoExercicio`) com o novo campo.
- Ao salvar/aplicar modelo, copiar os links para o exercicio do treino do aluno.

---

## 2. Organizacao da Biblioteca de Modelos (Masculino/Feminino)

### Abordagem: Pastas pre-definidas + cor
O sistema ja possui pastas hierarquicas com cores customizaveis. A melhor abordagem e:

- Adicionar opcao de **cor da pasta** no dialog de criacao e edicao (color picker com cores pre-definidas: azul, rosa, verde, roxo, laranja, vermelho).
- Adicionar um campo **icone/tag** opcional na pasta para marcar como "Masculino" ou "Feminino" (campo `tag` na tabela `modelo_pastas`).
- No `FolderExplorer`, exibir a tag visualmente (icone ou badge ao lado do nome da pasta).
- Adicionar **filtro rapido** no topo da biblioteca: "Todos", "Masculino", "Feminino" -- filtra pastas pela tag.

### Melhorias de navegacao
- Exibir o **caminho completo** da pasta no card do modelo quando em busca global (ja implementado parcialmente no `ModeloGrid`).
- Adicionar **contador de modelos totais** (incluindo subpastas) no badge de cada pasta no `FolderExplorer`.

---

## Detalhes Tecnicos

### Migracao SQL

```text
-- 1. Duracao total no modelo
ALTER TABLE public.treino_modelos 
ADD COLUMN duracao_total_minutos INTEGER;

-- 2. Links multiplos por exercicio do modelo
ALTER TABLE public.treino_modelo_exercicios 
ADD COLUMN links_demonstracao JSONB;

-- 3. Tag para pastas (Masculino/Feminino/custom)
ALTER TABLE public.modelo_pastas 
ADD COLUMN tag TEXT;
```

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useModelosTreino.ts` | Adicionar `duracao_total_minutos` e `links_demonstracao` aos tipos e mutations |
| `src/hooks/useModeloPastas.ts` | Adicionar `tag` ao tipo `ModeloPasta` |
| `src/components/ModeloVisualizacaoModal.tsx` | Campo de duracao editavel, exibir/editar multiplos links por exercicio |
| `src/components/modelos/ModeloGrid.tsx` | Exibir duracao no card do modelo |
| `src/components/modelos/FolderExplorer.tsx` | Color picker na criacao de pasta, exibir tag, filtro rapido Masc/Fem |
| `src/components/ModelosTreinoList.tsx` | Filtro por tag (Masculino/Feminino/Todos) |
| `src/hooks/useAplicarModelo.ts` | Copiar `links_demonstracao` ao aplicar modelo |

### Ordem de implementacao

1. Migracao SQL (3 colunas novas)
2. Duracao total do modelo (tipo + modal + card)
3. Multiplos links de demonstracao (tipo + modal + aplicacao)
4. Tags e cores nas pastas (tipo + explorer + filtro)
