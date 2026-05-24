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
}

export function CompactExerciseCard({
  exercicio,
  onToggleConcluido,
}: CompactExerciseCardProps) {
  const [localConcluido, setLocalConcluido] = useState(
    exercicio.concluido || false
  );
  const [localPesoExecutado, setLocalPesoExecutado] = useState(
    exercicio.peso_executado || null
  );
  const [restDialogOpen, setRestDialogOpen] = useState(false);

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

  if (localConcluido && onToggleConcluido) {
    return (
      <Card className="overflow-hidden rounded-none border-x-0 border-t-0 bg-green-50/50 shadow-none transition-colors dark:bg-green-950/10">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleToggle();
              }}
              aria-label={`Desmarcar ${exercicio.nome}`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </button>

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
        "overflow-hidden rounded-none border-x-0 border-t-0 shadow-none transition-colors",
        localConcluido
          ? "bg-green-50/50 dark:bg-green-950/10"
          : "bg-card hover:bg-muted/20"
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {onToggleConcluido && (
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
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            <p
              className={cn(
                "break-words text-sm font-semibold leading-snug text-foreground sm:text-base",
                localConcluido && "line-through text-muted-foreground"
              )}
            >
              {exercicio.nome}
            </p>

            <div className="space-y-1 text-xs leading-tight text-muted-foreground sm:text-sm">
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
                  <span>Tempo entre séries: {exercicio.descanso}s</span>
                </button>
              ) : null}

              {exercicio.observacoes ? (
                <p className="line-clamp-2 italic">{exercicio.observacoes}</p>
              ) : null}
            </div>
          </div>

          <ExerciseVideoPreview
            videoUrl={exercicio.link_video}
            fallbackImage={exercicio.thumbnail}
            title={exercicio.nome}
          />
        </div>
      </CardContent>

      <RestCountdownDialog
        open={restDialogOpen}
        seconds={exercicio.descanso || 0}
        onOpenChange={setRestDialogOpen}
      />
    </Card>
  );
}

export default CompactExerciseCard;
