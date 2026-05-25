import { supabase } from "@/integrations/supabase/client";

export function createNotificationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (Math.random() * 16) >> (Number(char) / 4)
    ).toString(16)
  );
}

export async function dispatchPushNotification(notificationId?: string | null) {
  if (!notificationId) return;

  const { data, error } = await supabase.functions.invoke("send-push-notification", {
    body: { notificationId },
  });

  if (error) {
    console.error("Erro ao enviar push notification:", error);
    return;
  }

  if (data?.sent === 0) {
    console.warn("Push notification nao entregue:", data);
  }
}
