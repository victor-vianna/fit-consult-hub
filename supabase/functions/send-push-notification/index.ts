// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, any> : {};
}

function isMobileSubscription(userAgent?: string | null) {
  if (!userAgent) return false;
  return (
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent))
  );
}

function buildTargetUrl(tipo: string, dados: Record<string, any>, recipientRole?: string) {
  const alunoId = dados.aluno_id || dados.profile_id;

  if (tipo === "nova_mensagem" || tipo === "mensagem") {
    if (recipientRole === "aluno") return "/aluno?section=chat";
    return alunoId ? `/chat?aluno=${alunoId}` : "/chat";
  }

  if (tipo === "treino_concluido" && alunoId) {
    return `/aluno/${alunoId}?tab=historico`;
  }

  if (alunoId && recipientRole === "personal") return `/aluno/${alunoId}`;
  return recipientRole === "aluno" ? "/aluno" : "/";
}

const EMOJI_REGEX =
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

function stripEmoji(value?: string | null) {
  return String(value || "").replace(EMOJI_REGEX, "").replace(/\s+/g, " ").trim();
}

function limitText(value: string, maxLength: number) {
  const clean = stripEmoji(value);
  if (clean.length <= maxLength) return clean;

  const sliced = clean.slice(0, maxLength).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > Math.floor(maxLength * 0.6)
    ? sliced.slice(0, lastSpace)
    : sliced
  ).trim();
}

function firstName(name?: string | null) {
  return stripEmoji(name).split(/\s+/).filter(Boolean)[0] || "Aluno";
}

function compactName(name?: string | null, maxLength = 30) {
  const clean = stripEmoji(name);
  if (!clean) return "Aluno";
  if (clean.length <= maxLength) return clean;

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return limitText(clean, maxLength);

  const firstAndLast = `${parts[0]} ${parts[parts.length - 1]}`;
  if (firstAndLast.length <= maxLength) return firstAndLast;

  return parts[0].length <= maxLength ? parts[0] : limitText(parts[0], maxLength);
}

function formatWorkoutDuration(totalSeconds?: number | null) {
  const minutes = Math.max(0, Math.round(Number(totalSeconds || 0) / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) return `${hours}h${String(remainingMinutes).padStart(2, "0")}min`;
  return `${remainingMinutes}min`;
}

function todayStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function buildMessageTitle(name: string, count: number) {
  if (count <= 1) return compactName(name, 30);

  const suffix = ` · ${count} mensagens`;
  return `${compactName(name, Math.max(8, 30 - suffix.length))}${suffix}`;
}

async function buildPushPayload(
  supabaseAdmin: any,
  notification: Record<string, any>,
  recipientRole?: string
) {
  const dados = asRecord(notification.dados);
  const tipo = notification.tipo;
  const recipientId = notification.destinatario_id;
  const url = buildTargetUrl(tipo, dados, recipientRole);

  let title = limitText(notification.titulo || "Nova notificação", 30);
  let body = limitText(notification.mensagem || "Você tem uma nova notificação.", 60);
  let tag = `fitconsult-${tipo}-${recipientId}`;
  let timestamp = Date.now();

  if (tipo === "nova_mensagem" || tipo === "mensagem") {
    const senderId = dados.remetente_id || dados.profile_id || dados.aluno_id;
    const conversationKey = dados.conversa_key || `${dados.aluno_id || ""}:${senderId || ""}`;
    const senderName =
      dados.remetente_nome ||
      dados.remetente_nome_curto ||
      notification.titulo?.replace(/^Nova mensagem de\s+/i, "") ||
      "Mensagem";

    const { data: unreadMessages } = await supabaseAdmin
      .from("notificacoes")
      .select("id, mensagem, dados, created_at, lida")
      .eq("destinatario_id", recipientId)
      .eq("tipo", notification.tipo)
      .eq("lida", false)
      .order("created_at", { ascending: false })
      .limit(20);

    const related = (unreadMessages || []).filter((item: Record<string, any>) => {
      const itemDados = asRecord(item.dados);
      const itemSenderId = itemDados.remetente_id || itemDados.profile_id || itemDados.aluno_id;
      const itemConversationKey =
        itemDados.conversa_key || `${itemDados.aluno_id || ""}:${itemSenderId || ""}`;

      return conversationKey
        ? itemConversationKey === conversationKey
        : itemSenderId && itemSenderId === senderId;
    });

    const count = Math.max(related.length, 1);
    const previews = (related.length > 0 ? related : [notification])
      .slice(0, 3)
      .reverse()
      .map((item: Record<string, any>) => limitText(item.mensagem || "", 60))
      .filter(Boolean);

    title = buildMessageTitle(senderName, count);
    body = previews.join("\n") || body;
    tag = `fitconsult-chat-${recipientId}-${conversationKey || senderId || notification.id}`;
    timestamp = new Date((related[0] || notification).created_at || Date.now()).getTime();
  }

  if (tipo === "treino_concluido") {
    const { data: sameDay } = await supabaseAdmin
      .from("notificacoes")
      .select("id")
      .eq("destinatario_id", recipientId)
      .eq("tipo", tipo)
      .gte("created_at", todayStartIso());
    const count = Math.max(sameDay?.length || 0, 1);

    title = count > 1 ? "Treinos concluídos" : "Treino concluído";
    body =
      count > 1
        ? `${count} alunos finalizaram hoje`
        : limitText(
            `${compactName(dados.aluno_nome, 42)} · ${formatWorkoutDuration(dados.duracao_total)}`,
            60
          );
    tag = `fitconsult-treino-concluido-${recipientId}-${todayStartIso().slice(0, 10)}`;
  }

  if (tipo === "feedback_treino") {
    const { data: sameDay } = await supabaseAdmin
      .from("notificacoes")
      .select("id")
      .eq("destinatario_id", recipientId)
      .eq("tipo", tipo)
      .gte("created_at", todayStartIso());
    const count = Math.max(sameDay?.length || 0, 1);

    title = count > 1 ? "Novos feedbacks" : "Novo feedback";
    body =
      count > 1
        ? `${count} alunos avaliaram hoje`
        : limitText(
            `${firstName(dados.aluno_nome)} avaliou com ${dados.rating || 0} estrelas`,
            60
          );
    tag = `fitconsult-feedback-${recipientId}-${todayStartIso().slice(0, 10)}`;
  }

  if (tipo === "treino_iniciado") {
    const { data: sameDay } = await supabaseAdmin
      .from("notificacoes")
      .select("id")
      .eq("destinatario_id", recipientId)
      .eq("tipo", tipo)
      .gte("created_at", todayStartIso());
    const count = Math.max(sameDay?.length || 0, 1);

    title = count > 1 ? "Treinos iniciados" : "Treino iniciado";
    body =
      count > 1
        ? `${count} alunos começaram hoje`
        : limitText(
            `${firstName(dados.aluno_nome)} começou o treino de ${dados.dia_treino || "hoje"}`,
            60
          );
    tag = `fitconsult-treino-iniciado-${recipientId}-${todayStartIso().slice(0, 10)}`;
  }

  return {
    title: title || "Nova notificação",
    body: body || "Você tem uma nova notificação.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag,
    renotify: true,
    timestamp,
    notificationId: notification.id,
    url,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:suporte@fitconsult.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return jsonResponse({ error: "VAPID keys nao configuradas." }, 500);
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Nao autorizado." }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      return jsonResponse({ error: "Token invalido." }, 401);
    }

    const { notificationId } = await req.json();
    if (!notificationId) {
      return jsonResponse({ error: "notificationId obrigatorio." }, 400);
    }

    const { data: notification, error: notificationError } = await supabaseAdmin
      .from("notificacoes")
      .select("id, destinatario_id, tipo, titulo, mensagem, dados, created_at")
      .eq("id", notificationId)
      .single();

    if (notificationError || !notification) {
      return jsonResponse({ error: "Notificacao nao encontrada." }, 404);
    }

    const dados = asRecord(notification.dados);
    const callerId = authData.user.id;
    const canDispatch =
      callerId === notification.destinatario_id ||
      callerId === dados.profile_id ||
      callerId === dados.aluno_id ||
      callerId === dados.remetente_id;

    if (!canDispatch) {
      return jsonResponse({ error: "Usuario sem permissao para enviar este push." }, 403);
    }

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", notification.destinatario_id)
      .maybeSingle();

    const allowed =
      (roleRow?.role === "aluno" && notification.tipo === "nova_mensagem") ||
      (roleRow?.role === "personal" &&
        [
          "nova_mensagem",
          "mensagem",
          "treino_concluido",
          "treino_iniciado",
          "feedback_treino",
        ].includes(notification.tipo));

    if (!allowed) {
      return jsonResponse({ skipped: true, reason: "Tipo de push nao habilitado para este perfil." });
    }

    const { data: subscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_agent")
      .eq("user_id", notification.destinatario_id)
      .is("revoked_at", null);

    if (!subscriptions?.length) {
      return jsonResponse({ sent: 0, reason: "Nenhuma subscription ativa." });
    }

    const mobileSubscriptions = subscriptions.filter((subscription) =>
      isMobileSubscription(subscription.user_agent)
    );

    if (!mobileSubscriptions.length) {
      return jsonResponse({
        sent: 0,
        reason: "Nenhuma subscription mobile ativa.",
        ignored_web: subscriptions.length,
      });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify(
      await buildPushPayload(supabaseAdmin, notification, roleRow?.role)
    );

    let sent = 0;
    let failed = 0;
    const revokedIds: string[] = [];
    const failures: Array<{ id: string; statusCode: number | null; message: string }> = [];

    await Promise.all(
      mobileSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload
          );
          sent += 1;
        } catch (error) {
          failed += 1;
          const statusCode = error?.statusCode || error?.status;
          failures.push({
            id: subscription.id,
            statusCode: statusCode ?? null,
            message: error?.body || error?.message || "Falha ao enviar push",
          });
          if ([400, 401, 403, 404, 410].includes(statusCode)) {
            revokedIds.push(subscription.id);
          } else {
            console.error("Erro ao enviar push:", error);
          }
        }
      })
    );

    if (revokedIds.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in("id", revokedIds);
    }

    return jsonResponse({ sent, failed, revoked: revokedIds.length, failures: failures.slice(0, 5) });
  } catch (error) {
    console.error("send-push-notification error:", error);
    return jsonResponse({ error: error?.message || "Erro inesperado." }, 500);
  }
});
