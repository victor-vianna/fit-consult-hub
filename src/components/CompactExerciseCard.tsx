// components/CompactExerciseCard.tsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlinePesoInput } from "@/components/InlinePesoInput";
import { ExerciseVideoPreview } from "@/components/ExerciseVideoPreview";
import { RestCountdownDialog } from "@/components/RestCountdownDialog";
import { supabase } from "@/integrations/supabase/client";

interface CompactExerciseCardProps {
  exercicio: {
    id: string;
    nome: string;
    link_video?: string | null;
    series?: number;
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
  isWorkoutActive?: boolean;
  profileId?: string;
  variant?: "list" | "carousel";
  className?: string;
  treinoId?: string | null;
  highlighted?: boolean;
}

export function CompactExerciseCard({
  exercicio,
  onToggleConcluido,
  variant = "list",
  className,
  treinoId,
  highlighted = false,
}: CompactExerciseCardProps) {
  const [localConcluido, setLocalConcluido] = useState(
    exercicio.concluido || false
  );
  const [localPesoExecutado, setLocalPesoExecutado] = useState(
    exercicio.peso_executado || null
  );
  const [restDialogOpen, setRestDialogOpen] = useState(false);
  const isCarousel = variant === "carousel";

  const handleToggle = async () => {
    const novoValor = !localConcluido;
    setLocalConcluido(novoValor);

    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    try {
      await onToggleConcluido?.(exercicio.id, novoValor);
    } catch (error) {
      console.error("Erro ao marcar exercicio:", error);
      setLocalConcluido(!novoValor);
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

  useEffect(() => {
    setLocalConcluido(exercicio.concluido || false);
    setLocalPesoExecutado(exercicio.peso_executado || null);
  }, [exercicio.id, exercicio.concluido, exercicio.peso_executado]);

  const toggleButton = onToggleConcluido ? (
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
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
        isCarousel ? "h-8 w-8" : "h-10 w-10"
      )}
    >
      {localConcluido ? (
        <CheckCircle2 className={cn("text-green-600", isCarousel ? "h-5 w-5" : "h-6 w-6")} />
      ) : (
        <Circle className={cn("text-muted-foreground", isCarousel ? "h-5 w-5" : "h-6 w-6")} />
      )}
    </button>
  ) : null;

  const exerciseContent = (
    <>
      <div
        className={cn(
          "flex min-w-0 items-start gap-3",
          isCarousel ? "h-full p-3" : "p-3 sm:p-4"
        )}
      >
        {toggleButton}

        <div className="min-w-0 flex-1 space-y-2">
          <p
            className={cn(
              "break-words font-semibold leading-snug text-foreground",
              isCarousel ? "text-sm" : "text-sm sm:text-base",
              localConcluido && "line-through text-muted-foreground"
            )}
          >
            {exercicio.nome}
          </p>

          <div
            className={cn(
              "space-y-1.5 leading-tight text-muted-foreground",
              isCarousel ? "text-xs" : "text-xs sm:text-sm"
            )}
          >
            <p>
              <span className="font-medium text-foreground/80">Series:</span>{" "}
              {exercicio.series || 3}/{exercicio.repeticoes || "12"}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-foreground/80">Carga:</span>
              <InlinePesoInput
                exercicioId={exercicio.id}
                pesoRecomendado={exercicio.carga || null}
                pesoExecutado={localPesoExecutado}
                onSave={handleSavePeso}
                compact
              />
            </div>

            {exercicio.descanso && exercicio.descanso > 0 ? (
              <button
                type="button"
                onClick={() => setRestDialogOpen(true)}
                className="flex items-center gap-1 text-left text-cyan-700 underline decoration-cyan-700/30 underline-offset-2 dark:text-cyan-300"
              >
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Intervalo: {exercicio.descanso}s</span>
              </button>
            ) : null}

            {exercicio.observacoes ? (
              <p className={cn("italic", isCarousel ? "line-clamp-2" : "line-clamp-3")}>
                {exercicio.observacoes}
              </p>
            ) : null}
          </div>
        </div>

        <ExerciseVideoPreview
          videoUrl={exercicio.link_video}
          fallbackImage={exercicio.thumbnail}
          title={exercicio.nome}
          objectFit="contain"
          className={cn(
            "bg-muted",
            isCarousel
              ? "aspect-[9/12] w-[104px] min-w-[104px] max-w-[104px] sm:w-[116px] sm:min-w-[116px] sm:max-w-[116px]"
              : "aspect-[9/12] w-[108px] min-w-[108px] max-w-[108px] sm:aspect-video sm:w-[176px] sm:min-w-[176px] sm:max-w-[196px]"
          )}
        />
      </div>

      <RestCountdownDialog
        open={restDialogOpen}
        seconds={exercicio.descanso || 0}
        onOpenChange={setRestDialogOpen}
      />
    </>
  );

  if (isCarousel) {
    return (
      <article
        className={cn(
          "h-full min-h-[188px] w-[82vw] min-w-[264px] max-w-[324px] snap-start overflow-hidden rounded-lg border bg-card shadow-sm",
          localConcluido && "border-green-500/30 bg-green-50/50 dark:bg-green-950/10",
          highlighted && "ring-2 ring-primary/70 ring-offset-2 ring-offset-background",
          className
        )}
        data-workout-cache-item={exercicio.id}
        data-workout-treino-id={treinoId ?? undefined}
        data-workout-cache-type="exercise"
      >
        {exerciseContent}
      </article>
    );
  }

  if (localConcluido && onToggleConcluido) {
    return (
      <Card
        className={cn(
          "overflow-hidden rounded-lg border-green-500/30 bg-green-50/50 shadow-sm transition-colors dark:bg-green-950/10",
          highlighted && "ring-2 ring-primary/70 ring-offset-2 ring-offset-background"
        )}
        data-workout-cache-item={exercicio.id}
        data-workout-treino-id={treinoId ?? undefined}
        data-workout-cache-type="exercise"
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            {toggleButton}

            <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-muted-foreground line-through sm:text-base">
              {exercicio.nome}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-sm transition-colors hover:bg-muted/20",
        localConcluido && "border-green-500/30 bg-green-50/50 dark:bg-green-950/10",
        highlighted && "ring-2 ring-primary/70 ring-offset-2 ring-offset-background",
        className
      )}
      data-workout-cache-item={exercicio.id}
      data-workout-treino-id={treinoId ?? undefined}
      data-workout-cache-type="exercise"
    >
      <CardContent className="p-0">{exerciseContent}</CardContent>
    </Card>
  );
}

export default CompactExerciseCard;
