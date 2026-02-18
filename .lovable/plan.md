

# FASE 3 -- Avaliacao e Evolucao do Aluno

## Resumo

Reorganizar completamente a aba de Avaliacao no perfil do aluno, criando secoes distintas com navegacao por sub-abas, e adicionar funcionalidades de fotos com linha do tempo, edicao de data e organizacao por pastas.

---

## 1. Reorganizar Area de Avaliacao

### Estado atual
A aba "Avaliacao" no `AlunoDetalhes.tsx` renderiza o `AvaliacaoFisicaManager.tsx` como um unico bloco monolitico que mistura medidas corporais, composicao corporal e fotos em um so lugar.

### Nova estrutura com sub-abas
Dentro da aba "Avaliacao" existente, criar sub-abas internas:

| Sub-aba | Conteudo |
|---------|----------|
| Fotos | Galeria organizada por pastas (frente, costas, lateral) com linha do tempo visual |
| Evolucao | Graficos de evolucao de peso, gordura, medidas ao longo do tempo (usando Recharts) |
| Composicao Corporal | Peso, altura, IMC, % gordura, massa magra |
| Avaliacao Fisica | Circunferencias (todas as medidas existentes) |
| Flexibilidade | Novos campos: teste de sentar-e-alcancar, ombro, quadril, tornozelo |
| Postural | Novos campos: observacoes posturais, desvios, fotos posturais |
| Triagem | Novos campos: PAR-Q, historico de lesoes, restricoes, liberacao medica |

### Implementacao
- Substituir o `AvaliacaoFisicaManager` monolitico por um componente wrapper `AvaliacaoHub.tsx` que usa `Tabs` interno para as 7 secoes.
- Extrair logica existente em sub-componentes menores dentro de `src/components/avaliacao/`.

---

## 2. Fotos de Avaliacao

### 2a. Permitir editar data das fotos
- Adicionar coluna `data_foto` (date, nullable) na tabela `fotos_evolucao` para registrar quando a foto foi tirada (independente do `created_at`).
- No formulario de upload, adicionar campo de data.
- Permitir editar a data depois do upload.

### 2b. Linha do tempo visual
- Criar componente `FotoTimeline.tsx` que agrupa fotos por data (usando `data_foto` ou `created_at` como fallback).
- Cada ponto na timeline mostra as fotos daquele dia, organizadas por tipo (frente, costas, lateral).
- Permitir comparacao lado-a-lado entre duas datas selecionadas.

### 2c. Pastas por tipo de foto
- Ja existe o campo `tipo_foto` (frente, costas, lado_direito, lado_esquerdo, outro).
- Criar visualizacao em pastas/abas que filtra por tipo.
- Adicionar contagem de fotos por tipo.

---

## Detalhes Tecnicos

### Migracao SQL

```text
-- 1. Data da foto (independente do created_at)
ALTER TABLE public.fotos_evolucao 
ADD COLUMN data_foto DATE;

-- 2. Campos de flexibilidade na avaliacao
ALTER TABLE public.avaliacoes_fisicas 
ADD COLUMN flexibilidade_sentar_alcancar NUMERIC,
ADD COLUMN flexibilidade_ombro TEXT,
ADD COLUMN flexibilidade_quadril TEXT,
ADD COLUMN flexibilidade_tornozelo TEXT;

-- 3. Campos posturais
ALTER TABLE public.avaliacoes_fisicas 
ADD COLUMN postural_observacoes TEXT,
ADD COLUMN postural_desvios JSONB;

-- 4. Campos de triagem
ALTER TABLE public.avaliacoes_fisicas 
ADD COLUMN triagem_parq JSONB,
ADD COLUMN triagem_historico_lesoes TEXT,
ADD COLUMN triagem_restricoes TEXT,
ADD COLUMN triagem_liberacao_medica BOOLEAN DEFAULT false,
ADD COLUMN triagem_observacoes TEXT;

-- 5. Permitir fotos independentes de avaliacao (tornar avaliacao_id nullable)
ALTER TABLE public.fotos_evolucao 
ALTER COLUMN avaliacao_id DROP NOT NULL;

-- 6. RLS para update de fotos (editar data)
CREATE POLICY "Personais podem atualizar fotos" ON public.fotos_evolucao
FOR UPDATE USING (personal_id = auth.uid());
```

### Novos arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/avaliacao/AvaliacaoHub.tsx` | Wrapper com sub-abas (Fotos, Evolucao, Composicao, etc.) |
| `src/components/avaliacao/FotosSection.tsx` | Galeria com pastas por tipo e upload |
| `src/components/avaliacao/FotoTimeline.tsx` | Linha do tempo visual de fotos |
| `src/components/avaliacao/EvolucaoSection.tsx` | Graficos de evolucao (Recharts) |
| `src/components/avaliacao/ComposicaoCorporalSection.tsx` | Peso, altura, IMC, gordura |
| `src/components/avaliacao/AvaliacaoFisicaSection.tsx` | Circunferencias |
| `src/components/avaliacao/FlexibilidadeSection.tsx` | Campos de flexibilidade |
| `src/components/avaliacao/PosturalSection.tsx` | Observacoes posturais |
| `src/components/avaliacao/TriagemSection.tsx` | PAR-Q e triagem |

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/AlunoDetalhes.tsx` | Substituir `AvaliacaoFisicaManager` por `AvaliacaoHub` |
| `src/components/AvaliacaoFisicaManager.tsx` | Refatorar -- extrair logica para sub-componentes |

### Ordem de implementacao

1. Migracao SQL (novas colunas + RLS)
2. Criar `AvaliacaoHub.tsx` com sub-abas e mover conteudo existente
3. Criar `FotosSection.tsx` com upload, edicao de data e galeria por tipo
4. Criar `FotoTimeline.tsx` com linha do tempo e comparacao lado-a-lado
5. Criar `EvolucaoSection.tsx` com graficos Recharts
6. Criar secoes de Flexibilidade, Postural e Triagem
7. Atualizar `AlunoDetalhes.tsx` para usar o novo hub

