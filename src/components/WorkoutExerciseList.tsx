// components/WorkoutExerciseList.tsx
import { Separator } from "@/components/ui/separator";
import { CompactExerciseCard } from "./CompactExerciseCard";
import { CompactGroupCard } from "./CompactGroupCard";
import { WorkoutBlockCard } from "./WorkoutBlockCard";
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
}

interface WorkoutExerciseListProps {
  exerciciosIsolados: Exercicio[];
  grupos: GrupoExercicio[];
  blocosInicio: BlocoTreino[];
  blocosMeio: BlocoTreino[];
  blocosFim: BlocoTreino[];
  onToggleExercicio: (id: string, concluido: boolean) => Promise<any>;
  onToggleGrupo?: (grupoId: string, concluido: boolean) => Promise<void>;
  onToggleBloco?: (blocoId: string, concluido: boolean) => Promise<void>;
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
}: WorkoutExerciseListProps) {
  return (
    <div className="space-y-4">
      {/* Blocos do Início */}
      {blocosInicio.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            <span className="font-semibold">Aquecimento</span>
            <Separator className="flex-1" />
          </div>
          {blocosInicio.map((bloco, idx) => (
            <WorkoutBlockCard
              key={bloco.id}
              bloco={bloco}
              index={idx}
              readOnly={false}
              onToggleConcluido={onToggleBloco}
            />
          ))}
        </div>
      )}

      {/* Exercícios Principais */}
      <div className="space-y-2">
        {/* Grupos */}
        {grupos.map((grupo, idx) => (
          <CompactGroupCard
            key={grupo.grupo_id || `grupo-${idx}`}
            grupo={grupo}
            index={idx}
            onToggleConcluido={onToggleExercicio}
            onToggleGrupoConcluido={onToggleGrupo}
          />
        ))}

        {/* Exercícios Isolados */}
        {exerciciosIsolados.map((exercicio, index) => (
          <CompactExerciseCard
            key={exercicio.id}
            exercicio={exercicio}
            index={index}
            onToggleConcluido={onToggleExercicio}
          />
        ))}
      </div>

      {/* Blocos do Meio */}
      {blocosMeio.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            <span className="font-semibold">Complementar</span>
            <Separator className="flex-1" />
          </div>
          {blocosMeio.map((bloco, idx) => (
            <WorkoutBlockCard
              key={bloco.id}
              bloco={bloco}
              index={idx}
              readOnly={false}
              onToggleConcluido={onToggleBloco}
            />
          ))}
        </div>
      )}

      {/* Blocos do Fim */}
      {blocosFim.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            <span className="font-semibold">Alongamento</span>
            <Separator className="flex-1" />
          </div>
          {blocosFim.map((bloco, idx) => (
            <WorkoutBlockCard
              key={bloco.id}
              bloco={bloco}
              index={idx}
              readOnly={false}
              onToggleConcluido={onToggleBloco}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkoutExerciseList;
