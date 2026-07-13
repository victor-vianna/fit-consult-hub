// components/CompactExerciseCard.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Dumbbell,
  MessageSquareText,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InlinePesoInput } from "@/components/InlinePesoInput";
import { supabase } from "@/integrations/supabase/client";
import { useWeightHistory } from "@/hooks/useWeightHistory";
import { formatDisplayMonthDay } from "@/utils/dateFormat";

interface CompactExerciseCardProps {
  exercicio: {
    id: string;
    nome: string;
    link_video?: string | null;
    series?: number;
    series_concluidas?: number | null;
    repeticoes?: string;
    descanso?: number;
    carga?: string | null;
    peso_executado?: string | null;
    observacoes?: string | null;
    concluido?: boolean;
    thumbnail?: string | null;
  };
  index: number;
  onToggleConcluido?: (id: string, concluido: boolean) => Promise<any>;
  onRegisterSerie?: (id: string, seriesConcluidas: number, totalSeries: number) => Promise<any>;
  isWorkoutActive?: boolean;
  profileId?: string;
  variant?: "list" | "carousel";
  className?: string;
  treinoId?: string | null;
  highlighted?: boolean;
  fitContainer?: boolean;
}

function parseWeight(value: string | number | null | undefined) {
  if (value === null || value === undefined) return NaN;
  return Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
}

function formatWeight(value: number) {
  if (!Number.isFinite(value)) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getSuggestedWeight(lastWeight: string | null) {
  const parsed = parseWeight(lastWeight);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  const increment = parsed < 10 ? 1 : parsed < 40 ? 2 : 2.5;
  return formatWeight(parsed + increment);
}

function getYoutubeId(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");

      const [, type, id] = url.pathname.split("/");
      if (["embed", "shorts"].includes(type) && id) return id;
    }
  } catch {
    return null;
  }

  return null;
}

function getVideoThumbnail(videoUrl?: string | null, fallback?: string | null) {
  if (fallback) return fallback;

  const youtubeId = getYoutubeId(videoUrl);
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

  return "/exercise-thumbnail.svg";
}

function getExternalVideoUrl(videoUrl?: string | null) {
  if (!videoUrl) return null;

  const youtubeId = getYoutubeId(videoUrl);
  if (youtubeId) return `https://www.youtube.com/watch?v=${youtubeId}`;

  return videoUrl;
}

function formatPrescription(exercicio: CompactExerciseCardProps["exercicio"]) {
  const series = exercicio.series || 3;
  const reps = exercicio.repeticoes || "12";
  return `${series}x${reps}`;
}

function formatCarga(carga?: string | null, ultimoPeso?: string | null) {
  const value = carga || ultimoPeso;
  return value ? `${value}kg` : "carga livre";
}

function getCompletedSeries(exercicio: CompactExerciseCardProps["exercicio"]) {
  const total = Math.max(1, exercicio.series || 3);
  if (exercicio.concluido) return total;
  return Math.min(Math.max(0, exercicio.series_concluidas ?? 0), total);
}

export function CompactExerciseCard({
  exercicio,
  index,
  onToggleConcluido,
  onRegisterSerie,
  isWorkoutActive = false,
  variant = "list",
  className,
  treinoId,
  highlighted = false,
  profileId,
  fitContainer = false,
}: CompactExerciseCardProps) {
  const [localConcluido, setLocalConcluido] = useState(
    exercicio.concluido || false
  );
  const [localPesoExecutado, setLocalPesoExecutado] = useState(
    exercicio.peso_executado || null
  );
  const [expanded, setExpanded] = useState(highlighted);
  const [completedSeries, setCompletedSeries] = useState(
    getCompletedSeries(exercicio)
  );

  const isCarousel = variant === "carousel";
  const totalSeries = Math.max(1, exercicio.series || 3);
  const currentSeries = Math.min(completedSeries + 1, totalSeries);
  const weightHistory = useWeightHistory(exercicio.nome, profileId || null);
  const suggestedWeight = getSuggestedWeight(weightHistory.ultimoPeso);
  const externalVideoUrl = getExternalVideoUrl(exercicio.link_video);
  const thumbnail = externalVideoUrl
    ? getVideoThumbnail(exercicio.link_video, exercicio.thumbnail)
    : null;
  const personalNote = exercicio.observacoes?.trim();

  useEffect(() => {
    setLocalConcluido(exercicio.concluido || false);
    setLocalPesoExecutado(exercicio.peso_executado || null);
    setCompletedSeries(getCompletedSeries(exercicio));
  }, [exercicio.id, exercicio.concluido, exercicio.peso_executado, exercicio.series, exercicio.series_concluidas]);

  useEffect(() => {
    if (highlighted) setExpanded(true);
  }, [highlighted]);

  useEffect(() => {
    if (!isWorkoutActive) {
      setLocalConcluido(false);
      setCompletedSeries(0);
      return;
    }

    setLocalConcluido(exercicio.concluido || false);
    setCompletedSeries(getCompletedSeries(exercicio));
  }, [isWorkoutActive, exercicio]);

  const handleToggle = async (target?: boolean) => {
    const novoValor = target ?? !localConcluido;
    const nextSeries = novoValor ? totalSeries : 0;
    setLocalConcluido(novoValor);
    setCompletedSeries(nextSeries);

    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    try {
      await onRegisterSerie?.(exercicio.id, nextSeries, totalSeries);
      await onToggleConcluido?.(exercicio.id, novoValor);
    } catch (error) {
      console.error("Erro ao marcar exercicio:", error);
      setLocalConcluido(!novoValor);
      setCompletedSeries(!novoValor ? totalSeries : 0);
    }
  };

  const handleSavePeso = async (exercicioId: string, peso: string) => {
    try {
      const { error } = await supabase
        .from("exercicios")
        .update({ peso_executado: peso })
        .eq("id", exercicioId);

      if (error) throw error;
      setLocalPesoExecutado(peso);
    } catch (error) {
      console.error("Erro ao atualizar peso:", error);
      throw error;
    }
  };

  const handleRegisterSet = async () => {
    const nextCount = Math.min(completedSeries + 1, totalSeries);
    setCompletedSeries(nextCount);
    await onRegisterSerie?.(exercicio.id, nextCount, totalSeries);

    if (nextCount >= totalSeries && !localConcluido) {
      await handleToggle(true);
    }
  };

  const compactSummary = useMemo(
    () =>
      `${formatPrescription(exercicio)} · ${formatCarga(
        exercicio.carga,
        weightHistory.ultimoPeso
      )}`,
    [exercicio, weightHistory.ultimoPeso]
  );

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-sm transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCarousel && !fitContainer
          ? "h-full min-h-[176px] min-w-[280px] snap-start sm:min-w-[300px]"
          : "",
        isCarousel && fitContainer ? "h-full min-h-[176px] min-w-0" : "",
        localConcluido && "border-green-500/30 bg-green-50/50 opacity-75 dark:bg-green-950/10",
        highlighted && "border-blue-500/60 bg-blue-950/10 ring-1 ring-blue-500/40",
        className
      )}
      data-workout-cache-item={exercicio.id}
      data-workout-treino-id={treinoId ?? undefined}
      data-workout-cache-type="exercise"
    >
      <CardContent className="p-0">
        <div
          className={cn(
            "flex items-center gap-3 p-3",
            isCarousel ? "min-h-[92px]" : "min-h-[82px] sm:min-h-[88px]"
          )}
        >
          {onToggleConcluido ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleToggle();
              }}
              aria-label={
                localConcluido
                  ? `Desmarcar ${exercicio.nome}`
                  : `Marcar ${exercicio.nome} como concluido`
              }
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              {localConcluido ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/60 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
              )}
            </button>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold text-muted-foreground">
              {index + 1}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "break-words text-sm font-semibold leading-tight text-foreground sm:text-base",
                localConcluido && "text-muted-foreground line-through"
              )}
            >
              {exercicio.nome}
            </p>
            <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
              {compactSummary}
            </p>
          </div>

          {externalVideoUrl && thumbnail && (
            <a
              href={externalVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              aria-label={`Abrir demonstracao de ${exercicio.nome} em nova aba`}
              title="Abrir demonstracao"
              className={cn(
                "relative shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm transition-transform active:scale-[0.98]",
                isCarousel ? "h-12 w-16" : "h-12 w-16 sm:h-14 sm:w-20"
              )}
            >
              <img
                src={thumbnail}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55">
                  <Play className="ml-0.5 h-3.5 w-3.5 text-white" />
                </span>
              </span>
            </a>
          )}

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>

        {expanded && (
          <div className="space-y-3 border-t bg-muted/10 p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Dumbbell className="h-3.5 w-3.5" />
                {formatPrescription(exercicio)}
              </span>
              {weightHistory.ultimoPeso && (
                  <span className="break-words text-right">
                  Última: {weightHistory.ultimoPeso}kg
                  {weightHistory.ultimaData
                    ? ` em ${formatDisplayMonthDay(weightHistory.ultimaData)}`
                    : ""}
                </span>
              )}
            </div>

            <div
              className={cn(
                "grid gap-3",
                !isCarousel && "sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.85fr)]"
              )}
            >
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Séries
                  </span>
                  <span className="text-xs text-muted-foreground">
                    série {Math.min(completedSeries + 1, totalSeries)} de {totalSeries}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: totalSeries }).map((_, seriesIndex) => {
                    const done = seriesIndex < completedSeries;
                    const active = seriesIndex + 1 === currentSeries && !localConcluido;
                    return (
                      <span
                        key={seriesIndex}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                          done && "border-green-500 bg-green-600 text-white",
                          active && "border-primary text-primary",
                          !done && !active && "border-border text-muted-foreground"
                        )}
                      >
                        {seriesIndex + 1}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border bg-background/70 p-3">
                <p className="mb-2 text-sm font-medium text-foreground">
                  Carga desta série
                </p>
                <InlinePesoInput
                  exercicioId={exercicio.id}
                  pesoRecomendado={exercicio.carga || null}
                  pesoExecutado={localPesoExecutado}
                  onSave={handleSavePeso}
                  ultimoPesoHistorico={weightHistory.ultimoPeso}
                  ultimaDataHistorico={weightHistory.ultimaData}
                  sugestaoPeso={suggestedWeight}
                  compact
                />
              </div>
            </div>

            {personalNote && (
              <div
                className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
                  <MessageSquareText className="h-3.5 w-3.5 text-primary" />
                  Observação do personal
                </div>
                <p className="whitespace-pre-line">{personalNote}</p>
              </div>
            )}

            <Button
              type="button"
              variant={localConcluido ? "outline" : "default"}
              size="lg"
              className="h-12 w-full gap-2 text-base font-semibold"
              disabled={!onToggleConcluido}
              onClick={(event) => {
                event.stopPropagation();
                if (localConcluido) {
                  handleToggle(false);
                } else {
                  handleRegisterSet();
                }
              }}
            >
              {localConcluido ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Exercício concluído
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4" />
                  Registrar série {currentSeries}
                </>
              )}
            </Button>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CompactExerciseCard;
