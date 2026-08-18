import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Quote, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  normalizeFeedbackReplyPreview,
  queueFeedbackReplyContext,
} from "@/utils/feedbackReplyContext";

interface FeedbackReplyProps {
  checkinId: string;
  alunoId: string;
  personalId: string;
  alunoNome: string;
  themeColor?: string;
  checkin?: Record<string, any> | null;
  onStartReply?: () => void;
}

const CITABLE_FIELDS: Array<{ key: string; label: string; type: "text" | "score" }> = [
  { key: "duvidas", label: "Duvidas", type: "text" },
  { key: "comentario_saude", label: "Saude", type: "text" },
  { key: "dores_corpo", label: "Dores no corpo", type: "text" },
  { key: "estado_emocional", label: "Estado emocional", type: "text" },
  { key: "mudanca_rotina", label: "Mudanca na rotina", type: "text" },
  { key: "justificativa_empenho", label: "Justificativa do empenho", type: "text" },
  { key: "justificativa_alimentacao", label: "Justificativa da alimentacao", type: "text" },
  { key: "justificativa_sono", label: "Justificativa do sono", type: "text" },
  { key: "nota_empenho", label: "Nota de empenho", type: "score" },
  { key: "nota_alimentacao", label: "Nota de alimentacao", type: "score" },
  { key: "nota_sono", label: "Nota de sono", type: "score" },
  { key: "saude_geral", label: "Saude geral", type: "score" },
  { key: "qualidade_vida", label: "Qualidade de vida", type: "score" },
  { key: "nivel_dificuldade", label: "Nivel de dificuldade", type: "score" },
];

const GENERAL = "__general__";

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function buildWeeklyTitle(checkin?: Record<string, any> | null) {
  if (checkin?.numero_semana && checkin?.ano) {
    return `Feedback semanal - Semana ${checkin.numero_semana}/${checkin.ano}`;
  }

  return "Feedback semanal";
}

function buildGeneralPreview(checkin?: Record<string, any> | null) {
  if (!checkin) return "Feedback semanal enviado pelo aluno";

  const textField = CITABLE_FIELDS.find((field) => field.type === "text" && hasValue(checkin[field.key]));
  if (textField) return `${textField.label}: ${String(checkin[textField.key])}`;

  const scores = [
    hasValue(checkin.nota_empenho) ? `Empenho ${checkin.nota_empenho}/10` : null,
    hasValue(checkin.nota_alimentacao) ? `Alimentacao ${checkin.nota_alimentacao}/10` : null,
    hasValue(checkin.nota_sono) ? `Sono ${checkin.nota_sono}/10` : null,
  ].filter(Boolean);

  return scores.length ? scores.join(", ") : "Feedback semanal enviado pelo aluno";
}

export function FeedbackReply({
  checkinId,
  alunoId,
  personalId,
  alunoNome,
  themeColor,
  checkin,
  onStartReply,
}: FeedbackReplyProps) {
  const [selectedField, setSelectedField] = useState<string>(GENERAL);
  const { toast } = useToast();
  const navigate = useNavigate();

  const availableFields = useMemo(() => {
    if (!checkin) return [];
    return CITABLE_FIELDS.filter((field) => hasValue(checkin[field.key]));
  }, [checkin]);

  const buildSelectedCitation = () => {
    if (selectedField === GENERAL || !checkin) return null;

    const field = CITABLE_FIELDS.find((item) => item.key === selectedField);
    if (!field) return null;

    const value = checkin[field.key];
    if (!hasValue(value)) return null;

    const formattedValue = field.type === "score" ? `${value}/10` : String(value);
    return `${field.label}: ${formattedValue}`;
  };

  const previewCitation = normalizeFeedbackReplyPreview(
    buildSelectedCitation() || buildGeneralPreview(checkin),
    "Feedback semanal enviado pelo aluno"
  );

  const handleStartReply = () => {
    queueFeedbackReplyContext({
      id: `weekly-feedback:${checkinId}:${selectedField}`,
      personalId,
      alunoId,
      senderId: personalId,
      sourceType: "weekly_feedback",
      sourceId: checkinId,
      authorName: alunoNome,
      title: buildWeeklyTitle(checkin),
      preview: previewCitation,
      createdAt: checkin?.preenchido_em || null,
    });

    toast({
      title: "Citacao anexada ao chat",
      description: `Escreva sua resposta para ${alunoNome}.`,
    });

    onStartReply?.();
    navigate(`/chat?aluno=${alunoId}`);
  };

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" style={{ color: themeColor }} />
          Responder feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {availableFields.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Responder sobre:
            </label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GENERAL}>Feedback geral</SelectItem>
                {availableFields.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div
          className="flex gap-2 rounded-lg border-l-4 bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          style={{ borderLeftColor: themeColor || "hsl(var(--primary))" }}
        >
          <Quote className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
          <div className="min-w-0">
            <p className="font-medium text-foreground/80">{buildWeeklyTitle(checkin)}</p>
            <p className="truncate">{previewCitation}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            style={{ backgroundColor: themeColor || undefined }}
            className="gap-2"
            onClick={handleStartReply}
          >
            <Reply className="h-3 w-3" />
            Responder no chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
