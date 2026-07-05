// components/GroupedExerciseCard.tsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Dumbbell,
  Edit,
  GripVertical,
  Play,
  Repeat,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { InlinePesoInput } from "@/components/InlinePesoInput";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";

const TIPOS_AGRUPAMENTO = {
  normal: { label: "Normal" },
  "bi-set": { label: "Bi-Set" },
  "tri-set": { label: "Tri-Set" },
  "drop-set": { label: "Drop-Set" },
  superset: { label: "Super-Set" },
  circuito: { label: "Circuito" },
} as const;

type TipoAgrupamento = keyof typeof TIPOS_AGRUPAMENTO;

interface ExercicioAgrupado {
  id: string;
  nome: string;
  link_video?: string | null;
  series?: number;
  repeticoes?: string;
  descanso?: number;
  carga?: string | number | null;
  peso_executado?: string | null;
  observacoes?: string | null;
  concluido?: boolean;
  ordem_no_grupo?: number | null;
}

interface GrupoExercicio {
  grupo_id: string;
  tipo_agrupamento: TipoAgrupamento | string;
  descanso_entre_grupos?: number | null;
  ordem?: number;
  exercicios: ExercicioAgrupado[];
}

interface GroupedExerciseCardProps {
  grupo: GrupoExercicio;
  index: number;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleConcluido?: (
    exercicioId: string,
    concluido: boolean
  ) => Promise<any> | void;
  onToggleGrupoConcluido?: (
    grupoId: string,
    concluido: boolean
  ) => Promise<void> | void;
  dragListeners?: any;
  dragAttributes?: any;
}

export function GroupedExerciseCard({
  grupo,
  index,
  readOnly = false,
  onEdit,
  onDelete,
  onToggleConcluido,
  onToggleGrupoConcluido,
  dragListeners,
  dragAttributes,
}: GroupedExerciseCardProps) {
  const [localExercicios, setLocalExercicios] = useState<ExercicioAgrupado[]>(
    grupo.exercicios || []
  );
  const [expanded, setExpanded] = useState(false);
  const { abrirExercicioNaBiblioteca } = useExerciseLibrary();

  useEffect(() => {
    setLocalExercicios(grupo.exercicios || []);
  }, [grupo.exercicios]);

  const tipoAtual = (grupo.tipo_agrupamento || "bi-set") as TipoAgrupamento;
  const tipoConfig =
    TIPOS_AGRUPAMENTO[tipoAtual] || TIPOS_AGRUPAMENTO["bi-set"];

  const todosConcluidos =
    localExercicios.length > 0 && localExercicios.every((e) => e.concluido);
  const algumConcluido = localExercicios.some((e) => e.concluido);
  const totalExercicios = localExercicios.length;

  const handleToggleExercicio = async (
    exercicioId: string,
    concluido: boolean
  ) => {
    if (!onToggleConcluido) return;

    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    setLocalExercicios((prev) =>
      prev.map((e) => (e.id === exercicioId ? { ...e, concluido } : e))
    );

    try {
      await onToggleConcluido(exercicioId, concluido);

      const exercicio = localExercicios.find((e) => e.id === exercicioId);
      if (exercicio) {
        if (concluido) {
          toast.success(`✓ ${exercicio.nome} concluído!`, {
            duration: 2000,
          });
        } else {
          toast.info(`↻ ${exercicio.nome} desmarcado`, {
            duration: 1500,
          });
        }
      }
    } catch (error) {
      console.error("[GroupedExerciseCard] Erro ao marcar exercício:", error);
      toast.error("Erro ao atualizar exercício");
      setLocalExercicios((prev) =>
        prev.map((e) =>
          e.id === exercicioId ? { ...e, concluido: !concluido } : e
        )
      );
    }
  };

  const handleToggleGrupo = async () => {
    if (!onToggleGrupoConcluido || !grupo.grupo_id) return;

    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    const novoStatus = !todosConcluidos;

    setLocalExercicios((prev) =>
      prev.map((e) => ({ ...e, concluido: novoStatus }))
    );

    try {
      await onToggleGrupoConcluido(grupo.grupo_id, novoStatus);

      if (novoStatus) {
        toast.success(`✓ ${tipoConfig.label} concluído!`, {
          duration: 2000,
        });
      } else {
        toast.info(`↻ ${tipoConfig.label} desmarcado`, {
          duration: 1500,
        });
      }
    } catch (error) {
      console.error("[GroupedExerciseCard] Erro ao marcar grupo:", error);
      toast.error("Erro ao atualizar grupo");
      setLocalExercicios(grupo.exercicios || []);
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

  const formatarCarga = (
    carga: string | number | null | undefined
  ): string | null => {
    if (carga == null) return null;
    const cargaStr = String(carga).trim();
    return cargaStr || null;
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
        "group overflow-hidden border transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        todosConcluidos &&
          "border-green-500/50 bg-green-50/30 dark:bg-green-950/20",
        algumConcluido &&
          !todosConcluidos &&
          "border-yellow-500/50 bg-yellow-50/20 dark:bg-yellow-950/10"
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex min-h-[56px] items-center justify-between gap-3 sm:min-h-[64px]">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex shrink-0 flex-col items-center gap-1">
              {!readOnly && (
                <div
                  {...dragListeners}
                  {...dragAttributes}
                  className="-m-1 cursor-grab touch-none p-1 active:cursor-grabbing"
                  title="Arrastar para reordenar"
                  onClick={(event) => event.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <Badge variant="outline" className="text-xs font-mono">
                {index + 1}
              </Badge>
            </div>

            {onToggleGrupoConcluido && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggleGrupo();
                }}
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-muted-foreground hover:text-primary"
                aria-label={
                  todosConcluidos
                    ? `Desmarcar ${tipoConfig.label}`
                    : `Marcar ${tipoConfig.label} como concluído`
                }
              >
                {todosConcluidos ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant={todosConcluidos ? "default" : "secondary"}
                  className="shrink-0 font-semibold"
                >
                  {tipoConfig.label}
                </Badge>
                {todosConcluidos && (
                  <Badge className="hidden shrink-0 bg-green-600 text-xs sm:inline-flex">
                    Completo
                  </Badge>
                )}
                {algumConcluido && !todosConcluidos && (
                  <Badge variant="outline" className="hidden text-xs sm:inline-flex">
                    Em andamento
                  </Badge>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {totalExercicios} exercício{totalExercicios !== 1 ? "s" : ""} colapsado
                {totalExercicios !== 1 ? "s" : ""}
              </p>
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
                  onClick={onEdit}
                  title="Editar grupo"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-destructive hover:text-destructive touch-target"
                  onClick={onDelete}
                  title="Deletar grupo"
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
            <div className="flex flex-wrap items-center gap-2">
              {grupo.descanso_entre_grupos != null &&
                grupo.descanso_entre_grupos > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    {grupo.descanso_entre_grupos}s após grupo
                  </Badge>
                )}
              <Badge variant="outline" className="text-xs">
                <Repeat className="mr-1 h-3 w-3" />
                Execute em sequência
              </Badge>
            </div>

            <div className="space-y-0">
              {localExercicios.map((exercicio, exIndex) => {
                const cargaFormatada = formatarCarga(exercicio.carga);
                const isFirst = exIndex === 0;
                const isLast = exIndex === localExercicios.length - 1;
                const hasNext = !isLast;

                return (
                  <div key={exercicio.id} className="relative">
                    <div
                      className={cn(
                        "flex items-start gap-3 border p-3 transition-all",
                        isFirst && "rounded-t-lg",
                        isLast && "rounded-b-lg",
                        !isFirst && "border-t-0",
                        exercicio.concluido
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                          : "border-border bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      {onToggleConcluido && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleExercicio(
                              exercicio.id,
                              !exercicio.concluido
                            );
                          }}
                          className="mt-1 shrink-0 transition-transform hover:scale-110"
                          aria-label={
                            exercicio.concluido
                              ? `Desmarcar ${exercicio.nome}`
                              : `Marcar ${exercicio.nome} como concluído`
                          }
                        >
                          {exercicio.concluido ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                      )}

                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-background text-xs font-bold text-primary">
                        {exIndex + 1}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p
                          className={cn(
                            "truncate text-sm font-semibold sm:text-base",
                            exercicio.concluido &&
                              "text-muted-foreground line-through"
                          )}
                        >
                          {exercicio.nome}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Dumbbell className="h-3.5 w-3.5" />
                            {exercicio.series || 3}x
                            {exercicio.repeticoes || "12"}
                          </span>

                          {cargaFormatada && onToggleConcluido ? (
                            <span onClick={(event) => event.stopPropagation()}>
                              <InlinePesoInput
                                exercicioId={exercicio.id}
                                pesoRecomendado={cargaFormatada}
                                pesoExecutado={exercicio.peso_executado || null}
                                onSave={handleSavePeso}
                                disabled={false}
                              />
                            </span>
                          ) : cargaFormatada ? (
                            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary">
                              {cargaFormatada}kg
                            </span>
                          ) : null}

                          {exercicio.descanso != null &&
                            exercicio.descanso > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {exercicio.descanso}s
                              </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {exercicio.link_video && (
                            <a
                              href={exercicio.link_video}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline touch-target"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Ver demonstração
                            </a>
                          )}

                          {!readOnly && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                abrirExercicioNaBiblioteca(exercicio.nome);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline touch-target"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Ver na biblioteca
                            </button>
                          )}
                        </div>

                        {exercicio.observacoes && (
                          <p className="text-xs text-muted-foreground italic">
                            {exercicio.observacoes}
                          </p>
                        )}
                      </div>
                    </div>

                    {hasNext && (
                      <div className="flex justify-center py-1">
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GroupedExerciseCard;
