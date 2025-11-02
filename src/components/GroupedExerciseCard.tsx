// components/GroupedExerciseCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  Clock,
  Dumbbell,
  CheckCircle2,
  Circle,
  Edit,
  Trash2,
  GripVertical,
  Repeat,
  ArrowDown,
} from "lucide-react";
import { TIPOS_AGRUPAMENTO } from "@/types/exerciseGroup";
import type { ExercicioAgrupado } from "@/types/exerciseGroup";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface GroupedExerciseCardProps {
  grupo: {
    id?: string;
    grupo_id?: string; // ✅ Adicionar
    tipo: string;
    tipo_agrupamento?: string;
    exercicios: ExercicioAgrupado[];
    descanso_entre_grupos?: number;
    observacoes?: string;
  };
  index: number;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleConcluido?: (
    exercicioId: string,
    concluido: boolean
  ) => Promise<any> | void;
  onOptimisticToggle?: (id: string, concluido: boolean) => void; // ✅ ADICIONADO
  onToggleGrupoConcluido?: (grupoId: string, concluido: boolean) => void;
}

export function GroupedExerciseCard({
  grupo,
  index,
  readOnly = false,
  onEdit,
  onDelete,
  onToggleConcluido,
  onOptimisticToggle, // ✅ ADICIONADO
  onToggleGrupoConcluido,
}: GroupedExerciseCardProps) {
  const tipoAtual =
    (grupo as any).tipo_agrupamento || (grupo as any).tipo || "bi-set";
  const tipoConfig =
    TIPOS_AGRUPAMENTO[tipoAtual as keyof typeof TIPOS_AGRUPAMENTO];

  const [localExercicios, setLocalExercicios] = useState(grupo.exercicios);

  useEffect(() => {
    setLocalExercicios(grupo.exercicios);
  }, [grupo.exercicios]);

  const todosConcluidos = localExercicios.every((e) => e.concluido);
  const algumConcluido = localExercicios.some((e) => e.concluido);

  // ✅ Função otimista para marcar exercício
  const handleToggleExercicio = async (
    exercicioId: string,
    concluido: boolean
  ) => {
    setLocalExercicios((prev) =>
      prev.map((e) => (e.id === exercicioId ? { ...e, concluido } : e))
    );

    onOptimisticToggle?.(exercicioId, concluido);

    try {
      await onToggleConcluido?.(exercicioId, concluido);
    } catch (error) {
      console.error("Erro ao marcar exercício:", error);
      setLocalExercicios((prev) =>
        prev.map((e) =>
          e.id === exercicioId ? { ...e, concluido: !concluido } : e
        )
      );
    }
  };

  const handleToggleGrupo = async () => {
    const grupoId = grupo.grupo_id ?? grupo.id;
    if (!grupoId) return;

    const novoStatus = !todosConcluidos;

    // Otimista
    setLocalExercicios((prev) =>
      prev.map((e) => ({ ...e, concluido: novoStatus }))
    );
    onToggleGrupoConcluido?.(grupoId, novoStatus);
  };

  return (
    <Card
      style={{ display: "block", visibility: "visible", opacity: 1 }} // ← ADICIONAR TEMPORÁRIO
      className={cn(
        "group hover:shadow-md transition-all",
        todosConcluidos &&
          "border-green-500/50 bg-green-50/30 dark:bg-green-950/20",
        algumConcluido && !todosConcluidos && "border-yellow-500/50"
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header do Grupo */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Grip + Número */}
            {!readOnly && (
              <div className="flex flex-col items-center gap-1 pt-1">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Badge variant="outline" className="text-xs">
                  {index + 1}
                </Badge>
              </div>
            )}

            {readOnly && (
              <div className="flex flex-col items-center gap-1 pt-1">
                <Badge variant="outline" className="text-xs">
                  {index + 1}
                </Badge>
              </div>
            )}

            {/* Informações do Grupo */}
            <div className="flex-1 space-y-2">
              {/* Tipo do Agrupamento */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={todosConcluidos ? "default" : "secondary"}
                  className="font-semibold"
                >
                  {tipoConfig?.icon} {tipoConfig?.label || grupo.tipo}
                </Badge>

                {grupo.descanso_entre_grupos && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {grupo.descanso_entre_grupos}s após grupo
                  </Badge>
                )}

                {todosConcluidos && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completo
                  </Badge>
                )}
              </div>

              {/* Instrução visual para aluno */}
              {onToggleGrupoConcluido && (
                <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <Repeat className="h-4 w-4 text-primary" />
                    <ArrowDown className="h-3 w-3 text-primary/60" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary mb-1">
                      Execute estes exercícios em sequência
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Faça todos os exercícios abaixo, um após o outro, antes de
                      descansar e repetir o circuito
                    </p>
                  </div>

                  {onToggleGrupoConcluido && (
                    <button
                      onClick={handleToggleGrupo}
                      className="shrink-0"
                      title={
                        todosConcluidos
                          ? "Desmarcar grupo completo"
                          : "Marcar grupo completo"
                      }
                    >
                      {todosConcluidos ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-primary hover:text-green-600 transition-colors" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Observações do Grupo */}
              {grupo.observacoes && (
                <p className="text-xs text-muted-foreground italic">
                  💡 {grupo.observacoes}
                </p>
              )}

              {/* Exercícios */}
              <div className="space-y-0 relative">
                {localExercicios.map((exercicio, exIndex) => (
                  <div key={exercicio.id} className="relative">
                    <div
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-all relative",
                        exIndex === 0 && "rounded-t-lg",
                        exIndex === grupo.exercicios.length - 1 &&
                          "rounded-b-lg",
                        exIndex > 0 &&
                          exIndex < grupo.exercicios.length - 1 &&
                          "rounded-none border-t-0",
                        exIndex === 0 &&
                          grupo.exercicios.length > 1 &&
                          "border-b-0 rounded-b-none",
                        exercicio.concluido
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                          : "bg-muted/30 border-border hover:bg-muted/50",
                        readOnly && "pl-4"
                      )}
                    >
                      {!readOnly && onToggleConcluido && (
                        <button
                          onClick={() =>
                            handleToggleExercicio(
                              exercicio.id,
                              !exercicio.concluido
                            )
                          }
                          className="mt-1 shrink-0 z-10 transition-transform hover:scale-110"
                        >
                          {exercicio.concluido ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                      )}

                      {/* Número do exercício */}
                      <div className="flex flex-col items-center mt-1">
                        <div
                          className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                            exercicio.concluido
                              ? "bg-green-600 text-white border-green-700"
                              : "bg-background text-primary border-primary/30"
                          )}
                        >
                          {exIndex + 1}
                        </div>
                      </div>

                      <div className="flex-1 space-y-1">
                        <p
                          className={cn(
                            "font-semibold text-sm",
                            exercicio.concluido &&
                              "line-through text-muted-foreground"
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

                          {exercicio.descanso_entre_grupos && (
                            <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs">
                              <Clock className="h-3 w-3" />
                              {exercicio.descanso_entre_grupos}s entre séries
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

                    {!readOnly && exIndex < grupo.exercicios.length - 1 && (
                      <div className="flex justify-center my-1">
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!readOnly && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
