// components/GroupedExerciseCard.tsx
import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";

// ✅ Tipos de agrupamento suportados
const TIPOS_AGRUPAMENTO = {
  normal: { label: "Normal", icon: "🏋️" },
  "bi-set": { label: "Bi-Set", icon: "🔄" },
  "tri-set": { label: "Tri-Set", icon: "🔄🔄" },
  "drop-set": { label: "Drop-Set", icon: "📉" },
  superset: { label: "Super-Set", icon: "⚡" },
} as const;

type TipoAgrupamento = keyof typeof TIPOS_AGRUPAMENTO;

// ✅ Interface do exercício agrupado (baseada nos hooks)
interface ExercicioAgrupado {
  id: string;
  nome: string;
  link_video?: string | null;
  series?: number;
  repeticoes?: string;
  descanso?: number;
  carga?: string | number | null;
  observacoes?: string | null;
  concluido?: boolean;
  ordem_no_grupo?: number | null;
}

// ✅ Interface do grupo (baseada em useExerciseGroups)
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
}

export function GroupedExerciseCard({
  grupo,
  index,
  readOnly = false,
  onEdit,
  onDelete,
  onToggleConcluido,
  onToggleGrupoConcluido,
}: GroupedExerciseCardProps) {
  // Estado local para updates otimistas
  const [localExercicios, setLocalExercicios] = useState<ExercicioAgrupado[]>(
    grupo.exercicios || []
  );

  // Sincronizar com props quando mudarem
  useEffect(() => {
    setLocalExercicios(grupo.exercicios || []);
  }, [grupo.exercicios]);

  // ✅ Tipo do agrupamento
  const tipoAtual = (grupo.tipo_agrupamento || "bi-set") as TipoAgrupamento;
  const tipoConfig =
    TIPOS_AGRUPAMENTO[tipoAtual] || TIPOS_AGRUPAMENTO["bi-set"];

  // Status do grupo
  const todosConcluidos =
    localExercicios.length > 0 && localExercicios.every((e) => e.concluido);
  const algumConcluido = localExercicios.some((e) => e.concluido);
  const nenhumConcluido = !algumConcluido;

  // ✅ Handler para toggle de exercício individual
  const handleToggleExercicio = async (
    exercicioId: string,
    concluido: boolean
  ) => {
    if (!onToggleConcluido) return;

    // Update otimista
    setLocalExercicios((prev) =>
      prev.map((e) => (e.id === exercicioId ? { ...e, concluido } : e))
    );

    try {
      await onToggleConcluido(exercicioId, concluido);
    } catch (error) {
      console.error("[GroupedExerciseCard] Erro ao marcar exercício:", error);
      // Reverter em caso de erro
      setLocalExercicios((prev) =>
        prev.map((e) =>
          e.id === exercicioId ? { ...e, concluido: !concluido } : e
        )
      );
    }
  };

  // ✅ Handler para toggle de grupo completo
  const handleToggleGrupo = async () => {
    if (!onToggleGrupoConcluido || !grupo.grupo_id) {
      console.warn("[GroupedExerciseCard] Toggle de grupo não disponível:", {
        hasHandler: !!onToggleGrupoConcluido,
        grupoId: grupo.grupo_id,
      });
      return;
    }

    const novoStatus = !todosConcluidos;

    // Update otimista
    setLocalExercicios((prev) =>
      prev.map((e) => ({ ...e, concluido: novoStatus }))
    );

    try {
      await onToggleGrupoConcluido(grupo.grupo_id, novoStatus);
    } catch (error) {
      console.error("[GroupedExerciseCard] Erro ao marcar grupo:", error);
      // Reverter em caso de erro
      setLocalExercicios(grupo.exercicios || []);
    }
  };

  // ✅ Formatar carga (pode ser string ou number)
  const formatarCarga = (
    carga: string | number | null | undefined
  ): string | null => {
    if (carga == null) return null;
    const cargaStr = String(carga).trim();
    return cargaStr || null;
  };

  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all",
        todosConcluidos &&
          "border-green-500/50 bg-green-50/30 dark:bg-green-950/20",
        algumConcluido &&
          !todosConcluidos &&
          "border-yellow-500/50 bg-yellow-50/20 dark:bg-yellow-950/10"
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header do Grupo */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Grip + Número (apenas para Personal) */}
            <div className="flex flex-col items-center gap-1 pt-1">
              {!readOnly && (
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              )}
              <Badge variant="outline" className="text-xs font-mono">
                {index + 1}
              </Badge>
            </div>

            {/* Informações do Grupo */}
            <div className="flex-1 space-y-2">
              {/* Tipo do Agrupamento + Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={todosConcluidos ? "default" : "secondary"}
                  className="font-semibold text-sm"
                >
                  {tipoConfig.icon} {tipoConfig.label}
                </Badge>

                {grupo.descanso_entre_grupos != null &&
                  grupo.descanso_entre_grupos > 0 && (
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

                {algumConcluido && !todosConcluidos && (
                  <Badge
                    variant="outline"
                    className="bg-yellow-100 border-yellow-300"
                  >
                    Em andamento
                  </Badge>
                )}
              </div>

              {/* Instrução visual para o aluno (apenas no modo aluno) */}
              {!readOnly && onToggleGrupoConcluido && (
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

                  <button
                    onClick={handleToggleGrupo}
                    className="shrink-0 transition-transform hover:scale-110"
                    title={
                      todosConcluidos
                        ? "Desmarcar grupo completo"
                        : "Marcar grupo completo"
                    }
                    aria-label={
                      todosConcluidos
                        ? "Desmarcar grupo como não concluído"
                        : "Marcar grupo como concluído"
                    }
                  >
                    {todosConcluidos ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Circle className="h-6 w-6 text-primary hover:text-green-600 transition-colors" />
                    )}
                  </button>
                </div>
              )}

              {/* Lista de Exercícios */}
              <div className="space-y-0 relative">
                {localExercicios.map((exercicio, exIndex) => {
                  const cargaFormatada = formatarCarga(exercicio.carga);
                  const isFirst = exIndex === 0;
                  const isLast = exIndex === localExercicios.length - 1;
                  const hasNext = !isLast;

                  return (
                    <div key={exercicio.id} className="relative">
                      <div
                        className={cn(
                          "flex items-start gap-3 p-3 border transition-all",
                          isFirst && "rounded-t-lg",
                          isLast && "rounded-b-lg",
                          !isFirst && "border-t-0",
                          exercicio.concluido
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                            : "bg-muted/30 border-border hover:bg-muted/50"
                        )}
                      >
                        {/* Checkbox (apenas no modo aluno) */}
                        {!readOnly && onToggleConcluido && (
                          <button
                            onClick={() =>
                              handleToggleExercicio(
                                exercicio.id,
                                !exercicio.concluido
                              )
                            }
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

                        {/* Número do exercício no grupo */}
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

                        {/* Detalhes do exercício */}
                        <div className="flex-1 space-y-1.5">
                          <p
                            className={cn(
                              "font-semibold text-sm",
                              exercicio.concluido &&
                                "line-through text-muted-foreground"
                            )}
                          >
                            {exercicio.nome}
                          </p>

                          {/* Link do vídeo */}
                          {exercicio.link_video && (
                            <a
                              href={exercicio.link_video}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Play className="h-3 w-3" />
                              Ver demonstração
                            </a>
                          )}

                          {/* Informações de treino */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <Dumbbell className="h-3 w-3" />
                              {exercicio.series || 3}x
                              {exercicio.repeticoes || "12"}
                            </span>

                            {cargaFormatada && (
                              <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {cargaFormatada}kg
                              </span>
                            )}

                            {exercicio.descanso != null &&
                              exercicio.descanso > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {exercicio.descanso}s
                                </span>
                              )}
                          </div>

                          {/* Observações do exercício */}
                          {exercicio.observacoes && (
                            <p className="text-xs text-muted-foreground italic">
                              💡 {exercicio.observacoes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Seta entre exercícios (apenas se não for o último) */}
                      {hasNext && (
                        <div className="flex justify-center my-1">
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Botões de ação (apenas para Personal) */}
          {!readOnly && (onEdit || onDelete) && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEdit}
                  title="Editar grupo"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={onDelete}
                  title="Deletar grupo"
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

export default GroupedExerciseCard;
