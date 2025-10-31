// hooks/useNotificacoes.ts
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  dados: any;
  lida: boolean;
  created_at: string;
}

export function useNotificacoes(userId: string) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ Carregar notificações do banco
  const carregarNotificacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("destinatario_id", userId)
        .order("created_at", { ascending: false })
        .limit(50); // Últimas 50 notificações

      if (error) throw error;

      setNotificacoes(data || []);
      setNaoLidas(data?.filter((n) => !n.lida).length || 0);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Marcar notificação como lida
  const marcarComoLida = async (notificacaoId: string) => {
    try {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("id", notificacaoId);

      if (error) throw error;

      // Atualizar estado local
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === notificacaoId ? { ...n, lida: true } : n))
      );
      setNaoLidas((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  // ✅ Marcar todas como lidas
  const marcarTodasComoLidas = async () => {
    try {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("destinatario_id", userId)
        .eq("lida", false);

      if (error) throw error;

      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      setNaoLidas(0);
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  // ✅ Deletar notificação
  const deletarNotificacao = async (notificacaoId: string) => {
    try {
      const { error } = await supabase
        .from("notificacoes")
        .delete()
        .eq("id", notificacaoId);

      if (error) throw error;

      setNotificacoes((prev) => prev.filter((n) => n.id !== notificacaoId));
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
    }
  };

  // ✅ Configurar realtime para receber notificações instantâneas
  useEffect(() => {
    carregarNotificacoes();

    // Criar canal de realtime
    const channel: RealtimeChannel = supabase
      .channel(`notificacoes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT", // Escutar apenas inserções
          schema: "public",
          table: "notificacoes",
          filter: `destinatario_id=eq.${userId}`,
        },
        (payload) => {
          // ✅ Nova notificação recebida!
          const novaNotificacao = payload.new as Notificacao;

          // Adicionar ao início da lista
          setNotificacoes((prev) => [novaNotificacao, ...prev]);
          setNaoLidas((prev) => prev + 1);

          // Mostrar toast
          toast.info(novaNotificacao.titulo, {
            description: novaNotificacao.mensagem,
          });

          // Tocar som (opcional)
          playNotificationSound();
        }
      )
      .subscribe();

    // Cleanup: desinscrever ao desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
    recarregar: carregarNotificacoes,
  };
}

// ✅ Função helper para tocar som
function playNotificationSound() {
  const audio = new Audio("/notification.mp3");
  audio.volume = 0.5;
  audio.play().catch(() => {
    // Ignorar erro se navegador bloquear autoplay
  });
}
