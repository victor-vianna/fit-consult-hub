// src/components/WorkoutCompletionScreen.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Trophy,
  Share2,
  Home,
  Star,
  ChevronDown,
  CheckCircle2,
  Clock,
  Dumbbell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkoutCompletionData } from "@/hooks/useWorkoutTimer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  createNotificationId,
  dispatchPushNotification,
} from "@/utils/pushNotifications";
import { firstName, previewNotificationMessage } from "@/utils/notificationText";

interface WorkoutCompletionScreenProps {
  data: WorkoutCompletionData;
  treinoId: string;
  onClose: () => void;
}

export function WorkoutCompletionScreen({
  data,
  treinoId,
  onClose,
}: WorkoutCompletionScreenProps) {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const tempoExibido = (() => {
    const parts = data.tempoFormatado.split(":");
    if (parts.length === 3 && parts[0] === "00") {
      return parts.slice(1).join(":");
    }
    return data.tempoFormatado;
  })();

  const enviarFeedback = async () => {
    if (!rating && !feedback.trim()) return;
    setIsSubmitting(true);

    try {
      const { data: sessaoData } = await supabase
        .from("treino_sessoes")
        .select("personal_id, profile_id")
        .eq("treino_semanal_id", treinoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (sessaoData?.personal_id) {
        const { data: alunoProfile } = await supabase
          .from("profiles")
          .select("nome")
          .eq("id", sessaoData.profile_id)
          .single();

        const notificacaoId = createNotificationId();
        const { error: notificacaoError } = await supabase
          .from("notificacoes")
          .insert({
            id: notificacaoId,
            destinatario_id: sessaoData.personal_id,
            tipo: "feedback_treino",
            titulo: "Novo feedback",
            mensagem: previewNotificationMessage(
              `${firstName(alunoProfile?.nome)} avaliou com ${rating || 0} estrelas`
            ),
            dados: {
              treino_id: treinoId,
              rating,
              comentario: feedback,
              aluno_id: sessaoData.profile_id,
              aluno_nome: alunoProfile?.nome || null,
              tipo_acao: "feedback",
            },
            lida: false,
          });

        if (notificacaoError) throw notificacaoError;
        await dispatchPushNotification(notificacaoId);
      }

      toast.success("Feedback enviado!");
    } catch (err) {
      console.error("Erro ao enviar feedback:", err);
      toast.error("Erro ao enviar feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createStoryImage = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, "#07111f");
    gradient.addColorStop(0.55, "#0b1628");
    gradient.addColorStop(1, "#05070d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = "rgba(59, 130, 246, 0.22)";
    ctx.beginPath();
    ctx.arc(900, 220, 220, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.roundRect(92, 240, 896, 1180, 44);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 76px Arial, sans-serif";
    ctx.fillText("Treino concluido", 140, 380);

    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.font = "400 34px Arial, sans-serif";
    ctx.fillText(data.data, 140, 440);

    ctx.fillStyle = "#60a5fa";
    ctx.font = "800 118px Arial, sans-serif";
    ctx.fillText(tempoExibido, 140, 650);

    const metrics = [
      ["Exercicios", `${data.exerciciosConcluidos}/${data.exerciciosTotal}`],
      ["Cargas registradas", String(data.cargasRegistradas)],
      ["Inicio / fim", `${data.horaInicio} - ${data.horaFim}`],
    ];

    metrics.forEach(([label, value], index) => {
      const y = 820 + index * 170;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.roundRect(140, y, 800, 112, 24);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.62)";
      ctx.font = "500 28px Arial, sans-serif";
      ctx.fillText(label, 180, y + 42);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 42px Arial, sans-serif";
      ctx.fillText(value, 180, y + 88);
    });

    ctx.fillStyle = "rgba(255,255,255,0.74)";
    ctx.font = "400 32px Arial, sans-serif";
    ctx.fillText(data.mensagemMotivacional.slice(0, 92), 140, 1320);

    return new Promise<File | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        resolve(
          new File([blob], "resumo-treino-story.png", {
            type: "image/png",
          })
        );
      }, "image/png");
    });
  };

  const handleShare = async () => {
    const storyFile = await createStoryImage();

    if (storyFile && navigator.share) {
      const shareData: ShareData = {
        title: "Treino concluido",
        text: data.mensagemMotivacional,
        files: [storyFile],
      };

      try {
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch {
        return;
      }
    }

    if (storyFile) {
      const url = URL.createObjectURL(storyFile);
      const link = document.createElement("a");
      link.href = url;
      link.download = storyFile.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Imagem do story gerada. Escolha a imagem no Instagram.");
    }

    window.setTimeout(() => {
      window.location.href = "instagram://story-camera";
    }, 350);
  };

  const handleVoltar = async () => {
    if (rating || feedback.trim()) {
      await enviarFeedback();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background p-4"
      >
        <button
          onClick={handleShare}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Compartilhar"
        >
          <Share2 className="h-5 w-5" />
        </button>

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full max-w-md"
        >
          <Card className="border-2 shadow-xl">
            <CardContent className="space-y-6 p-8">
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
                >
                  <Trophy className="h-10 w-10 text-primary" />
                </motion.div>
              </div>

              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold tracking-tight">
                  Treino concluido
                </h1>
                <p className="text-sm text-muted-foreground">{data.data}</p>
              </div>

              <div className="space-y-1.5 py-2 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tempo total
                </p>
                <p className="font-mono text-5xl font-bold tracking-tight text-foreground">
                  {tempoExibido}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border bg-muted/30 px-2 py-3">
                  <p className="mb-1 flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Tempo
                  </p>
                  <p className="text-xs font-semibold tabular-nums">
                    {data.horaInicio} - {data.horaFim}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-2 py-3">
                  <p className="mb-1 flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    Feitos
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {data.exerciciosConcluidos}/{data.exerciciosTotal}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-2 py-3">
                  <p className="mb-1 flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Dumbbell className="h-3 w-3" />
                    Cargas
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {data.cargasRegistradas}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleShare}
                className="h-11 w-full gap-2"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar story
              </Button>

              <p className="px-2 text-center text-sm italic text-muted-foreground">
                {data.mensagemMotivacional}
              </p>

              <Collapsible open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-center gap-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                    Deixar feedback para o personal
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        feedbackOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="flex justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-0.5 transition-transform hover:scale-110"
                        aria-label={`${star} estrelas`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            rating && star <= rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Como foi o treino? (opcional)"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    className="resize-none text-sm"
                    rows={3}
                  />
                </CollapsibleContent>
              </Collapsible>

              <Button
                onClick={handleVoltar}
                className="h-12 w-full gap-2 text-base"
                disabled={isSubmitting}
              >
                <Home className="h-5 w-5" />
                {isSubmitting ? "Enviando..." : "Finalizar"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
