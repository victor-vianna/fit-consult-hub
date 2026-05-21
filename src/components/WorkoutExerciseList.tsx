// components/WorkoutExerciseList.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompactExerciseCard } from "./CompactExerciseCard";
import { CompactGroupCard } from "./CompactGroupCard";
import { WorkoutBlockCard } from "./WorkoutBlockCard";
import { CheckCircle, CheckCircle2, ChevronDown, Circle, Clock, Trophy } from "lucide-react";
import { TIPOS_BLOCO, formatarDuracao } from "@/types/workoutBlocks";
import type { BlocoTreino } from "@/types/workoutBlocks";
import type { GrupoExercicio } from "@/hooks/useExerciseGroups";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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

function getBlockDuration(bloco: BlocoTreino) {
  const minutos =
    bloco.config_cardio?.duracao_minutos ??
    bloco.config_alongamento?.duracao_minutos ??
    bloco.config_aquecimento?.duracao_minutos ??
    bloco.duracao_estimada_minutos;

  return minutos ? formatarDuracao(minutos) : null;
}

function MobileWorkoutBlockCard({
  bloco,
  index,
  onToggleConcluido,
}: {
  bloco: BlocoTreino;
  index: number;
  onToggleConcluido?: (blocoId: string, concluido: boolean) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const tipoConfig = TIPOS_BLOCO[bloco.tipo] ?? TIPOS_BLOCO.outro;
  const duration = getBlockDuration(bloco);

  const handleToggle = async () => {
    await onToggleConcluido?.(bloco.id, !bloco.concluido);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card transition-all duration-300",
        bloco.concluido &&
          "border-green-200/50 bg-green-50/50 dark:bg-green-950/10"
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3">
        {onToggleConcluido && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleToggle();
            }}
            className="shrink-0 inline-flex min-h-[44px] min-w-[44px] -m-1 items-center justify-center transition-transform active:scale-95"
            aria-label={
              bloco.concluido
                ? `Desmarcar ${bloco.nome}`
                : `Marcar ${bloco.nome} como concluido`
            }
          >
            {bloco.concluido ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
        )}

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted sm:h-12 sm:w-12">
          <span className="text-lg">{tipoConfig.icon}</span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="min-w-0 flex-1 py-1 -my-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {tipoConfig.label}
            </Badge>
            {duration && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {duration}
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-1 break-words text-sm font-semibold leading-snug sm:text-base",
              bloco.concluido && "line-through text-muted-foreground"
            )}
          >
            {index + 1}. {bloco.nome}
          </p>
        </button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir" : "Recolher"}
          className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0"
        >
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              !collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {!collapsed && (
        <div className="border-t p-3">
          <WorkoutBlockCard
            bloco={bloco}
            index={index}
            readOnly={true}
            onToggleConcluido={onToggleConcluido}
          />
        </div>
      )}
    </div>
  );
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
  const isMobile = useIsMobile();

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
            return isMobile ? (
              <MobileWorkoutBlockCard
                key={bloco.id}
                bloco={bloco}
                index={idx}
                onToggleConcluido={onToggleBloco}
              />
            ) : (
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
