import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  conversa_key: string;
  remetente_id: string;
  destinatario_id: string;
  conteudo: string;
  tipo: string;
  lida: boolean;
  created_at: string;
}

interface UseChatMessagesProps {
  personalId: string;
  alunoId: string;
  currentUserId: string;
}

export function useChatMessages({ personalId, alunoId, currentUserId }: UseChatMessagesProps) {
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const conversaKey = `${personalId}::${alunoId}`;

  // Carregar mensagens
  const fetchMensagens = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mensagens_chat")
      .select("*")
      .eq("conversa_key", conversaKey)
      .order("created_at", { ascending: true })
      .limit(200);

    if (!error && data) {
      setMensagens(data as ChatMessage[]);
    }
    setLoading(false);
  }, [conversaKey]);

  // Contar não lidas
  const fetchNaoLidas = useCallback(async () => {
    const { count } = await supabase
      .from("mensagens_chat")
      .select("*", { count: "exact", head: true })
      .eq("conversa_key", conversaKey)
      .eq("destinatario_id", currentUserId)
      .eq("lida", false);

    setNaoLidas(count || 0);
  }, [conversaKey, currentUserId]);

  // Marcar como lidas
  const marcarComoLidas = useCallback(async () => {
    await supabase
      .from("mensagens_chat")
      .update({ lida: true })
      .eq("conversa_key", conversaKey)
      .eq("destinatario_id", currentUserId)
      .eq("lida", false);

    setNaoLidas(0);
    setMensagens(prev => prev.map(m => 
      m.destinatario_id === currentUserId ? { ...m, lida: true } : m
    ));
  }, [conversaKey, currentUserId]);

  // Marcar uma mensagem específica como NÃO lida (manual, para o destinatário)
  const marcarComoNaoLida = useCallback(async (mensagemId: string) => {
    const { error } = await supabase
      .from("mensagens_chat")
      .update({ lida: false })
      .eq("id", mensagemId)
      .eq("destinatario_id", currentUserId);

    if (!error) {
      setMensagens(prev => prev.map(m => m.id === mensagemId ? { ...m, lida: false } : m));
      setNaoLidas(prev => prev + 1);
    }
  }, [currentUserId]);

  // Enviar mensagem
  const enviarMensagem = useCallback(async (conteudo: string) => {
    if (!conteudo.trim()) return;
    setSending(true);

    const destinatarioId = currentUserId === personalId ? alunoId : personalId;

    const { error } = await supabase.from("mensagens_chat").insert({
      conversa_key: conversaKey,
      remetente_id: currentUserId,
      destinatario_id: destinatarioId,
      conteudo: conteudo.trim(),
      tipo: "texto",
    });

    if (!error) {
      // Criar notificação para o destinatário
      const { data: remetenteProfile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", currentUserId)
        .single();

      await supabase.from("notificacoes").insert({
        destinatario_id: destinatarioId,
        tipo: "nova_mensagem",
        titulo: `Nova mensagem de ${remetenteProfile?.nome || "Usuário"}`,
        mensagem: conteudo.trim().substring(0, 100),
        dados: { aluno_id: alunoId, profile_id: currentUserId },
      });
    }

    setSending(false);
  }, [conversaKey, currentUserId, personalId, alunoId]);

  // Realtime subscription
  useEffect(() => {
    fetchMensagens();
    fetchNaoLidas();

    const channel = supabase
      .channel(`chat:${conversaKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens_chat",
          filter: `conversa_key=eq.${conversaKey}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMensagens(prev => [...prev, newMsg]);
          if (newMsg.destinatario_id === currentUserId) {
            // Se o painel está visível, marcar imediatamente como lida
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
              supabase
                .from("mensagens_chat")
                .update({ lida: true })
                .eq("id", newMsg.id)
                .then(() => {
                  setMensagens(prev => prev.map(m => m.id === newMsg.id ? { ...m, lida: true } : m));
                });
            } else {
              setNaoLidas(prev => prev + 1);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mensagens_chat",
          filter: `conversa_key=eq.${conversaKey}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMensagens(prev => prev.map(m => m.id === updated.id ? { ...m, lida: updated.lida } : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaKey, fetchMensagens, fetchNaoLidas, currentUserId]);

  return {
    mensagens,
    loading,
    sending,
    naoLidas,
    enviarMensagem,
    marcarComoLidas,
    marcarComoNaoLida,
    fetchNaoLidas,
  };
}

// Hook simples para contar não lidas totais (para badges no dashboard)
export function useChatNaoLidas(userId: string) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetch = async () => {
      const { count } = await supabase
        .from("mensagens_chat")
        .select("*", { count: "exact", head: true })
        .eq("destinatario_id", userId)
        .eq("lida", false);
      setTotal(count || 0);
    };

    fetch();

    const channel = supabase
      .channel(`chat-badge:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens_chat",
          filter: `destinatario_id=eq.${userId}`,
        },
        () => fetch()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mensagens_chat",
          filter: `destinatario_id=eq.${userId}`,
        },
        () => fetch()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return total;
}

// Hook que retorna a última mensagem da conversa (para preview no dashboard)
export interface UltimaMensagemPreview {
  id: string;
  conteudo: string;
  remetente_id: string;
  destinatario_id: string;
  lida: boolean;
  created_at: string;
}

export function useUltimaMensagem(personalId: string, alunoId: string) {
  const [ultima, setUltima] = useState<UltimaMensagemPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const conversaKey = personalId && alunoId ? `${personalId}::${alunoId}` : "";

  useEffect(() => {
    if (!conversaKey) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("mensagens_chat")
        .select("id, conteudo, remetente_id, destinatario_id, lida, created_at")
        .eq("conversa_key", conversaKey)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setUltima((data as UltimaMensagemPreview | null) ?? null);
      setLoading(false);
    };

    fetch();

    const channel = supabase
      .channel(`chat-last:${conversaKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensagens_chat",
          filter: `conversa_key=eq.${conversaKey}`,
        },
        () => fetch()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversaKey]);

  return { ultima, loading };
}
