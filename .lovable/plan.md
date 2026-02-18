
# Fase 6 -- Exportacao e Profissionalizacao

## Resumo

Adicionar botoes de exportacao de treino semanal do aluno em dois formatos: **Word (.docx)** e **PDF**, com layout profissional compativel com papel timbrado. A exportacao usara os dados do personal (logo, nome) e do aluno para gerar um documento organizado.

---

## Bibliotecas Necessarias

- **docx** (npm): Gera arquivos `.docx` (Word 2007+) no navegador. Permite controle total de formatacao, tabelas, cabecalhos e rodapes.
- **file-saver**: Para disparar o download do arquivo gerado.
- **jspdf** + **jspdf-autotable**: Gera PDFs no navegador com suporte a tabelas formatadas.

---

## Estrutura do Documento Exportado

O documento (tanto Word quanto PDF) tera:

1. **Cabecalho/Papel Timbrado**
   - Logo do personal (se configurado em `personal_settings.logo_url`)
   - Nome do personal/studio (`display_name`)
   - Linha separadora com cor do tema (`theme_color`)

2. **Informacoes do Aluno**
   - Nome do aluno
   - Semana de referencia (ex: "10/02 - 16/02/2026")

3. **Treinos por Dia**
   - Para cada dia da semana com conteudo:
     - Titulo do dia (ex: "Segunda-feira - Treino A")
     - Descricao (se houver)
     - Tabela de exercicios com colunas: Exercicio | Series | Repeticoes | Carga | Descanso | Observacoes
     - Exercicios agrupados (bi-set, tri-set) indicados visualmente
     - Blocos de treino (cardio, alongamento) listados separadamente

4. **Rodape**
   - "Gerado por [nome do personal]" + data de geracao

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/utils/exportTreinoWord.ts` | Funcao que recebe dados do treino, aluno e personal e gera um .docx usando a lib `docx` |
| `src/utils/exportTreinoPDF.ts` | Funcao que recebe os mesmos dados e gera um .pdf usando `jspdf` + `jspdf-autotable` |

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/TreinosManager.tsx` | Adicionar botoes "Exportar Word" e "Exportar PDF" no header da aba de treinos, ao lado da navegacao de semanas |

---

## Detalhes Tecnicos

### Funcao `exportTreinoWord`

```text
Parametros:
  - treinos: TreinoDia[]
  - gruposPorTreino: Record<string, GrupoExercicios[]>
  - blocosPorTreino: Record<string, BlocoTreino[]>
  - alunoNome: string
  - semanaLabel: string
  - personalSettings: PersonalSettings

Gera um Document do docx com:
  - Header com logo + nome do personal
  - Secao de info do aluno
  - Para cada dia: titulo + tabela de exercicios
  - Footer com data de geracao

Usa Packer.toBlob() + saveAs() para download
```

### Funcao `exportTreinoPDF`

```text
Mesmos parametros.
Usa jsPDF com:
  - addImage para logo
  - autoTable para tabelas formatadas
  - Cores do tema do personal
  - Download automatico via doc.save()
```

### Integracao no TreinosManager

Adicionar um `DropdownMenu` com icone de download contendo duas opcoes:
- "Exportar Word (.docx)"
- "Exportar PDF"

Ambos chamam as funcoes utilitarias passando os dados ja disponiveis no componente (treinos, grupos, blocos, alunoProfile, personalSettings).

### Ordem de implementacao

1. Instalar dependencias (`docx`, `file-saver`, `jspdf`, `jspdf-autotable`)
2. Criar `exportTreinoWord.ts`
3. Criar `exportTreinoPDF.ts`
4. Integrar botoes no `TreinosManager.tsx`
