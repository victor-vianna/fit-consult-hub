import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Quote, Reply, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  normalizeFeedbackReplyPreview,
  queueFeedbackReplyContext,
} from "@/utils/feedbackReplyContext";

interface TreinoFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunoId: string;
  alunoNome: string;
  personalId: string;
  themeColor?: string;
  rating?: number | null;
  comentario?: string | null;
  treinoId?: string | null;
  createdAt?: string;
}

function buildWorkoutFeedbackPreview(rating?: number | null, comentario?: string | null) {
  const parts = [
    rating ? `Avaliacao: ${rating}/5` : null,
    comentario?.trim() ? comentario.trim() : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" - ") : "Feedback de treino enviado pelo aluno";
}

export function TreinoFeedbackModal({
  open,
  onOpenChange,
  alunoId,
  alunoNome,
  personalId,
  themeColor,
  rating,
  comentario,
  treinoId,
  createdAt,
}: TreinoFeedbackModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const previewCitation = normalizeFeedbackReplyPreview(
    buildWorkoutFeedbackPreview(rating, comentario),
    "Feedback de treino enviado pelo aluno"
  );

  const handleStartReply = () => {
    queueFeedbackReplyContext({
      id: `workout-feedback:${treinoId || alunoId}:${createdAt || "latest"}`,
      personalId,
      alunoId,
      senderId: personalId,
      sourceType: "workout_feedback",
      sourceId: treinoId || `feedback-treino:${alunoId}`,
      authorName: alunoNome,
      title: "Feedback de treino",
      preview: previewCitation,
      createdAt: createdAt || null,
    });

    toast({
      title: "Citacao anexada ao chat",
      description: `Escreva sua resposta para ${alunoNome}.`,
    });

    onOpenChange(false);
    navigate(`/chat?aluno=${alunoId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
            >
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>Feedback de treino</span>
              <p className="text-sm font-normal text-muted-foreground">{alunoNome}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Card>
            <CardContent className="space-y-3 pt-4">
              {rating ? (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-muted-foreground">Avaliacao:</span>
                  <span className="text-sm font-semibold">{rating}/5</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem avaliacao</p>
              )}
              {comentario ? (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Comentario</p>
                  <p className="whitespace-pre-wrap text-sm">{comentario}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem comentario</p>
              )}
            </CardContent>
          </Card>

          <div
            className="flex gap-2 rounded-lg border-l-4 bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            style={{ borderLeftColor: themeColor || "hsl(var(--primary))" }}
          >
            <Quote className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
            <div className="min-w-0">
              <p className="font-medium text-foreground/80">Feedback de treino</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
