// components/WorkoutDayView.tsx
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Loader2, CalendarDays } from "lucide-react";
import { WorkoutTimer } from "./WorkoutTimer";
import { WorkoutDayHeader } from "./WorkoutDayHeader";
import { WorkoutExerciseList } from "./WorkoutExerciseList";
import type { TreinoDia } from "@/types/treino";
import type { BlocoTreino } from "@/types/workoutBlocks";
import type { GrupoExercicio } from "@/hooks/useExerciseGroups";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import { useExerciseProgress } from "@/hooks/useExerciseProgress";

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

  // 🔧 Hook de persistência de sessão PWA
  const { 
    treinosIniciados, 
    marcarTreinoIniciado, 
    marcarTreinoFinalizado,
    isLoading: isLoadingSession 
  } = useWorkoutSession(profileId, personalId);

  // 🔧 Hook de persistência de progresso PWA
  const {
    salvarProgressoLocal,
    marcarSincronizado,
    mesclarProgressoExercicios,
    salvarBlocoProgressoLocal,
    marcarBlocoSincronizado,
    mesclarProgressoBlocos,
  } = useExerciseProgress(profileId);

  // Buscar semana ativa
  const { data: semanaAtiva, refetch: refetchSemanaAtiva } = useQuery({
    queryKey: ["semana-ativa", profileId, personalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treino_semana_ativa")
        .select("semana_inicio")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profileId && !!personalId,
    // Manter dados frescos para PWA
    staleTime: 1000 * 60, // 1 minuto
    refetchOnWindowFocus: true,
  });

  // 🔧 PWA: Refetch dados ao voltar ao app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Refetch para garantir dados atualizados ao voltar
        refetchSemanaAtiva();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refetchSemanaAtiva]);

  // 🔧 Sincronizar com props quando mudarem - mesclar com progresso local
  useEffect(() => {
    // Mesclar progresso local com dados do servidor
    const treinosMesclados = treinos.map(treino => ({
      ...treino,
      exercicios: mesclarProgressoExercicios(treino.exercicios),
    }));
    setLocalTreinos(treinosMesclados);
  }, [treinos, mesclarProgressoExercicios]);

  useEffect(() => {
    // Mesclar grupos com progresso local
    const gruposMesclados: Record<string, GrupoExercicio[]> = {};
    Object.keys(gruposPorTreino).forEach(treinoId => {
      gruposMesclados[treinoId] = gruposPorTreino[treinoId].map(grupo => ({
        ...grupo,
        exercicios: mesclarProgressoExercicios(grupo.exercicios),
      }));
    });
    setLocalGrupos(gruposMesclados);
  }, [gruposPorTreino, mesclarProgressoExercicios]);

  // 🔧 Sincronizar blocos: prioriza blocosPorTreino, mescla com progresso local
  useEffect(() => {
    // Mesclar blocos da prop com blocos que vêm dentro de cada treino
    const blocosAtualizados: Record<string, BlocoTreino[]> = {};
    
    // Primeiro, processar blocos da prop
    Object.keys(blocosPorTreino).forEach(treinoId => {
      blocosAtualizados[treinoId] = mesclarProgressoBlocos(blocosPorTreino[treinoId]);
    });
    
    // Depois, adicionar blocos de cada treino se não existirem
    treinos.forEach((treino) => {
      const treinoId = (treino as any).treinoId ?? (treino as any).id;
      if (treinoId && treino.blocos && treino.blocos.length > 0) {
        // Se não existe na prop ou está vazio, usa os blocos do treino
        if (!blocosAtualizados[treinoId] || blocosAtualizados[treinoId].length === 0) {
          blocosAtualizados[treinoId] = mesclarProgressoBlocos(treino.blocos as BlocoTreino[]);
        }
      }
    });
    
    setLocalBlocos(blocosAtualizados);
  }, [blocosPorTreino, treinos, mesclarProgressoBlocos]);

  // 🔧 Helper: Obter ID do treino
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

  // 🔧 Calcular total de itens de treino (exercícios isolados + exercícios em grupos + blocos)
  const calcularTotalItens = useCallback(
    (treino: TreinoDia, grupos: GrupoExercicio[], blocos: BlocoTreino[]): number => {
      const exerciciosIsolados = treino.exercicios.filter(
        (ex) => !ex.grupo_id
      ).length;
      const exerciciosEmGrupos = grupos.reduce(
        (total, grupo) => total + (grupo.exercicios?.length || 0),
        0
      );
      const totalBlocos = blocos.length;
      return exerciciosIsolados + exerciciosEmGrupos + totalBlocos;
    },
    []
  );

  // ✅ Handler para toggle de exercício - salva localmente primeiro
  const handleToggleExercicio = async (id: string, concluido: boolean) => {
    // 🔧 Salvar no localStorage imediatamente (PWA)
    salvarProgressoLocal(id, concluido);

    // Update otimista em treinos
    setLocalTreinos((prev) =>
      prev.map((t) => ({
        ...t,
        exercicios: t.exercicios.map((ex) =>
          ex.id === id ? { ...ex, concluido } : ex
        ),
      }))
    );

    // Update otimista em grupos
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
      // 🔧 Marcar como sincronizado após sucesso
      marcarSincronizado(id);
    } catch (error) {
      console.error("[WorkoutDayView] Erro ao marcar exercício:", error);
      // Não reverter - o progresso local permanece e será sincronizado depois
    }
  };

  // ✅ Handler para toggle de grupo
  const handleToggleGrupo = async (grupoId: string, concluido: boolean) => {
    if (!onToggleGrupoConcluido) return;

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
      setLocalGrupos(gruposPorTreino);
    }
  };

  // ✅ Handler para toggle de bloco - salva localmente primeiro
  const handleToggleBloco = async (blocoId: string, concluido: boolean) => {
    if (!onToggleBlocoConcluido) return;

    // 🔧 Salvar no localStorage imediatamente (PWA)
    salvarBlocoProgressoLocal(blocoId, concluido);

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
      // 🔧 Marcar como sincronizado após sucesso
      marcarBlocoSincronizado(blocoId);
    } catch (error) {
      console.error("[WorkoutDayView] Erro ao marcar bloco:", error);
      // Não reverter - o progresso local permanece e será sincronizado depois
    }
  };

  // Handler para iniciar treino - usa hook de persistência
  const handleIniciarTreino = (dia: number, treinoId: string | null) => {
    if (treinoId) {
      marcarTreinoIniciado(treinoId, dia);
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
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Header Principal */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl shadow-lg">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Meus Treinos
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe seu progresso semanal
            </p>
          </div>
        </div>

        {/* Indicador de Semana Ativa */}
        {semanaAtiva?.semana_inicio && (
          <Badge variant="outline" className="gap-2 px-3 py-1.5">
            <CalendarDays className="h-3 w-3" />
            <span className="text-xs">
              Semana: {format(new Date(semanaAtiva.semana_inicio), "dd/MM", { locale: ptBR })}
            </span>
          </Badge>
        )}
      </div>

      {/* Tabs dos Dias */}
      <Tabs defaultValue={String(primeiroDiaComConteudo)} className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-card/50 backdrop-blur-sm border shadow-lg rounded-xl">
          {diasSemana.map((dia, index) => {
            const treino = localTreinos.find((t) => t.dia === index + 1);
            const treinoId = treino ? getTreinoId(treino) : null;
            const grupos = treinoId ? localGrupos[treinoId] ?? [] : [];
            const blocos = treinoId ? localBlocos[treinoId] ?? [] : [];

            // Total de itens agora inclui blocos
            const totalItens = treino
              ? calcularTotalItens(treino, grupos, blocos)
              : 0;
            const temConteudo = totalItens > 0;
            const progresso = treino ? calcularProgresso(treino, grupos) : 0;

            return (
              <TabsTrigger
                key={index + 1}
                value={String(index + 1)}
                disabled={!temConteudo}
                className="flex flex-col gap-1 py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg transition-all"
              >
                <span className="text-xs font-bold">{dia.abrev}</span>
                {temConteudo && (
                  <div className="flex flex-col items-center gap-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {totalItens}
                    </Badge>
                    {progresso > 0 && (
                      <span className="text-[10px] font-bold opacity-80">
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

          const totalItens = calcularTotalItens(treino, grupos, blocos);
          const temConteudo = totalItens > 0;
          const progresso = calcularProgresso(treino, grupos);

          // Separar blocos por posição
          const blocosInicio = blocos.filter((b) => b.posicao === "inicio");
          const blocosMeio = blocos.filter((b) => b.posicao === "meio");
          const blocosFim = blocos.filter((b) => b.posicao === "fim");

          // Exercícios isolados
          const exerciciosIsolados = treino.exercicios.filter(
            (ex) => !ex.grupo_id
          );

          const isDiaIniciado = treinosIniciados[treino.dia] || false;

          return (
            <TabsContent
              key={treino.dia}
              value={String(treino.dia)}
              className="mt-6 space-y-6"
            >
              <Card className="border-primary/30 shadow-xl bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-6 space-y-6">
                  {/* Header do Dia */}
                  <WorkoutDayHeader
                    diaNome={diaInfo.nome}
                    descricao={treino.descricao}
                    totalExercicios={totalItens}
                    totalGrupos={grupos.length}
                    totalBlocos={blocos.length}
                    progresso={progresso}
                    onIniciarTreino={() => handleIniciarTreino(treino.dia, treinoId)}
                    treinoIniciado={isDiaIniciado}
                  />

                  {/* Cronômetro - apenas quando iniciado */}
                  {isDiaIniciado && treinoId && (
                    <WorkoutTimer
                      treinoId={treinoId}
                      profileId={profileId}
                      personalId={personalId}
                      readOnly={false}
                      onWorkoutComplete={() => marcarTreinoFinalizado(treinoId, treino.dia)}
                      onWorkoutCancel={() => marcarTreinoFinalizado(treinoId, treino.dia)}
                    />
                  )}

                  {/* Conteúdo */}
                  {!temConteudo ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                      <div className="p-5 bg-muted/50 rounded-full">
                        <Dumbbell className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-muted-foreground">
                          Dia de Descanso
                        </p>
                        <p className="text-sm text-muted-foreground max-w-md px-4">
                          Nenhum conteúdo programado para este dia.
                          <br />
                          Aproveite para recuperar!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <WorkoutExerciseList
                      exerciciosIsolados={exerciciosIsolados}
                      grupos={grupos}
                      blocosInicio={blocosInicio}
                      blocosMeio={blocosMeio}
                      blocosFim={blocosFim}
                      onToggleExercicio={handleToggleExercicio}
                      onToggleGrupo={handleToggleGrupo}
                      onToggleBloco={handleToggleBloco}
                    />
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
