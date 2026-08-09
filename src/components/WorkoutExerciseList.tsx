// components/WorkoutExerciseList.tsx
import { Button } from "@/components/ui/button";
import { CompactExerciseCard } from "./CompactExerciseCard";
import { CompactGroupCard } from "./CompactGroupCard";
import { WorkoutBlockCard } from "./WorkoutBlockCard";
import { CheckCircle, Trophy } from "lucide-react";
import type { BlocoTreino } from "@/types/workoutBlocks";
import type { GrupoExercicio } from "@/hooks/useExerciseGroups";
import {
  buildOrderedWorkoutItems,
  type OrderedWorkoutItem,
} from "@/utils/workoutNormalization";

interface Exercicio {
  id: string;
  nome: string;
  link_video?: string | null;
  series?: number;
  series_concluidas?: number | null;
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

type UnifiedItem = OrderedWorkoutItem<any, any, any>;

interface WorkoutExerciseListProps {
  exerciciosIsolados: Exercicio[];
  grupos: GrupoExercicio[];
  blocosInicio: BlocoTreino[];
  blocosMeio: BlocoTreino[];
  blocosFim: BlocoTreino[];
  onToggleExercicio: (id: string, concluido: boolean) => Promise<any>;
  onRegisterSerie?: (id: string, seriesConcluidas: number, totalSeries: number) => Promise<any>;
  onToggleGrupo?: (grupoId: string, concluido: boolean) => Promise<void>;
  onToggleBloco?: (blocoId: string, concluido: boolean) => Promise<void>;
  isWorkoutActive?: boolean;
  onFinalizarTreino?: () => void;
  profileId?: string;
  treinoId?: string | null;
  resumeItemId?: string | null;
}

export function WorkoutExerciseList({
  exerciciosIsolados,
  grupos,
  blocosInicio,
  blocosMeio,
  blocosFim,
  onToggleExercicio,
  onRegisterSerie,
  onToggleGrupo,
  onToggleBloco,
  isWorkoutActive,
  onFinalizarTreino,
  profileId,
  treinoId,
  resumeItemId,
}: WorkoutExerciseListProps) {
  const orderedItems = buildOrderedWorkoutItems(
    exerciciosIsolados,
    grupos,
    [...blocosInicio, ...blocosMeio, ...blocosFim]
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
          onRegisterSerie={isWorkoutActive ? onRegisterSerie : undefined}
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
        onRegisterSerie={isWorkoutActive ? onRegisterSerie : undefined}
        isWorkoutActive={!!isWorkoutActive}
        profileId={profileId}
        treinoId={treinoId}
        highlighted={!!isWorkoutActive && resumeItemId === exercicio.id}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {orderedItems.map((item, idx) => renderItem(item, idx))}
      </div>

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
