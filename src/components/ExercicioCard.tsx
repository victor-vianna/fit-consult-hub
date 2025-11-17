// components/ExercicioCard.tsx
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Edit,
  Trash2,
  ExternalLink,
  GripVertical,
  Clock,
  Repeat,
  Weight,
  CheckCircle2,
  Circle,
  Play,
  Dumbbell,
  BookOpen,
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
  /**
   * Handler que faz a persistência (pode retornar Promise).
   * Se o pai quiser fazer atualização otimista, também pode fazê-lo aqui,
   * ou usar onOptimisticToggle abaixo para explicitar a intenção otimista.
   */
  onToggleConcluido?: (id: string, concluido: boolean) => Promise<any> | void;
  /**
   * Callback opcional para notificar o pai imediatamente (otimisticamente)
   * de que o exercício foi marcado/desmarcado, para que o pai atualize
   * seu estado e a barra de progresso.
   */
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
  const { success, light } = useHaptic();

  // marca que o usuário interagiu (p/ evitar sobrescrever durante a interação ativa)
  const hasUserInteracted = useRef(false);

  // ✅ Apenas sincronizar quando prop mudar externamente
  useEffect(() => {
    setLocalConcluido(exercicio.concluido);
  }, [exercicio.id]); // Remove exercicio.concluido da dependência

  const { abrirExercicioNaBiblioteca } = useExerciseLibrary();

  const handleToggle = async (novoValor: boolean) => {
    // Feedback háptico: sucesso ao completar, leve ao desmarcar
    if (novoValor) {
      success();
    } else {
      light();
    }

    setLocalConcluido(novoValor);
    onOptimisticToggle?.(exercicio.id, novoValor);

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
      className={cn(
        "overflow-hidden transition-all border",
        localConcluido
          ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-900"
          : "hover:shadow-md border-border",
        isUpdating && "opacity-60"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Número do exercício */}
          {!readOnly && (
            <div className="flex flex-col items-center gap-1 pt-1">
              <div
                {...dragListeners}
                {...dragAttributes}
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant="outline" className="text-xs">
                {index + 1}
              </Badge>
            </div>
          )}

          {readOnly && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {index + 1}
            </Badge>
          )}

          {/* Conteúdo do exercício */}
          <div className="flex-1">
            <div
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all",
                localConcluido
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  : "bg-muted/30 border-border hover:bg-muted/50"
              )}
            >
              {/* Checkbox (só para aluno/readOnly) */}
              {onToggleConcluido && (
                <button
                  onClick={() => handleToggle(!localConcluido)}
                  className={cn(
                    "mt-1 shrink-0 z-10 transition-all duration-300 ease-in-out",
                    "min-w-[44px] min-h-[44px] flex items-center justify-center",
                    localConcluido
                      ? "scale-110 text-green-500"
                      : "hover:scale-110 text-muted-foreground hover:text-primary"
                  )}
                  disabled={isUpdating}
                >
                  {localConcluido ? (
                    <CheckCircle2 className="h-5 w-5 transition-transform duration-300 ease-in-out" />
                  ) : (
                    <Circle className="h-5 w-5 transition-transform duration-300 ease-in-out" />
                  )}
                </button>
              )}

              {/* Número circular */}
              <div className="flex flex-col items-center mt-1">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                    localConcluido
                      ? "bg-green-600 text-white border-green-700"
                      : "bg-background text-primary border-primary/30"
                  )}
                >
                  1
                </div>
              </div>

              {/* Informações do exercício */}
              <div className="flex-1 space-y-1">
                <p
                  className={cn(
                    "font-semibold text-base md:text-sm",
                    localConcluido && "line-through text-muted-foreground"
                  )}
                >
                  {exercicio.nome}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {exercicio.link_video && (
                    <a
                      href={exercicio.link_video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-xs text-blue-600 hover:underline flex items-center gap-1 touch-target"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Play className="h-4 w-4 md:h-3 md:w-3" />
                      Ver demonstração
                    </a>
                  )}

                  {onToggleConcluido && (
                    <button
                      onClick={() => abrirExercicioNaBiblioteca(exercicio.nome)}
                      className="text-sm md:text-xs text-purple-600 hover:underline flex items-center gap-1 touch-target"
                    >
                      <BookOpen className="h-4 w-4 md:h-3 md:w-3" />
                      Ver na biblioteca
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm md:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium">
                    <Dumbbell className="h-4 w-4 md:h-3 md:w-3" />
                    {exercicio.series}x{exercicio.repeticoes}
                  </span>

                  {exercicio.carga && onToggleConcluido ? (
                    <InlinePesoInput
                      exercicioId={exercicio.id}
                      pesoRecomendado={exercicio.carga}
                      pesoExecutado={exercicio.peso_executado || null}
                      onSave={handleSavePeso}
                      disabled={isUpdating}
                    />
                  ) : exercicio.carga ? (
                    <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {exercicio.carga}kg
                    </span>
                  ) : null}

                  {exercicio.descanso > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {exercicio.descanso}s
                    </span>
                  )}
                </div>

                {exercicio.observacoes && (
                  <p className="text-sm md:text-xs text-muted-foreground italic">
                    {exercicio.observacoes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ações (só para personal) */}
          {!readOnly && (onEdit || onDelete) && (
            <div className="flex flex-col gap-1 flex-shrink-0">
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 md:h-8 md:w-8 touch-target"
                  onClick={() => onEdit(exercicio)}
                  title="Editar exercício"
                >
                  <Edit className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 md:h-8 md:w-8 text-destructive hover:text-destructive touch-target"
                  onClick={() => onDelete(exercicio.id)}
                  title="Excluir exercício"
                >
                  <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
