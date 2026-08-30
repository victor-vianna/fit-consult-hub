// components/CompactGroupCard.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompactExerciseCard } from "./CompactExerciseCard";

const TIPOS_AGRUPAMENTO = {
  normal: { label: "Normal" },
  "bi-set": { label: "Bi-Set" },
  "tri-set": { label: "Tri-Set" },
  "drop-set": { label: "Drop-Set" },
  superset: { label: "Super-Set" },
  circuito: { label: "Circuito" },
} as const;

interface CompactGroupCardProps {
  grupo: {
    grupo_id: string;
    tipo_agrupamento: string;
    descanso_entre_grupos?: number | null;
    exercicios: any[];
  };
  index: number;
  onToggleConcluido?: (id: string, concluido: boolean) => Promise<any>;
  onRegisterSerie?: (id: string, seriesConcluidas: number, totalSeries: number) => Promise<any>;
  onToggleGrupoConcluido?: (
    grupoId: string,
    concluido: boolean
  ) => Promise<void>;
  isWorkoutActive?: boolean;
  profileId?: string;
  treinoId?: string | null;
  resumeItemId?: string | null;
}

export function CompactGroupCard({
  grupo,
  index,
  onToggleConcluido,
  onRegisterSerie,
  onToggleGrupoConcluido,
  isWorkoutActive = false,
  profileId,
  treinoId,
  resumeItemId,
}: CompactGroupCardProps) {
  const [localExercicios, setLocalExercicios] = useState(grupo.exercicios);
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasCarouselOverflow, setHasCarouselOverflow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalExercicios(grupo.exercicios);
  }, [grupo.exercicios]);

  useEffect(() => {
    if (!isWorkoutActive) {
      setLocalExercicios((prev) =>
        prev.map((exercicio) => ({
          ...exercicio,
          concluido: false,
          series_concluidas: 0,
        }))
      );
      return;
    }

    setLocalExercicios(grupo.exercicios);
  }, [isWorkoutActive]);

  const tipoConfig =
    TIPOS_AGRUPAMENTO[
      grupo.tipo_agrupamento as keyof typeof TIPOS_AGRUPAMENTO
    ] || TIPOS_AGRUPAMENTO["bi-set"];

  const todosConcluidos =
    localExercicios.length > 0 && localExercicios.every((e) => e.concluido);
  const algumConcluido = localExercicios.some((e) => e.concluido);
  const concluidosCount = localExercicios.filter((e) => e.concluido).length;
  const hasMultipleExercises = localExercicios.length > 1;
  const fitExercisesOnScreen = localExercicios.length <= 2;
  const boundedActiveIndex = Math.min(
    activeIndex,
    Math.max(localExercicios.length - 1, 0)
  );
  const canNavigateCarousel = hasMultipleExercises && hasCarouselOverflow;
  const canGoPrev = canNavigateCarousel && boundedActiveIndex > 0;
  const canGoNext =
    canNavigateCarousel && boundedActiveIndex < localExercicios.length - 1;
  const exerciseIdsKey = localExercicios.map((exercicio) => exercicio.id).join("|");
  const hasHighlightedExercise = localExercicios.some(
    (exercicio) => exercicio.id === resumeItemId
  );

  useEffect(() => {
    if (hasHighlightedExercise) setExpanded(true);
  }, [hasHighlightedExercise]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, localExercicios.length);
    setActiveIndex((currentIndex) => {
      const lastIndex = localExercicios.length - 1;
      if (lastIndex < 0 || currentIndex > lastIndex) return 0;
      return Math.max(0, currentIndex);
    });
  }, [localExercicios.length]);

  useEffect(() => {
    setActiveIndex(0);
    scrollContainerRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [exerciseIdsKey]);

  const updateCarouselState = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container || !hasMultipleExercises) {
      setHasCarouselOverflow(false);
      setActiveIndex(0);
      return;
    }

    const hasOverflow = container.scrollWidth - container.clientWidth > 2;
    setHasCarouselOverflow(hasOverflow);

    if (!hasOverflow) {
      setActiveIndex(0);
      return;
    }

    const containerLeft = container.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    itemRefs.current.forEach((item, idx) => {
      if (!item) return;

      const distance = Math.abs(item.getBoundingClientRect().left - containerLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = idx;
      }
    });

    setActiveIndex((currentIndex) =>
      currentIndex === closestIndex ? currentIndex : closestIndex
    );
  }, [hasMultipleExercises]);

  const scheduleCarouselStateUpdate = useCallback(() => {
    if (rafRef.current !== null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateCarouselState();
    });
  }, [updateCarouselState]);

  useEffect(() => {
    if (!expanded || !hasMultipleExercises) {
      setHasCarouselOverflow(false);
      setActiveIndex(0);
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    updateCarouselState();

    if (typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(scheduleCarouselStateUpdate);
    resizeObserver.observe(container);
    itemRefs.current.forEach((item) => {
      if (item) resizeObserver.observe(item);
    });

    return () => resizeObserver.disconnect();
  }, [
    expanded,
    hasMultipleExercises,
    localExercicios.length,
    scheduleCarouselStateUpdate,
    updateCarouselState,
  ]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    },
    []
  );

  const scrollToExercise = useCallback(
    (targetIndex: number) => {
      const container = scrollContainerRef.current;
      if (!container || !canNavigateCarousel) return;

      const safeIndex = Math.min(
        Math.max(targetIndex, 0),
        Math.max(localExercicios.length - 1, 0)
      );
      const targetItem = itemRefs.current[safeIndex];
      if (!targetItem) return;

      const containerRect = container.getBoundingClientRect();
      const itemRect = targetItem.getBoundingClientRect();
      const left = container.scrollLeft + itemRect.left - containerRect.left;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      setActiveIndex(safeIndex);
      container.scrollTo({
        left,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [canNavigateCarousel, localExercicios.length]
  );

  const handleToggleGrupo = async () => {
    if (!onToggleGrupoConcluido) return;
    const novoStatus = !todosConcluidos;

    setLocalExercicios((prev) =>
      prev.map((e) => ({
        ...e,
        concluido: novoStatus,
        series_concluidas: novoStatus ? e.series || 1 : 0,
      }))
    );

    try {
      await onToggleGrupoConcluido(grupo.grupo_id, novoStatus);
    } catch (error) {
      console.error("Erro ao marcar grupo:", error);
      setLocalExercicios(grupo.exercicios);
    }
  };

  const handleToggleExercicio = async (id: string, concluido: boolean) => {
    setLocalExercicios((prev) =>
      prev.map((exercicio) =>
        exercicio.id === id
          ? {
              ...exercicio,
              concluido,
              series_concluidas: concluido ? exercicio.series || 1 : 0,
            }
          : exercicio
      )
    );

    await onToggleConcluido?.(id, concluido);
  };

  const handleRegisterSerie = async (
    id: string,
    seriesConcluidas: number,
    totalSeries: number
  ) => {
    const safeTotal = Math.max(1, totalSeries);
    const safeSeries = Math.min(Math.max(0, Math.floor(seriesConcluidas)), safeTotal);
    const concluido = safeSeries >= safeTotal;

    setLocalExercicios((prev) =>
      prev.map((exercicio) =>
        exercicio.id === id
          ? { ...exercicio, series_concluidas: safeSeries, concluido }
          : exercicio
      )
    );

    return onRegisterSerie?.(id, safeSeries, safeTotal);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-sm transition-colors",
        todosConcluidos && "border-green-500/30 bg-green-50/50 dark:bg-green-950/10",
        algumConcluido && !todosConcluidos && "border-yellow-500/50",
        hasHighlightedExercise && "border-blue-500/60 bg-blue-950/10 ring-1 ring-blue-500/40"
      )}
    >
      <CardContent className="p-0">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setExpanded((value) => !value);
            }
          }}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
        >
          {isWorkoutActive && onToggleGrupoConcluido ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                handleToggleGrupo();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  handleToggleGrupo();
                }
              }}
              aria-label="Marcar grupo combinado como concluido"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              {todosConcluidos ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/60 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
              )}
            </span>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold text-muted-foreground">
              {index + 1}
            </span>
          )}

          <div
            className={cn(
              "hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex",
              todosConcluidos
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-primary/10"
            )}
          >
            <LinkIcon
              className={cn(
                "h-5 w-5",
                todosConcluidos ? "text-green-600" : "text-primary"
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="shrink-0 text-xs font-semibold">
                {tipoConfig.label}
              </Badge>
              <p
                className={cn(
                  "break-words text-sm font-semibold leading-tight text-foreground sm:text-base",
                  todosConcluidos && "text-muted-foreground line-through"
                )}
              >
                {localExercicios.map((ex) => ex.nome).join(" + ")}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {localExercicios.length} exercicios · {concluidosCount}/{localExercicios.length} concluidos
            </p>
          </div>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>

        {expanded && (
          <div className="border-t bg-muted/10 p-3 sm:p-4">
            {hasMultipleExercises && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                  Exercício {boundedActiveIndex + 1} de {localExercicios.length}
                </p>

                {hasCarouselOverflow ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Exercício anterior"
                      disabled={!canGoPrev}
                      onClick={(event) => {
                        event.stopPropagation();
                        scrollToExercise(boundedActiveIndex - 1);
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Próximo exercício"
                      disabled={!canGoNext}
                      onClick={(event) => {
                        event.stopPropagation();
                        scrollToExercise(boundedActiveIndex + 1);
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            <div
              ref={scrollContainerRef}
              onScroll={
                hasMultipleExercises ? scheduleCarouselStateUpdate : undefined
              }
              className={cn(
                "pb-2",
                hasMultipleExercises
                  ? "-mx-3 max-w-[calc(100%_+_1.5rem)] overflow-x-auto overscroll-x-contain px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-4 sm:max-w-[calc(100%_+_2rem)] sm:px-4"
                  : "overflow-visible"
              )}
            >
              <div
                className={cn(
                  "gap-3",
                  hasMultipleExercises
                    ? "flex w-full snap-x snap-mandatory scroll-px-3 sm:scroll-px-4"
                    : "grid w-full grid-cols-1",
                  fitExercisesOnScreen &&
                    "min-[720px]:grid min-[720px]:grid-cols-2"
                )}
              >
                {localExercicios.map((exercicio, idx) => (
                  <div
                    key={exercicio.id}
                    ref={(node) => {
                      itemRefs.current[idx] = node;
                    }}
                    className={cn(
                      "min-w-0",
                      hasMultipleExercises &&
                        "shrink-0 basis-[calc(100%_-_3rem)] snap-start last:mr-12 sm:basis-[calc(100%_-_4rem)] sm:last:mr-16 lg:basis-[min(520px,48%)] lg:last:mr-0",
                      fitExercisesOnScreen &&
                        "min-[720px]:basis-auto min-[720px]:shrink min-[720px]:snap-none min-[720px]:last:mr-0"
                    )}
                  >
                    <CompactExerciseCard
                      exercicio={exercicio}
                      index={idx}
                      variant="carousel"
                      onToggleConcluido={handleToggleExercicio}
                      onRegisterSerie={handleRegisterSerie}
                      isWorkoutActive={isWorkoutActive}
                      profileId={profileId}
                      treinoId={treinoId}
                      highlighted={resumeItemId === exercicio.id}
                      fitContainer
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CompactGroupCard;
