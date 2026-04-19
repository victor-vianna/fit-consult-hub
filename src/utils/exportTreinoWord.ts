import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  ImageRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Header,
  Footer,
  ShadingType,
  LevelFormat,
} from "docx";
import { saveAs } from "file-saver";
import type { TreinoDia } from "@/types/treino";
import type { PersonalSettings } from "@/hooks/usePersonalSettings";
import { organizeForExport } from "./exportOrganizer";

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; type: "png" | "jpg" }> {
  const res = await fetch(url);
  const blob = await res.blob();
  const buf = await blob.arrayBuffer();
  const type: "png" | "jpg" = blob.type.includes("png") ? "png" : "jpg";
  return { bytes: new Uint8Array(buf), type };
}

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

// US Letter: 12240 DXA wide, 1" margins = 9360 content width
const PAGE_WIDTH = 12240;
const PAGE_HEIGHT = 15840;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9360

// Column widths for 6 columns (Exercise wider, rest equal)
const COL_WIDTHS = [3200, 1100, 1260, 1200, 1200, 1400]; // sum = 9360

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 80, right: 80 };

function createHeaderRow(themeColor: string): TableRow {
  const headers = ["Exercício", "Séries", "Repetições", "Carga", "Descanso", "Obs."];
  return new TableRow({
    children: headers.map(
      (h, i) =>
        new TableCell({
          width: { size: COL_WIDTHS[i], type: WidthType.DXA },
          borders: cellBorders,
          margins: cellMargins,
          shading: {
            type: ShadingType.CLEAR,
            color: "auto",
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
          width: { size: COL_WIDTHS[i], type: WidthType.DXA },
          borders: cellBorders,
          margins: cellMargins,
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
  useLetterhead?: boolean;
}

export async function exportTreinoWord(params: ExportTreinoParams) {
  const { treinos, gruposPorTreino, blocosPorTreino, alunoNome, semanaLabel, personalSettings, useLetterhead } = params;
  const themeColor = personalSettings.theme_color || "#3b82f6";
  const personalName = personalSettings.display_name || "Personal Trainer";

  // Pre-load letterhead bytes if requested
  let letterheadImage: { bytes: Uint8Array; type: "png" | "jpg" } | null = null;
  if (useLetterhead && personalSettings.letterhead_url) {
    try {
      letterheadImage = await fetchImageBytes(personalSettings.letterhead_url);
    } catch (err) {
      console.warn("Falha ao carregar papel timbrado para Word:", err);
    }
  }

  const children: any[] = [];

  // Header / Branding (skip when letterhead is used — assume the timbrado has its own brand)
  if (!letterheadImage) {
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
            space: 1,
          },
        },
        spacing: { after: 200 },
        children: [],
      })
    );
  }

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
        children: [
          new TextRun({
            text: titulo,
            bold: true,
            size: 26,
            font: "Calibri",
          }),
        ],
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

    // Organize into sections
    const sections = organizeForExport(exerciciosIsolados, grupos, blocos);

    for (const section of sections) {
      // Section label
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.label.toUpperCase(),
              bold: true,
              size: 20,
              color: hexToRgb(themeColor),
              font: "Calibri",
            }),
          ],
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 2,
              color: hexToRgb(themeColor),
              space: 1,
            },
          },
          spacing: { before: 150, after: 80 },
        })
      );

      if (section.type === "exercicios") {
        // Exercise table
        const rows: TableRow[] = [createHeaderRow(themeColor)];

        section.items.forEach((ex) => rows.push(createExerciseRow(ex)));

        // Groups
        grupos.forEach((grupo: any) => {
          const tipoLabel = grupo.tipo_agrupamento || "Grupo";
          (grupo.exercicios || [])
            .sort((a: any, b: any) => (a.ordem_no_grupo || 0) - (b.ordem_no_grupo || 0))
            .forEach((ex: any, idx: number) => {
              const prefix = idx === 0 ? `[${tipoLabel}]` : "  >";
              rows.push(createExerciseRow(ex, prefix));
            });
        });

        if (rows.length > 1) {
          children.push(
            new Table({
              rows,
              width: { size: CONTENT_WIDTH, type: WidthType.DXA },
              columnWidths: COL_WIDTHS,
            })
          );
        }
      } else {
        // Blocks
        section.items.forEach((bloco: any) => {
          const parts: string[] = [bloco.nome];
          if (bloco.duracao_estimada_minutos) parts.push(`${bloco.duracao_estimada_minutos} min`);

          children.push(
            new Paragraph({
              numbering: { reference: "block-bullets", level: 0 },
              children: [
                new TextRun({
                  text: parts.join(" — "),
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
              spacing: { before: 40, after: 30 },
            })
          );
          if (bloco.descricao) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: bloco.descricao, size: 18, font: "Calibri" }),
                ],
                indent: { left: 720 },
                spacing: { after: 30 },
              })
            );
          }
        });
      }
    }

    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "block-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: letterheadImage
              ? { top: 2880, right: MARGIN, bottom: 2160, left: MARGIN } // 2" top, 1.5" bottom for letterhead
              : { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children,
        headers: letterheadImage
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 0 },
                    children: [
                      new ImageRun({
                        type: letterheadImage.type,
                        data: letterheadImage.bytes,
                        transformation: { width: 595, height: 120 }, // ~A4 width header strip
                      } as any),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: letterheadImage
                      ? ""
                      : `Gerado por ${personalName} — ${new Date().toLocaleDateString("pt-BR")}`,
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
