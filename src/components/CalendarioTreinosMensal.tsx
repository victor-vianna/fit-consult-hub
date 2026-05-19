// src/components/CalendarioTreinosMensal.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  parseISO,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTreinosHistorico } from "@/hooks/useTreinosHistorico";
import { DetalhesDiaTreino } from "./DetalhesDiaTreino";

interface CalendarioTreinosMensalProps {
  profileId: string;
  personalId: string;
  themeColor?: string;
  refreshKey?: number; // ✅ PROP PARA SINCRONIZAÇÃO
}

export function CalendarioTreinosMensal({
  profileId,
  personalId,
  themeColor,
  refreshKey, // ✅ RECEBER refreshKey
}: CalendarioTreinosMensalProps) {
  const [mesAtual, setMesAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);

  const { treinos, loading, stats, refetch } = useTreinosHistorico(
    profileId,
    mesAtual
  );

  const inicioMes = startOfMonth(mesAtual);
  const fimMes = endOfMonth(mesAtual);
  const diasDoMes = eachDayOfInterval({ start: inicioMes, end: fimMes });

  // Ajustar para começar na segunda-feira
  const primeiroDiaSemana = getDay(inicioMes);
  const diasVaziosInicio = primeiroDiaSemana === 0 ? 6 : primeiroDiaSemana - 1;

  const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  // ✅ SINCRONIZAR quando refreshKey mudar
  useEffect(() => {
    refetch();
  }, [profileId, mesAtual, refreshKey]);

  // ✅ Escutar evento de treino concluído para atualizar calendário
  useEffect(() => {
    const handleWorkoutCompleted = () => {
      refetch();
    };
    window.addEventListener("workout-completed", handleWorkoutCompleted);
    return () => {
      window.removeEventListener("workout-completed", handleWorkoutCompleted);
    };
  }, [refetch]);

  const getTreinosDoDia = (dia: Date) => {
    return treinos.filter((treino) => {
      // dia_semana: 1=segunda, 7=domingo. semana já é segunda-feira.
      // Offset = dia_semana - 1 (segunda = 0 dias após início da semana)
      const dataTreino = addDays(parseISO(treino.semana), treino.dia_semana - 1);
      return isSameDay(dataTreino, dia);
    });
  };

  const mesAnterior = () => setMesAtual(subMonths(mesAtual, 1));
  const proximoMes = () => setMesAtual(addMonths(mesAtual, 1));

  // ✅ CALLBACK para quando um treino for atualizado no modal
  const handleTreinoAtualizado = () => {
    refetch();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Carregando calendário...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle
              className="text-base md:text-lg"
              style={{ color: themeColor || undefined }}
            >
              Histórico de Treinos
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={mesAnterior}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold min-w-[110px] text-center capitalize text-xs md:text-sm">
                {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={proximoMes}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Estatísticas compactas */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-1.5 bg-muted rounded-md">
              <div className="text-base md:text-lg font-bold leading-tight">{stats.total}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">
                Planejados
              </div>
            </div>
            <div className="text-center p-1.5 bg-muted rounded-md">
              <div
                className="text-base md:text-lg font-bold leading-tight"
                style={{ color: themeColor || undefined }}
              >
                {stats.concluidos}
              </div>
              <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">
                Concluídos
              </div>
            </div>
            <div className="text-center p-1.5 bg-muted rounded-md">
              <div className="text-base md:text-lg font-bold leading-tight">{stats.percentual}%</div>
              <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">Frequência</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {diasSemana.map((dia) => (
              <div
                key={dia}
                className="text-center text-[10px] md:text-xs font-semibold text-muted-foreground"
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Grid do calendário compacto */}
          <div className="grid grid-cols-7 gap-1">
            {/* Dias vazios no início */}
            {Array.from({ length: diasVaziosInicio }).map((_, index) => (
              <div key={`empty-${index}`} className="h-10 md:h-11" />
            ))}

            {/* Dias do mês */}
            {diasDoMes.map((dia) => {
              const treinosDoDia = getTreinosDoDia(dia);
              const temTreino = treinosDoDia.length > 0;
              const todosCompletos =
                temTreino && treinosDoDia.every((t) => t.concluido);
              const algunsCompletos =
                temTreino &&
                treinosDoDia.some((t) => t.concluido) &&
                !todosCompletos;

              return (
                <button
                  key={dia.toISOString()}
                  onClick={() => temTreino && setDiaSelecionado(dia)}
                  disabled={!temTreino}
                  className={`
                    h-10 md:h-11 p-0.5 rounded-md border transition-all
                    ${
                      temTreino
                        ? "cursor-pointer hover:scale-105"
                        : "cursor-default opacity-50"
                    }
                    ${
                      todosCompletos
                        ? "bg-green-100 dark:bg-green-900/30 border-green-500"
                        : algunsCompletos
                        ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500"
                        : temTreino
                        ? "bg-muted border-muted-foreground/20"
                        : "border-transparent"
                    }
                  `}
                  style={
                    todosCompletos && themeColor
                      ? {
                          backgroundColor: `${themeColor}20`,
                          borderColor: themeColor,
                        }
                      : undefined
                  }
                >
                  <div className="flex flex-col items-center justify-center h-full leading-none">
                    <span className="text-xs md:text-sm font-semibold">
                      {format(dia, "d")}
                    </span>
                    {temTreino && (
                      <div className="mt-0.5">
                        {todosCompletos ? (
                          <CheckCircle2
                            className="h-3 w-3"
                            style={{ color: themeColor || "#22c55e" }}
                          />
                        ) : algunsCompletos ? (
                          <Circle className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <Circle className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legenda compacta */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[11px] md:text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle2
                className="h-3 w-3"
                style={{ color: themeColor || "#22c55e" }}
              />
              <span>Concluído</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="h-3 w-3 text-yellow-500" />
              <span>Parcial</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="h-3 w-3 text-muted-foreground" />
              <span>Pendente</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalhes do dia */}
      {diaSelecionado && (
        <DetalhesDiaTreino
          open={!!diaSelecionado}
          onClose={() => setDiaSelecionado(null)}
          dia={diaSelecionado}
          treinos={getTreinosDoDia(diaSelecionado)}
          profileId={profileId}
          personalId={personalId}
          themeColor={themeColor}
          onTreinoAtualizado={handleTreinoAtualizado} // ✅ PASSAR CALLBACK
        />
      )}
    </>
  );
}
