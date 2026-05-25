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
      .select("id, destinatario_id, tipo, titulo, mensagem, dados")
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
        ["nova_mensagem", "mensagem", "treino_concluido"].includes(notification.tipo));

    if (!allowed) {
      return jsonResponse({ skipped: true, reason: "Tipo de push nao habilitado para este perfil." });
    }

    const { data: subscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", notification.destinatario_id)
      .is("revoked_at", null);

    if (!subscriptions?.length) {
      return jsonResponse({ sent: 0, reason: "Nenhuma subscription ativa." });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      title: notification.titulo || "FitConsult",
      body: notification.mensagem || "Nova notificacao",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `fitconsult-${notification.id}`,
      notificationId: notification.id,
      url: buildTargetUrl(notification.tipo, dados, roleRow?.role),
    });

    let sent = 0;
    const revokedIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (subscription) => {
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
          const statusCode = error?.statusCode || error?.status;
          if (statusCode === 404 || statusCode === 410) {
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

    return jsonResponse({ sent, revoked: revokedIds.length });
  } catch (error) {
    console.error("send-push-notification error:", error);
    return jsonResponse({ error: error?.message || "Erro inesperado." }, 500);
  }
});
