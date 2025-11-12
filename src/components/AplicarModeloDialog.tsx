// components/AplicarModeloDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Dumbbell, Blocks } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ModeloTreino } from "@/hooks/useModelosTreino";

interface AplicarModeloDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelo: ModeloTreino | null;
  onAplicar: (diasSelecionados: number[]) => Promise<void>;
  loading?: boolean;
}

const DIAS_SEMANA = [
  { num: 1, nome: "Segunda-feira", abrev: "SEG" },
  { num: 2, nome: "Terça-feira", abrev: "TER" },
  { num: 3, nome: "Quarta-feira", abrev: "QUA" },
  { num: 4, nome: "Quinta-feira", abrev: "QUI" },
  { num: 5, nome: "Sexta-feira", abrev: "SEX" },
  { num: 6, nome: "Sábado", abrev: "SÁB" },
  { num: 7, nome: "Domingo", abrev: "DOM" },
];

export function AplicarModeloDialog({
  open,
  onOpenChange,
  modelo,
  onAplicar,
  loading = false,
}: AplicarModeloDialogProps) {
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);

  const toggleDia = (dia: number) => {
    setDiasSelecionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const handleAplicar = async () => {
    if (diasSelecionados.length === 0) return;

    await onAplicar(diasSelecionados);
    setDiasSelecionados([]);
  };

  const handleClose = () => {
    setDiasSelecionados([]);
    onOpenChange(false);
  };

  if (!modelo) return null;

  const totalExercicios = modelo.exercicios?.length || 0;
  const totalBlocos = modelo.blocos?.length || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Aplicar Modelo de Treino
          </DialogTitle>
          <DialogDescription>
            Escolha os dias da semana para aplicar o modelo "{modelo.nome}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações do modelo */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-semibold text-base">{modelo.nome}</h4>
                {modelo.descricao && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {modelo.descricao}
                  </p>
                )}
              </div>
              {modelo.categoria && (
                <Badge variant="secondary">{modelo.categoria}</Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {totalExercicios > 0 && (
                <span className="flex items-center gap-1">
                  <Dumbbell className="h-4 w-4" />
                  {totalExercicios} exercício{totalExercicios !== 1 ? "s" : ""}
                </span>
              )}
              {totalBlocos > 0 && (
                <span className="flex items-center gap-1">
                  <Blocks className="h-4 w-4" />
                  {totalBlocos} bloco{totalBlocos !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Seleção de dias */}
          <div className="space-y-3">
            <Label>Selecione os dias da semana</Label>
            <div className="grid grid-cols-2 gap-3">
              {DIAS_SEMANA.map((dia) => {
                const selecionado = diasSelecionados.includes(dia.num);

                return (
                  <div
                    key={dia.num}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-all hover:bg-accent",
                      selecionado && "bg-primary/5 border-primary"
                    )}
                    onClick={() => !loading && toggleDia(dia.num)}
                  >
                    <Checkbox
                      checked={selecionado}
                      onCheckedChange={() => !loading && toggleDia(dia.num)}
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={selecionado ? "default" : "outline"}
                          className="font-mono text-xs"
                        >
                          {dia.abrev}
                        </Badge>
                        <span className="text-sm font-medium">{dia.nome}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {diasSelecionados.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {diasSelecionados.length} dia
                {diasSelecionados.length !== 1 ? "s" : ""} selecionado
                {diasSelecionados.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Aviso */}
          {diasSelecionados.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Se já existir treino nos dias selecionados, ele será
                substituído pelo modelo.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleAplicar}
            disabled={loading || diasSelecionados.length === 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar Modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
