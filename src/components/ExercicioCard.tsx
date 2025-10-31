// components/ExercicioCard.tsx
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
  onToggleConcluido?: (id: string, concluido: boolean) => void;
  dragListeners?: any; // Listeners do useSortable
  dragAttributes?: any; // Attributes do useSortable
}

export function ExercicioCard({
  exercicio,
  index,
  readOnly = false,
  onEdit,
  onDelete,
  onToggleConcluido,
  dragListeners,
  dragAttributes,
}: ExercicioCardProps) {
  const concluido = exercicio.concluido || false;

  return (
    <Card
      className={cn(
        "overflow-hidden p-4 transition-all border",
        concluido
          ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-900"
          : "hover:shadow-md border-border"
      )}
    >
      <div className="flex items-start gap-3">
        {/* ✅ Drag handle (apenas se não for readOnly) */}
        {!readOnly && (
          <div
            {...dragListeners}
            {...dragAttributes}
            className="cursor-grab active:cursor-grabbing pt-1"
            title="Arrastar exercício"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* ✅ Número do exercício */}
        <Badge
          variant={concluido ? "default" : "outline"}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center p-0"
        >
          {index + 1}
        </Badge>

        {/* ✅ Conteúdo principal */}
        <div className="flex-1 space-y-3">
          {/* Título + Link do vídeo */}
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "font-semibold text-base leading-tight flex-1",
                concluido && "line-through text-muted-foreground"
              )}
            >
              {exercicio.nome}
            </h4>

            {exercicio.link_video && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 flex-shrink-0"
                asChild
              >
                <a
                  href={exercicio.link_video}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver demonstração"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>

          {/* ✅ Informações do treino */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Séries</p>
                <p className="font-medium">{exercicio.series}x</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground rotate-90" />
              <div>
                <p className="text-xs text-muted-foreground">Reps</p>
                <p className="font-medium">{exercicio.repeticoes}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Descanso</p>
                <p className="font-medium">{exercicio.descanso}s</p>
              </div>
            </div>

            {exercicio.carga && (
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Carga</p>
                  <p className="font-medium">{exercicio.carga}</p>
                </div>
              </div>
            )}
          </div>

          {/* ✅ Observações */}
          {exercicio.observacoes && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-medium">💡 Dica do Personal:</span>{" "}
                {exercicio.observacoes}
              </p>
            </div>
          )}

          {/* ✅ Checkbox para marcar como concluído */}
          {!readOnly && onToggleConcluido && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Checkbox
                id={`concluido-${exercicio.id}`}
                checked={concluido}
                onCheckedChange={(checked) =>
                  onToggleConcluido(exercicio.id, checked as boolean)
                }
              />
              <Label
                htmlFor={`concluido-${exercicio.id}`}
                className="text-sm cursor-pointer select-none"
              >
                {concluido ? "✅ Concluído" : "Marcar como concluído"}
              </Label>
            </div>
          )}
        </div>

        {/* ✅ Botões de ação (apenas para personal) */}
        {!readOnly && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
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
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(exercicio.id)}
                title="Excluir exercício"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
