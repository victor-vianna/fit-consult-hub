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
    const minOrdem = grupo.exercicios?.length > 0
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
}: WorkoutExerciseListProps) {
  // Merge all blocks into one array
  const allBlocos = [...blocosInicio, ...blocosMeio, ...blocosFim];

  // Build unified sorted list
  const unifiedList = buildUnifiedList(exerciciosIsolados, grupos, allBlocos);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {unifiedList.map((item, idx) => {
          if (item.type === "block") {
            const bloco = item.data;
            return (
              <WorkoutBlockCard
                key={bloco.id}
                bloco={bloco}
                index={idx}
                readOnly={true}
                onToggleConcluido={onToggleBloco}
              />
            );
          }

          if (item.type === "group") {
            const grupo = item.data;
            return (
              <CompactGroupCard
                key={grupo.grupo_id || `grupo-${idx}`}
                grupo={grupo}
                index={idx}
                onToggleConcluido={onToggleExercicio}
                onToggleGrupoConcluido={onToggleGrupo}
                profileId={profileId}
              />
            );
          }

          // exercise
          const exercicio = item.data;
          return (
            <CompactExerciseCard
              key={exercicio.id}
              exercicio={exercicio}
              index={idx}
              onToggleConcluido={onToggleExercicio}
              profileId={profileId}
            />
          );
        })}
      </div>

      {/* Botão Finalizar Treino */}
      {isWorkoutActive && onFinalizarTreino && (
        <div className="mt-6 pt-4 border-t border-border/50">
          <Button
            onClick={onFinalizarTreino}
            size="lg"
            className="w-full h-14 text-base font-semibold shadow-lg gap-2"
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
