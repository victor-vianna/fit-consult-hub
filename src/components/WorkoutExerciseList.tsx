// components/WorkoutExerciseList.tsx
import { Button } from "@/components/ui/button";
import { CompactExerciseCard } from "./CompactExerciseCard";
import { CompactGroupCard } from "./CompactGroupCard";
import { WorkoutBlockCard } from "./WorkoutBlockCard";
import { CheckCircle, Trophy } from "lucide-react";
import type { BlocoTreino } from "@/types/workoutBlocks";
import type { GrupoExercicio } from "@/hooks/useExerciseGroups";

interface Exercicio {
  id: string;
  nome: string;
  link_video?: string | null;
  series?: number;
  repeticoes?: string;
  descanso?: number;
  carga?: string | null;
  peso_executado?: string | null;
  observacoes?: string | null;
  concluido?: boolean;
  grupo_id?: string | null;
  thumbnail?: string | null;
  ordem?: number;
}

type UnifiedItem = {
  type: "exercise" | "group" | "block";
  ordem: number;
  data: any;
};

interface WorkoutExerciseListProps {
  exerciciosIsolados: Exercicio[];
  grupos: GrupoExercicio[];
  blocosInicio: BlocoTreino[];
  blocosMeio: BlocoTreino[];
  blocosFim: BlocoTreino[];
  onToggleExercicio: (id: string, concluido: boolean) => Promise<any>;
  onToggleGrupo?: (grupoId: string, concluido: boolean) => Promise<void>;
  onToggleBloco?: (blocoId: string, concluido: boolean) => Promise<void>;
  isWorkoutActive?: boolean;
  onFinalizarTreino?: () => void;
  profileId?: string;
  treinoId?: string | null;
  resumeItemId?: string | null;
}

function buildUnifiedList(
  exerciciosIsolados: Exercicio[],
  grupos: GrupoExercicio[],
  blocos: BlocoTreino[]
): UnifiedItem[] {
  const items: UnifiedItem[] = [];

  exerciciosIsolados.forEach((ex) => {
    items.push({
      type: "exercise",
      ordem: ex.ordem ?? 0,
      data: ex,
    });
  });

  grupos.forEach((grupo: any) => {
    const minOrdem =
      grupo.exercicios?.length > 0
        ? Math.min(...grupo.exercicios.map((e: any) => e.ordem ?? 0))
        : 0;
    items.push({
      type: "group",
      ordem: minOrdem,
      data: grupo,
    });
  });

  blocos.forEach((bloco: any) => {
    items.push({
      type: "block",
      ordem: bloco.ordem ?? 0,
      data: bloco,
    });
  });

  items.sort((a, b) => a.ordem - b.ordem);
  return items;
}

export function WorkoutExerciseList({
  exerciciosIsolados,
  grupos,
  blocosInicio,
  blocosMeio,
  blocosFim,
  onToggleExercicio,
  onToggleGrupo,
  onToggleBloco,
  isWorkoutActive,
  onFinalizarTreino,
  profileId,
  treinoId,
  resumeItemId,
}: WorkoutExerciseListProps) {
  const aquecimentoList = buildUnifiedList([], [], blocosInicio);
  const mainList = buildUnifiedList(
    exerciciosIsolados,
    grupos,
    [...blocosMeio, ...blocosFim]
  );

  const renderItem = (item: UnifiedItem, idx: number) => {
    if (item.type === "block") {
      const bloco = item.data;
      return (
        <div
          key={bloco.id}
          data-workout-cache-item={bloco.id}
          data-workout-treino-id={treinoId ?? undefined}
          data-workout-cache-type="block"
        >
          <WorkoutBlockCard
            bloco={bloco}
            index={idx}
            readOnly={true}
            onToggleConcluido={isWorkoutActive ? onToggleBloco : undefined}
          />
        </div>
      );
    }

    if (item.type === "group") {
      const grupo = item.data;
      return (
        <CompactGroupCard
          key={grupo.grupo_id || `grupo-${idx}`}
          grupo={grupo}
          index={idx}
          onToggleConcluido={isWorkoutActive ? onToggleExercicio : undefined}
          onToggleGrupoConcluido={isWorkoutActive ? onToggleGrupo : undefined}
          isWorkoutActive={!!isWorkoutActive}
          profileId={profileId}
          treinoId={treinoId}
          resumeItemId={isWorkoutActive ? resumeItemId : null}
        />
      );
    }

    const exercicio = item.data;
    return (
      <CompactExerciseCard
        key={exercicio.id}
        exercicio={exercicio}
        index={idx}
        onToggleConcluido={isWorkoutActive ? onToggleExercicio : undefined}
        isWorkoutActive={!!isWorkoutActive}
        profileId={profileId}
        treinoId={treinoId}
        highlighted={!!isWorkoutActive && resumeItemId === exercicio.id}
      />
    );
  };

  const renderSection = (label: string, items: UnifiedItem[], offset = 0) => {
    if (items.length === 0) return null;

    return (
      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => renderItem(item, offset + idx))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      {renderSection("Aquecimento", aquecimentoList)}
      {renderSection("Treino principal", mainList, aquecimentoList.length)}

      {isWorkoutActive && onFinalizarTreino && (
        <div className="mt-6 border-t border-border/50 pt-4">
          <Button
            onClick={onFinalizarTreino}
            size="lg"
            className="h-14 w-full gap-2 text-base font-semibold shadow-lg"
          >
            <Trophy className="h-5 w-5" />
            Finalizar Treino
            <CheckCircle className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default WorkoutExerciseList;
