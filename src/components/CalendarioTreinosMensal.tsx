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

  const getTreinosDoDia = (dia: Date) => {
    return treinos.filter((treino) => {
      const dataTreino = addDays(parseISO(treino.semana), treino.dia_semana);
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle
              className="text-2xl md:text-xl"
              style={{ color: themeColor || undefined }}
            >
              Histórico de Treinos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={mesAnterior}
                className="h-10 w-10 md:h-9 md:w-9 touch-target"
              >
                <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
              <span className="font-semibold min-w-[150px] text-center capitalize text-base md:text-sm">
                {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={proximoMes}
                className="h-10 w-10 md:h-9 md:w-9 touch-target"
              >
                <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 md:gap-3 mt-4">
            <div className="text-center p-4 md:p-3 bg-muted rounded-lg">
              <div className="text-3xl md:text-2xl font-bold">{stats.total}</div>
              <div className="text-sm md:text-xs text-muted-foreground">
                Treinos Planejados
              </div>
            </div>
            <div className="text-center p-4 md:p-3 bg-muted rounded-lg">
              <div
                className="text-3xl md:text-2xl font-bold"
                style={{ color: themeColor || undefined }}
              >
                {stats.concluidos}
              </div>
              <div className="text-sm md:text-xs text-muted-foreground">
                Treinos Concluídos
              </div>
            </div>
            <div className="text-center p-4 md:p-3 bg-muted rounded-lg">
              <div className="text-3xl md:text-2xl font-bold">{stats.percentual}%</div>
              <div className="text-sm md:text-xs text-muted-foreground">Frequência</div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-3 md:gap-2 mb-3 md:mb-2">
            {diasSemana.map((dia) => (
              <div
                key={dia}
                className="text-center text-base md:text-sm font-semibold text-muted-foreground py-2"
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Grid do calendário */}
          <div className="grid grid-cols-7 gap-3 md:gap-2">
            {/* Dias vazios no início */}
            {Array.from({ length: diasVaziosInicio }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
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
                    aspect-square p-3 md:p-2 rounded-lg border-2 transition-all touch-target
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
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="text-base md:text-sm font-semibold">
                      {format(dia, "d")}
                    </span>
                    {temTreino && (
                      <div className="flex gap-1 mt-1">
                        {todosCompletos ? (
                          <CheckCircle2
                            className="h-4 w-4 md:h-3 md:w-3"
                            style={{ color: themeColor || "#22c55e" }}
                          />
                        ) : algunsCompletos ? (
                          <Circle className="h-4 w-4 md:h-3 md:w-3 text-yellow-500" />
                        ) : (
                          <Circle className="h-4 w-4 md:h-3 md:w-3 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center gap-6 md:gap-4 mt-6 text-base md:text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className="h-5 w-5 md:h-4 md:w-4"
                style={{ color: themeColor || "#22c55e" }}
              />
              <span>Concluído</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 md:h-4 md:w-4 text-yellow-500" />
              <span>Parcial</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
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
