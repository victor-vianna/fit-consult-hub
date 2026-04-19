import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TreinoDia } from "@/types/treino";
import type { PersonalSettings } from "@/hooks/usePersonalSettings";
import { organizeForExport } from "./exportOrganizer";

const diasSemana = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export interface ExportTreinoPDFParams {
  treinos: TreinoDia[];
  gruposPorTreino: Record<string, any[]>;
  blocosPorTreino: Record<string, any[]>;
  alunoNome: string;
  semanaLabel: string;
  personalSettings: PersonalSettings;
  useLetterhead?: boolean;
}

export async function exportTreinoPDF(params: ExportTreinoPDFParams) {
  const { treinos, gruposPorTreino, blocosPorTreino, alunoNome, semanaLabel, personalSettings, useLetterhead } = params;
  const themeColor = personalSettings.theme_color || "#3b82f6";
  const personalName = personalSettings.display_name || "Personal Trainer";
  const rgb = hexToRgb(themeColor);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Pre-load letterhead if needed
  let letterheadDataUrl: string | null = null;
  if (useLetterhead && personalSettings.letterhead_url) {
    try {
      letterheadDataUrl = await loadImage(personalSettings.letterhead_url);
    } catch (err) {
      console.warn("Não foi possível carregar o papel timbrado:", err);
    }
  }

  const drawLetterhead = () => {
    if (letterheadDataUrl) {
      doc.addImage(letterheadDataUrl, "PNG", 0, 0, pageWidth, pageHeight);
    }
  };

  // Hook every new page to draw letterhead first
  const originalAddPage = doc.addPage.bind(doc);
  (doc as any).addPage = function (...args: any[]) {
    const result = originalAddPage(...args);
    drawLetterhead();
    return result;
  };

  // Draw letterhead on first page
  drawLetterhead();

  // When using letterhead, leave more top margin to avoid overlapping the header art
  let y = letterheadDataUrl ? 50 : 15;

  // Header (skip if letterhead is used — assume the timbrado already has branding)
  if (!letterheadDataUrl) {
    if (personalSettings.logo_url) {
      try {
        const img = await loadImage(personalSettings.logo_url);
        doc.addImage(img, "PNG", 14, y, 20, 20);
        doc.setFontSize(20);
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.setFont("helvetica", "bold");
        doc.text(personalName, 38, y + 13);
        y += 25;
      } catch {
        doc.setFontSize(20);
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.setFont("helvetica", "bold");
        doc.text(personalName, pageWidth / 2, y + 5, { align: "center" });
        y += 12;
      }
    } else {
      doc.setFontSize(20);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.setFont("helvetica", "bold");
      doc.text(personalName, pageWidth / 2, y + 5, { align: "center" });
      y += 12;
    }

    // Separator
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.8);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
  }

  // Student info
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.text("Aluno: ", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(alunoNome, 14 + doc.getTextWidth("Aluno: "), y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Semana: ", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(semanaLabel, 14 + doc.getTextWidth("Semana: "), y);
  y += 10;

  // Top margin for new pages (avoid letterhead header art)
  const pageTopY = letterheadDataUrl ? 50 : 15;
  const pageBottomLimit = letterheadDataUrl ? pageHeight - 35 : pageHeight - 20;

  // Days
  treinos.forEach((treino) => {
    const treinoId = treino.treinoId;
    const exerciciosIsolados = treino.exercicios.filter((ex) => !ex.grupo_id);
    const grupos = treinoId ? (gruposPorTreino[treinoId] || []) : [];
    const blocos = treinoId ? (blocosPorTreino[treinoId] || []) : [];

    const hasContent = exerciciosIsolados.length > 0 || grupos.length > 0 || blocos.length > 0;
    if (!hasContent) return;

    // Check page space
    if (y > pageBottomLimit - 20) {
      doc.addPage();
      y = pageTopY;
    }

    const diaNome = diasSemana[treino.dia - 1] || `Dia ${treino.dia}`;
    const titulo = treino.nome_treino ? `${diaNome} - ${treino.nome_treino}` : diaNome;

    doc.setFontSize(13);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.setFont("helvetica", "bold");
    doc.text(titulo, 14, y);
    y += 2;

    if (treino.descricao) {
      y += 4;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "italic");
      doc.text(treino.descricao, 14, y);
      y += 2;
    }

    // Organize sections
    const sections = organizeForExport(exerciciosIsolados, grupos, blocos);

    for (const section of sections) {
      // Check page space
      if (y > pageBottomLimit - 10) {
        doc.addPage();
        y = pageTopY;
      }

      // Section label
      y += 4;
      doc.setFontSize(10);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.setFont("helvetica", "bold");
      doc.text(section.label.toUpperCase(), 14, y);
      y += 1;

      // Thin colored line under section label
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.setLineWidth(0.3);
      doc.line(14, y, 70, y);
      y += 2;

      if (section.type === "exercicios") {
        // Exercise table
        const tableData: string[][] = [];

        section.items.forEach((ex) => {
          tableData.push([
            ex.nome,
            ex.series ? String(ex.series) : "-",
            ex.repeticoes || "-",
            ex.carga || "-",
            ex.descanso ? `${ex.descanso}s` : "-",
            ex.observacoes || "-",
          ]);
        });

        // Groups
        grupos.forEach((grupo: any) => {
          const tipoLabel = grupo.tipo_agrupamento || "Grupo";
          (grupo.exercicios || [])
            .sort((a: any, b: any) => (a.ordem_no_grupo || 0) - (b.ordem_no_grupo || 0))
            .forEach((ex: any, idx: number) => {
              const prefix = idx === 0 ? `[${tipoLabel}] ` : "> ";
              tableData.push([
                prefix + ex.nome,
                ex.series ? String(ex.series) : "-",
                ex.repeticoes || "-",
                ex.carga || "-",
                ex.descanso ? `${ex.descanso}s` : "-",
                ex.observacoes || "-",
              ]);
            });
        });

        if (tableData.length > 0) {
          autoTable(doc, {
            startY: y + 1,
            head: [["Exercicio", "Series", "Reps", "Carga", "Descanso", "Obs."]],
            body: tableData,
            theme: "grid",
            headStyles: {
              fillColor: rgb,
              textColor: [255, 255, 255],
              fontSize: 8,
              fontStyle: "bold",
              halign: "center",
            },
            bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
            columnStyles: {
              0: { halign: "left", cellWidth: "auto" },
              1: { halign: "center", cellWidth: 15 },
              2: { halign: "center", cellWidth: 18 },
              3: { halign: "center", cellWidth: 18 },
              4: { halign: "center", cellWidth: 18 },
              5: { halign: "left", cellWidth: 30 },
            },
            margin: { left: 14, right: 14, top: pageTopY, bottom: pageHeight - pageBottomLimit },
          });
          y = (doc as any).lastAutoTable.finalY + 2;
        }
      } else {
        // Blocks rendered as a compact table
        const blocosData = section.items.map((bloco: any) => {
          const parts = [bloco.nome];
          if (bloco.duracao_estimada_minutos) parts.push(`${bloco.duracao_estimada_minutos} min`);
          if (bloco.descricao) parts.push(bloco.descricao);
          return [parts.join(" - ")];
        });

        autoTable(doc, {
          startY: y + 1,
          body: blocosData,
          theme: "plain",
          bodyStyles: {
            fontSize: 8,
            textColor: [40, 40, 40],
            cellPadding: 2,
          },
          margin: { left: 16, right: 14, top: pageTopY, bottom: pageHeight - pageBottomLimit },
        });
        y = (doc as any).lastAutoTable.finalY + 2;
      }
    }

    y += 6;
  });

  // Footer (skip when letterhead is used to avoid overlapping)
  if (!letterheadDataUrl) {
    const footerText = `Gerado por ${personalName} - ${new Date().toLocaleDateString("pt-BR")}`;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
    }
  }

  doc.save(`Treino_${alunoNome.replace(/\s+/g, "_")}_${semanaLabel.replace(/\//g, "-")}.pdf`);
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not available"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
