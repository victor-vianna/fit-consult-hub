// src/components/WorkoutCompletionScreen.tsx
import { useLayoutEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Trophy,
  Share2,
  Home,
  Star,
  CheckCircle2,
  Clock,
  Dumbbell,
  MessageSquareText,
} from "lucide-react";
import { motion } from "framer-motion";
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

  useLayoutEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      overflowX: body.style.overflowX,
      position: body.style.position,
      top: body.style.top,
      bottom: body.style.bottom,
      left: body.style.left,
      right: body.style.right,
      overscrollBehavior: body.style.overscrollBehavior,
      width: body.style.width,
    };
    const previousRootStyles = {
      overflow: root.style.overflow,
      overflowX: root.style.overflowX,
      overscrollBehavior: root.style.overscrollBehavior,
    };
    const scrollY = window.scrollY;

    body.style.overflow = "hidden";
    body.style.overflowX = "hidden";
    body.style.position = "fixed";
    body.style.top = "0";
    body.style.bottom = "0";
    body.style.left = "0";
    body.style.right = "0";
    body.style.overscrollBehavior = "none";
    body.style.width = "100%";
    root.style.overflow = "hidden";
    root.style.overflowX = "hidden";
    root.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyStyles.overflow;
      body.style.overflowX = previousBodyStyles.overflowX;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.bottom = previousBodyStyles.bottom;
      body.style.left = previousBodyStyles.left;
      body.style.right = previousBodyStyles.right;
      body.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
      body.style.width = previousBodyStyles.width;
      root.style.overflow = previousRootStyles.overflow;
      root.style.overflowX = previousRootStyles.overflowX;
      root.style.overscrollBehavior = previousRootStyles.overscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, []);

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
    <Dialog open modal>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[1000] touch-none bg-black/75" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
          className="fixed inset-0 z-[1001] flex h-[100svh] w-screen items-center justify-center overflow-hidden p-3"
      >
          <DialogPrimitive.Content
            onEscapeKeyDown={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            className="max-h-[90svh] w-[90vw] max-w-[420px] overflow-y-auto overscroll-contain rounded-xl outline-none"
          >
            <DialogTitle className="sr-only">Treino concluido</DialogTitle>
            <DialogDescription className="sr-only">
              Resumo do treino finalizado e envio opcional de feedback para o personal.
            </DialogDescription>

            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
            >
              <Card className="border-2 shadow-xl">
                <CardContent className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-6">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Compartilhar"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>

              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 sm:h-16 sm:w-16"
                >
                  <Trophy className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
                </motion.div>
              </div>

              <div className="text-center">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Treino concluido
                </h1>
                <p className="text-sm text-muted-foreground">{data.data}</p>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tempo total
                </p>
                <p className="font-mono text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  {tempoExibido}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border bg-muted/30 px-2 py-2 sm:py-3">
                  <p className="mb-1 flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Tempo
                  </p>
                  <p className="text-xs font-semibold tabular-nums">
                    {data.horaInicio} - {data.horaFim}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-2 py-2 sm:py-3">
                  <p className="mb-1 flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    Feitos
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {data.exerciciosConcluidos}/{data.exerciciosTotal}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-2 py-2 sm:py-3">
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
                className="h-10 w-full shrink-0 gap-2 sm:h-11"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar story
              </Button>

              <p className="line-clamp-2 px-2 text-center text-xs italic text-muted-foreground sm:text-sm">
                {data.mensagemMotivacional}
              </p>

              <section className="rounded-xl border border-primary/35 bg-primary/5 p-3 shadow-sm ring-1 ring-primary/10">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <MessageSquareText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight text-foreground">
                      Feedback para o personal
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avalie o treino em poucos segundos.
                    </p>
                  </div>
                </div>

                <div className="mb-2 flex justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="rounded-full p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`${star} estrelas`}
                    >
                      <Star
                        className={`h-6 w-6 sm:h-7 sm:w-7 ${
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
                  className="min-h-[56px] resize-none text-sm sm:min-h-[68px]"
                  rows={2}
                />
              </section>

              <Button
                onClick={handleVoltar}
                className="h-11 w-full shrink-0 gap-2 text-base sm:h-12"
                disabled={isSubmitting}
              >
                <Home className="h-5 w-5" />
                {isSubmitting ? "Enviando..." : "Finalizar"}
              </Button>
                </CardContent>
              </Card>
            </motion.div>
          </DialogPrimitive.Content>
      </motion.div>
      </DialogPortal>
    </Dialog>
  );
}
