import { useEffect, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getWeekStart } from "@/utils/weekUtils";
import { cn } from "@/lib/utils";

interface TreinoSemanal {
  id: string;
  dia_semana: number;
  semana: string;
  concluido: boolean;
  observacoes: string | null;
}

interface CalendarioSemanalProps {
  profileId: string;
  personalId: string;
  themeColor?: string;
  onVerHistoricoCompleto?: () => void;
  onTreinoAtualizado?: () => void;
}

const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

export function CalendarioSemanal({
  profileId,
  themeColor,
  onTreinoAtualizado,
}: CalendarioSemanalProps) {
  const [treinos, setTreinos] = useState<TreinoSemanal[]>([]);
  const [semanaAtual, setSemanaAtual] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const { toast } = useToast();
  const accentColor = themeColor || "hsl(var(--primary))";

  useEffect(() => {
    if (profileId) carregarTreinos();
  }, [profileId, semanaAtual]);

  useEffect(() => {
    const handleWorkoutCompleted = () => {
      if (profileId) carregarTreinos();
    };

    window.addEventListener("workout-completed", handleWorkoutCompleted);
    return () => {
      window.removeEventListener("workout-completed", handleWorkoutCompleted);
    };
  }, [profileId]);

  const carregarTreinos = async () => {
    try {
      const semanaFormatada = format(semanaAtual, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("treinos_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .eq("semana", semanaFormatada);

      if (error) throw error;
      setTreinos(data || []);
    } catch (err) {
      console.error("[CalendarioSemanal] Erro ao carregar treinos:", err);
      toast({
        title: "Erro",
        description: "Nao foi possivel carregar os treinos da semana",
        variant: "destructive",
      });
    }
  };

  const irParaSemanaAnterior = () => {
    setSemanaAtual((prev) => addDays(prev, -7));
  };

  const irParaProximaSemana = () => {
    setSemanaAtual((prev) => addDays(prev, 7));
  };

  const irParaSemanaAtual = () => {
    setSemanaAtual(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const isSemanaAtualSelecionada =
    format(semanaAtual, "yyyy-MM-dd") === getWeekStart();

  const toggleTreino = async (treinoId: string, concluido: boolean) => {
    const { error } = await supabase
      .from("treinos_semanais")
      .update({
        concluido: !concluido,
        updated_at: new Date().toISOString(),
      })
      .eq("id", treinoId);

    if (error) {
      toast({
        title: "Erro",
        description: "Nao foi possivel atualizar o treino",
        variant: "destructive",
      });
      return;
    }

    setTreinos((prev) =>
      prev.map((t) => (t.id === treinoId ? { ...t, concluido: !concluido } : t))
    );

    onTreinoAtualizado?.();
  };

  return (
    <Card
      className="border bg-card shadow-sm"
      style={{
        borderColor: themeColor ? `${themeColor}26` : undefined,
        background: themeColor
          ? `linear-gradient(135deg, ${themeColor}08, ${themeColor}03)`
          : undefined,
      }}
    >
      <CardHeader className="space-y-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold sm:text-base">
              Frequencia de treinos
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {format(semanaAtual, "dd/MM", { locale: ptBR })} -{" "}
              {format(addDays(semanaAtual, 6), "dd/MM", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={irParaSemanaAnterior}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isSemanaAtualSelecionada && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={irParaSemanaAtual}
              >
                Hoje
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={irParaProximaSemana}
              aria-label="Proxima semana"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {diasSemana.map((dia, index) => {
            const diaMes = addDays(semanaAtual, index);
            const diaSemanaDb = index + 1;
            const treino = treinos.find((t) => t.dia_semana === diaSemanaDb);
            const isHoje = isSameDay(diaMes, new Date());
            const isConcluido = !!treino?.concluido;

            return (
              <div
                key={dia}
                className={cn(
                  "flex min-h-[86px] flex-col items-center justify-between rounded-lg border bg-background/70 p-2.5 transition-colors",
                  isHoje && "shadow-sm"
                )}
                style={{
                  borderColor: isHoje
                    ? `${accentColor}66`
                    : isConcluido
                    ? `${accentColor}40`
                    : undefined,
                  backgroundColor: isHoje
                    ? `${accentColor}12`
                    : isConcluido
                    ? `${accentColor}08`
                    : undefined,
                }}
              >
                <div className="text-center space-y-1">
                  <p className="text-[11px] font-semibold leading-tight">{dia}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(diaMes, "d", { locale: ptBR })}
                  </p>
                </div>

                {treino ? (
                  <button
                    type="button"
                    onClick={() => toggleTreino(treino.id, treino.concluido)}
                    aria-label={
                      treino.concluido
                        ? `Desmarcar treino de ${dia}`
                        : `Marcar treino de ${dia} como concluido`
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full border transition-transform active:scale-95"
                    style={{
                      borderColor: treino.concluido ? accentColor : `${accentColor}66`,
                      backgroundColor: treino.concluido ? accentColor : "transparent",
                      color: treino.concluido ? "#fff" : accentColor,
                    }}
                  >
                    {treino.concluido ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                    )}
                  </button>
                ) : (
                  <span className="h-6 w-6 rounded-full border border-dashed opacity-30" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
