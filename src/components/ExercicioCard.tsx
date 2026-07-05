// components/ExercicioCard.tsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Dumbbell,
  Edit,
  GripVertical,
  Play,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { InlinePesoInput } from "@/components/InlinePesoInput";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { useHaptic } from "@/hooks/useHaptic";

interface Exercicio {
  id: string;
  nome: string;
  link_video: string | null;
  ordem: number;
  series: number;
  repeticoes: string;
  descanso: number;
  carga?: string;
  peso_executado?: string | null;
  observacoes?: string;
  concluido: boolean;
}

interface ExercicioCardProps {
  exercicio: Exercicio;
  index: number;
  readOnly?: boolean;
  onEdit?: (exercicio: Exercicio) => void;
  onDelete?: (id: string) => void;
  onToggleConcluido?: (id: string, concluido: boolean) => Promise<any> | void;
  onOptimisticToggle?: (id: string, concluido: boolean) => void;
  dragListeners?: any;
  dragAttributes?: any;
}

export function ExercicioCard({
  exercicio,
  index,
  readOnly = false,
  onEdit,
  onDelete,
  onToggleConcluido,
  onOptimisticToggle,
  dragListeners,
  dragAttributes,
}: ExercicioCardProps) {
  const [localConcluido, setLocalConcluido] = useState(exercicio.concluido);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { success, light } = useHaptic();
  const { abrirExercicioNaBiblioteca } = useExerciseLibrary();

  useEffect(() => {
    setLocalConcluido(exercicio.concluido);
  }, [exercicio.id, exercicio.concluido]);

  const treinoResumo =
    exercicio.series > 0
      ? `${exercicio.series}x${exercicio.repeticoes || "-"}`
      : exercicio.repeticoes || "Prescrição";

  const handleToggle = async (novoValor: boolean) => {
    if (novoValor) {
      success();
    } else {
      light();
    }

    setLocalConcluido(novoValor);
    onOptimisticToggle?.(exercicio.id, novoValor);
    setIsUpdating(true);

    try {
      await onToggleConcluido?.(exercicio.id, novoValor);

      if (novoValor) {
        toast.success(`✓ ${exercicio.nome} concluído!`, {
          duration: 2000,
        });
      } else {
        toast.info(`↻ ${exercicio.nome} desmarcado`, {
          duration: 1500,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar exercício:", error);
      setLocalConcluido(!novoValor);
      toast.error("Erro ao atualizar exercício");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePeso = async (exercicioId: string, peso: string) => {
    try {
      const { error } = await supabase
        .from("exercicios")
        .update({ peso_executado: peso })
        .eq("id", exercicioId);

      if (error) throw error;
    } catch (error) {
      console.error("Erro ao atualizar peso:", error);
      throw error;
    }
  };

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
        "overflow-hidden border transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        localConcluido
          ? "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          : "border-border bg-card hover:bg-muted/30",
        isUpdating && "opacity-60"
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex min-h-[56px] items-center gap-3 sm:min-h-[64px]">
          {!readOnly && (
            <div className="flex shrink-0 flex-col items-center gap-1">
              <div
                {...dragListeners}
                {...dragAttributes}
                className="-m-1 cursor-grab touch-none p-1 active:cursor-grabbing"
                title="Arrastar para reordenar"
                onClick={(event) => event.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant="outline" className="text-xs">
                {index + 1}
              </Badge>
            </div>
          )}

          {onToggleConcluido ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleToggle(!localConcluido);
              }}
              className={cn(
                "flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center transition-all duration-200",
                localConcluido
                  ? "text-green-500"
                  : "text-muted-foreground hover:text-primary"
              )}
              disabled={isUpdating}
              aria-label={
                localConcluido
                  ? `Desmarcar ${exercicio.nome}`
                  : `Marcar ${exercicio.nome} como concluído`
              }
            >
              {localConcluido ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
          ) : readOnly ? (
            <Badge variant="outline" className="shrink-0 text-xs">
              {index + 1}
            </Badge>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "min-w-0 flex-1 truncate text-sm font-semibold leading-tight sm:text-base",
                  localConcluido && "text-muted-foreground line-through"
                )}
              >
                {exercicio.nome}
              </p>
              {localConcluido && (
                <Badge className="hidden shrink-0 bg-green-600 text-xs sm:inline-flex">
                  Concluído
                </Badge>
              )}
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium">
                <Dumbbell className="h-3.5 w-3.5" />
                {treinoResumo}
              </span>
              {exercicio.descanso > 0 && (
                <span className="hidden items-center gap-1 sm:inline-flex">
                  <Clock className="h-3.5 w-3.5" />
                  {exercicio.descanso}s
                </span>
              )}
            </div>
          </div>

          {!readOnly && (onEdit || onDelete) && (
            <div
              className="flex shrink-0 gap-1"
              onClick={(event) => event.stopPropagation()}
            >
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 touch-target"
                  onClick={() => onEdit(exercicio)}
                  title="Editar exercício"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-destructive hover:text-destructive touch-target"
                  onClick={() => onDelete(exercicio.id)}
                  title="Excluir exercício"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {exercicio.link_video && (
                <a
                  href={exercicio.link_video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline touch-target"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Play className="h-4 w-4" />
                  Ver demonstração
                </a>
              )}

              {onToggleConcluido && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    abrirExercicioNaBiblioteca(exercicio.nome);
                  }}
                  className="inline-flex items-center gap-1 text-purple-600 hover:underline touch-target"
                >
                  <BookOpen className="h-4 w-4" />
                  Ver na biblioteca
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium">
                <Dumbbell className="h-4 w-4" />
                {treinoResumo}
              </span>

              {exercicio.carga && onToggleConcluido ? (
                <span onClick={(event) => event.stopPropagation()}>
                  <InlinePesoInput
                    exercicioId={exercicio.id}
                    pesoRecomendado={exercicio.carga}
                    pesoExecutado={exercicio.peso_executado || null}
                    onSave={handleSavePeso}
                    disabled={isUpdating}
                  />
                </span>
              ) : exercicio.carga ? (
                <span className="rounded bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary">
                  {exercicio.carga}kg
                </span>
              ) : null}

              {exercicio.descanso > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {exercicio.descanso}s de descanso
                </span>
              )}
            </div>

            {exercicio.observacoes && (
              <p className="text-sm text-muted-foreground italic">
                {exercicio.observacoes}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
