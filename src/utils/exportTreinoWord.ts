import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Footer,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";
import type { TreinoDia } from "@/types/treino";
import type { PersonalSettings } from "@/hooks/usePersonalSettings";

const diasSemana = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

function hexToRgb(hex: string): string {
  return hex.replace("#", "");
}

function createHeaderRow(themeColor: string): TableRow {
  const headers = ["Exercício", "Séries", "Repetições", "Carga", "Descanso", "Obs."];
  return new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          shading: {
            type: ShadingType.SOLID,
            color: hexToRgb(themeColor),
            fill: hexToRgb(themeColor),
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: h,
                  bold: true,
                  color: "FFFFFF",
                  size: 18,
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        })
    ),
  });
}

function createExerciseRow(ex: any, prefix?: string): TableRow {
  const nome = prefix ? `${prefix} ${ex.nome}` : ex.nome;
  const values = [
    nome,
    ex.series ? String(ex.series) : "-",
    ex.repeticoes || "-",
    ex.carga || "-",
    ex.descanso ? `${ex.descanso}s` : "-",
    ex.observacoes || "-",
  ];

  return new TableRow({
    children: values.map(
      (v, i) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: v,
                  size: 18,
                  font: "Calibri",
                }),
              ],
              alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
            }),
          ],
        })
    ),
  });
}

export interface ExportTreinoParams {
  treinos: TreinoDia[];
  gruposPorTreino: Record<string, any[]>;
  blocosPorTreino: Record<string, any[]>;
  alunoNome: string;
  semanaLabel: string;
  personalSettings: PersonalSettings;
}

export async function exportTreinoWord(params: ExportTreinoParams) {
  const { treinos, gruposPorTreino, blocosPorTreino, alunoNome, semanaLabel, personalSettings } = params;
  const themeColor = personalSettings.theme_color || "#3b82f6";
  const personalName = personalSettings.display_name || "Personal Trainer";

  const children: any[] = [];

  // Header / Branding
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: personalName,
          bold: true,
          size: 36,
          color: hexToRgb(themeColor),
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Separator line
  children.push(
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: hexToRgb(themeColor),
        },
      },
      spacing: { after: 200 },
    })
  );

  // Student info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Aluno: ", bold: true, size: 22, font: "Calibri" }),
        new TextRun({ text: alunoNome, size: 22, font: "Calibri" }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Semana: ", bold: true, size: 22, font: "Calibri" }),
        new TextRun({ text: semanaLabel, size: 22, font: "Calibri" }),
      ],
      spacing: { after: 300 },
    })
  );

  // Days
  treinos.forEach((treino) => {
    const treinoId = treino.treinoId;
    const exerciciosIsolados = treino.exercicios.filter((ex) => !ex.grupo_id);
    const grupos = treinoId ? (gruposPorTreino[treinoId] || []) : [];
    const blocos = treinoId ? (blocosPorTreino[treinoId] || []) : [];

    const hasContent = exerciciosIsolados.length > 0 || grupos.length > 0 || blocos.length > 0;
    if (!hasContent) return;

    const diaNome = diasSemana[treino.dia - 1] || `Dia ${treino.dia}`;
    const titulo = treino.nome_treino
      ? `${diaNome} — ${treino.nome_treino}`
      : diaNome;

    children.push(
      new Paragraph({
        text: titulo,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      })
    );

    if (treino.descricao) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: treino.descricao, italics: true, size: 20, font: "Calibri" }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    // Exercise table
    const rows: TableRow[] = [createHeaderRow(themeColor)];

    // Isolated exercises
    exerciciosIsolados
      .sort((a, b) => a.ordem - b.ordem)
      .forEach((ex) => rows.push(createExerciseRow(ex)));

    // Groups
    grupos.forEach((grupo: any) => {
      const tipoLabel = grupo.tipo_agrupamento || "Grupo";
      (grupo.exercicios || [])
        .sort((a: any, b: any) => (a.ordem_no_grupo || 0) - (b.ordem_no_grupo || 0))
        .forEach((ex: any, idx: number) => {
          const prefix = idx === 0 ? `[${tipoLabel}]` : "↳";
          rows.push(createExerciseRow(ex, prefix));
        });
    });

    if (rows.length > 1) {
      children.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    // Blocks
    blocos.forEach((bloco: any) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `📋 ${bloco.nome}`,
              bold: true,
              size: 20,
              font: "Calibri",
            }),
            new TextRun({
              text: bloco.duracao_estimada_minutos
                ? ` (${bloco.duracao_estimada_minutos} min)`
                : "",
              size: 18,
              font: "Calibri",
            }),
          ],
          spacing: { before: 100, after: 50 },
        })
      );
      if (bloco.descricao) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: bloco.descricao, size: 18, font: "Calibri" }),
            ],
            spacing: { after: 50 },
          })
        );
      }
    });

    children.push(new Paragraph({ spacing: { after: 200 } }));
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Gerado por ${personalName} — ${new Date().toLocaleDateString("pt-BR")}`,
                    size: 16,
                    color: "888888",
                    font: "Calibri",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Treino_${alunoNome.replace(/\s+/g, "_")}_${semanaLabel.replace(/\//g, "-")}.docx`);
}
