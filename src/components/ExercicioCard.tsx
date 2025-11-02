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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Exercicio {
  id: string;
  nome: string;
  link_video: string | null;
  ordem: number;
  series: number;
  repeticoes: string;
  descanso: number;
  carga?: string;
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

  // marca que o usuário interagiu (p/ evitar sobrescrever durante a interação ativa)
  const hasUserInteracted = useRef(false);

  // Sincroniza o estado local com a prop do pai quando NÃO estamos atualizando.
  // Isso permite que, após a resposta do servidor (pai atualiza o prop),
  // o componente reflita o estado final.
  useEffect(() => {
    if (!isUpdating) {
      setLocalConcluido(exercicio.concluido);
      // se o pai confirmou uma mudança, resetamos a flag de interação
      hasUserInteracted.current = false;
    }
  }, [exercicio.concluido, exercicio.id, isUpdating]);

  const handleToggle = async (novoValor: boolean) => {
    setLocalConcluido(novoValor);
    onOptimisticToggle?.(exercicio.id, novoValor);

    try {
      await onToggleConcluido?.(exercicio.id, novoValor);
    } catch (error) {
      console.error("Erro ao atualizar exercício:", error);
      setLocalConcluido(!novoValor);
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
                    "font-semibold text-sm",
                    localConcluido && "line-through text-muted-foreground"
                  )}
                >
                  {exercicio.nome}
                </p>

                {exercicio.link_video && (
                  <a
                    href={exercicio.link_video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Play className="h-3 w-3" />
                    Ver demonstração
                  </a>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium">
                    <Dumbbell className="h-3 w-3" />
                    {exercicio.series}x{exercicio.repeticoes}
                  </span>

                  {exercicio.carga && (
                    <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {exercicio.carga}kg
                    </span>
                  )}

                  {exercicio.descanso > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {exercicio.descanso}s
                    </span>
                  )}
                </div>

                {exercicio.observacoes && (
                  <p className="text-xs text-muted-foreground italic">
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
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => onEdit(exercicio)}
                  title="Editar exercício"
                >
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(exercicio.id)}
                  title="Excluir exercício"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
