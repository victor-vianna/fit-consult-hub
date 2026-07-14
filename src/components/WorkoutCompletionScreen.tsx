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
  Download,
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

function loadCanvasImage(src?: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCircularLogo(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  radius: number,
  fallbackText = "FC",
  borderColor = "rgba(255,255,255,0.78)",
  borderWidth = 2
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (image) {
    const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  } else {
    const fallbackGradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    fallbackGradient.addColorStop(0, "#2563eb");
    fallbackGradient.addColorStop(1, "#06b6d4");
    ctx.fillStyle = fallbackGradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${Math.round(radius * 0.54)}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fallbackText.slice(0, 3).toUpperCase(), x, y + 2);
  }

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTrophyIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#facc15";
  ctx.strokeStyle = "#fde68a";
  ctx.lineWidth = Math.max(3, size * 0.055);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(size * 0.28, size * 0.18);
  ctx.lineTo(size * 0.72, size * 0.18);
  ctx.quadraticCurveTo(size * 0.68, size * 0.56, size * 0.5, size * 0.64);
  ctx.quadraticCurveTo(size * 0.32, size * 0.56, size * 0.28, size * 0.18);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(size * 0.28, size * 0.25);
  ctx.quadraticCurveTo(size * 0.1, size * 0.27, size * 0.12, size * 0.44);
  ctx.quadraticCurveTo(size * 0.14, size * 0.58, size * 0.35, size * 0.56);
  ctx.moveTo(size * 0.72, size * 0.25);
  ctx.quadraticCurveTo(size * 0.9, size * 0.27, size * 0.88, size * 0.44);
  ctx.quadraticCurveTo(size * 0.86, size * 0.58, size * 0.65, size * 0.56);
  ctx.stroke();

  ctx.fillStyle = "#facc15";
  ctx.fillRect(size * 0.45, size * 0.62, size * 0.1, size * 0.18);
  ctx.beginPath();
  ctx.roundRect(size * 0.32, size * 0.78, size * 0.36, size * 0.08, size * 0.03);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(size * 0.22, size * 0.87, size * 0.56, size * 0.1, size * 0.04);
  ctx.fill();
  ctx.restore();
}

function drawCenteredFitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  initialSize: number,
  font: string,
  color: string,
  weight = "800"
) {
  let size = initialSize;
  do {
    ctx.font = `${weight} ${size}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth || size <= 28) break;
    size -= 4;
  } while (size > 28);

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

function drawWrappedCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);
  const visibleLines = lines.slice(0, maxLines);

  if (lines.length > maxLines && visibleLines.length > 0) {
    let lastLine = visibleLines[visibleLines.length - 1];
    while (ctx.measureText(`${lastLine}...`).width > maxWidth && lastLine.length > 0) {
      lastLine = lastLine.slice(0, -1);
    }
    visibleLines[visibleLines.length - 1] = `${lastLine.trim()}...`;
  }

  visibleLines.forEach((visibleLine, index) => {
    ctx.fillText(visibleLine, x, y + index * lineHeight);
  });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function WorkoutCompletionScreen({
  data,
  treinoId,
  onClose,
}: WorkoutCompletionScreenProps) {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [fallbackStoryFile, setFallbackStoryFile] = useState<File | null>(null);

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
    const { data: sessaoData } = await supabase
      .from("treino_sessoes")
      .select("personal_id")
      .eq("treino_semanal_id", treinoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: personalSettings } = sessaoData?.personal_id
      ? await supabase
          .from("personal_settings")
          .select("logo_url")
          .eq("personal_id", sessaoData.personal_id)
          .maybeSingle()
      : { data: null };

    const logoImage = await loadCanvasImage(personalSettings?.logo_url);
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, "#0a0f18");
    gradient.addColorStop(1, "#0e1e35");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath();
    ctx.arc(540, 210, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawCircularLogo(ctx, logoImage, 540, 210, 80, "FC", "#ffffff", 2);

    const title = "Treino conclu\u00eddo";
    ctx.font = "900 86px Arial, sans-serif";
    const titleWidth = ctx.measureText(title).width;
    const trophySize = 80;
    const titleGroupWidth = trophySize + 28 + titleWidth;
    drawTrophyIcon(ctx, 540 - titleGroupWidth / 2, 360, trophySize);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(title, 540 - titleGroupWidth / 2 + trophySize + 28, 427);

    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.font = "500 36px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.data, 540, 490);

    ctx.fillStyle = "rgba(255,255,255,0.58)";
    ctx.font = "700 32px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Tempo total", 540, 665);

    ctx.shadowColor = "rgba(59, 130, 246, 0.42)";
    ctx.shadowBlur = 26;
    drawCenteredFitText(
      ctx,
      tempoExibido,
      540,
      815,
      820,
      168,
      "Arial, sans-serif",
      "#3b82f6",
      "900"
    );
    ctx.shadowBlur = 0;

    const stats = [
      {
        label: "Exerc\u00edcios",
        value: `${data.exerciciosConcluidos}/${data.exerciciosTotal}`,
      },
      {
        label: "Cargas",
        value: String(data.cargasRegistradas),
      },
      {
        label: "Hor\u00e1rio",
        value: `${data.horaInicio} - ${data.horaFim}`,
      },
    ];
    const statWidth = 286;
    const statHeight = 190;
    const statGap = 30;
    const statsStartX = (1080 - statWidth * 3 - statGap * 2) / 2;
    const statsY = 1010;

    stats.forEach((stat, index) => {
      const x = statsStartX + index * (statWidth + statGap);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.roundRect(x, statsY, statWidth, statHeight, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "700 28px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(stat.label, x + statWidth / 2, statsY + 62);

      drawCenteredFitText(
        ctx,
        stat.value,
        x + statWidth / 2,
        statsY + 134,
        statWidth - 44,
        index === 2 ? 36 : 56,
        "Arial, sans-serif",
        "#ffffff",
        "850"
      );
    });

    ctx.fillStyle = "rgba(255,255,255,0.76)";
    ctx.font = "italic 38px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    drawWrappedCenteredText(
      ctx,
      data.mensagemMotivacional,
      540,
      1365,
      700,
      54,
      3
    );

    drawCircularLogo(ctx, logoImage, 540, 1642, 58, "FC", "rgba(255,255,255,0.72)", 2);

    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "600 26px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FitConsult", 540, 1738);

    return new Promise<File | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        resolve(
          new File([blob], "treino-fitconsult.png", {
            type: "image/png",
          })
        );
      }, "image/png");
    });
  };

  const handleShare = async () => {
    setIsSharing(true);

    try {
      const storyFile = await createStoryImage();
      if (!storyFile) {
        toast.error("Erro ao gerar imagem do story");
        return;
      }

      const shareData: ShareData = {
        title: "Treino FitConsult",
        text: "Treino concluido no FitConsult",
        files: [storyFile],
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        try {
          await navigator.share(shareData);
          setFallbackStoryFile(null);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }

      setFallbackStoryFile(storyFile);
      toast.info("Compartilhamento indisponivel. Baixe a imagem para enviar manualmente.");
    } finally {
      setIsSharing(false);
    }
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
                      disabled={isSharing}
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
                disabled={isSharing}
                className="h-10 w-full shrink-0 gap-2 sm:h-11"
              >
                <Share2 className="h-4 w-4" />
                {isSharing ? "Gerando imagem..." : "Compartilhar story"}
              </Button>

              {fallbackStoryFile && (
                <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-center">
                  <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                    Salve a imagem e compartilhe manualmente no Instagram.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9 w-full gap-2"
                    onClick={() => downloadFile(fallbackStoryFile)}
                  >
                    <Download className="h-4 w-4" />
                    Baixar imagem
                  </Button>
                </div>
              )}

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
