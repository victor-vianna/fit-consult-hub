// components/ExercicioCard.tsx
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
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

  const handleToggle = async (checked: boolean | "indeterminate") => {
    if (
      readOnly ||
      !onToggleConcluido ||
      isUpdating ||
      checked === "indeterminate"
    ) {
      return;
    }

    const newValue = checked as boolean;

    // Marca que houve interação do usuário
    hasUserInteracted.current = true;

    console.log("🔄 Toggle iniciado:", {
      exercicioId: exercicio.id,
      exercicioNome: exercicio.nome,
      de: localConcluido,
      para: newValue,
    });

    // Atualização otimista local imediata
    setLocalConcluido(newValue);
    setIsUpdating(true);

    // Notifica o pai otimisticamente (se fornecido) para atualizar barra de progresso
    try {
      onOptimisticToggle?.(exercicio.id, newValue);
    } catch (err) {
      console.warn("onOptimisticToggle lançou erro:", err);
    }

    try {
      // Chama o handler de persistência (pai pode retornar Promise)
      const maybePromise = onToggleConcluido(exercicio.id, newValue);
      if (maybePromise && typeof (maybePromise as any).then === "function") {
        const result = await maybePromise;
        console.log("✅ Toggle bem-sucedido:", result);
      } else {
        console.log("✅ Toggle (sync) chamado com sucesso");
      }
      // mantém o estado local como newValue — caso o pai confirme, acima o prop vai estar igual
      setLocalConcluido(newValue);
    } catch (error) {
      console.error("❌ Erro ao toggle:", error);
      // Reverte localmente em caso de erro
      setLocalConcluido(!newValue);
      // Notifica o pai para reverter também (opcional: pai pode checar)
      try {
        onOptimisticToggle?.(exercicio.id, !newValue);
      } catch (_) {}
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden p-3 sm:p-4 transition-all border",
        localConcluido
          ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-900"
          : "hover:shadow-md border-border",
        isUpdating && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {!readOnly && (
          <div
            {...dragListeners}
            {...dragAttributes}
            className="cursor-grab active:cursor-grabbing pt-1 hidden sm:block"
            title="Arrastar exercício"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <Badge
          variant={localConcluido ? "default" : "outline"}
          className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center p-0 text-xs sm:text-sm"
        >
          {index + 1}
        </Badge>

        <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "font-semibold text-sm sm:text-base leading-tight flex-1",
                localConcluido && "line-through text-muted-foreground"
              )}
            >
              {exercicio.nome}
            </h4>

            {exercicio.link_video && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
                asChild
              >
                <a
                  href={exercicio.link_video}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver demonstração"
                >
                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                </a>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Repeat className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Séries
                </p>
                <p className="font-medium truncate">{exercicio.series}x</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Repeat className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground rotate-90 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Reps
                </p>
                <p className="font-medium truncate">{exercicio.repeticoes}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Descanso
                </p>
                <p className="font-medium truncate">{exercicio.descanso}s</p>
              </div>
            </div>

            {exercicio.carga && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Weight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Carga
                  </p>
                  <p className="font-medium truncate">{exercicio.carga}</p>
                </div>
              </div>
            )}
          </div>

          {exercicio.observacoes && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                <span className="font-medium">💡 Dica:</span>{" "}
                {exercicio.observacoes}
              </p>
            </div>
          )}

          {!readOnly && onToggleConcluido && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Checkbox
                id={`concluido-${exercicio.id}`}
                checked={localConcluido}
                disabled={isUpdating}
                onCheckedChange={handleToggle}
              />
              <Label
                htmlFor={`concluido-${exercicio.id}`}
                className="text-xs sm:text-sm cursor-pointer select-none"
              >
                {isUpdating
                  ? "⏳ Salvando..."
                  : localConcluido
                  ? "✅ Concluído"
                  : "Marcar como concluído"}
              </Label>
            </div>
          )}
        </div>

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
    </Card>
  );
}
