// src/hooks/useWorkoutTimer.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseWorkoutTimerProps {
  treinoId: string; // ID do treino semanal
  profileId: string; // ID do aluno
  personalId: string; // ID do personal
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

  // Refs para controle de estado no intervalo
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPersistRef = useRef<number>(0); // Último tempo salvo no banco
  const elapsedRef = useRef<number>(0); // Tempo mais recente sem depender de re-render

  // Atualiza a ref sempre que elapsedTime muda
  useEffect(() => {
    elapsedRef.current = elapsedTime;
  }, [elapsedTime]);

  // ✅ Persistir tempo no banco (manual ou periódico)
  const persistirTempo = useCallback(async () => {
    if (!sessaoId) return;
    try {
      const { error } = await supabase
        .from("treino_sessoes")
        .update({
          duracao_segundos: elapsedRef.current,
        })
        .eq("id", sessaoId);

      if (error) throw error;
      lastPersistRef.current = elapsedRef.current;
    } catch (err) {
      console.error("Erro ao persistir tempo:", err);
    }
  }, [sessaoId]);

  // ✅ Efeito principal do timer
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const novo = prev + 1;

          // Salva no banco a cada 10 segundos
          if (novo - lastPersistRef.current >= 10) {
            persistirTempo();
          }

          return novo;
        });
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
  }, [isRunning, isPaused, persistirTempo]);

  // ✅ Salvar o tempo ao fechar/atualizar a página
  useEffect(() => {
    const handleUnload = () => {
      persistirTempo();
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [persistirTempo]);

  // ✅ Iniciar treino
  const iniciar = async () => {
    try {
      if (!treinoId || !profileId || !personalId) {
        toast.error("Dados inválidos para iniciar o treino");
        return;
      }

      // Cria nova sessão de treino
      const { data, error } = await supabase
        .from("treino_sessoes")
        .insert({
          treino_semanal_id: treinoId,
          profile_id: profileId,
          personal_id: personalId,
          inicio: new Date().toISOString(),
          status: "em_andamento",
          duracao_segundos: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setSessaoId(data.id);
      setIsRunning(true);
      setIsPaused(false);
      setElapsedTime(0);
      lastPersistRef.current = 0;

      toast.success("🏋️‍♂️ Treino iniciado com sucesso!");
    } catch (err) {
      console.error("Erro ao iniciar treino:", err);
      toast.error("Erro ao iniciar treino");
    }
  };

  // ✅ Alternar pausa/retomar
  const togglePause = async () => {
    if (!sessaoId) {
      toast.error("Nenhum treino ativo para pausar/retomar");
      return;
    }

    try {
      const novoStatus = !isPaused;
      setIsPaused(novoStatus);
      setIsRunning(!novoStatus);

      const { error } = await supabase
        .from("treino_sessoes")
        .update({
          status: novoStatus ? "pausado" : "em_andamento",
          duracao_segundos: elapsedRef.current,
        })
        .eq("id", sessaoId);

      if (error) throw error;

      toast.info(novoStatus ? "⏸️ Treino pausado" : "▶️ Treino retomado");
    } catch (err) {
      console.error("Erro ao alternar pausa:", err);
      toast.error("Erro ao pausar/retomar treino");
    }
  };

  // ✅ Finalizar treino
  const finalizar = async () => {
    if (!sessaoId) {
      toast.error("Nenhuma sessão ativa para finalizar");
      return;
    }

    try {
      // Persiste o tempo final antes de concluir
      await persistirTempo();

      const { error } = await supabase
        .from("treino_sessoes")
        .update({
          fim: new Date().toISOString(),
          duracao_segundos: elapsedRef.current,
          status: "concluido",
        })
        .eq("id", sessaoId);

      if (error) throw error;

      // Envia notificação ao personal
      await supabase.from("notificacoes").insert({
        destinatario_id: personalId,
        tipo: "treino_concluido",
        titulo: "🎉 Treino Concluído",
        mensagem: `Seu aluno finalizou o treino em ${formatTime(
          elapsedRef.current
        )}.`,
        dados: {
          sessao_id: sessaoId,
          treino_id: treinoId,
          duracao: elapsedRef.current,
        },
        lida: false,
      });

      setIsRunning(false);
      setIsPaused(false);
      setSessaoId(null);

      toast.success(
        `Treino finalizado! Duração: ${formatTime(elapsedRef.current)} 🎉`
      );
    } catch (err) {
      console.error("Erro ao finalizar treino:", err);
      toast.error("Erro ao finalizar treino");
    }
  };

  // ✅ Cancelar treino
  const cancelar = async () => {
    if (!sessaoId) {
      toast.error("Nenhuma sessão ativa para cancelar");
      return;
    }

    try {
      await persistirTempo();

      const { error } = await supabase
        .from("treino_sessoes")
        .update({ status: "cancelado" })
        .eq("id", sessaoId);

      if (error) throw error;

      setIsRunning(false);
      setIsPaused(false);
      setElapsedTime(0);
      setSessaoId(null);
      lastPersistRef.current = 0;

      toast.info("❌ Treino cancelado");
    } catch (err) {
      console.error("Erro ao cancelar treino:", err);
      toast.error("Erro ao cancelar treino");
    }
  };

  // ✅ Formatar tempo em HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    isRunning,
    isPaused,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    iniciar,
    togglePause,
    finalizar,
    cancelar,
  };
}
