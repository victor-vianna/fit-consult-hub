import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PushStatus =
  | "unsupported"
  | "missing_key"
  | "default"
  | "denied"
  | "granted"
  | "subscribed"
  | "error";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function getPushSupportStatus(): PushStatus {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  if (!VAPID_PUBLIC_KEY) return "missing_key";
  return Notification.permission as PushStatus;
}

export function usePushNotifications(userId?: string | null) {
  const [status, setStatus] = useState<PushStatus>(() => getPushSupportStatus());
  const supported = useMemo(
    () => !["unsupported", "missing_key"].includes(status),
    [status]
  );

  const syncSubscription = useCallback(
    async (subscription: PushSubscription) => {
      if (!userId) return;
      const json = subscription.toJSON();
      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        throw new Error("Subscription push incompleta.");
      }

      const { error } = await (supabase as any).from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          revoked_at: null,
          updated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

      if (error) throw error;
    },
    [userId]
  );

  const enablePushNotifications = useCallback(
    async ({ requestPermission = true } = {}) => {
      const currentStatus = getPushSupportStatus();
      setStatus(currentStatus);

      if (!userId || currentStatus === "unsupported" || currentStatus === "missing_key") {
        return false;
      }

      let permission = Notification.permission;
      if (permission === "default" && requestPermission) {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        setStatus(permission as PushStatus);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
        });
      }

      await syncSubscription(subscription);
      setStatus("subscribed");
      return true;
    },
    [syncSubscription, userId]
  );

  useEffect(() => {
    const currentStatus = getPushSupportStatus();
    setStatus(currentStatus);

    if (userId && currentStatus === "granted") {
      enablePushNotifications({ requestPermission: false }).catch((error) => {
        console.error("Erro ao sincronizar notificacoes push:", error);
        setStatus("error");
      });
    }
  }, [enablePushNotifications, userId]);

  return {
    status,
    supported,
    missingVapidKey: status === "missing_key",
    enabled: status === "subscribed",
    enablePushNotifications,
  };
}
