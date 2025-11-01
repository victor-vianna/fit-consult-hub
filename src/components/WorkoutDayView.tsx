import { useState } from "react";
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
  treinos,
  profileId,
  personalId,
  onToggleConcluido,
}: WorkoutDayViewProps) {
  const calcularProgresso = (treino: TreinoDia) => {
    if (treino.exercicios.length === 0) return 0;
    const concluidos = treino.exercicios.filter((e) => e.concluido).length;
    return Math.round((concluidos / treino.exercicios.length) * 100);
  };

  // Encontrar o primeiro dia com exercícios para ser o padrão
  const primeiroDiaComExercicios =
    treinos.find((t) => t.exercicios.length > 0)?.dia || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Meus Treinos</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe seu progresso semanal
            </p>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <Tabs defaultValue={String(primeiroDiaComExercicios)} className="w-full">
        {/* Lista de Dias da Semana */}
        <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-muted/50">
          {diasSemana.map((dia, index) => {
            const treino = treinos.find((t) => t.dia === index + 1);
            const temExercicios = treino && treino.exercicios.length > 0;
            const progresso = treino ? calcularProgresso(treino) : 0;

            return (
              <TabsTrigger
                key={index + 1}
                value={String(index + 1)}
                disabled={!temExercicios}
                className="flex flex-col gap-1 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <span className="text-xs font-bold">{dia.abrev}</span>
                {temExercicios && (
                  <div className="flex flex-col items-center gap-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {treino.exercicios.length}
                    </Badge>
                    {progresso > 0 && (
                      <span className="text-[10px] text-primary font-medium">
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

          return (
            <TabsContent
              key={treino.dia}
              value={String(treino.dia)}
              className="mt-6"
            >
              <Card className="border-primary/30 shadow-lg">
                {/* HEADER FIXO COM CRONÔMETRO */}
                <CardHeader className="sticky top-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 z-10 border-b shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Título do Dia */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <CardTitle className="text-2xl font-bold">
                          {diaInfo.nome}
                        </CardTitle>
                      </div>

                      {/* Descrição/Grupo Muscular */}
                      {treino.descricao && (
                        <CardDescription className="text-base font-medium">
                          🎯 {treino.descricao}
                        </CardDescription>
                      )}

                      {/* Badges de Informação */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          <Dumbbell className="h-3 w-3 mr-1" />
                          {treino.exercicios.length} exercício
                          {treino.exercicios.length !== 1 ? "s" : ""}
                        </Badge>

                        {progresso > 0 && (
                          <Badge variant="default" className="bg-primary">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {progresso}% concluído
                          </Badge>
                        )}

                        {progresso === 100 && (
                          <Badge variant="default" className="bg-green-600">
                            ✓ Treino Completo!
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* CRONÔMETRO FIXO */}
                    {temExercicios && treino.treinoId && (
                      <div className="shrink-0">
                        <WorkoutTimer
                          treinoId={treino.treinoId}
                          profileId={profileId}
                          personalId={personalId}
                          readOnly={false}
                        />
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* ÁREA DE EXERCÍCIOS */}
                <CardContent className="p-6">
                  {!temExercicios ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <div className="p-5 bg-muted/50 rounded-full">
                        <Dumbbell className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-muted-foreground">
                          Dia de Descanso
                        </p>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Nenhum exercício programado para este dia.
                          <br />
                          Aproveite para recuperar!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
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
                            readOnly={true}
                            onToggleConcluido={(id, concluido) => {
                              onToggleConcluido(id, concluido).catch((e) =>
                                console.error("Erro ao marcar:", e)
                              );
                            }}
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
