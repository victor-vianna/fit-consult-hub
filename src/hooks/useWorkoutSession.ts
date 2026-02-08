// hooks/useWorkoutSession.ts
// Hook para gerenciar persistência de sessão de treino no PWA
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [sessoesAtivas, setSessoesAtivas] = useState<Record<string, boolean>>({});
  const [treinosIniciados, setTreinosIniciados] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

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
        const diasIniciados: Record<number, boolean> = {};
        
        Object.values(states).forEach(state => {
          if (state.iniciado) {
            diasIniciados[state.dia] = true;
          }
        });
        
        setTreinosIniciados(diasIniciados);
      }

      // 2. Buscar sessões ativas no banco (em_andamento ou pausado)
      const { data: sessoesDB } = await supabase
        .from("treino_sessoes")
        .select("id, treino_semanal_id, status")
        .eq("profile_id", profileId)
        .in("status", ["em_andamento", "pausado"]);

      if (sessoesDB && sessoesDB.length > 0) {
        const ativas: Record<string, boolean> = {};
        sessoesDB.forEach(sessao => {
          ativas[sessao.treino_semanal_id] = true;
        });
        setSessoesAtivas(ativas);

        // Sincronizar com treinosIniciados
        const treinoIds = sessoesDB.map(s => s.treino_semanal_id);
        const { data: treinosData } = await supabase
          .from("treinos_semanais")
          .select("id, dia_semana")
          .in("id", treinoIds);

        if (treinosData) {
          const diasAtivos: Record<number, boolean> = {};
          treinosData.forEach(treino => {
            diasAtivos[treino.dia_semana] = true;
          });
          setTreinosIniciados(prev => ({ ...prev, ...diasAtivos }));
          
          // Atualizar localStorage com dados do banco
          const storedStates = localStorage.getItem(WORKOUT_STATE_KEY);
          const states: StoredWorkoutStates = storedStates ? JSON.parse(storedStates) : {};
          
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
        // Não há sessões ativas no banco - limpar localStorage de treinos não ativos
        const storedStates = localStorage.getItem(WORKOUT_STATE_KEY);
        if (storedStates) {
          const states: StoredWorkoutStates = JSON.parse(storedStates);
          const treinoIds = Object.keys(states);
          
          // Verificar quais realmente não existem mais
          if (treinoIds.length > 0) {
            const { data: verificar } = await supabase
              .from("treino_sessoes")
              .select("treino_semanal_id")
              .eq("profile_id", profileId)
              .in("treino_semanal_id", treinoIds)
              .in("status", ["em_andamento", "pausado"]);
              
            const ativosNoBanco = new Set(verificar?.map(s => s.treino_semanal_id) || []);
            
            // Remover estados de treinos que não estão mais ativos
            let atualizado = false;
            Object.keys(states).forEach(treinoId => {
              if (!ativosNoBanco.has(treinoId)) {
                delete states[treinoId];
                atualizado = true;
              }
            });
            
            if (atualizado) {
              localStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(states));
              
              // Atualizar state local
              const diasIniciados: Record<number, boolean> = {};
              Object.values(states).forEach(state => {
                if (state.iniciado) {
                  diasIniciados[state.dia] = true;
                }
              });
              setTreinosIniciados(diasIniciados);
            }
          }
        }
      }
    } catch (error) {
      console.error("[useWorkoutSession] Erro ao carregar estado:", error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  // 🔧 Carregar estado ao montar e quando voltar do background
  useEffect(() => {
    carregarEstado();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // 🔧 Refetch ao voltar - sincronizar com banco
        carregarEstado();
      }
    };

    // 🔧 iOS PWA: usar focus como fallback
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
        states[treinoId] = {
          treinoId,
          dia,
          iniciado,
          timestamp: Date.now(),
        };
      } else {
        delete states[treinoId];
      }
      
      localStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(states));
    } catch (error) {
      console.error("[useWorkoutSession] Erro ao persistir estado:", error);
    }
  }, []);

  // Marcar treino como iniciado
  const marcarTreinoIniciado = useCallback((treinoId: string, dia: number) => {
    setTreinosIniciados(prev => ({ ...prev, [dia]: true }));
    setSessoesAtivas(prev => ({ ...prev, [treinoId]: true }));
    persistirEstado(treinoId, dia, true);
  }, [persistirEstado]);

  // Marcar treino como finalizado/cancelado
  const marcarTreinoFinalizado = useCallback((treinoId: string, dia: number) => {
    setTreinosIniciados(prev => {
      const next = { ...prev };
      delete next[dia];
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

    // Depois verifica no banco
    try {
      const { data } = await supabase
        .from("treino_sessoes")
        .select("id")
        .eq("treino_semanal_id", treinoId)
        .in("status", ["em_andamento", "pausado"])
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

  // Limpar estados antigos ao montar
  useEffect(() => {
    limparEstadosAntigos();
  }, [limparEstadosAntigos]);

  return {
    treinosIniciados,
    sessoesAtivas,
    isLoading,
    marcarTreinoIniciado,
    marcarTreinoFinalizado,
    verificarSessaoAtiva,
  };
}
