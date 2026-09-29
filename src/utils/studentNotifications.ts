import { supabase } from "@/integrations/supabase/client";
import { createNotificationId, dispatchPushNotification } from "@/utils/pushNotifications";
import { previewNotificationMessage } from "@/utils/notificationText";

type StudentNotificationInput = {
  studentId: string;
  personalId?: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  dados?: Record<string, unknown>;
  dedupeKey?: string;
  push?: boolean;
};

export async function createStudentNotification({
  studentId,
  personalId,
  tipo,
  titulo,
  mensagem,
  dados,
  dedupeKey,
  push = true,
}: StudentNotificationInput) {
  if (!studentId) return null;

  const id = createNotificationId();
  const notification = {
    id,
    destinatario_id: studentId,
    tipo,
    titulo,
    mensagem: previewNotificationMessage(mensagem, 90),
    dedupe_key: dedupeKey || null,
    dados: {
      aluno_id: studentId,
      personal_id: personalId || null,
      tipo_acao: getStudentNotificationAction(tipo),
      ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
      ...(dados || {}),
    },
    lida: false,
  };

  const query = dedupeKey
    ? supabase
        .from("notificacoes")
        .upsert(notification, {
          onConflict: "destinatario_id,tipo,dedupe_key",
          ignoreDuplicates: true,
        })
    : supabase.from("notificacoes").insert(notification);

  const { data: inserted, error } = await query.select("id").maybeSingle();

  if (error) {
    console.error("Erro ao criar notificacao para aluno:", error);
    return null;
  }

  // An ignored conflict means this event had already been persisted. Do not
  // send another push; return the canonical id for callers that need it.
  if (!inserted?.id && dedupeKey) {
    const { data: existing, error: existingError } = await supabase
      .from("notificacoes")
      .select("id")
      .eq("destinatario_id", studentId)
      .eq("tipo", tipo)
      .eq("dedupe_key", dedupeKey)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("Erro ao localizar notificacao deduplicada:", existingError);
      return null;
    }

    return existing?.id || null;
  }

  if (push && inserted?.id) {
    await dispatchPushNotification(inserted.id).catch((pushError) => {
      console.error("Erro ao enviar push para aluno:", pushError);
    });
  }

  return inserted?.id || null;
}

function getStudentNotificationAction(tipo: string) {
  if (tipo.includes("mensagem")) return "chat";
  if (tipo.includes("treino") || tipo.startsWith("planilha_")) return "treino";
  if (tipo.includes("avaliacao") || tipo.includes("composicao")) return "avaliacao";
  if (tipo.includes("material")) return "material";
  if (tipo.includes("pagamento") || tipo.includes("plano")) return "plano";
  return "sistema";
}
