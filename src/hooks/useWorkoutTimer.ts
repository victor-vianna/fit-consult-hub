// src/hooks/useWorkoutTimer.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SESSION_STATUS, ACTIVE_SESSION_STATUSES, WORKOUT_EVENTS, dispatchWorkoutEvent } from "@/constants/workoutStatus";

// 🔧 Key única por treino para evitar conflitos
const getStorageKey = (treinoId: string) => `workout_timer_${treinoId}`;
const PERSIST_INTERVAL = 5000; // 5 segundos

// 🔧 Interface melhorada com timestamps absolutos
interface StoredSession {
  sessaoId: string;
  treinoId: string;
  startTimestamp: number;         // Data.now() do início real
  isPaused: boolean;
  pausedTimestamp?: number;       // Data.now() quando pausou
  totalPausedMs: number;          // Tempo total pausado em ms
  tempoDescansoTotal: number;     // Segundos de descanso
  restStartTimestamp?: number;    // Início do descanso atual
  restType?: "serie" | "exercicio";
}

interface UseWorkoutTimerProps {
  treinoId: string;
  profileId: string;
  personalId: string;
}

interface Descanso {
  id: string;
  tipo: "serie" | "exercicio";
  inicio: string;
  fim?: string;
  duracao_segundos?: number;
}

export interface WorkoutCompletionData {
  tempoTotal: number;
  tempoFormatado: string;
  horaInicio: string;
  horaFim: string;
  data: string;
  tempoDescanso: number;
  tempoPausas: number;
  totalDescansos: number;
  mensagemMotivacional: string;
  exerciciosConcluidos: number;
  exerciciosTotal: number;
}

const FRASE_FINAL_PADRAO = "Treino finalizado com excelência.";

export function useWorkoutTimer({
  treinoId,
  profileId,
  personalId,
}: UseWorkoutTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [completionData, setCompletionData] = useState<WorkoutCompletionData | null>(null);
  const [inicioTreino, setInicioTreino] = useState<Date | null>(null);

  // Descansos
  const [isResting, setIsResting] = useState(false);
  const [restType, setRestType] = useState<"serie" | "exercicio" | null>(null);
  const [restElapsedTime, setRestElapsedTime] = useState(0);
  const [currentRestId, setCurrentRestId] = useState<string | null>(null);
  const [descansos, setDescansos] = useState<Descanso[]>([]);
  const [tempoDescansoTotal, setTempoDescansoTotal] = useState(0);
  const [tempoPausadoTotal, setTempoPausadoTotal] = useState(0);

  // 🔧 Refs com timestamps absolutos
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const restIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const persistIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimestampRef = useRef<number>(0);          // Timestamp absoluto do início
  const pausedTimestampRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef<number>(0);           // Total pausado em ms
  const isPausedRef = useRef<boolean>(false);            // Ref para evitar stale closure
  const restStartTimestampRef = useRef<number>(0);

  // 🔧 Calcula tempo decorrido baseado em timestamps absolutos
  const calculateElapsedTime = useCallback((): number => {
    if (!startTimestampRef.current) return 0;
    
    const now = Date.now();
    let elapsed: number;
    
    if (pausedTimestampRef.current) {
      // Se está pausado, usar o timestamp de pausa
      elapsed = pausedTimestampRef.current - startTimestampRef.current - totalPausedMsRef.current;
    } else {
      // Se está rodando, calcular tempo atual
      elapsed = now - startTimestampRef.current - totalPausedMsRef.current;
    }
    
    return Math.max(0, Math.floor(elapsed / 1000));
  }, []);

  // 🔧 FIX: Use refs for ALL values in saveToStorage to prevent stale closures
  const sessaoIdRef = useRef<string | null>(null);
  const tempoDescansoTotalRef = useRef(0);
  const isRestingRef = useRef(false);
  const restTypeRef = useRef<"serie" | "exercicio" | null>(null);

  // Keep refs in sync with state
  useEffect(() => { sessaoIdRef.current = sessaoId; }, [sessaoId]);
  useEffect(() => { tempoDescansoTotalRef.current = tempoDescansoTotal; }, [tempoDescansoTotal]);
  useEffect(() => { isRestingRef.current = isResting; }, [isResting]);
  useEffect(() => { restTypeRef.current = restType; }, [restType]);

  const saveToStorage = useCallback(() => {
    if (!sessaoIdRef.current || !treinoId) return;
    
    const session: StoredSession = {
      sessaoId: sessaoIdRef.current,
      treinoId,
      startTimestamp: startTimestampRef.current,
      isPaused: isPausedRef.current,
      pausedTimestamp: pausedTimestampRef.current || undefined,
      totalPausedMs: totalPausedMsRef.current,
      tempoDescansoTotal: tempoDescansoTotalRef.current,
      restStartTimestamp: isRestingRef.current ? restStartTimestampRef.current : undefined,
      restType: restTypeRef.current || undefined,
    };
    
    localStorage.setItem(getStorageKey(treinoId), JSON.stringify(session));
  }, [treinoId]);

  // 🔧 Persistir no banco - uses ref to avoid stale sessaoId
  const persistirTempo = useCallback(async () => {
    if (!sessaoIdRef.current) return;
    
    const tempoAtual = calculateElapsedTime();
    const pausasTotalSegundos = Math.floor(totalPausedMsRef.current / 1000);
    
    try {
      await supabase
        .from("treino_sessoes")
        .update({
          duracao_segundos: tempoAtual,
          tempo_descanso_total: tempoDescansoTotalRef.current,
          tempo_pausado_total: pausasTotalSegundos,
        })
        .eq("id", sessaoIdRef.current);

      saveToStorage();
    } catch (err) {
      console.error("[useWorkoutTimer] Erro ao persistir tempo:", err);
    }
  }, [calculateElapsedTime, saveToStorage]);

  // 🔧 Restaurar sessão ativa ao montar
  useEffect(() => {
    const restaurarSessao = async () => {
      if (!profileId || !treinoId) {
        setIsLoading(false);
        return;
      }

      try {
        // Primeiro tenta restaurar do localStorage específico deste treino
        const stored = localStorage.getItem(getStorageKey(treinoId));
        let sessaoRestaurada = false;

        if (stored) {
          const session: StoredSession = JSON.parse(stored);
          
          // Verificar se a sessão ainda existe e está ativa no banco
          const { data: sessaoDB } = await supabase
            .from("treino_sessoes")
            .select("*")
            .eq("id", session.sessaoId)
            .in("status", ["em_andamento", "pausado"])
            .single();

          if (sessaoDB) {
            const now = Date.now();
            
            // Restaurar refs de timestamp
            startTimestampRef.current = session.startTimestamp;
            totalPausedMsRef.current = session.totalPausedMs;
            
            if (session.isPaused && session.pausedTimestamp) {
              pausedTimestampRef.current = session.pausedTimestamp;
            }
            
            // Calcular tempo decorrido
            const tempoCalculado = calculateElapsedTime();
            
            setSessaoId(session.sessaoId);
            setElapsedTime(tempoCalculado);
            setIsRunning(!session.isPaused);
            setIsPaused(session.isPaused);
            isPausedRef.current = session.isPaused;
            setTempoPausadoTotal(Math.floor(session.totalPausedMs / 1000));
            setInicioTreino(new Date(session.startTimestamp));

            // Restaurar descanso ativo se houver
            if (session.restStartTimestamp && session.restType) {
              restStartTimestampRef.current = session.restStartTimestamp;
              const restTime = Math.floor((now - session.restStartTimestamp) / 1000);
              setIsResting(true);
              setRestType(session.restType);
              setRestElapsedTime(restTime);
            }

            // Carregar descansos da sessão
            const { data: descansosDB } = await supabase
              .from("treino_descansos")
              .select("*")
              .eq("sessao_id", session.sessaoId)
              .order("created_at", { ascending: true });

            if (descansosDB) {
              setDescansos(descansosDB as Descanso[]);
              
              // Verificar se há descanso em andamento no banco
              const descansoAtivo = descansosDB.find((d: any) => !d.fim);
              if (descansoAtivo && !session.restStartTimestamp) {
                const inicioDescanso = new Date(descansoAtivo.inicio).getTime();
                restStartTimestampRef.current = inicioDescanso;
                const restTime = Math.floor((now - inicioDescanso) / 1000);
                setIsResting(true);
                setRestType(descansoAtivo.tipo as "serie" | "exercicio");
                setCurrentRestId(descansoAtivo.id);
                setRestElapsedTime(restTime);
              }
            }

            sessaoRestaurada = true;
          } else {
            // Sessão não existe mais no banco, limpar localStorage
            localStorage.removeItem(getStorageKey(treinoId));
          }
        }

        // Se não restaurou do localStorage, buscar no banco
        if (!sessaoRestaurada) {
          const { data: sessaoAtiva } = await supabase
            .from("treino_sessoes")
            .select("*")
            .eq("treino_semanal_id", treinoId)
            .eq("profile_id", profileId)
            .in("status", ["em_andamento", "pausado"])
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (sessaoAtiva) {
            const now = Date.now();
            const inicio = new Date(sessaoAtiva.inicio!).getTime();
            
            startTimestampRef.current = inicio;
            totalPausedMsRef.current = (sessaoAtiva.tempo_pausado_total || 0) * 1000;
            
            if (sessaoAtiva.status === "pausado" && sessaoAtiva.pausado_em) {
              pausedTimestampRef.current = new Date(sessaoAtiva.pausado_em).getTime();
            }
            
            const tempoCalculado = calculateElapsedTime();

            setSessaoId(sessaoAtiva.id);
            setElapsedTime(tempoCalculado);
            setIsRunning(sessaoAtiva.status === "em_andamento");
            setIsPaused(sessaoAtiva.status === "pausado");
            isPausedRef.current = sessaoAtiva.status === "pausado";
            setTempoPausadoTotal(sessaoAtiva.tempo_pausado_total || 0);
            setInicioTreino(new Date(sessaoAtiva.inicio!));

            // Carregar descansos
            const { data: descansosDB } = await supabase
              .from("treino_descansos")
              .select("*")
              .eq("sessao_id", sessaoAtiva.id)
              .order("created_at", { ascending: true });

            if (descansosDB) {
              setDescansos(descansosDB as Descanso[]);
              
              const descansoAtivo = descansosDB.find((d: any) => !d.fim);
              if (descansoAtivo) {
                const inicioDescanso = new Date(descansoAtivo.inicio).getTime();
                restStartTimestampRef.current = inicioDescanso;
                setIsResting(true);
                setRestType(descansoAtivo.tipo as "serie" | "exercicio");
                setCurrentRestId(descansoAtivo.id);
                setRestElapsedTime(Math.floor((now - inicioDescanso) / 1000));
              }
            }

            // Salvar no localStorage para próxima restauração
            saveToStorage();
          }
        }
      } catch (err) {
        console.error("[useWorkoutTimer] Erro ao restaurar sessão:", err);
      } finally {
        setIsLoading(false);
      }
    };

    restaurarSessao();
  }, [profileId, treinoId, calculateElapsedTime, saveToStorage]);

  // 🔧 Timer principal - recalcula baseado em timestamp
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(calculateElapsedTime());
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, calculateElapsedTime]);

  // Timer de descanso
  useEffect(() => {
    if (isResting) {
      restIntervalRef.current = setInterval(() => {
        if (restStartTimestampRef.current) {
          const now = Date.now();
          const restTime = Math.floor((now - restStartTimestampRef.current) / 1000);
          setRestElapsedTime(restTime);
        }
      }, 1000);
    } else {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
        restIntervalRef.current = null;
      }
    }

    return () => {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
      }
    };
  }, [isResting]);

  // Persistência periódica
  useEffect(() => {
    if (isRunning || isPaused) {
      persistIntervalRef.current = setInterval(() => {
        persistirTempo();
      }, PERSIST_INTERVAL);
    } else {
      if (persistIntervalRef.current) {
        clearInterval(persistIntervalRef.current);
        persistIntervalRef.current = null;
      }
    }

    return () => {
      if (persistIntervalRef.current) {
        clearInterval(persistIntervalRef.current);
      }
    };
  }, [isRunning, isPaused, persistirTempo]);

  // 🔧 Salvar ao fechar página / PWA - usar múltiplos eventos
  useEffect(() => {
    const handleUnload = () => {
      saveToStorage();
      persistirTempo();
    };

    // Eventos para PWA: pagehide é mais confiável que beforeunload em mobile
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [saveToStorage, persistirTempo]);

  // 🔧 Visibilidade da página - CRÍTICO para PWA mobile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Salvar imediatamente ao minimizar/trocar de app
        saveToStorage();
        persistirTempo();
      } else if (document.visibilityState === "visible" && treinoId) {
        // 🔧 Recalcular tempo ao voltar baseado em timestamps absolutos
        const stored = localStorage.getItem(getStorageKey(treinoId));
        if (stored) {
          try {
            const session: StoredSession = JSON.parse(stored);
            if (session.sessaoId === sessaoId) {
              // Restaurar refs
              startTimestampRef.current = session.startTimestamp;
              totalPausedMsRef.current = session.totalPausedMs;
              
              if (session.isPaused && session.pausedTimestamp) {
                pausedTimestampRef.current = session.pausedTimestamp;
              } else {
                pausedTimestampRef.current = null;
              }
              
              // Recalcular tempo
              const tempoAtual = calculateElapsedTime();
              setElapsedTime(tempoAtual);
              
              // Restaurar descanso ativo
              if (session.restStartTimestamp && session.restType) {
                const now = Date.now();
                restStartTimestampRef.current = session.restStartTimestamp;
                const restTime = Math.floor((now - session.restStartTimestamp) / 1000);
                setRestElapsedTime(restTime);
                setIsResting(true);
                setRestType(session.restType);
              }
              
              // Restaurar outros estados
              setTempoDescansoTotal(session.tempoDescansoTotal || 0);
              setTempoPausadoTotal(Math.floor((session.totalPausedMs || 0) / 1000));
            }
          } catch (e) {
            console.error("[useWorkoutTimer] Erro ao restaurar estado:", e);
          }
        }
      }
    };

    // 🔧 Para iOS PWA: usar focus como fallback
    const handleFocus = () => {
      if (treinoId && sessaoId) {
        handleVisibilityChange();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [treinoId, sessaoId, saveToStorage, persistirTempo, calculateElapsedTime]);

  // Iniciar treino
  const iniciar = async () => {
    try {
      // Verifica se o usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error("Você precisa estar logado para iniciar o treino");
        return;
      }

      // Verifica se o usuário autenticado é o dono do treino
      if (user.id !== profileId) {
        toast.error("Você não tem permissão para iniciar este treino");
        return;
      }

      if (!treinoId || !profileId || !personalId) {
        toast.error("Dados inválidos para iniciar o treino");
        return;
      }

      const now = Date.now();
      const inicioDate = new Date();

      const { data, error } = await supabase
        .from("treino_sessoes")
        .insert({
          treino_semanal_id: treinoId,
          profile_id: profileId,
          personal_id: personalId,
          inicio: inicioDate.toISOString(),
          status: "em_andamento",
          duracao_segundos: 0,
          tempo_descanso_total: 0,
          tempo_pausado_total: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao inserir sessão:", error);
        if (error.code === "42501") {
          toast.error("Você não tem permissão para iniciar este treino. Por favor, faça login novamente.");
        } else {
          toast.error("Não foi possível iniciar o treino. Tente novamente.");
        }
        return;
      }

      // 🔧 Configurar timestamps absolutos
      startTimestampRef.current = now;
      pausedTimestampRef.current = null;
      totalPausedMsRef.current = 0;
      
      setSessaoId(data.id);
      isPausedRef.current = false;
      setIsRunning(true);
      setIsPaused(false);
      setElapsedTime(0);
      setDescansos([]);
      setTempoDescansoTotal(0);
      setTempoPausadoTotal(0);
      setInicioTreino(inicioDate);

      // Salvar no localStorage
      const session: StoredSession = {
        sessaoId: data.id,
        treinoId,
        startTimestamp: now,
        isPaused: false,
        totalPausedMs: 0,
        tempoDescansoTotal: 0,
      };
      localStorage.setItem(getStorageKey(treinoId), JSON.stringify(session));

      toast.success("🚀 Treino iniciado! Vamos nessa!");
    } catch (err) {
      console.error("Erro ao iniciar treino:", err);
      toast.error("Erro ao iniciar treino. Verifique sua conexão.");
    }
  };

  // Pausar/Retomar
  const togglePause = async () => {
    if (!sessaoId) {
      toast.error("Nenhum treino ativo");
      return;
    }

    const now = Date.now();
    const vaiPausar = !isPaused;

    // 🔧 Atualizar estado IMEDIATAMENTE (otimista)
    if (vaiPausar) {
      pausedTimestampRef.current = now;
      isPausedRef.current = true;
      setIsPaused(true);
      setIsRunning(false);
    } else {
      const tempoPausado = pausedTimestampRef.current
        ? now - pausedTimestampRef.current
        : 0;
      totalPausedMsRef.current += tempoPausado;
      pausedTimestampRef.current = null;
      isPausedRef.current = false;
      const pausasTotalSegundos = Math.floor(totalPausedMsRef.current / 1000);
      setTempoPausadoTotal(pausasTotalSegundos);
      setIsPaused(false);
      setIsRunning(true);
    }
    saveToStorage();

    if (vaiPausar) {
      toast.info("⏸️ Treino pausado");
    } else {
      toast.info("▶️ Treino retomado!");
    }

    // Persistir no banco (async, sem bloquear UI)
    try {
      if (vaiPausar) {
        await supabase
          .from("treino_sessoes")
          .update({
            status: "pausado",
            duracao_segundos: calculateElapsedTime(),
            pausado_em: new Date(now).toISOString(),
            tempo_descanso_total: tempoDescansoTotal,
          })
          .eq("id", sessaoId);
      } else {
        const pausasTotalSegundos = Math.floor(totalPausedMsRef.current / 1000);
        await supabase
          .from("treino_sessoes")
          .update({
            status: "em_andamento",
            pausado_em: null,
            tempo_pausado_total: pausasTotalSegundos,
          })
          .eq("id", sessaoId);
      }
    } catch (err) {
      console.error("Erro ao persistir pausa/retomada:", err);
      toast.error("Erro ao salvar estado. Tente novamente.");
    }
  };

  // Iniciar descanso
  const iniciarDescanso = async (tipo: "serie" | "exercicio") => {
    if (!sessaoId) {
      toast.error("Nenhum treino ativo");
      return;
    }

    if (isResting) {
      toast.warning("Já existe um descanso em andamento");
      return;
    }

    try {
      const now = Date.now();

      const { data, error } = await supabase
        .from("treino_descansos")
        .insert({
          sessao_id: sessaoId,
          tipo,
          inicio: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      restStartTimestampRef.current = now;
      setIsResting(true);
      setRestType(tipo);
      setRestElapsedTime(0);
      setCurrentRestId(data.id);
      saveToStorage();

      const label = tipo === "serie" ? "séries" : "exercícios";
      toast.info(`☕ Descanso entre ${label} iniciado`);
    } catch (err) {
      console.error("Erro ao iniciar descanso:", err);
      toast.error("Erro ao iniciar descanso");
    }
  };

  // 🔧 Encerrar descanso com cálculo preciso
  const encerrarDescanso = async () => {
    if (!currentRestId || !isResting) {
      return;
    }

    try {
      // 🔧 Calcular duração baseada em timestamp
      const now = Date.now();
      const duracao = restStartTimestampRef.current 
        ? Math.floor((now - restStartTimestampRef.current) / 1000)
        : restElapsedTime;

      const { error } = await supabase
        .from("treino_descansos")
        .update({
          fim: new Date().toISOString(),
          duracao_segundos: duracao,
        })
        .eq("id", currentRestId);

      if (error) throw error;

      // Atualizar lista de descansos
      setDescansos((prev) =>
        prev.map((d) =>
          d.id === currentRestId
            ? { ...d, fim: new Date().toISOString(), duracao_segundos: duracao }
            : d
        )
      );

      // Adicionar ao total de descanso
      const existeNaLista = descansos.some((d) => d.id === currentRestId);
      if (!existeNaLista) {
        setDescansos((prev) => [
          ...prev,
          {
            id: currentRestId,
            tipo: restType!,
            inicio: new Date(restStartTimestampRef.current).toISOString(),
            fim: new Date().toISOString(),
            duracao_segundos: duracao,
          },
        ]);
      }

      const novoTempoDescanso = tempoDescansoTotal + duracao;
      setTempoDescansoTotal(novoTempoDescanso);

      // Atualizar no banco
      await supabase
        .from("treino_sessoes")
        .update({ tempo_descanso_total: novoTempoDescanso })
        .eq("id", sessaoId);

      // Limpar estado de descanso
      setIsResting(false);
      setRestType(null);
      setRestElapsedTime(0);
      setCurrentRestId(null);
      restStartTimestampRef.current = 0;
      saveToStorage();

      toast.success(`✅ Descanso encerrado: ${formatTime(duracao)}`);
    } catch (err) {
      console.error("Erro ao encerrar descanso:", err);
      toast.error("Erro ao encerrar descanso");
    }
  };

  // 🔧 Finalizar treino com cálculo correto de descanso
  const finalizar = async (): Promise<WorkoutCompletionData | null> => {
    if (!sessaoId) {
      toast.error("Nenhuma sessão ativa");
      return null;
    }

    try {
      // 🔧 Encerrar descanso ativo se houver
      if (isResting && currentRestId) {
        await encerrarDescanso();
      }

      // Persistir tempo atual
      await persistirTempo();

      const fimDate = new Date();
      const tempoFinal = calculateElapsedTime();
      const pausasTotalSegundos = Math.floor(totalPausedMsRef.current / 1000);
      
      const { error } = await supabase
        .from("treino_sessoes")
        .update({
          fim: fimDate.toISOString(),
          duracao_segundos: tempoFinal,
          tempo_descanso_total: tempoDescansoTotal,
          tempo_pausado_total: pausasTotalSegundos,
          status: "concluido",
        })
        .eq("id", sessaoId);

      if (error) throw error;

      // 🔧 CORREÇÃO: Marcar treinos_semanais.concluido = true
      await supabase
        .from("treinos_semanais")
        .update({ concluido: true, updated_at: new Date().toISOString() })
        .eq("id", treinoId);

      // Buscar nome do aluno
      const { data: alunoData } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", profileId)
        .single();

      const nomeAluno = alunoData?.nome || "Aluno";

      // 🔧 Buscar descansos do BANCO e calcular tempo total real
      const { data: descansosFinais } = await supabase
        .from("treino_descansos")
        .select("*")
        .eq("sessao_id", sessaoId)
        .order("created_at", { ascending: true });

      // 🔧 Calcular tempo de descanso total do banco (mais confiável)
      let tempoDescansoCalculado = 0;
      if (descansosFinais) {
        for (const d of descansosFinais) {
          if (d.duracao_segundos) {
            tempoDescansoCalculado += d.duracao_segundos;
          } else if (d.inicio && !d.fim) {
            // Descanso não encerrado - calcular tempo em tempo real
            const inicioDescanso = new Date(d.inicio).getTime();
            const duracaoAtual = Math.floor((Date.now() - inicioDescanso) / 1000);
            tempoDescansoCalculado += duracaoAtual;
          }
        }
      }

      // Enviar notificação ao personal
      await supabase.from("notificacoes").insert({
        destinatario_id: personalId,
        tipo: "treino_concluido",
        titulo: "🎉 Treino Concluído",
        mensagem: `${nomeAluno} finalizou o treino em ${formatTime(tempoFinal)} (descanso: ${formatTime(tempoDescansoCalculado)})`,
        dados: {
          sessao_id: sessaoId,
          treino_id: treinoId,
          aluno_nome: nomeAluno,
          aluno_id: profileId,
          duracao_total: tempoFinal,
          duracao_descanso: tempoDescansoCalculado,
          duracao_pausas: pausasTotalSegundos,
          total_descansos: descansosFinais?.length || 0,
          descansos: descansosFinais?.map((d: any) => ({
            tipo: d.tipo,
            duracao: d.duracao_segundos || 0,
          })) || [],
        },
        lida: false,
      });

      // Mensagem customizada do personal (fallback profissional)
      const { data: personalCfg } = await supabase
        .from("personal_settings")
        .select("mensagem_conclusao_treino")
        .eq("personal_id", personalId)
        .maybeSingle();

      const mensagemMotivacional =
        personalCfg?.mensagem_conclusao_treino?.trim() || FRASE_FINAL_PADRAO;

      // Contagem de exercícios (concluídos / total)
      const { data: exerciciosTreino } = await supabase
        .from("exercicios")
        .select("id, concluido")
        .eq("treino_semanal_id", treinoId)
        .is("deleted_at", null);

      const exerciciosTotal = exerciciosTreino?.length || 0;
      const exerciciosConcluidos =
        exerciciosTreino?.filter((e) => e.concluido).length || 0;

      const dadosConclusao: WorkoutCompletionData = {
        tempoTotal: tempoFinal,
        tempoFormatado: formatTime(tempoFinal),
        horaInicio: inicioTreino ? inicioTreino.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        horaFim: fimDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        data: fimDate.toLocaleDateString('pt-BR'),
        tempoDescanso: tempoDescansoCalculado,
        tempoPausas: pausasTotalSegundos,
        totalDescansos: descansosFinais?.length || 0,
        mensagemMotivacional,
        exerciciosConcluidos,
        exerciciosTotal,
      };

      setCompletionData(dadosConclusao);
      setShowCompletionScreen(true);

      // 🔧 FIX: Dispatch centralized events for cross-component sync
      dispatchWorkoutEvent(WORKOUT_EVENTS.COMPLETED, { treinoId, profileId, personalId });
      dispatchWorkoutEvent(WORKOUT_EVENTS.DASHBOARD_REFRESH, { personalId });


      // Limpar estado
      localStorage.removeItem(getStorageKey(treinoId));
      setIsRunning(false);
      setIsPaused(false);
      isPausedRef.current = false;
      setElapsedTime(0);
      setDescansos([]);
      setTempoDescansoTotal(0);
      setTempoPausadoTotal(0);
      startTimestampRef.current = 0;
      pausedTimestampRef.current = null;
      totalPausedMsRef.current = 0;

      return dadosConclusao;
    } catch (err) {
      console.error("Erro ao finalizar treino:", err);
      toast.error("Erro ao finalizar treino");
      return null;
    }
  };

  // Fechar tela de conclusão
  const fecharTelaConclusao = () => {
    setShowCompletionScreen(false);
    setCompletionData(null);
  };

  // Cancelar treino
  const cancelar = async () => {
    if (!sessaoId) {
      toast.error("Nenhuma sessão ativa");
      return;
    }

    try {
      const { error } = await supabase
        .from("treino_sessoes")
        .update({ status: "cancelado" })
        .eq("id", sessaoId);

      if (error) throw error;

      localStorage.removeItem(getStorageKey(treinoId));
      setIsRunning(false);
      setIsPaused(false);
      isPausedRef.current = false;
      setElapsedTime(0);
      setSessaoId(null);
      setDescansos([]);
      setTempoDescansoTotal(0);
      setTempoPausadoTotal(0);
      setRestElapsedTime(0);
      setInicioTreino(null);
      startTimestampRef.current = 0;
      pausedTimestampRef.current = null;
      totalPausedMsRef.current = 0;
      restStartTimestampRef.current = 0;

      toast.info("Treino cancelado");
    } catch (err) {
      console.error("Erro ao cancelar treino:", err);
      toast.error("Erro ao cancelar treino");
    }
  };

  // Formatar tempo
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Formatar tempo curto (para exibição compacta)
  const formatTimeShort = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  return {
    // Estados
    isRunning,
    isPaused,
    isResting,
    isLoading,
    elapsedTime,
    restElapsedTime,
    restType,
    descansos,
    tempoDescansoTotal,
    tempoPausadoTotal,
    sessaoId,
    showCompletionScreen,
    completionData,
    
    // Formatados
    formattedTime: formatTime(elapsedTime),
    formattedRestTime: formatTime(restElapsedTime),
    formattedDescansoTotal: formatTime(tempoDescansoTotal),
    
    // Ações
    iniciar,
    togglePause,
    finalizar,
    cancelar,
    iniciarDescanso,
    encerrarDescanso,
    fecharTelaConclusao,
    
    // Utils
    formatTime,
    formatTimeShort,
  };
}
