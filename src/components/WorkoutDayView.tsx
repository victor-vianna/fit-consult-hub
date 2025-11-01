// components/WorkoutDayView.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Calendar, CheckCircle2 } from "lucide-react";
import { SortableExercicioCard } from "@/components/SortableExercicioCard";
import { WorkoutTimer } from "./WorkoutTimer";
import type { TreinoDia } from "@/types/treino";
import { useState } from "react";

interface WorkoutDayViewProps {
  treinos: TreinoDia[];
  profileId: string;
  personalId: string;
  onToggleConcluido: (
    id: string,
    concluido: boolean
  ) => Promise<{
    exercicioId: string;
    concluido: boolean;
  }>;
}

const diasSemana = [
  { nome: "Segunda-feira", abrev: "SEG" },
  { nome: "Terça-feira", abrev: "TER" },
  { nome: "Quarta-feira", abrev: "QUA" },
  { nome: "Quinta-feira", abrev: "QUI" },
  { nome: "Sexta-feira", abrev: "SEX" },
  { nome: "Sábado", abrev: "SÁB" },
  { nome: "Domingo", abrev: "DOM" },
];

export function WorkoutDayView({
  treinos: initialTreinos,
  profileId,
  personalId,
  onToggleConcluido,
}: WorkoutDayViewProps) {
  const [treinos, setTreinos] = useState<TreinoDia[]>(initialTreinos);

  const calcularProgresso = (treino: TreinoDia) => {
    if (treino.exercicios.length === 0) return 0;
    const concluidos = treino.exercicios.filter((e) => e.concluido).length;
    return Math.round((concluidos / treino.exercicios.length) * 100);
  };

  const primeiroDiaComExercicios =
    treinos.find((t) => t.exercicios.length > 0)?.dia || 1;

  const handleToggleConcluido = async (id: string, concluido: boolean) => {
    try {
      return await onToggleConcluido(id, concluido);
    } catch (error) {
      console.error("Erro ao marcar exercício:", error);
      throw error;
    }
  };

  // ✅ Atualização otimista do exercício no estado local
  const handleOptimisticToggle = (id: string, concluido: boolean) => {
    setTreinos((prev) =>
      prev.map((treino) => ({
        ...treino,
        exercicios: treino.exercicios.map((ex) =>
          ex.id === id ? { ...ex, concluido } : ex
        ),
      }))
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-xl shadow-lg">
            <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Meus Treinos
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Acompanhe seu progresso semanal
            </p>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <Tabs defaultValue={String(primeiroDiaComExercicios)} className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-card/50 backdrop-blur-sm border shadow-lg rounded-xl">
          {diasSemana.map((dia, index) => {
            const treino = treinos.find((t) => t.dia === index + 1);
            const temExercicios = treino && treino.exercicios.length > 0;
            const progresso = treino ? calcularProgresso(treino) : 0;

            return (
              <TabsTrigger
                key={index + 1}
                value={String(index + 1)}
                disabled={!temExercicios}
                className="flex flex-col gap-0.5 sm:gap-1 py-2 sm:py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg transition-all"
              >
                <span className="text-[10px] sm:text-xs font-bold">
                  {dia.abrev}
                </span>
                {temExercicios && (
                  <div className="flex flex-col items-center gap-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-3 sm:h-4"
                    >
                      {treino.exercicios.length}
                    </Badge>
                    {progresso > 0 && (
                      <span className="text-[9px] sm:text-[10px] font-bold opacity-80">
                        {progresso}%
                      </span>
                    )}
                  </div>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Conteúdo de Cada Dia */}
        {treinos.map((treino) => {
          const diaInfo = diasSemana[treino.dia - 1];
          const temExercicios = treino.exercicios.length > 0;
          const progresso = calcularProgresso(treino);
          const concluidos = treino.exercicios.filter(
            (e) => e.concluido
          ).length;
          const total = treino.exercicios.length;

          return (
            <TabsContent
              key={treino.dia}
              value={String(treino.dia)}
              className="mt-4 sm:mt-6 space-y-4 sm:space-y-6"
            >
              {/* Cronômetro */}
              {temExercicios && treino.treinoId && (
                <WorkoutTimer
                  treinoId={treino.treinoId}
                  profileId={profileId}
                  personalId={personalId}
                  readOnly={false}
                />
              )}

              {/* Card do Dia */}
              <Card className="border-primary/30 shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
                        {diaInfo.nome}
                      </CardTitle>
                    </div>

                    {treino.descricao && (
                      <CardDescription className="text-sm sm:text-base font-medium">
                        🎯 {treino.descricao}
                      </CardDescription>
                    )}

                    {/* Barra de Progresso */}
                    {temExercicios && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-semibold text-muted-foreground">
                            Progresso do treino
                          </span>
                          <span className="font-bold text-primary">
                            {concluidos}/{total} exercícios
                          </span>
                        </div>

                        <div className="relative w-full h-3 sm:h-4 bg-muted rounded-full overflow-hidden shadow-inner">
                          <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out shadow-lg"
                            style={{ width: `${progresso}%` }}
                          >
                            {progresso > 15 && (
                              <div className="absolute inset-0 flex items-center justify-end pr-2">
                                <span className="text-[10px] sm:text-xs font-bold text-primary-foreground drop-shadow">
                                  {progresso}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex gap-1 flex-wrap">
                            {treino.exercicios.slice(0, 10).map((ex) => (
                              <div
                                key={ex.id}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  ex.concluido
                                    ? "bg-green-500 scale-110"
                                    : "bg-muted-foreground/20"
                                }`}
                                title={ex.nome}
                              />
                            ))}
                            {treino.exercicios.length > 10 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                +{treino.exercicios.length - 10}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs sm:text-sm"
                      >
                        <Dumbbell className="h-3 w-3 mr-1" />
                        {treino.exercicios.length} exercício
                        {treino.exercicios.length !== 1 ? "s" : ""}
                      </Badge>

                      {progresso > 0 && progresso < 100 && (
                        <Badge
                          variant="default"
                          className="bg-primary text-xs sm:text-sm"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {progresso}% concluído
                        </Badge>
                      )}

                      {progresso === 100 && (
                        <Badge
                          variant="default"
                          className="bg-green-600 text-xs sm:text-sm animate-pulse"
                        >
                          ✓ Treino Completo!
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                  {!temExercicios ? (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center space-y-4">
                      <div className="p-4 sm:p-5 bg-muted/50 rounded-full">
                        <Dumbbell className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-base sm:text-lg font-semibold text-muted-foreground">
                          Dia de Descanso
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-4">
                          Nenhum exercício programado para este dia.
                          <br />
                          Aproveite para recuperar!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {treino.exercicios.map((exercicio, index) => {
                        const cardEx = {
                          id: exercicio.id,
                          nome: exercicio.nome,
                          link_video: exercicio.link_video ?? null,
                          ordem: exercicio.ordem,
                          series: exercicio.series,
                          repeticoes: exercicio.repeticoes,
                          descanso: exercicio.descanso,
                          carga:
                            exercicio.carga != null
                              ? String(exercicio.carga)
                              : undefined,
                          observacoes: exercicio.observacoes ?? undefined,
                          concluido: !!exercicio.concluido,
                        };

                        return (
                          <SortableExercicioCard
                            key={exercicio.id}
                            exercicio={cardEx}
                            index={index}
                            readOnly={false}
                            onToggleConcluido={handleToggleConcluido}
                            onOptimisticToggle={handleOptimisticToggle} // ✅ Adicionado
                          />
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export default WorkoutDayView;
