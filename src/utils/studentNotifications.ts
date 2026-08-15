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

  if (dedupeKey) {
    const { data: existing, error: existingError } = await supabase
      .from("notificacoes")
      .select("id")
      .eq("destinatario_id", studentId)
      .eq("tipo", tipo)
      .contains("dados", { dedupe_key: dedupeKey })
      .maybeSingle();

    if (!existingError && existing?.id) return existing.id;
  }

  const id = createNotificationId();
  const { error } = await supabase.from("notificacoes").insert({
    id,
    destinatario_id: studentId,
    tipo,
    titulo,
    mensagem: previewNotificationMessage(mensagem, 90),
    dados: {
      aluno_id: studentId,
      personal_id: personalId || null,
      tipo_acao: getStudentNotificationAction(tipo),
      ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
      ...(dados || {}),
    },
    lida: false,
  });

  if (error) {
    console.error("Erro ao criar notificacao para aluno:", error);
    return null;
  }

  if (push) {
    await dispatchPushNotification(id).catch((pushError) => {
      console.error("Erro ao enviar push para aluno:", pushError);
    });
  }

  return id;
}

function getStudentNotificationAction(tipo: string) {
  if (tipo.includes("mensagem")) return "chat";
  if (tipo.includes("treino") || tipo.startsWith("planilha_")) return "treino";
  if (tipo.includes("avaliacao") || tipo.includes("composicao")) return "avaliacao";
  if (tipo.includes("material")) return "material";
  if (tipo.includes("pagamento") || tipo.includes("plano")) return "plano";
  return "sistema";
}
