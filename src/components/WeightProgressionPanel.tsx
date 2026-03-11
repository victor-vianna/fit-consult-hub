// components/WeightProgressionPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Dumbbell, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWeightHistoryBatch, type WeightRecord } from "@/hooks/useWeightHistory";
import { Skeleton } from "@/components/ui/skeleton";

interface WeightProgressionPanelProps {
  profileId: string;
  themeColor?: string;
}

export function WeightProgressionPanel({ profileId, themeColor }: WeightProgressionPanelProps) {
  const { data: grouped, isLoading } = useWeightHistoryBatch(profileId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" style={{ color: themeColor || undefined }} />
            Progressão de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const exercicios = Object.entries(grouped || {})
    .filter(([_, records]) => records.length >= 1)
    .sort((a, b) => {
      // Ordenar por data mais recente
      const dateA = new Date(a[1][0].data).getTime();
      const dateB = new Date(b[1][0].data).getTime();
      return dateB - dateA;
    });

  if (exercicios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" style={{ color: themeColor || undefined }} />
            Progressão de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum registro de peso executado ainda</p>
            <p className="text-xs mt-1">Os dados aparecerão conforme o aluno registrar as cargas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" style={{ color: themeColor || undefined }} />
          Progressão de Cargas
          <Badge variant="secondary" className="text-xs ml-auto">
            {exercicios.length} exercício{exercicios.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {exercicios.map(([nome, records]) => (
          <ExerciseProgressRow key={nome} nome={nome} records={records} />
        ))}
      </CardContent>
    </Card>
  );
}

function ExerciseProgressRow({ nome, records }: { nome: string; records: WeightRecord[] }) {
  const ultimo = records[0];
  const penultimo = records[1];
  const diff = penultimo
    ? parseFloat(ultimo.peso_executado) - parseFloat(penultimo.peso_executado)
    : 0;
  const pesos = records.map(r => parseFloat(r.peso_executado)).filter(p => !isNaN(p));
  const maiorPeso = pesos.length > 0 ? Math.max(...pesos) : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Dumbbell className="h-4 w-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm capitalize truncate">{nome}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            Última: <span className="font-mono font-semibold text-foreground">{ultimo.peso_executado}kg</span>
          </span>
          <span className="text-xs text-muted-foreground">
            em {format(new Date(ultimo.data), "dd/MM", { locale: ptBR })}
          </span>
          {records.length > 1 && (
            <span className="text-[10px] text-muted-foreground">
              ({records.length}x)
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {diff !== 0 && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5",
              diff > 0
                ? "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:bg-green-950/30"
                : "text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:bg-red-950/30"
            )}
          >
            {diff > 0 ? <ArrowUp className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDown className="h-2.5 w-2.5 mr-0.5" />}
            {Math.abs(diff).toFixed(1)}kg
          </Badge>
        )}
        {diff === 0 && penultimo && (
          <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">
            <Minus className="h-2.5 w-2.5 mr-0.5" />
            Manteve
          </Badge>
        )}
        {maiorPeso > 0 && (
          <span className="font-mono text-xs font-bold text-primary">
            PR: {maiorPeso}kg
          </span>
        )}
      </div>
    </div>
  );
}

export default WeightProgressionPanel;
