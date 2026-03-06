// hooks/useWorkoutSession.ts
// Hook para gerenciar persistência de sessão de treino no PWA
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_SESSION_STATUSES } from "@/constants/workoutStatus";

const WORKOUT_STATE_KEY = "pwa_workout_state";

interface WorkoutState {
  treinoId: string;
  dia: number;
  iniciado: boolean;
  timestamp: number;
}

interface StoredWorkoutStates {
  [treinoId: string]: WorkoutState;
}

export function useWorkoutSession(profileId: string, personalId: string) {
  // 🔧 FIX: Track by treinoId (not day) to support multiple workouts per day
  const [sessoesAtivas, setSessoesAtivas] = useState<Record<string, boolean>>({});
  const [treinosIniciados, setTreinosIniciados] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 🔧 Carregar estado do banco e localStorage
  const carregarEstado = useCallback(async () => {
    if (!profileId) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Carregar estados do localStorage
      const storedStates = localStorage.getItem(WORKOUT_STATE_KEY);
      if (storedStates) {
        const states: StoredWorkoutStates = JSON.parse(storedStates);
        const iniciadosPorTreino: Record<string, boolean> = {};
        
        Object.values(states).forEach(state => {
          if (state.iniciado) {
            iniciadosPorTreino[state.treinoId] = true;
          }
        });
        
        if (mountedRef.current) setTreinosIniciados(iniciadosPorTreino);
      }

      // 2. Buscar sessões ativas no banco (em_andamento ou pausado)
      const { data: sessoesDB } = await supabase
        .from("treino_sessoes")
        .select("id, treino_semanal_id, status")
        .eq("profile_id", profileId)
        .in("status", ACTIVE_SESSION_STATUSES as unknown as string[]);

      if (!mountedRef.current) return;

      if (sessoesDB && sessoesDB.length > 0) {
        const ativas: Record<string, boolean> = {};
        const iniciadosPorTreino: Record<string, boolean> = {};
        
        sessoesDB.forEach(sessao => {
          ativas[sessao.treino_semanal_id] = true;
          iniciadosPorTreino[sessao.treino_semanal_id] = true;
        });
        
        setSessoesAtivas(ativas);
        setTreinosIniciados(prev => ({ ...prev, ...iniciadosPorTreino }));
        
        // Atualizar localStorage com dados do banco
        const currentStored = localStorage.getItem(WORKOUT_STATE_KEY);
        const states: StoredWorkoutStates = currentStored ? JSON.parse(currentStored) : {};
        
        // Fetch dia_semana for these treinos
        const treinoIds = sessoesDB.map(s => s.treino_semanal_id);
        const { data: treinosData } = await supabase
          .from("treinos_semanais")
          .select("id, dia_semana")
          .in("id", treinoIds);

        if (treinosData) {
          treinosData.forEach(treino => {
            states[treino.id] = {
              treinoId: treino.id,
              dia: treino.dia_semana,
              iniciado: true,
              timestamp: Date.now(),
            };
          });
          localStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(states));
        }
      } else {
        // Não há sessões ativas no banco - limpar localStorage
        const currentStored = localStorage.getItem(WORKOUT_STATE_KEY);
        if (currentStored) {
          const states: StoredWorkoutStates = JSON.parse(currentStored);
          const treinoIds = Object.keys(states);
          
          if (treinoIds.length > 0) {
            const { data: verificar } = await supabase
              .from("treino_sessoes")
              .select("treino_semanal_id")
              .eq("profile_id", profileId)
              .in("treino_semanal_id", treinoIds)
              .in("status", ACTIVE_SESSION_STATUSES as unknown as string[]);
              
            const ativosNoBanco = new Set(verificar?.map(s => s.treino_semanal_id) || []);
            
            let atualizado = false;
            Object.keys(states).forEach(treinoId => {
              if (!ativosNoBanco.has(treinoId)) {
                delete states[treinoId];
                atualizado = true;
              }
            });
            
            if (atualizado) {
              localStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(states));
              
              if (mountedRef.current) {
                const iniciadosPorTreino: Record<string, boolean> = {};
                Object.values(states).forEach(state => {
                  if (state.iniciado) {
                    iniciadosPorTreino[state.treinoId] = true;
                  }
                });
                setTreinosIniciados(iniciadosPorTreino);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[useWorkoutSession] Erro ao carregar estado:", error);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [profileId]);

  // 🔧 Carregar estado ao montar e quando voltar do background
  useEffect(() => {
    carregarEstado();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        carregarEstado();
      }
    };

    const handleFocus = () => {
      carregarEstado();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [carregarEstado]);

  // Persistir estado no localStorage
  const persistirEstado = useCallback((treinoId: string, dia: number, iniciado: boolean) => {
    try {
      const storedStates = localStorage.getItem(WORKOUT_STATE_KEY);
      const states: StoredWorkoutStates = storedStates ? JSON.parse(storedStates) : {};
      
      if (iniciado) {
        states[treinoId] = { treinoId, dia, iniciado, timestamp: Date.now() };
      } else {
        delete states[treinoId];
      }
      
      localStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(states));
    } catch (error) {
      console.error("[useWorkoutSession] Erro ao persistir estado:", error);
    }
  }, []);

  // 🔧 FIX: marcarTreinoIniciado tracks by treinoId
  const marcarTreinoIniciado = useCallback((treinoId: string, dia: number) => {
    setTreinosIniciados(prev => ({ ...prev, [treinoId]: true }));
    setSessoesAtivas(prev => ({ ...prev, [treinoId]: true }));
    persistirEstado(treinoId, dia, true);
  }, [persistirEstado]);

  // 🔧 FIX: marcarTreinoFinalizado tracks by treinoId
  const marcarTreinoFinalizado = useCallback((treinoId: string, dia: number) => {
    setTreinosIniciados(prev => {
      const next = { ...prev };
      delete next[treinoId];
      return next;
    });
    setSessoesAtivas(prev => {
      const next = { ...prev };
      delete next[treinoId];
      return next;
    });
    persistirEstado(treinoId, dia, false);
  }, [persistirEstado]);

  // Verificar se um treino específico tem sessão ativa
  const verificarSessaoAtiva = useCallback(async (treinoId: string): Promise<boolean> => {
    if (!treinoId) return false;
    
    // Primeiro verifica cache local
    if (sessoesAtivas[treinoId]) return true;

    try {
      const { data } = await supabase
        .from("treino_sessoes")
        .select("id")
        .eq("treino_semanal_id", treinoId)
        .in("status", ACTIVE_SESSION_STATUSES as unknown as string[])
        .limit(1)
        .maybeSingle();

      return !!data;
    } catch {
      return false;
    }
  }, [sessoesAtivas]);

  // Limpar estados antigos (mais de 24h)
  const limparEstadosAntigos = useCallback(() => {
    try {
      const storedStates = localStorage.getItem(WORKOUT_STATE_KEY);
      if (!storedStates) return;
      
      const states: StoredWorkoutStates = JSON.parse(storedStates);
      const agora = Date.now();
      const umDia = 24 * 60 * 60 * 1000;
      
      let atualizado = false;
      Object.keys(states).forEach(treinoId => {
        if (agora - states[treinoId].timestamp > umDia) {
          delete states[treinoId];
          atualizado = true;
        }
      });
      
      if (atualizado) {
        localStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(states));
      }
    } catch (error) {
      console.error("[useWorkoutSession] Erro ao limpar estados antigos:", error);
    }
  }, []);

  useEffect(() => {
    limparEstadosAntigos();
  }, [limparEstadosAntigos]);

  // 🔧 COMPAT: Helper to check by treinoId (primary) or day (legacy fallback)
  const isTreinoIniciado = useCallback((treinoId: string | null): boolean => {
    if (!treinoId) return false;
    return !!treinosIniciados[treinoId];
  }, [treinosIniciados]);

  return {
    treinosIniciados,
    sessoesAtivas,
    isLoading,
    marcarTreinoIniciado,
    marcarTreinoFinalizado,
    verificarSessaoAtiva,
    isTreinoIniciado,
  };
}
