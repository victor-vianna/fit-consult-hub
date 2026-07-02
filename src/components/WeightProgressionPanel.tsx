// components/WeightProgressionPanel.tsx
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Dumbbell, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeightHistoryBatch, type WeightRecord } from "@/hooks/useWeightHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayMonthDay } from "@/utils/dateFormat";

interface WeightProgressionPanelProps {
  profileId: string;
  themeColor?: string;
}

interface ExerciseProgressStats {
  diff: number;
  maiorPeso: number;
}

type ExerciseProgressItem = {
  nome: string;
  records: WeightRecord[];
  stats: ExerciseProgressStats;
};

export function WeightProgressionPanel({ profileId, themeColor }: WeightProgressionPanelProps) {
  const { data: grouped, isLoading } = useWeightHistoryBatch(profileId);
  const [showAll, setShowAll] = useState(false);

  const exercicios = useMemo<ExerciseProgressItem[]>(
    () =>
      Object.entries(grouped || {})
        .filter(([_, records]) => records.length >= 1)
        .map(([nome, records]) => ({ nome, records, stats: getExerciseStats(records) }))
        .sort((a, b) => {
          const priorityA = getProgressPriority(a.stats.diff);
          const priorityB = getProgressPriority(b.stats.diff);
          if (priorityA !== priorityB) return priorityB - priorityA;

          const absDiffA = Math.abs(a.stats.diff);
          const absDiffB = Math.abs(b.stats.diff);
          if (absDiffA !== absDiffB) return absDiffB - absDiffA;

          return new Date(b.records[0].data).getTime() - new Date(a.records[0].data).getTime();
        }),
    [grouped]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" style={{ color: themeColor || undefined }} />
            Progressao de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (exercicios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" style={{ color: themeColor || undefined }} />
            Progressao de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum registro de peso executado ainda</p>
            <p className="text-xs mt-1">Os dados aparecerao conforme o aluno registrar as cargas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleExercises = showAll ? exercicios : exercicios.slice(0, 6);
  const dropsCount = exercicios.filter((item) => item.stats.diff < 0).length;
  const gainsCount = exercicios.filter((item) => item.stats.diff > 0).length;
  const maintainedCount = exercicios.filter((item) => item.stats.diff === 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" style={{ color: themeColor || undefined }} />
          Progressao de Cargas
          <Badge variant="secondary" className="text-xs ml-auto">
            {exercicios.length} exercicio{exercicios.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3">
          <ProgressSummaryItem label="Queda" value={dropsCount} tone="danger" />
          <ProgressSummaryItem label="Evolucao" value={gainsCount} tone="success" />
          <ProgressSummaryItem label="Manteve" value={maintainedCount} tone="muted" />
        </div>

        <p className="text-xs text-muted-foreground">
          Resumo priorizado por queda recente e maiores aumentos. Exercicios sem mudanca ficam com menor destaque.
        </p>

        <div className="space-y-2">
          {visibleExercises.map((item) => (
            <ExerciseProgressRow key={item.nome} item={item} />
          ))}
        </div>

        {!showAll && exercicios.length > 6 && (
          <Button variant="outline" className="w-full" onClick={() => setShowAll(true)}>
            Ver todos os {exercicios.length} exercicios
          </Button>
        )}
        {showAll && exercicios.length > 6 && (
          <Button variant="ghost" className="w-full" onClick={() => setShowAll(false)}>
            Mostrar resumo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressSummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "danger" | "success" | "muted";
}) {
  return (
    <div className="rounded-md border bg-background/70 p-2">
      <p
        className={cn(
          "text-xl font-bold",
          tone === "danger" && "text-red-600 dark:text-red-400",
          tone === "success" && "text-green-600 dark:text-green-400",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ExerciseProgressRow({ item }: { item: ExerciseProgressItem }) {
  const { nome, records, stats } = item;
  const ultimo = records[0];
  const diff = stats.diff;
  const isDrop = diff < 0;
  const isGain = diff > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        isDrop
          ? "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20"
          : isGain
          ? "border-green-300 bg-green-50 dark:border-green-900/60 dark:bg-green-950/20"
          : "bg-card/70 text-muted-foreground hover:bg-muted/30"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isDrop
            ? "bg-red-100 dark:bg-red-950/50"
            : isGain
            ? "bg-green-100 dark:bg-green-950/50"
            : "bg-primary/10"
        )}
      >
        <Dumbbell
          className={cn(
            "h-4 w-4",
            isDrop ? "text-red-600" : isGain ? "text-green-600" : "text-muted-foreground"
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm capitalize", isDrop || isGain ? "font-semibold text-foreground" : "font-medium")}>
          {nome}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs text-muted-foreground">
            {formatWeight(parseWeight(ultimo.peso_executado))}kg em {formatDisplayMonthDay(ultimo.data)}
          </span>
          <span className="text-xs text-muted-foreground">
            pico {formatWeight(stats.maiorPeso)}kg
          </span>
          {records.length > 1 && (
            <span className="text-[10px] text-muted-foreground">({records.length}x)</span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {diff !== 0 ? (
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isGain
                ? "border-green-300 bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                : "border-red-300 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            )}
          >
            {isGain ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
            {isGain ? "+" : "-"}
            {formatWeight(Math.abs(diff))}kg
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            <Minus className="mr-1 h-3 w-3" />
            manteve
          </Badge>
        )}
      </div>
    </div>
  );
}

function parseWeight(value: string | number | null | undefined) {
  if (value === null || value === undefined) return NaN;
  return Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
}

function getExerciseStats(records: WeightRecord[]): ExerciseProgressStats {
  const ultimoPeso = parseWeight(records[0]?.peso_executado);
  const penultimoPeso = parseWeight(records[1]?.peso_executado);
  const pesos = records.map((record) => parseWeight(record.peso_executado)).filter(Number.isFinite);

  return {
    diff: Number.isFinite(ultimoPeso) && Number.isFinite(penultimoPeso)
      ? ultimoPeso - penultimoPeso
      : 0,
    maiorPeso: pesos.length > 0 ? Math.max(...pesos) : 0,
  };
}

function getProgressPriority(diff: number) {
  if (diff < 0) return 3;
  if (diff > 0) return 2;
  return 1;
}

function formatWeight(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default WeightProgressionPanel;
