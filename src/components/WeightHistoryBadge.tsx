// components/WeightHistoryBadge.tsx
import { useState } from "react";
import { TrendingUp, History, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { WeightRecord } from "@/hooks/useWeightHistory";

interface WeightHistoryBadgeProps {
  ultimoPeso: string | null;
  ultimaData: string | null;
  historico: WeightRecord[];
  exercicioNome: string;
  loading?: boolean;
  compact?: boolean;
}

export function WeightHistoryBadge({
  ultimoPeso,
  ultimaData,
  historico,
  exercicioNome,
  loading = false,
  compact = false,
}: WeightHistoryBadgeProps) {
  const [open, setOpen] = useState(false);

  if (loading || !ultimoPeso) return null;

  const dataFormatada = ultimaData
    ? format(new Date(ultimaData), "dd/MM", { locale: ptBR })
    : null;

  // Calcular tendência
  const tendencia = calcularTendencia(historico);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 rounded-md transition-all text-left",
            "hover:bg-muted/80 active:scale-95",
            compact
              ? "px-1.5 py-0.5 text-[11px]"
              : "px-2 py-1 text-xs"
          )}
          title="Ver histórico de carga"
        >
          <History className={cn("shrink-0 text-muted-foreground", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          <span className="text-muted-foreground">
            Última: <span className="font-semibold text-foreground">{ultimoPeso}kg</span>
            {dataFormatada && (
              <span className="text-muted-foreground/70"> em {dataFormatada}</span>
            )}
          </span>
          {tendencia !== 0 && (
            <TrendingUp
              className={cn(
                "h-3 w-3 shrink-0",
                tendencia > 0 ? "text-green-600" : "text-red-500 rotate-180"
              )}
            />
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progressão de Carga
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{exercicioNome}</p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3">
            <ResumoCard
              label="Última carga"
              valor={`${ultimoPeso}kg`}
            />
            <ResumoCard
              label="Maior carga"
              valor={`${getMaiorPeso(historico)}kg`}
            />
            <ResumoCard
              label="Registros"
              valor={String(historico.length)}
            />
          </div>

          {/* Histórico detalhado */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Histórico</h4>
            {historico.map((record, idx) => {
              const anterior = historico[idx + 1];
              const diff = anterior
                ? parseFloat(record.peso_executado) - parseFloat(anterior.peso_executado)
                : 0;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border",
                    idx === 0 ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">
                      {record.peso_executado}kg
                    </span>
                    {diff !== 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          diff > 0
                            ? "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:bg-green-950/30"
                            : "text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:bg-red-950/30"
                        )}
                      >
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)}kg
                      </Badge>
                    )}
                    {idx === 0 && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20" variant="outline">
                        Atual
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(record.data), "dd/MM/yy", { locale: ptBR })}
                  </span>
                </div>
              );
            })}

            {historico.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum registro de peso encontrado
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResumoCard({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50 border">
      <p className="text-lg font-bold">{valor}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function calcularTendencia(historico: WeightRecord[]): number {
  if (historico.length < 2) return 0;
  const ultimo = parseFloat(historico[0].peso_executado);
  const penultimo = parseFloat(historico[1].peso_executado);
  if (isNaN(ultimo) || isNaN(penultimo)) return 0;
  return ultimo - penultimo;
}

function getMaiorPeso(historico: WeightRecord[]): string {
  if (historico.length === 0) return "0";
  const pesos = historico.map((r) => parseFloat(r.peso_executado)).filter((p) => !isNaN(p));
  return pesos.length > 0 ? Math.max(...pesos).toString() : "0";
}
