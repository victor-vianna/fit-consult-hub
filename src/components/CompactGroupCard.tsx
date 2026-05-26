// components/CompactGroupCard.tsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Clock,
  Link as LinkIcon,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompactExerciseCard } from "./CompactExerciseCard";

const TIPOS_AGRUPAMENTO = {
  normal: { label: "Normal" },
  "bi-set": { label: "Bi-Set" },
  "tri-set": { label: "Tri-Set" },
  "drop-set": { label: "Drop-Set" },
  superset: { label: "Super-Set" },
  circuito: { label: "Circuito" },
} as const;

interface CompactGroupCardProps {
  grupo: {
    grupo_id: string;
    tipo_agrupamento: string;
    descanso_entre_grupos?: number | null;
    exercicios: any[];
  };
  index: number;
  onToggleConcluido?: (id: string, concluido: boolean) => Promise<any>;
  onToggleGrupoConcluido?: (
    grupoId: string,
    concluido: boolean
  ) => Promise<void>;
  isWorkoutActive?: boolean;
  profileId?: string;
  treinoId?: string | null;
  resumeItemId?: string | null;
}

export function CompactGroupCard({
  grupo,
  onToggleConcluido,
  onToggleGrupoConcluido,
  isWorkoutActive = false,
  profileId,
  treinoId,
  resumeItemId,
}: CompactGroupCardProps) {
  const [localExercicios, setLocalExercicios] = useState(grupo.exercicios);

  useEffect(() => {
    setLocalExercicios(grupo.exercicios);
  }, [grupo.exercicios]);

  const tipoConfig =
    TIPOS_AGRUPAMENTO[
      grupo.tipo_agrupamento as keyof typeof TIPOS_AGRUPAMENTO
    ] || TIPOS_AGRUPAMENTO["bi-set"];

  const todosConcluidos =
    localExercicios.length > 0 && localExercicios.every((e) => e.concluido);
  const algumConcluido = localExercicios.some((e) => e.concluido);
  const concluidosCount = localExercicios.filter((e) => e.concluido).length;

  const handleToggleGrupo = async () => {
    if (!onToggleGrupoConcluido) return;
    const novoStatus = !todosConcluidos;

    setLocalExercicios((prev) =>
      prev.map((e) => ({ ...e, concluido: novoStatus }))
    );

    try {
      await onToggleGrupoConcluido(grupo.grupo_id, novoStatus);
    } catch (error) {
      console.error("Erro ao marcar grupo:", error);
      setLocalExercicios(grupo.exercicios);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-sm transition-colors",
        todosConcluidos && "border-green-500/30 bg-green-50/50 dark:bg-green-950/10",
        algumConcluido && !todosConcluidos && "border-yellow-500/50"
      )}
    >
      <CardContent className="p-0">
        <div
          className={cn(
            "flex items-start gap-3 p-3 sm:p-4",
            todosConcluidos
              ? "bg-green-50/60 dark:bg-green-950/10"
              : "bg-primary/5"
          )}
        >
          {isWorkoutActive && onToggleGrupoConcluido && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleToggleGrupo();
              }}
              aria-label="Marcar grupo combinado como concluido"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              {todosConcluidos ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Circle className="h-6 w-6 text-primary" />
              )}
            </button>
          )}

          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              todosConcluidos
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-primary/10"
            )}
          >
            <LinkIcon
              className={cn(
                "h-5 w-5",
                todosConcluidos ? "text-green-600" : "text-primary"
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold leading-tight text-foreground sm:text-base">
                Exercicios combinados
              </p>
              <Badge variant="secondary" className="text-xs font-semibold">
                {tipoConfig.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {localExercicios.length} exercicios
              </Badge>
              {todosConcluidos ? (
                <Badge className="bg-green-600 text-xs">Completo</Badge>
              ) : algumConcluido ? (
                <Badge
                  variant="outline"
                  className="border-yellow-500 text-xs text-yellow-700 dark:text-yellow-400"
                >
                  {concluidosCount}/{localExercicios.length}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm">
              Alterne os movimentos e descanse ao final do combinado.
            </p>
          </div>
        </div>

        <div className="border-t bg-muted/10 p-3 sm:p-4">
          {!todosConcluidos && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-background/70 p-2">
              <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-xs leading-snug text-muted-foreground">
                Execute os cards em sequencia. Depois descanse{" "}
                <strong>{grupo.descanso_entre_grupos || 60}s</strong>.
              </p>
            </div>
          )}

          <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:-mx-4 sm:px-4">
            <div className="flex snap-x snap-mandatory gap-3">
              {localExercicios.map((exercicio, idx) => (
                <CompactExerciseCard
                  key={exercicio.id}
                  exercicio={exercicio}
                  index={idx}
                  variant="carousel"
                  onToggleConcluido={onToggleConcluido}
                  isWorkoutActive={isWorkoutActive}
                  profileId={profileId}
                  treinoId={treinoId}
                  highlighted={resumeItemId === exercicio.id}
                />
              ))}
            </div>
          </div>

          {grupo.descanso_entre_grupos &&
            grupo.descanso_entre_grupos > 0 &&
            !todosConcluidos && (
              <div className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-800 dark:bg-yellow-950/20">
                <Clock className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                  Descanso do combinado: {grupo.descanso_entre_grupos}s
                </span>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CompactGroupCard;
