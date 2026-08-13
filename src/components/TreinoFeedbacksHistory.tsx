import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDisplayDateTime } from "@/utils/dateFormat";
import { Dumbbell, MessageSquareText, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TreinoFeedbacksHistoryProps {
  profileId: string;
  personalId: string;
  studentName: string;
  themeColor?: string;
}

interface TreinoFeedbackNotification {
  id: string;
  created_at: string;
  dados: {
    aluno_id?: string | null;
    aluno_nome?: string | null;
    comentario?: string | null;
    rating?: number | string | null;
    treino_id?: string | null;
  } | null;
}

interface TreinoFeedbackItem {
  id: string;
  createdAt: string;
  comentario: string | null;
  rating: number | null;
  treinoId: string | null;
}

function normalizeRating(value: number | string | null | undefined) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return Math.min(5, Math.max(1, Math.round(rating)));
}

function RatingStars({ rating }: { rating: number | null }) {
  return (
    <div className="flex items-center gap-1" aria-label={rating ? `${rating} estrelas` : "Sem avaliacao"}>
      {Array.from({ length: 5 }).map((_, index) => {
        const active = rating !== null && index < rating;
        return (
          <Star
            key={index}
            className={`h-4 w-4 ${
              active
                ? "fill-yellow-400 text-yellow-500"
                : "text-muted-foreground/35"
            }`}
          />
        );
      })}
    </div>
  );
}

export function TreinoFeedbacksHistory({
  profileId,
  personalId,
  studentName,
  themeColor,
}: TreinoFeedbacksHistoryProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<TreinoFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("notificacoes")
          .select("id, created_at, dados")
          .eq("destinatario_id", personalId)
          .eq("tipo", "feedback_treino")
          .filter("dados->>aluno_id", "eq", profileId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const items = ((data || []) as TreinoFeedbackNotification[]).map((item) => ({
          id: item.id,
          createdAt: item.created_at,
          comentario: item.dados?.comentario?.trim() || null,
          rating: normalizeRating(item.dados?.rating),
          treinoId: item.dados?.treino_id || null,
        }));

        setFeedbacks(items);
      } catch (error: any) {
        console.error("Erro ao buscar feedbacks de treino:", error);
        toast({
          title: "Erro ao carregar feedbacks de treino",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [personalId, profileId, toast]);

  const averageRating = useMemo(() => {
    const ratings = feedbacks
      .map((feedback) => feedback.rating)
      .filter((rating): rating is number => rating !== null);

    if (ratings.length === 0) return null;
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }, [feedbacks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4"
            style={{
              borderColor: themeColor ? `${themeColor}40` : "rgba(0, 0, 0, 0.1)",
              borderTopColor: themeColor || "#000000",
            }}
          />
          <p className="text-muted-foreground">Carregando feedbacks de treino...</p>
        </div>
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <Card className="border-2 shadow-md">
        <CardContent className="py-16 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <MessageSquareText className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            Nenhum feedback de treino registrado
          </h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            As avaliacoes enviadas por {studentName} ao finalizar um treino
            aparecerao aqui, separadas dos feedbacks semanais.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-2 shadow-lg">
        <div
          className="h-2"
          style={{
            background: `linear-gradient(90deg, ${
              themeColor || "hsl(var(--primary))"
            }, ${themeColor || "hsl(var(--primary))"}80)`,
          }}
        />
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
              >
                <MessageSquareText className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="mb-2 text-2xl">
                  Feedbacks de Treino de {studentName}
                </CardTitle>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Historico das avaliacoes enviadas logo apos a conclusao dos
                  treinos. Estes registros sao separados dos feedbacks semanais.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Dumbbell className="h-3.5 w-3.5" />
                {feedbacks.length} envio{feedbacks.length === 1 ? "" : "s"}
              </Badge>
              {averageRating !== null && (
                <Badge className="gap-1 bg-yellow-500 text-black">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Media {averageRating.toFixed(1)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {feedbacks.map((feedback) => (
          <Card key={feedback.id} className="border-2">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <RatingStars rating={feedback.rating} />
                    <Badge variant="secondary">
                      {feedback.rating ? `${feedback.rating}/5` : "Sem estrelas"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDisplayDateTime(feedback.createdAt)}
                    </span>
                  </div>

                  {feedback.comentario ? (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {feedback.comentario}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      O aluno enviou apenas a avaliacao por estrelas.
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={() => navigate(`/chat?aluno=${profileId}`)}
                >
                  <MessageSquareText className="h-4 w-4" />
                  Responder no chat
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
