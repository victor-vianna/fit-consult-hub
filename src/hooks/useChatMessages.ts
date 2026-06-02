import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { createNotificationId, dispatchPushNotification } from "@/utils/pushNotifications";

export interface ChatMessage {
  id: string;
  conversa_key: string;
  remetente_id: string;
  destinatario_id: string;
  conteudo: string;
  tipo: string;
  lida: boolean;
  created_at: string;
  reply_to: string | null;
  edited_at: string | null;
  deleted_for_all: boolean;
  deleted_for: string[];
  favorited_by: string[];
  pinned_by: string[];
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
  const isReady = Boolean(personalId && alunoId && currentUserId);

  const visibleMensagens = mensagens.filter(
    (m) => !(m.deleted_for || []).includes(currentUserId)
  );

  const upsertMensagem = useCallback((msg: ChatMessage) => {
    setMensagens((prev) => {
      if (prev.some((m) => m.id === msg.id)) {
        return prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
      }

      return [...prev, msg].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const fetchMensagens = useCallback(async () => {
    if (!isReady) {
      setMensagens([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("mensagens_chat")
      .select("*")
      .eq("conversa_key", conversaKey)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) {
      setMensagens((data as ChatMessage[]).reverse());
    } else if (error) {
      console.error("Erro ao carregar mensagens:", error);
      toast({
        title: "Nao foi possivel carregar o chat",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [conversaKey, isReady]);

  const fetchNaoLidas = useCallback(async () => {
    if (!isReady) {
      setNaoLidas(0);
      return;
    }

    const { count } = await supabase
      .from("mensagens_chat")
      .select("*", { count: "exact", head: true })
      .eq("conversa_key", conversaKey)
      .eq("destinatario_id", currentUserId)
      .eq("lida", false);

    setNaoLidas(count || 0);
  }, [conversaKey, currentUserId, isReady]);

  const marcarComoLidas = useCallback(async () => {
    if (!isReady) return;

    await supabase
      .from("mensagens_chat")
      .update({ lida: true })
      .eq("conversa_key", conversaKey)
      .eq("destinatario_id", currentUserId)
      .eq("lida", false);

    setNaoLidas(0);
    setMensagens((prev) =>
      prev.map((m) => (m.destinatario_id === currentUserId ? { ...m, lida: true } : m))
    );
  }, [conversaKey, currentUserId, isReady]);

  const marcarComoNaoLida = useCallback(
    async (mensagemId: string) => {
      if (!isReady) return;

      const { error } = await supabase
        .from("mensagens_chat")
        .update({ lida: false })
        .eq("id", mensagemId)
        .eq("destinatario_id", currentUserId);

      if (!error) {
        setMensagens((prev) =>
          prev.map((m) => (m.id === mensagemId ? { ...m, lida: false } : m))
        );
        setNaoLidas((prev) => prev + 1);
      }
    },
    [currentUserId, isReady]
  );

  const enviarMensagem = useCallback(
    async (conteudo: string, replyToId: string | null = null) => {
      const conteudoFinal = conteudo.trim();
      if (!conteudoFinal || sending) return false;
      if (!isReady || ![personalId, alunoId].includes(currentUserId)) {
        toast({
          title: "Conversa indisponivel",
          description: "Nao foi possivel identificar personal e aluno desta conversa.",
          variant: "destructive",
        });
        return false;
      }
      setSending(true);

      try {
        const destinatarioId = currentUserId === personalId ? alunoId : personalId;

        const { data: mensagemEnviada, error } = await supabase
          .from("mensagens_chat")
          .insert({
            conversa_key: conversaKey,
            remetente_id: currentUserId,
            destinatario_id: destinatarioId,
            conteudo: conteudoFinal,
            tipo: "texto",
            reply_to: replyToId,
          })
          .select("*")
          .single();

        if (error) throw error;
        if (mensagemEnviada) upsertMensagem(mensagemEnviada as ChatMessage);

        const [{ data: remetenteProfile }, { data: alunoProfile }] = await Promise.all([
          supabase.from("profiles").select("nome").eq("id", currentUserId).single(),
          supabase.from("profiles").select("nome").eq("id", alunoId).single(),
        ]);

        const notificacaoId = createNotificationId();
        const { error: notificationError } = await supabase.from("notificacoes").insert({
          id: notificacaoId,
          destinatario_id: destinatarioId,
          tipo: "nova_mensagem",
          titulo: `Nova mensagem de ${remetenteProfile?.nome || "Usuário"}`,
          mensagem: conteudoFinal.substring(0, 100),
          dados: {
            aluno_id: alunoId,
            aluno_nome: alunoProfile?.nome || null,
            profile_id: currentUserId,
            tipo_acao: "chat",
          },
        });

        if (!notificationError) {
          await dispatchPushNotification(notificacaoId).catch((pushError) => {
            console.error("Erro ao enviar push de chat:", pushError);
          });
        } else {
          console.error("Erro ao criar notificacao de chat:", notificationError);
        }

        return true;
      } catch (error: any) {
        console.error("Erro ao enviar mensagem:", error);
        toast({
          title: "Nao foi possivel enviar a mensagem",
          description: error?.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversaKey, currentUserId, personalId, alunoId, sending, upsertMensagem, isReady]
  );

  // Editar mensagem (apenas remetente)
  const editarMensagem = useCallback(
    async (mensagemId: string, novoConteudo: string) => {
      if (!novoConteudo.trim()) return;
      const { error } = await supabase
        .from("mensagens_chat")
        .update({ conteudo: novoConteudo.trim(), edited_at: new Date().toISOString() })
        .eq("id", mensagemId)
        .eq("remetente_id", currentUserId);

      if (!error) {
        setMensagens((prev) =>
          prev.map((m) =>
            m.id === mensagemId
              ? { ...m, conteudo: novoConteudo.trim(), edited_at: new Date().toISOString() }
              : m
          )
        );
      }
      return !error;
    },
    [currentUserId]
  );

  // Excluir só para mim (oculta da minha visão)
  const excluirParaMim = useCallback(
    async (mensagemId: string) => {
      const msg = mensagens.find((m) => m.id === mensagemId);
      if (!msg) return false;
      const novoArray = Array.from(new Set([...(msg.deleted_for || []), currentUserId]));
      const { error } = await supabase
        .from("mensagens_chat")
        .update({ deleted_for: novoArray })
        .eq("id", mensagemId);
      if (!error) {
        setMensagens((prev) =>
          prev.map((m) => (m.id === mensagemId ? { ...m, deleted_for: novoArray } : m))
        );
      }
      return !error;
    },
    [mensagens, currentUserId]
  );

  // Excluir para todos (apenas remetente)
  const excluirParaTodos = useCallback(
    async (mensagemId: string) => {
      const { error } = await supabase
        .from("mensagens_chat")
        .update({ deleted_for_all: true, conteudo: "" })
        .eq("id", mensagemId)
        .eq("remetente_id", currentUserId);

      if (!error) {
        setMensagens((prev) =>
          prev.map((m) =>
            m.id === mensagemId ? { ...m, deleted_for_all: true, conteudo: "" } : m
          )
        );
      }
      return !error;
    },
    [currentUserId]
  );

  const toggleMensagemFlag = useCallback(
    async (
      mensagemId: string,
      field: "favorited_by" | "pinned_by",
      labels: { add: string; remove: string; error: string }
    ) => {
      const msg = mensagens.find((m) => m.id === mensagemId);
      if (!msg) return false;

      const current = msg[field] || [];
      const isMarked = current.includes(currentUserId);
      const next = isMarked
        ? current.filter((id) => id !== currentUserId)
        : [...current, currentUserId];

      setMensagens((prev) =>
        prev.map((m) => (m.id === mensagemId ? { ...m, [field]: next } : m))
      );

      const { error } = await supabase
        .from("mensagens_chat")
        .update({ [field]: next })
        .eq("id", mensagemId);

      if (error) {
        console.error(`Erro ao atualizar ${field}:`, error);
        setMensagens((prev) =>
          prev.map((m) => (m.id === mensagemId ? { ...m, [field]: current } : m))
        );
        toast({
          title: labels.error,
          description:
            error.message.includes(field) || error.message.includes("schema cache")
              ? "A migration do chat ainda nao foi aplicada no Supabase."
              : error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({ title: isMarked ? labels.remove : labels.add });
      return true;
    },
    [mensagens, currentUserId]
  );

  const toggleMensagemFavorita = useCallback(
    async (mensagemId: string) => {
      return toggleMensagemFlag(mensagemId, "favorited_by", {
        add: "Mensagem favoritada",
        remove: "Mensagem removida dos favoritos",
        error: "Nao foi possivel favoritar",
      });
    },
    [toggleMensagemFlag]
  );

  const toggleMensagemFixada = useCallback(
    async (mensagemId: string) => {
      return toggleMensagemFlag(mensagemId, "pinned_by", {
        add: "Mensagem fixada",
        remove: "Mensagem desafixada",
        error: "Nao foi possivel fixar",
      });
    },
    [toggleMensagemFlag]
  );

  useEffect(() => {
    if (!isReady) {
      setMensagens([]);
      setNaoLidas(0);
      setLoading(false);
      return;
    }

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
          upsertMensagem(newMsg);
          if (newMsg.destinatario_id === currentUserId) {
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
              supabase
                .from("mensagens_chat")
                .update({ lida: true })
                .eq("id", newMsg.id)
                .then(() => {
                  setMensagens((prev) =>
                    prev.map((m) => (m.id === newMsg.id ? { ...m, lida: true } : m))
                  );
                });
            } else {
              setNaoLidas((prev) => prev + 1);
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
          setMensagens((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaKey, fetchMensagens, fetchNaoLidas, currentUserId, upsertMensagem, isReady]);

  return {
    mensagens: visibleMensagens,
    loading,
    sending,
    naoLidas,
    enviarMensagem,
    marcarComoLidas,
    marcarComoNaoLida,
    editarMensagem,
    excluirParaMim,
    excluirParaTodos,
    toggleMensagemFavorita,
    toggleMensagemFixada,
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return total;
}

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaKey]);

  return { ultima, loading };
}
