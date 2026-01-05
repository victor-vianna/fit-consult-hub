// src/hooks/useWorkoutTimer.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "workout_timer_session";
const PERSIST_INTERVAL = 5000; // 5 segundos

interface StoredSession {
  sessaoId: string;
  startTime: number;
  elapsedTime: number;
  isPaused: boolean;
  pausedAt?: number;
  tempoDescansoTotal: number;
  tempoPausadoTotal: number;
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

  // Descansos
  const [isResting, setIsResting] = useState(false);
  const [restType, setRestType] = useState<"serie" | "exercicio" | null>(null);
  const [restElapsedTime, setRestElapsedTime] = useState(0);
  const [currentRestId, setCurrentRestId] = useState<string | null>(null);
  const [descansos, setDescansos] = useState<Descanso[]>([]);
  const [tempoDescansoTotal, setTempoDescansoTotal] = useState(0);
  const [tempoPausadoTotal, setTempoPausadoTotal] = useState(0);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const restIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const persistIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef<number>(0);
  const restElapsedRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const restStartTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);

  // Atualiza refs
  useEffect(() => {
    elapsedRef.current = elapsedTime;
  }, [elapsedTime]);

  useEffect(() => {
    restElapsedRef.current = restElapsedTime;
  }, [restElapsedTime]);

  // Salvar no localStorage
  const saveToStorage = useCallback(() => {
    if (sessaoId) {
      const session: StoredSession = {
        sessaoId,
        startTime: startTimeRef.current,
        elapsedTime: elapsedRef.current,
        isPaused,
        pausedAt: pausedAtRef.current || undefined,
        tempoDescansoTotal,
        tempoPausadoTotal,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [sessaoId, isPaused, tempoDescansoTotal, tempoPausadoTotal]);

  // Persistir no banco
  const persistirTempo = useCallback(async () => {
    if (!sessaoId) return;
    try {
      await supabase
        .from("treino_sessoes")
        .update({
          duracao_segundos: elapsedRef.current,
          tempo_descanso_total: tempoDescansoTotal,
          tempo_pausado_total: tempoPausadoTotal,
        })
        .eq("id", sessaoId);

      saveToStorage();
    } catch (err) {
      console.error("Erro ao persistir tempo:", err);
    }
  }, [sessaoId, tempoDescansoTotal, tempoPausadoTotal, saveToStorage]);

  // Restaurar sessão ativa ao montar
  useEffect(() => {
    const restaurarSessao = async () => {
      if (!profileId || !treinoId) {
        setIsLoading(false);
        return;
      }

      try {
        // Primeiro tenta restaurar do localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
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
            // Calcular tempo decorrido desde o início
            const now = Date.now();
            let tempoCalculado = session.elapsedTime;

            if (!session.isPaused && session.startTime) {
              // Se estava rodando, calcular tempo adicional
              const tempoAdicional = Math.floor((now - session.startTime) / 1000) - session.elapsedTime;
              tempoCalculado = session.elapsedTime + Math.max(0, tempoAdicional);
            }

            setSessaoId(session.sessaoId);
            setElapsedTime(tempoCalculado);
            elapsedRef.current = tempoCalculado;
            startTimeRef.current = session.startTime;
            setIsRunning(!session.isPaused);
            setIsPaused(session.isPaused);
            setTempoDescansoTotal(session.tempoDescansoTotal);
            setTempoPausadoTotal(session.tempoPausadoTotal);

            if (session.isPaused && session.pausedAt) {
              pausedAtRef.current = session.pausedAt;
            }

            // Carregar descansos da sessão
            const { data: descansosDB } = await supabase
              .from("treino_descansos")
              .select("*")
              .eq("sessao_id", session.sessaoId)
              .order("created_at", { ascending: true });

            if (descansosDB) {
              setDescansos(descansosDB as Descanso[]);
              
              // Verificar se há descanso em andamento
              const descansoAtivo = descansosDB.find((d: any) => !d.fim);
              if (descansoAtivo) {
                setIsResting(true);
                setRestType(descansoAtivo.tipo as "serie" | "exercicio");
                setCurrentRestId(descansoAtivo.id);
                
                // Calcular tempo de descanso em andamento
                const inicioDescanso = new Date(descansoAtivo.inicio).getTime();
                const restTime = Math.floor((now - inicioDescanso) / 1000);
                setRestElapsedTime(restTime);
                restElapsedRef.current = restTime;
                restStartTimeRef.current = inicioDescanso;
              }
            }

            sessaoRestaurada = true;
          } else {
            // Sessão não existe mais no banco, limpar localStorage
            localStorage.removeItem(STORAGE_KEY);
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
            
            let tempoCalculado = sessaoAtiva.duracao_segundos || 0;
            
            if (sessaoAtiva.status === "em_andamento" && !sessaoAtiva.pausado_em) {
              // Calcular tempo desde o início menos pausas
              const tempoTotal = Math.floor((now - inicio) / 1000);
              tempoCalculado = tempoTotal - (sessaoAtiva.tempo_pausado_total || 0);
            }

            setSessaoId(sessaoAtiva.id);
            setElapsedTime(tempoCalculado);
            elapsedRef.current = tempoCalculado;
            startTimeRef.current = inicio;
            setIsRunning(sessaoAtiva.status === "em_andamento");
            setIsPaused(sessaoAtiva.status === "pausado");
            setTempoDescansoTotal(sessaoAtiva.tempo_descanso_total || 0);
            setTempoPausadoTotal(sessaoAtiva.tempo_pausado_total || 0);

            if (sessaoAtiva.pausado_em) {
              pausedAtRef.current = new Date(sessaoAtiva.pausado_em).getTime();
            }

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
                setIsResting(true);
                setRestType(descansoAtivo.tipo as "serie" | "exercicio");
                setCurrentRestId(descansoAtivo.id);
                
                const inicioDescanso = new Date(descansoAtivo.inicio).getTime();
                const restTime = Math.floor((now - inicioDescanso) / 1000);
                setRestElapsedTime(restTime);
                restElapsedRef.current = restTime;
                restStartTimeRef.current = inicioDescanso;
              }
            }

            // Salvar no localStorage para próxima restauração
            saveToStorage();
          }
        }
      } catch (err) {
        console.error("Erro ao restaurar sessão:", err);
      } finally {
        setIsLoading(false);
      }
    };

    restaurarSessao();
  }, [profileId, treinoId, saveToStorage]);

  // Timer principal
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
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
  }, [isRunning, isPaused]);

  // Timer de descanso
  useEffect(() => {
    if (isResting) {
      restIntervalRef.current = setInterval(() => {
        setRestElapsedTime((prev) => prev + 1);
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

  // Salvar ao fechar página
  useEffect(() => {
    const handleUnload = () => {
      saveToStorage();
      persistirTempo();
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [saveToStorage, persistirTempo]);

  // Visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveToStorage();
        persistirTempo();
      } else if (document.visibilityState === "visible" && sessaoId) {
        // Recalcular tempo ao voltar
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session: StoredSession = JSON.parse(stored);
          if (session.sessaoId === sessaoId && !session.isPaused) {
            const now = Date.now();
            const tempoDecorrido = Math.floor((now - session.startTime) / 1000);
            setElapsedTime(tempoDecorrido);
            elapsedRef.current = tempoDecorrido;
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [sessaoId, saveToStorage, persistirTempo]);

  // Iniciar treino
  const iniciar = async () => {
    try {
      if (!treinoId || !profileId || !personalId) {
        toast.error("Dados inválidos para iniciar o treino");
        return;
      }

      const now = Date.now();

      const { data, error } = await supabase
        .from("treino_sessoes")
        .insert({
          treino_semanal_id: treinoId,
          profile_id: profileId,
          personal_id: personalId,
          inicio: new Date().toISOString(),
          status: "em_andamento",
          duracao_segundos: 0,
          tempo_descanso_total: 0,
          tempo_pausado_total: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setSessaoId(data.id);
      setIsRunning(true);
      setIsPaused(false);
      setElapsedTime(0);
      elapsedRef.current = 0;
      startTimeRef.current = now;
      setDescansos([]);
      setTempoDescansoTotal(0);
      setTempoPausadoTotal(0);

      // Salvar no localStorage
      const session: StoredSession = {
        sessaoId: data.id,
        startTime: now,
        elapsedTime: 0,
        isPaused: false,
        tempoDescansoTotal: 0,
        tempoPausadoTotal: 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

      toast.success("Treino iniciado!");
    } catch (err) {
      console.error("Erro ao iniciar treino:", err);
      toast.error("Erro ao iniciar treino");
    }
  };

  // Pausar/Retomar
  const togglePause = async () => {
    if (!sessaoId) {
      toast.error("Nenhum treino ativo");
      return;
    }

    try {
      const now = Date.now();
      const novoStatus = !isPaused;

      if (novoStatus) {
        // Pausando
        pausedAtRef.current = now;
        
        await supabase
          .from("treino_sessoes")
          .update({
            status: "pausado",
            duracao_segundos: elapsedRef.current,
            pausado_em: new Date().toISOString(),
            tempo_descanso_total: tempoDescansoTotal,
          })
          .eq("id", sessaoId);

        setIsPaused(true);
        setIsRunning(false);
        toast.info("Treino pausado");
      } else {
        // Retomando
        const tempoPausado = pausedAtRef.current 
          ? Math.floor((now - pausedAtRef.current) / 1000) 
          : 0;
        
        const novoTempoPausado = tempoPausadoTotal + tempoPausado;
        setTempoPausadoTotal(novoTempoPausado);
        pausedAtRef.current = null;

        await supabase
          .from("treino_sessoes")
          .update({
            status: "em_andamento",
            pausado_em: null,
            tempo_pausado_total: novoTempoPausado,
          })
          .eq("id", sessaoId);

        setIsPaused(false);
        setIsRunning(true);
        toast.info("Treino retomado");
      }

      saveToStorage();
    } catch (err) {
      console.error("Erro ao pausar/retomar:", err);
      toast.error("Erro ao pausar/retomar treino");
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

      setIsResting(true);
      setRestType(tipo);
      setRestElapsedTime(0);
      restElapsedRef.current = 0;
      restStartTimeRef.current = now;
      setCurrentRestId(data.id);

      const label = tipo === "serie" ? "séries" : "exercícios";
      toast.info(`Descanso entre ${label} iniciado`);
    } catch (err) {
      console.error("Erro ao iniciar descanso:", err);
      toast.error("Erro ao iniciar descanso");
    }
  };

  // Encerrar descanso
  const encerrarDescanso = async () => {
    if (!currentRestId || !isResting) {
      return;
    }

    try {
      const duracao = restElapsedRef.current;

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

      // Adicionar ao total de descanso se não existir na lista
      const existeNaLista = descansos.some((d) => d.id === currentRestId);
      if (!existeNaLista) {
        setDescansos((prev) => [
          ...prev,
          {
            id: currentRestId,
            tipo: restType!,
            inicio: new Date(restStartTimeRef.current).toISOString(),
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

      setIsResting(false);
      setRestType(null);
      setRestElapsedTime(0);
      setCurrentRestId(null);

      toast.success(`Descanso encerrado: ${formatTime(duracao)}`);
    } catch (err) {
      console.error("Erro ao encerrar descanso:", err);
      toast.error("Erro ao encerrar descanso");
    }
  };

  // Finalizar treino
  const finalizar = async () => {
    if (!sessaoId) {
      toast.error("Nenhuma sessão ativa");
      return;
    }

    try {
      // Encerrar descanso se houver
      if (isResting) {
        await encerrarDescanso();
      }

      await persistirTempo();

      const { error } = await supabase
        .from("treino_sessoes")
        .update({
          fim: new Date().toISOString(),
          duracao_segundos: elapsedRef.current,
          tempo_descanso_total: tempoDescansoTotal,
          tempo_pausado_total: tempoPausadoTotal,
          status: "concluido",
        })
        .eq("id", sessaoId);

      if (error) throw error;

      // Buscar descansos para notificação
      const { data: descansosFinais } = await supabase
        .from("treino_descansos")
        .select("*")
        .eq("sessao_id", sessaoId)
        .order("created_at", { ascending: true });

      // Enviar notificação ao personal
      await supabase.from("notificacoes").insert({
        destinatario_id: personalId,
        tipo: "treino_concluido",
        titulo: "Treino Concluído",
        mensagem: `Aluno finalizou o treino em ${formatTime(elapsedRef.current)} (descanso: ${formatTime(tempoDescansoTotal)})`,
        dados: {
          sessao_id: sessaoId,
          treino_id: treinoId,
          duracao_total: elapsedRef.current,
          duracao_descanso: tempoDescansoTotal,
          duracao_pausas: tempoPausadoTotal,
          total_descansos: descansosFinais?.length || 0,
          descansos: descansosFinais?.map((d: any) => ({
            tipo: d.tipo,
            duracao: d.duracao_segundos,
          })) || [],
        },
        lida: false,
      });

      // Limpar estado
      localStorage.removeItem(STORAGE_KEY);
      setIsRunning(false);
      setIsPaused(false);
      setSessaoId(null);
      setElapsedTime(0);
      setDescansos([]);
      setTempoDescansoTotal(0);
      setTempoPausadoTotal(0);

      toast.success(`Treino finalizado! Duração: ${formatTime(elapsedRef.current)}`);
    } catch (err) {
      console.error("Erro ao finalizar treino:", err);
      toast.error("Erro ao finalizar treino");
    }
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

      localStorage.removeItem(STORAGE_KEY);
      setIsRunning(false);
      setIsPaused(false);
      setIsResting(false);
      setElapsedTime(0);
      setSessaoId(null);
      setDescansos([]);
      setTempoDescansoTotal(0);
      setTempoPausadoTotal(0);
      setRestElapsedTime(0);

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
    
    // Utils
    formatTime,
  };
}
