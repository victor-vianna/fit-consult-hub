// components/WorkoutDayView.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dumbbell,
  Calendar,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  Blocks,
} from "lucide-react";
import { SortableExercicioCard } from "@/components/SortableExercicioCard";
import { GroupedExerciseCard } from "./GroupedExerciseCard";
import { WorkoutTimer } from "./WorkoutTimer";
import { WorkoutBlockCard } from "./WorkoutBlockCard";
import type { TreinoDia } from "@/types/treino";
import type { BlocoTreino } from "@/types/workoutBlocks";
import type { GrupoExercicio } from "@/hooks/useExerciseGroups";

interface WorkoutDayViewProps {
  treinos: TreinoDia[];
  profileId: string;
  personalId: string;
  gruposPorTreino?: Record<string, GrupoExercicio[]>;
  blocosPorTreino?: Record<string, BlocoTreino[]>;
  onToggleConcluido: (id: string, concluido: boolean) => Promise<any>;
  onToggleGrupoConcluido?: (
    grupoId: string,
    concluido: boolean
  ) => Promise<void>;
  onToggleBlocoConcluido?: (
    blocoId: string,
    concluido: boolean
  ) => Promise<void>;
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
  gruposPorTreino = {},
  blocosPorTreino = {},
  onToggleConcluido,
  onToggleGrupoConcluido,
  onToggleBlocoConcluido,
}: WorkoutDayViewProps) {
  // Estado local para updates otimistas
  const [localTreinos, setLocalTreinos] = useState<TreinoDia[]>(treinos);
  const [localGrupos, setLocalGrupos] =
    useState<Record<string, GrupoExercicio[]>>(gruposPorTreino);
  const [localBlocos, setLocalBlocos] =
    useState<Record<string, BlocoTreino[]>>(blocosPorTreino);

  // Sincronizar com props quando mudarem
  useEffect(() => {
    setLocalTreinos(treinos);
  }, [treinos]);

  useEffect(() => {
    setLocalGrupos(gruposPorTreino);
  }, [gruposPorTreino]);

  useEffect(() => {
    setLocalBlocos(blocosPorTreino);
  }, [blocosPorTreino]);

  // 🔧 Helper: Obter ID do treino de forma consistente
  const getTreinoId = useCallback((treino: TreinoDia): string | null => {
    const rawId = (treino as any).treinoId ?? (treino as any).id;
    return rawId ? String(rawId) : null;
  }, []);

  // 🔧 Calcular progresso do treino
  const calcularProgresso = useCallback(
    (treino: TreinoDia, grupos: GrupoExercicio[]): number => {
      let totalExercicios = 0;
      let exerciciosConcluidos = 0;

      // Exercícios isolados
      const exerciciosIsolados = treino.exercicios.filter((ex) => !ex.grupo_id);
      totalExercicios += exerciciosIsolados.length;
      exerciciosConcluidos += exerciciosIsolados.filter(
        (ex) => ex.concluido
      ).length;

      // Exercícios em grupos
      grupos.forEach((grupo) => {
        if (grupo.exercicios && grupo.exercicios.length > 0) {
          totalExercicios += grupo.exercicios.length;
          exerciciosConcluidos += grupo.exercicios.filter(
            (ex: any) => ex.concluido
          ).length;
        }
      });

      if (totalExercicios === 0) return 0;
      return Math.round((exerciciosConcluidos / totalExercicios) * 100);
    },
    []
  );

  // 🔧 Calcular total de exercícios (isolados + em grupos)
  const calcularTotalExercicios = useCallback(
    (treino: TreinoDia, grupos: GrupoExercicio[]): number => {
      const exerciciosIsolados = treino.exercicios.filter(
        (ex) => !ex.grupo_id
      ).length;
      const exerciciosEmGrupos = grupos.reduce(
        (total, grupo) => total + (grupo.exercicios?.length || 0),
        0
      );
      return exerciciosIsolados + exerciciosEmGrupos;
    },
    []
  );

  // ✅ Handler para toggle de exercício isolado
  const handleToggleExercicio = async (id: string, concluido: boolean) => {
    // Update otimista
    setLocalTreinos((prev) =>
      prev.map((t) => ({
        ...t,
        exercicios: t.exercicios.map((ex) =>
          ex.id === id ? { ...ex, concluido } : ex
        ),
      }))
    );

    // Update otimista nos grupos também
    setLocalGrupos((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((treinoId) => {
        updated[treinoId] = updated[treinoId].map((grupo) => ({
          ...grupo,
          exercicios: grupo.exercicios.map((ex: any) =>
            ex.id === id ? { ...ex, concluido } : ex
          ),
        }));
      });
      return updated;
    });

    try {
      await onToggleConcluido(id, concluido);
    } catch (error) {
      console.error("[WorkoutDayView] Erro ao marcar exercício:", error);
      // Reverter em caso de erro
      setLocalTreinos(treinos);
      setLocalGrupos(gruposPorTreino);
    }
  };

  // ✅ Handler para toggle de grupo completo
  const handleToggleGrupo = async (grupoId: string, concluido: boolean) => {
    if (!onToggleGrupoConcluido) {
      console.warn("[WorkoutDayView] onToggleGrupoConcluido não fornecido");
      return;
    }

    // Update otimista
    setLocalGrupos((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((treinoId) => {
        updated[treinoId] = updated[treinoId].map((grupo) =>
          grupo.grupo_id === grupoId
            ? {
                ...grupo,
                exercicios: grupo.exercicios.map((ex: any) => ({
                  ...ex,
                  concluido,
                })),
              }
            : grupo
        );
      });
      return updated;
    });

    try {
      await onToggleGrupoConcluido(grupoId, concluido);
    } catch (error) {
      console.error("[WorkoutDayView] Erro ao marcar grupo:", error);
      // Reverter em caso de erro
      setLocalGrupos(gruposPorTreino);
    }
  };

  // ✅ Handler para toggle de bloco
  const handleToggleBloco = async (blocoId: string, concluido: boolean) => {
    if (!onToggleBlocoConcluido) {
      console.warn("[WorkoutDayView] onToggleBlocoConcluido não fornecido");
      return;
    }

    // Update otimista
    setLocalBlocos((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((treinoId) => {
        updated[treinoId] = updated[treinoId].map((bloco) =>
          bloco.id === blocoId ? { ...bloco, concluido } : bloco
        );
      });
      return updated;
    });

    try {
      await onToggleBlocoConcluido(blocoId, concluido);
    } catch (error) {
      console.error("[WorkoutDayView] Erro ao marcar bloco:", error);
      // Reverter em caso de erro
      setLocalBlocos(blocosPorTreino);
    }
  };

  // Encontrar primeiro dia com conteúdo
  const primeiroDiaComConteudo =
    localTreinos.find((t) => {
      const treinoId = getTreinoId(t);
      const grupos = treinoId ? localGrupos[treinoId] ?? [] : [];
      const blocos = treinoId ? localBlocos[treinoId] ?? [] : [];
      return t.exercicios.length > 0 || grupos.length > 0 || blocos.length > 0;
    })?.dia || 1;

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

      {/* Tabs */}
      <Tabs defaultValue={String(primeiroDiaComConteudo)} className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-card/50 backdrop-blur-sm border shadow-lg rounded-xl">
          {diasSemana.map((dia, index) => {
            const treino = localTreinos.find((t) => t.dia === index + 1);
            const treinoId = treino ? getTreinoId(treino) : null;
            const grupos = treinoId ? localGrupos[treinoId] ?? [] : [];
            const blocos = treinoId ? localBlocos[treinoId] ?? [] : [];

            const totalExercicios = treino
              ? calcularTotalExercicios(treino, grupos)
              : 0;
            const temConteudo = totalExercicios > 0 || blocos.length > 0;
            const progresso = treino ? calcularProgresso(treino, grupos) : 0;

            return (
              <TabsTrigger
                key={index + 1}
                value={String(index + 1)}
                disabled={!temConteudo}
                className="flex flex-col gap-0.5 sm:gap-1 py-2 sm:py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg transition-all"
              >
                <span className="text-[10px] sm:text-xs font-bold">
                  {dia.abrev}
                </span>
                {temConteudo && (
                  <div className="flex flex-col items-center gap-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-3 sm:h-4"
                    >
                      {totalExercicios}
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

        {/* Conteúdo de cada dia */}
        {localTreinos.map((treino) => {
          const diaInfo = diasSemana[treino.dia - 1];
          const treinoId = getTreinoId(treino);
          const grupos = treinoId ? localGrupos[treinoId] ?? [] : [];
          const blocos = treinoId ? localBlocos[treinoId] ?? [] : [];

          const totalExercicios = calcularTotalExercicios(treino, grupos);
          const temConteudo = totalExercicios > 0 || blocos.length > 0;
          const progresso = calcularProgresso(treino, grupos);

          // Separar blocos por posição
          const blocosInicio = blocos.filter((b) => b.posicao === "inicio");
          const blocosMeio = blocos.filter((b) => b.posicao === "meio");
          const blocosFim = blocos.filter((b) => b.posicao === "fim");

          // Exercícios isolados (não estão em grupos)
          const exerciciosIsolados = treino.exercicios.filter(
            (ex) => !ex.grupo_id
          );

          return (
            <TabsContent
              key={treino.dia}
              value={String(treino.dia)}
              className="mt-4 sm:mt-6 space-y-4 sm:space-y-6"
            >
              {/* Cronômetro - apenas se tiver conteúdo */}
              {temConteudo && treinoId && (
                <WorkoutTimer
                  treinoId={treinoId}
                  profileId={profileId}
                  personalId={personalId}
                  readOnly={false}
                />
              )}

              {/* Card do dia */}
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

                    {/* Badges de informação */}
                    {temConteudo && (
                      <div className="flex flex-wrap items-center gap-2">
                        {totalExercicios > 0 && (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs sm:text-sm"
                          >
                            <Dumbbell className="h-3 w-3 mr-1" />
                            {totalExercicios} exercício
                            {totalExercicios !== 1 ? "s" : ""}
                          </Badge>
                        )}

                        {grupos.length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs sm:text-sm bg-blue-50 border-blue-200 text-blue-700"
                          >
                            <LinkIcon className="h-3 w-3 mr-1" />
                            {grupos.length} grupo
                            {grupos.length !== 1 ? "s" : ""}
                          </Badge>
                        )}

                        {blocos.length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs sm:text-sm bg-purple-50 border-purple-200 text-purple-700"
                          >
                            <Blocks className="h-3 w-3 mr-1" />
                            {blocos.length} bloco
                            {blocos.length !== 1 ? "s" : ""}
                          </Badge>
                        )}

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
                    )}
                  </div>
                </CardHeader>

                {/* Conteúdo do Card */}
                <CardContent className="p-4 sm:p-6">
                  {!temConteudo ? (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center space-y-4">
                      <div className="p-4 sm:p-5 bg-muted/50 rounded-full">
                        <Dumbbell className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-base sm:text-lg font-semibold text-muted-foreground">
                          Dia de Descanso
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-4">
                          Nenhum conteúdo programado para este dia.
                          <br />
                          Aproveite para recuperar!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* 🎬 BLOCOS DO INÍCIO */}
                      {blocosInicio.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Separator className="flex-1" />
                            <span className="font-semibold">
                              Início do Treino
                            </span>
                            <Separator className="flex-1" />
                          </div>
                          {blocosInicio.map((bloco, idx) => (
                            <WorkoutBlockCard
                              key={bloco.id}
                              bloco={bloco}
                              index={idx}
                              readOnly={false}
                              onToggleConcluido={handleToggleBloco}
                            />
                          ))}
                        </div>
                      )}

                      {/* 💪 GRUPOS + EXERCÍCIOS ISOLADOS */}
                      <div className="space-y-3">
                        {/* Grupos */}
                        {grupos.length > 0 &&
                          grupos.map((grupo, idx) => (
                            <GroupedExerciseCard
                              key={grupo.grupo_id ?? `grupo-${idx}`}
                              grupo={grupo}
                              index={idx}
                              readOnly={false}
                              onToggleGrupoConcluido={handleToggleGrupo}
                              onToggleConcluido={handleToggleExercicio}
                            />
                          ))}

                        {/* Exercícios Isolados */}
                        {exerciciosIsolados.length > 0 &&
                          exerciciosIsolados.map((exercicio, index) => (
                            <SortableExercicioCard
                              key={exercicio.id}
                              exercicio={exercicio}
                              index={index}
                              readOnly={false}
                              onToggleConcluido={handleToggleExercicio}
                            />
                          ))}
                      </div>

                      {/* 🧘 BLOCOS DO MEIO */}
                      {blocosMeio.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Separator className="flex-1" />
                            <span className="font-semibold">Complementar</span>
                            <Separator className="flex-1" />
                          </div>
                          {blocosMeio.map((bloco, idx) => (
                            <WorkoutBlockCard
                              key={bloco.id}
                              bloco={bloco}
                              index={idx}
                              readOnly={false}
                              onToggleConcluido={handleToggleBloco}
                            />
                          ))}
                        </div>
                      )}

                      {/* 🏁 BLOCOS DO FIM */}
                      {blocosFim.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Separator className="flex-1" />
                            <span className="font-semibold">Finalização</span>
                            <Separator className="flex-1" />
                          </div>
                          {blocosFim.map((bloco, idx) => (
                            <WorkoutBlockCard
                              key={bloco.id}
                              bloco={bloco}
                              index={idx}
                              readOnly={false}
                              onToggleConcluido={handleToggleBloco}
                            />
                          ))}
                        </div>
                      )}
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
