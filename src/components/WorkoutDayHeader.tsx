// components/WorkoutDayHeader.tsx
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutDayHeaderProps {
  diaNome: string;
  descricao?: string | null;
  totalItens: number;
  completedItems: number;
  totalExercicios: number;
  totalGrupos: number;
  totalBlocos: number;
  progresso: number;
  treinoIniciado: boolean;
  onStartWorkout?: () => void;
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function WorkoutDayHeader({
  diaNome,
  descricao,
  totalItens,
  completedItems,
  totalExercicios,
  totalGrupos,
  totalBlocos,
  progresso,
  treinoIniciado,
  onStartWorkout,
}: WorkoutDayHeaderProps) {
  const progressValue =
    totalItens > 0
      ? Math.round((Math.min(completedItems, totalItens) / totalItens) * 100)
      : progresso;

  const pills = [
    totalExercicios > 0
      ? pluralize(totalExercicios, "exercicio", "exercicios")
      : null,
    totalGrupos > 0 ? pluralize(totalGrupos, "grupo", "grupos") : null,
    totalBlocos > 0 ? pluralize(totalBlocos, "bloco", "blocos") : null,
  ].filter(Boolean);

  return (
    <section className="rounded-xl border bg-card/80 p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {diaNome}
          </h2>
          {descricao && (
            <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
              {descricao}
            </p>
          )}
        </div>

        {!treinoIniciado && onStartWorkout ? (
          <Button
            type="button"
            onClick={onStartWorkout}
            size="lg"
            className="h-11 gap-2 px-5 font-semibold sm:min-w-[172px]"
          >
            <Play className="h-4 w-4" />
            Iniciar treino
          </Button>
        ) : (
          <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Em andamento
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Progress value={progressValue} className="h-1.5 flex-1" />
        <span className="shrink-0 text-xs font-medium text-muted-foreground sm:text-sm">
          {Math.min(completedItems, totalItens)} de {totalItens} concluidos
        </span>
      </div>

      {pills.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {pills.map((pill) => (
            <span
              key={pill}
              className={cn(
                "shrink-0 rounded-full border bg-background/70 px-3 py-1",
                "text-xs font-medium text-muted-foreground"
              )}
            >
              {pill}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export default WorkoutDayHeader;
