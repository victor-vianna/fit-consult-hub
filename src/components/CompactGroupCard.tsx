// components/CompactGroupCard.tsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronDown,
  Link as LinkIcon,
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
  index,
  onToggleConcluido,
  onToggleGrupoConcluido,
  isWorkoutActive = false,
  profileId,
  treinoId,
  resumeItemId,
}: CompactGroupCardProps) {
  const [localExercicios, setLocalExercicios] = useState(grupo.exercicios);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLocalExercicios(grupo.exercicios);
  }, [grupo.exercicios]);

  useEffect(() => {
    if (!isWorkoutActive) {
      setLocalExercicios((prev) =>
        prev.map((exercicio) => ({ ...exercicio, concluido: false }))
      );
    }
  }, [isWorkoutActive]);

  const tipoConfig =
    TIPOS_AGRUPAMENTO[
      grupo.tipo_agrupamento as keyof typeof TIPOS_AGRUPAMENTO
    ] || TIPOS_AGRUPAMENTO["bi-set"];

  const todosConcluidos =
    localExercicios.length > 0 && localExercicios.every((e) => e.concluido);
  const algumConcluido = localExercicios.some((e) => e.concluido);
  const concluidosCount = localExercicios.filter((e) => e.concluido).length;
  const fitExercisesOnScreen = localExercicios.length <= 2;
  const hasHighlightedExercise = localExercicios.some(
    (exercicio) => exercicio.id === resumeItemId
  );

  useEffect(() => {
    if (hasHighlightedExercise) setExpanded(true);
  }, [hasHighlightedExercise]);

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

  const handleToggleExercicio = async (id: string, concluido: boolean) => {
    setLocalExercicios((prev) =>
      prev.map((exercicio) =>
        exercicio.id === id ? { ...exercicio, concluido } : exercicio
      )
    );

    await onToggleConcluido?.(id, concluido);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-sm transition-colors",
        todosConcluidos && "border-green-500/30 bg-green-50/50 dark:bg-green-950/10",
        algumConcluido && !todosConcluidos && "border-yellow-500/50",
        hasHighlightedExercise && "border-blue-500/60 bg-blue-950/10 ring-1 ring-blue-500/40"
      )}
    >
      <CardContent className="p-0">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setExpanded((value) => !value);
            }
          }}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
        >
          {isWorkoutActive && onToggleGrupoConcluido ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                handleToggleGrupo();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  handleToggleGrupo();
                }
              }}
              aria-label="Marcar grupo combinado como concluido"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              {todosConcluidos ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/60 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
              )}
            </span>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold text-muted-foreground">
              {index + 1}
            </span>
          )}

          <div
            className={cn(
              "hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex",
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
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="shrink-0 text-xs font-semibold">
                {tipoConfig.label}
              </Badge>
              <p
                className={cn(
                  "break-words text-sm font-semibold leading-tight text-foreground sm:text-base",
                  todosConcluidos && "text-muted-foreground line-through"
                )}
              >
                {localExercicios.map((ex) => ex.nome).join(" + ")}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {localExercicios.length} exercicios · {concluidosCount}/{localExercicios.length} concluidos
            </p>
          </div>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>

        {expanded && (
          <div className="border-t bg-muted/10 p-3 sm:p-4">
            <div
              className={cn(
                "pb-2",
                fitExercisesOnScreen
                  ? "overflow-visible"
                  : "-mx-3 overflow-x-auto px-3 sm:-mx-4 sm:px-4"
              )}
            >
              <div
                className={cn(
                  "grid gap-3",
                  fitExercisesOnScreen
                    ? "w-full grid-cols-1 min-[720px]:grid-cols-2"
                    : "min-w-max snap-x snap-mandatory grid-cols-[repeat(var(--cols),minmax(280px,1fr))] sm:grid-cols-[repeat(var(--cols),minmax(300px,1fr))]"
                )}
                style={{ ["--cols" as any]: localExercicios.length }}
              >
                {localExercicios.map((exercicio, idx) => (
                  <CompactExerciseCard
                    key={exercicio.id}
                    exercicio={exercicio}
                    index={idx}
                    variant="carousel"
                    onToggleConcluido={handleToggleExercicio}
                    isWorkoutActive={isWorkoutActive}
                    profileId={profileId}
                    treinoId={treinoId}
                    highlighted={resumeItemId === exercicio.id}
                    fitContainer={fitExercisesOnScreen}
                  />
                ))}
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CompactGroupCard;
