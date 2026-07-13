// components/WorkoutDayView.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
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
import { usePersistedState } from "@/hooks/usePersistedState";
import { formatDisplayMonthDay } from "@/utils/dateFormat";

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
  onWorkoutFinished?: () => void;
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

const WORKOUT_RESUME_CACHE_VERSION = 1;

function getBlockDurationMinutes(bloco: BlocoTreino) {
  return (
    bloco.config_cardio?.duracao_minutos ??
    bloco.config_alongamento?.duracao_minutos ??
    bloco.config_aquecimento?.duracao_minutos ??
    bloco.duracao_estimada_minutos ??
    0
  );
}

function estimateExerciseMinutes(exercicio: { series?: number | null; descanso?: number | null }) {
  const series = Math.max(1, exercicio.series ?? 3);
  const workSeconds = series * 45;
  const restSeconds = Math.max(series - 1, 0) * (exercicio.descanso ?? 0);
  return (workSeconds + restSeconds) / 60;
}

function estimateWorkoutMinutes(
  exercicios: any[],
  grupos: GrupoExercicio[],
  blocos: BlocoTreino[]
) {
  const isolatedMinutes = exercicios.reduce(
    (total, exercicio) => total + estimateExerciseMinutes(exercicio),
    0
  );
  const groupMinutes = grupos.reduce(
    (total, grupo) =>
      total +
      (grupo.exercicios ?? []).reduce(
        (subtotal: number, exercicio: any) =>
          subtotal + estimateExerciseMinutes(exercicio),
        0
      ),
    0
  );
  const blockMinutes = blocos.reduce(
    (total, bloco) => total + getBlockDurationMinutes(bloco),
    0
  );

  return Math.max(1, Math.round(isolatedMinutes + groupMinutes + blockMinutes));
}

function countCompletedItems(
  exercicios: any[],
  grupos: GrupoExercicio[],
  blocos: BlocoTreino[]
) {
  const isolatedDone = exercicios.filter((exercicio) => exercicio.concluido).length;
  const groupDone = grupos.reduce(
    (total, grupo) =>
      total + (grupo.exercicios ?? []).filter((ex: any) => ex.concluido).length,
    0
  );
  const blocksDone = blocos.filter((bloco) => bloco.concluido).length;

  return isolatedDone + groupDone + blocksDone;
}

function buildWorkoutSubtitle(treino: TreinoDia, hasMultiple: boolean) {
  const parts = [
    treino.nome_treino || (hasMultiple ? "Treino principal" : null),
    treino.descricao,
  ].filter((value): value is string => Boolean(value?.trim()));

  return parts.join(" · ");
}

interface WorkoutResumeSnapshot {
  version: number;
  profileId: string;
  personalId: string;
  treinoId: string;
  dia: number;
  itemId: string | null;
  scrollY: number;
  updatedAt: number;
}

interface WorkoutResumeItem {
  id: string;
  type: "exercise" | "block";
  treinoId: string;
  dia: number;
  ordem: number;
  concluido: boolean;
}

function getWorkoutResumeCacheKey(profileId: string, personalId: string) {
  return `fitconsult:workout-resume:${profileId}:${personalId}:v${WORKOUT_RESUME_CACHE_VERSION}`;
}

function buildWorkoutResumeItems(
  treino: TreinoDia,
  treinoId: string,
  grupos: GrupoExercicio[],
  blocos: BlocoTreino[]
): WorkoutResumeItem[] {
  const items: WorkoutResumeItem[] = [];

  treino.exercicios
    .filter((ex) => !ex.grupo_id)
    .forEach((ex, index) => {
      items.push({
        id: ex.id,
        type: "exercise",
        treinoId,
        dia: treino.dia,
        ordem: ex.ordem ?? index,
        concluido: !!ex.concluido,
      });
    });

  grupos.forEach((grupo, grupoIndex) => {
    const grupoOrdem =
      grupo.exercicios?.length > 0
        ? Math.min(...grupo.exercicios.map((ex: any) => ex.ordem ?? grupoIndex))
        : grupoIndex;

    grupo.exercicios?.forEach((ex: any, index: number) => {
      items.push({
        id: ex.id,
        type: "exercise",
        treinoId,
        dia: treino.dia,
        ordem: grupoOrdem + ((ex.ordem_no_grupo ?? index + 1) / 100),
        concluido: !!ex.concluido,
      });
    });
  });

  blocos.forEach((bloco, index) => {
    items.push({
      id: bloco.id,
      type: "block",
      treinoId,
      dia: treino.dia,
      ordem: bloco.ordem ?? index,
      concluido: !!bloco.concluido,
    });
  });

  return items.sort((a, b) => a.ordem - b.ordem);
}

export function WorkoutDayView({
  treinos,
  profileId,
  personalId,
  gruposPorTreino = {},
  blocosPorTreino = {},
  onToggleConcluido,
  onToggleGrupoConcluido,
  onToggleBlocoConcluido,
  onWorkoutFinished,
}: WorkoutDayViewProps) {
  // Estado local para updates otimistas
  const [localTreinos, setLocalTreinos] = useState<TreinoDia[]>(treinos);
  const [localGrupos, setLocalGrupos] =
    useState<Record<string, GrupoExercicio[]>>(gruposPorTreino);
  const [localBlocos, setLocalBlocos] =
    useState<Record<string, BlocoTreino[]>>(blocosPorTreino);

  // 🔧 Hook de persistência de sessão PWA
  const { 
    isTreinoIniciado, 
    marcarTreinoIniciado, 
    marcarTreinoFinalizado,
    isLoading: isLoadingSession 
  } = useWorkoutSession(profileId, personalId);

  // 🔧 Hook de persistência de progresso PWA
  const {
    salvarProgressoLocal,
    marcarSincronizado,
    persistirExercicioAgora,
    persistirSeriesAgora,
    mesclarProgressoExercicios,
    salvarBlocoProgressoLocal,
    marcarBlocoSincronizado,
    persistirBlocoAgora,
    mesclarProgressoBlocos,
    limparProgressoLocal,
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

    const resumeTarget = getResumeItemAfterToggle(id, concluido);
    if (resumeTarget) {
      setDiaAtivo(String(resumeTarget.dia));
      saveResumeTarget(resumeTarget.treinoId, resumeTarget.id, resumeTarget.dia);
      scrollToResumeItem(resumeTarget.id);
    }

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

    const sincronizado = await persistirExercicioAgora(id, concluido);
    if (!sincronizado) return;

    try {
      await onToggleConcluido(id, concluido);
      // 🔧 Marcar como sincronizado após sucesso
      marcarSincronizado(id);
    } catch (error) {
      console.error("[WorkoutDayView] Erro ao marcar exercício, tentando retry:", error);
      // 🔧 Retry 1x
      try {
        await onToggleConcluido(id, concluido);
        marcarSincronizado(id);
      } catch (retryError) {
        console.error("[WorkoutDayView] Retry falhou, mantido no localStorage:", retryError);
        // Progresso local permanece e será sincronizado depois
      }
    }
  };

  // ✅ Handler para registro de séries
  const handleRegisterSerie = async (
    id: string,
    seriesConcluidas: number,
    totalSeries: number
  ) => {
    const safeTotal = Math.max(1, totalSeries);
    const safeSeries = Math.min(Math.max(0, Math.floor(seriesConcluidas)), safeTotal);
    const concluido = safeSeries >= safeTotal;

    setLocalTreinos((prev) =>
      prev.map((treino) => ({
        ...treino,
        exercicios: treino.exercicios.map((ex) =>
          ex.id === id
            ? { ...ex, series_concluidas: safeSeries, concluido }
            : ex
        ),
      }))
    );

    setLocalGrupos((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((treinoId) => {
        updated[treinoId] = updated[treinoId].map((grupo) => ({
          ...grupo,
          exercicios: grupo.exercicios.map((ex: any) =>
            ex.id === id
              ? { ...ex, series_concluidas: safeSeries, concluido }
              : ex
          ),
        }));
      });
      return updated;
    });

    return persistirSeriesAgora(id, safeSeries, safeTotal);
  };

  // ✅ Handler para toggle de grupo
  const handleToggleGrupo = async (grupoId: string, concluido: boolean) => {
    if (!onToggleGrupoConcluido) return;

    const grupoAtual = Object.values(localGrupos)
      .flat()
      .find((grupo) => grupo.grupo_id === grupoId);
    const exercicioReferencia = concluido
      ? grupoAtual?.exercicios?.[grupoAtual.exercicios.length - 1]
      : grupoAtual?.exercicios?.[0];
    const resumeTarget = exercicioReferencia
      ? getResumeItemAfterToggle(exercicioReferencia.id, concluido)
      : null;

    if (resumeTarget) {
      setDiaAtivo(String(resumeTarget.dia));
      saveResumeTarget(resumeTarget.treinoId, resumeTarget.id, resumeTarget.dia);
      scrollToResumeItem(resumeTarget.id);
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
                  series_concluidas: concluido ? ex.series || 1 : 0,
                })),
              }
            : grupo
        );
      });
      return updated;
    });

    const resultadosSync = await Promise.all(
      (grupoAtual?.exercicios ?? []).map((exercicio: any) =>
        persistirSeriesAgora(
          exercicio.id,
          concluido ? exercicio.series || 1 : 0,
          exercicio.series || 1
        )
      )
    );
    if (resultadosSync.some((sincronizado) => !sincronizado)) return;

    try {
      await onToggleGrupoConcluido(grupoId, concluido);
    } catch (error) {
      console.error("[WorkoutDayView] Erro ao marcar grupo:", error);
    }
  };

  // ✅ Handler para toggle de bloco - salva localmente primeiro
  const handleToggleBloco = async (blocoId: string, concluido: boolean) => {
    if (!onToggleBlocoConcluido) return;

    // 🔧 Salvar no localStorage imediatamente (PWA)
    salvarBlocoProgressoLocal(blocoId, concluido);

    const resumeTarget = getResumeItemAfterToggle(blocoId, concluido);
    if (resumeTarget) {
      setDiaAtivo(String(resumeTarget.dia));
      saveResumeTarget(resumeTarget.treinoId, resumeTarget.id, resumeTarget.dia);
      scrollToResumeItem(resumeTarget.id);
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

    const blocoSincronizado = await persistirBlocoAgora(blocoId, concluido);
    if (!blocoSincronizado) return;

    try {
      await onToggleBlocoConcluido(blocoId, concluido);
      // 🔧 Marcar como sincronizado após sucesso
      marcarBlocoSincronizado(blocoId);
    } catch (error) {
      console.error("[WorkoutDayView] Erro ao marcar bloco:", error);
      // Não reverter - o progresso local permanece e será sincronizado depois
    }
  };

  const resetLocalProgressForTreino = useCallback((treinoId: string) => {
    const treinoAtual = localTreinos.find((treino) => getTreinoId(treino) === treinoId);
    const exercicioIds = [
      ...(treinoAtual?.exercicios.map((ex) => ex.id) || []),
      ...((localGrupos[treinoId] || []).flatMap((grupo) =>
        grupo.exercicios.map((ex: any) => ex.id)
      )),
    ];
    const blocoIds = (localBlocos[treinoId] || []).map((bloco) => bloco.id);

    limparProgressoLocal(exercicioIds, blocoIds);
    exercicioIds.forEach((exercicioId) => {
      salvarProgressoLocal(exercicioId, false);
    });
    blocoIds.forEach((blocoId) => {
      salvarBlocoProgressoLocal(blocoId, false);
    });

    setLocalTreinos((prev) =>
      prev.map((treino) =>
        getTreinoId(treino) === treinoId
          ? {
              ...treino,
              exercicios: treino.exercicios.map((ex) => ({
                ...ex,
                concluido: false,
                series_concluidas: 0,
              })),
            }
          : treino
      )
    );

    setLocalGrupos((prev) => ({
      ...prev,
      [treinoId]: (prev[treinoId] || []).map((grupo) => ({
        ...grupo,
        exercicios: grupo.exercicios.map((ex: any) => ({
          ...ex,
          concluido: false,
          series_concluidas: 0,
        })),
      })),
    }));

    setLocalBlocos((prev) => ({
      ...prev,
      [treinoId]: (prev[treinoId] || []).map((bloco) => ({
        ...bloco,
        concluido: false,
        concluido_em: null,
      })),
    }));
  }, [
    getTreinoId,
    limparProgressoLocal,
    localBlocos,
    localGrupos,
    localTreinos,
    salvarBlocoProgressoLocal,
    salvarProgressoLocal,
  ]);

  // Handler para iniciar treino - usa hook de persistência
  const handleIniciarTreino = (treinoId: string, dia: number) => {
    if (treinoId) {
      marcarTreinoIniciado(treinoId, dia);
      const target = getFirstPendingItemForTreino(treinoId);
      setDiaAtivo(String(dia));
      saveResumeTarget(treinoId, target?.id ?? null, dia);
      scrollToResumeItem(target?.id ?? null);
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

  // 🔧 Persistir aba do dia ativa por aluno+personal (sobrevive a navegação/reload)
  const [diaAtivo, setDiaAtivo] = usePersistedState<string>(
    `workout-day-tab:${profileId}:${personalId}`,
    String(primeiroDiaComConteudo),
    { storage: "local" }
  );

  const [resumeItemId, setResumeItemId] = useState<string | null>(null);
  const restoreKeyRef = useRef<string | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const resumeCacheKey = getWorkoutResumeCacheKey(profileId, personalId);

  const readWorkoutResume = useCallback((): WorkoutResumeSnapshot | null => {
    try {
      const raw = window.localStorage.getItem(resumeCacheKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as WorkoutResumeSnapshot;
      if (
        parsed.version !== WORKOUT_RESUME_CACHE_VERSION ||
        parsed.profileId !== profileId ||
        parsed.personalId !== personalId
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }, [personalId, profileId, resumeCacheKey]);

  const writeWorkoutResume = useCallback(
    (snapshot: Omit<WorkoutResumeSnapshot, "version" | "profileId" | "personalId" | "updatedAt">) => {
      try {
        const next: WorkoutResumeSnapshot = {
          ...snapshot,
          version: WORKOUT_RESUME_CACHE_VERSION,
          profileId,
          personalId,
          updatedAt: Date.now(),
        };

        window.localStorage.setItem(resumeCacheKey, JSON.stringify(next));
      } catch (error) {
        console.error("[WorkoutDayView] Erro ao salvar retomada do treino:", error);
      }
    },
    [personalId, profileId, resumeCacheKey]
  );

  const getTreinoContext = useCallback(
    (treinoId: string | null) => {
      if (!treinoId) return null;

      const treino = localTreinos.find((item) => getTreinoId(item) === treinoId);
      if (!treino) return null;

      return {
        treino,
        treinoId,
        grupos: localGrupos[treinoId] ?? [],
        blocos: localBlocos[treinoId] ?? [],
      };
    },
    [getTreinoId, localBlocos, localGrupos, localTreinos]
  );

  const getResumeItemsForTreino = useCallback(
    (treinoId: string | null) => {
      const context = getTreinoContext(treinoId);
      if (!context) return [];

      return buildWorkoutResumeItems(
        context.treino,
        context.treinoId,
        context.grupos,
        context.blocos
      );
    },
    [getTreinoContext]
  );

  const findResumeItemById = useCallback(
    (itemId: string) => {
      for (const treino of localTreinos) {
        const treinoId = getTreinoId(treino);
        if (!treinoId) continue;

        const item = getResumeItemsForTreino(treinoId).find((current) => current.id === itemId);
        if (item) return item;
      }

      return null;
    },
    [getResumeItemsForTreino, getTreinoId, localTreinos]
  );

  const getResumeItemAfterToggle = useCallback(
    (itemId: string, concluido: boolean) => {
      const current = findResumeItemById(itemId);
      if (!current) return null;

      if (!concluido) return current;

      const items = getResumeItemsForTreino(current.treinoId);
      const currentIndex = items.findIndex((item) => item.id === itemId);
      const nextPending = items
        .slice(Math.max(currentIndex + 1, 0))
        .find((item) => !item.concluido && item.id !== itemId);

      return nextPending ?? items.find((item) => !item.concluido && item.id !== itemId) ?? current;
    },
    [findResumeItemById, getResumeItemsForTreino]
  );

  const getFirstPendingItemForTreino = useCallback(
    (treinoId: string | null, preferredItemId?: string | null) => {
      const items = getResumeItemsForTreino(treinoId);
      if (items.length === 0) return null;

      if (preferredItemId) {
        const preferred = items.find((item) => item.id === preferredItemId);
        if (preferred && !preferred.concluido) return preferred;

        const preferredIndex = items.findIndex((item) => item.id === preferredItemId);
        if (preferredIndex >= 0) {
          const nextPending = items.slice(preferredIndex + 1).find((item) => !item.concluido);
          if (nextPending) return nextPending;
        }
      }

      return items.find((item) => !item.concluido) ?? items[0];
    },
    [getResumeItemsForTreino]
  );

  const scrollToResumeItem = useCallback((itemId: string | null, behavior: ScrollBehavior = "smooth") => {
    if (!itemId) return;

    setResumeItemId(itemId);

    window.setTimeout(() => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>("[data-workout-cache-item]")
      ).find((element) => element.dataset.workoutCacheItem === itemId);

      if (target) {
        target.scrollIntoView({ behavior, block: "center", inline: "center" });
      }
    }, 120);
  }, []);

  const saveResumeTarget = useCallback(
    (treinoId: string, itemId: string | null, dia?: number) => {
      const context = getTreinoContext(treinoId);
      const resolvedDia = dia ?? context?.treino.dia ?? Number(diaAtivo) ?? primeiroDiaComConteudo;

      writeWorkoutResume({
        treinoId,
        dia: resolvedDia,
        itemId,
        scrollY: window.scrollY,
      });

      if (itemId) setResumeItemId(itemId);
    },
    [diaAtivo, getTreinoContext, primeiroDiaComConteudo, writeWorkoutResume]
  );

  const saveVisibleWorkoutPosition = useCallback(() => {
    const activeTreinoIds = localTreinos
      .map((treino) => getTreinoId(treino))
      .filter((treinoId): treinoId is string => !!treinoId && isTreinoIniciado(treinoId));

    if (activeTreinoIds.length === 0) return;

    const visibleItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-workout-cache-item]")
    )
      .filter((element) => {
        const treinoId = element.dataset.workoutTreinoId;
        if (!treinoId || !activeTreinoIds.includes(treinoId)) return false;

        const rect = element.getBoundingClientRect();
        return rect.bottom > 72 && rect.top < window.innerHeight - 72;
      })
      .sort((a, b) => {
        const targetTop = Math.min(220, window.innerHeight * 0.35);
        return (
          Math.abs(a.getBoundingClientRect().top - targetTop) -
          Math.abs(b.getBoundingClientRect().top - targetTop)
        );
      });

    const current = visibleItems[0];
    if (!current) return;

    const treinoId = current.dataset.workoutTreinoId;
    const itemId = current.dataset.workoutCacheItem ?? null;
    if (!treinoId) return;

    const context = getTreinoContext(treinoId);
    if (!context) return;

    writeWorkoutResume({
      treinoId,
      dia: context.treino.dia,
      itemId,
      scrollY: window.scrollY,
    });
  }, [getTreinoContext, getTreinoId, isTreinoIniciado, localTreinos, writeWorkoutResume]);

  useEffect(() => {
    if (isLoadingSession) return;

    const cached = readWorkoutResume();
    const activeTreinoIds = localTreinos
      .map((treino) => getTreinoId(treino))
      .filter((treinoId): treinoId is string => !!treinoId && isTreinoIniciado(treinoId));

    const cachedIsActive = cached?.treinoId && activeTreinoIds.includes(cached.treinoId);
    const treinoIdToRestore = cachedIsActive ? cached.treinoId : activeTreinoIds[0];
    if (!treinoIdToRestore) return;

    const target = getFirstPendingItemForTreino(
      treinoIdToRestore,
      cachedIsActive ? cached?.itemId : null
    );

    const context = getTreinoContext(treinoIdToRestore);
    if (!context || !target) return;

    const restoreKey = `${treinoIdToRestore}:${target.id}:${target.concluido}`;
    if (restoreKeyRef.current === restoreKey) return;
    restoreKeyRef.current = restoreKey;

    setDiaAtivo(String(context.treino.dia));
    saveResumeTarget(treinoIdToRestore, target.id, context.treino.dia);
    scrollToResumeItem(target.id, "auto");
  }, [
    getFirstPendingItemForTreino,
    getTreinoContext,
    getTreinoId,
    isLoadingSession,
    isTreinoIniciado,
    localTreinos,
    readWorkoutResume,
    saveResumeTarget,
    scrollToResumeItem,
    setDiaAtivo,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollFrameRef.current != null) return;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        saveVisibleWorkoutPosition();
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveVisibleWorkoutPosition();
        return;
      }

      const cached = readWorkoutResume();
      if (!cached || !isTreinoIniciado(cached.treinoId)) return;

      setDiaAtivo(String(cached.dia));
      scrollToResumeItem(cached.itemId, "auto");
    };

    const handlePageHide = () => saveVisibleWorkoutPosition();

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (scrollFrameRef.current != null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, [
    isTreinoIniciado,
    readWorkoutResume,
    saveVisibleWorkoutPosition,
    scrollToResumeItem,
    setDiaAtivo,
  ]);

  return (
    <div className="space-y-3 sm:space-y-4 pb-20">
      {/* Header Compacto */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          <h1 className="text-base font-semibold text-foreground">
            Meus Treinos
          </h1>
        </div>

        {/* Indicador de Semana Ativa */}
        {semanaAtiva?.semana_inicio && (
          <Badge variant="outline" className="gap-1 px-2 py-0.5 text-[10px]">
            <CalendarDays className="h-3 w-3" />
            <span>
              {formatDisplayMonthDay(semanaAtiva.semana_inicio)}
            </span>
          </Badge>
        )}
      </div>


      {/* Tabs dos Dias */}
      <Tabs value={diaAtivo} onValueChange={setDiaAtivo} className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-card/50 backdrop-blur-sm border shadow-lg rounded-xl">
          {diasSemana.map((dia, index) => {
            const treinosDoDia = localTreinos.filter((t) => t.dia === index + 1);
            
            let totalItens = 0;
            let progressoTotal = 0;
            let treinoCount = 0;
            
            treinosDoDia.forEach((treino) => {
              const treinoId = getTreinoId(treino);
              const grupos = treinoId ? localGrupos[treinoId] ?? [] : [];
              const blocos = treinoId ? localBlocos[treinoId] ?? [] : [];
              totalItens += calcularTotalItens(treino, grupos, blocos);
              const p = calcularProgresso(treino, grupos);
              if (p > 0 || treino.exercicios.length > 0) {
                progressoTotal += p;
                treinoCount++;
              }
            });

            const temConteudo = totalItens > 0;
            const progresso = treinoCount > 0 ? Math.round(progressoTotal / treinoCount) : 0;

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
                    {treinosDoDia.length > 1 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                        {treinosDoDia.length} treinos
                      </Badge>
                    )}
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

        {/* Conteúdo de cada dia - agrupado */}
        {diasSemana.map((diaInfo, index) => {
          const diaNr = index + 1;
          const treinosDoDia = localTreinos.filter((t) => t.dia === diaNr);

          return (
            <TabsContent
              key={diaNr}
              value={String(diaNr)}
              className="mt-6 space-y-6"
            >
              {treinosDoDia.map((treino, treinoIndex) => {
                const treinoId = getTreinoId(treino);
                const grupos = treinoId ? localGrupos[treinoId] ?? [] : [];
                const blocos = treinoId ? localBlocos[treinoId] ?? [] : [];

                const totalItens = calcularTotalItens(treino, grupos, blocos);
                const treinoTemConteudo = totalItens > 0;
                const progresso = calcularProgresso(treino, grupos);

                const blocosInicio = blocos.filter((b) => b.posicao === "inicio");
                const blocosMeio = blocos.filter((b) => b.posicao === "meio");
                const blocosFim = blocos.filter((b) => b.posicao === "fim");

                const exerciciosIsolados = treino.exercicios.filter(
                  (ex) => !ex.grupo_id
                );
                const completedItems = countCompletedItems(
                  exerciciosIsolados,
                  grupos,
                  blocos
                );
                const duracaoEstimadaMinutos = estimateWorkoutMinutes(
                  exerciciosIsolados,
                  grupos,
                  blocos
                );

                const isDiaIniciado = isTreinoIniciado(treinoId);
                const hasMultiple = treinosDoDia.filter(t => {
                  const tid = getTreinoId(t);
                  const g = tid ? localGrupos[tid] ?? [] : [];
                  const b = tid ? localBlocos[tid] ?? [] : [];
                  return calcularTotalItens(t, g, b) > 0;
                }).length > 1;

                if (!treinoTemConteudo && treinosDoDia.length > 1) return null;

                return (
                  <TreinoCard
                    key={treinoId || treinoIndex}
                    treino={treino}
                    treinoId={treinoId}
                    diaInfo={diaInfo}
                    hasMultiple={hasMultiple}
                    totalItens={totalItens}
                    completedItems={completedItems}
                    duracaoEstimadaMinutos={duracaoEstimadaMinutos}
                    grupos={grupos}
                    blocos={blocos}
                    blocosInicio={blocosInicio}
                    blocosMeio={blocosMeio}
                    blocosFim={blocosFim}
                    exerciciosIsolados={exerciciosIsolados}
                    progresso={progresso}
                    isDiaIniciado={isDiaIniciado}
                    treinoTemConteudo={treinoTemConteudo}
                    profileId={profileId}
                    personalId={personalId}
                    marcarTreinoIniciado={handleIniciarTreino}
                    marcarTreinoFinalizado={marcarTreinoFinalizado}
                    onTreinoConcluido={(finishedTreinoId) => {
                      resetLocalProgressForTreino(finishedTreinoId);
                      onWorkoutFinished?.();
                    }}
                    onTreinoCancelado={(canceledTreinoId) => {
                      resetLocalProgressForTreino(canceledTreinoId);
                    }}
                    handleToggleExercicio={handleToggleExercicio}
                    handleRegisterSerie={handleRegisterSerie}
                    handleToggleGrupo={handleToggleGrupo}
                    handleToggleBloco={handleToggleBloco}
                    resumeItemId={resumeItemId}
                  />
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

// Sub-component that manages its own finalizarRef
function TreinoCard({
  treino,
  treinoId,
  diaInfo,
  hasMultiple,
  totalItens,
  completedItems,
  duracaoEstimadaMinutos,
  grupos,
  blocos,
  blocosInicio,
  blocosMeio,
  blocosFim,
  exerciciosIsolados,
  progresso,
  isDiaIniciado,
  treinoTemConteudo,
  profileId,
  personalId,
  marcarTreinoIniciado,
  marcarTreinoFinalizado,
  onTreinoConcluido,
  onTreinoCancelado,
  handleToggleExercicio,
  handleRegisterSerie,
  handleToggleGrupo,
  handleToggleBloco,
  resumeItemId,
}: {
  treino: TreinoDia;
  treinoId: string | null;
  diaInfo: { nome: string; abrev: string };
  hasMultiple: boolean;
  totalItens: number;
  completedItems: number;
  duracaoEstimadaMinutos: number;
  grupos: GrupoExercicio[];
  blocos: BlocoTreino[];
  blocosInicio: BlocoTreino[];
  blocosMeio: BlocoTreino[];
  blocosFim: BlocoTreino[];
  exerciciosIsolados: any[];
  progresso: number;
  isDiaIniciado: boolean;
  treinoTemConteudo: boolean;
  profileId: string;
  personalId: string;
  marcarTreinoIniciado: (treinoId: string, dia: number) => void;
  marcarTreinoFinalizado: (treinoId: string, dia: number) => void;
  onTreinoConcluido: (treinoId: string) => void;
  onTreinoCancelado: (treinoId: string) => void;
  handleToggleExercicio: (id: string, concluido: boolean) => Promise<any>;
  handleRegisterSerie: (id: string, seriesConcluidas: number, totalSeries: number) => Promise<any>;
  handleToggleGrupo: (grupoId: string, concluido: boolean) => Promise<void>;
  handleToggleBloco: (blocoId: string, concluido: boolean) => Promise<void>;
  resumeItemId?: string | null;
}) {
  const finalizarRef = useRef<(() => void) | null>(null);
  const iniciarRef = useRef<(() => void) | null>(null);

  const isWorkoutActive = isDiaIniciado && !!treinoId;
  const totalExercicios =
    exerciciosIsolados.length +
    grupos.reduce(
      (total, grupo) => total + (grupo.exercicios?.length || 0),
      0
    );
  const subtitle = buildWorkoutSubtitle(treino, hasMultiple);

  return (
    <Card className="border-primary/30 shadow-xl bg-card/50 backdrop-blur-sm">
      <CardContent className="p-3 sm:p-5 space-y-4">
        <WorkoutDayHeader
          diaNome={diaInfo.nome}
          descricao={subtitle}
          totalItens={totalItens}
          completedItems={completedItems}
          totalExercicios={totalExercicios}
          totalGrupos={grupos.length}
          totalBlocos={blocos.length}
          progresso={progresso}
          treinoIniciado={isDiaIniciado}
          duracaoEstimadaMinutos={duracaoEstimadaMinutos}
          onStartWorkout={treinoId ? () => iniciarRef.current?.() : undefined}
        />

        {/* Timer inline em destaque no topo */}
        {treinoId && (
          <WorkoutTimer
            treinoId={treinoId}
            profileId={profileId}
            personalId={personalId}
            readOnly={false}
            progresso={progresso}
            finalizarRef={finalizarRef}
            iniciarRef={iniciarRef}
            onWorkoutStart={() => marcarTreinoIniciado(treinoId, treino.dia)}
            onWorkoutComplete={() => {
              marcarTreinoFinalizado(treinoId, treino.dia);
              onTreinoConcluido(treinoId);
            }}
            onWorkoutCancel={() => {
              marcarTreinoFinalizado(treinoId, treino.dia);
              onTreinoCancelado(treinoId);
            }}
          />
        )}

        {!treinoTemConteudo ? (
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
            onRegisterSerie={handleRegisterSerie}
            onToggleGrupo={handleToggleGrupo}
            onToggleBloco={handleToggleBloco}
            isWorkoutActive={isWorkoutActive}
            onFinalizarTreino={() => finalizarRef.current?.()}
            profileId={profileId}
            treinoId={treinoId}
            resumeItemId={resumeItemId}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default WorkoutDayView;
