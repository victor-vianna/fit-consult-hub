import { supabase } from "@/integrations/supabase/client";

export async function dispatchPushNotification(notificationId?: string | null) {
  if (!notificationId) return;

  const { error } = await supabase.functions.invoke("send-push-notification", {
    body: { notificationId },
  });

  if (error) {
    console.error("Erro ao enviar push notification:", error);
  }
}
