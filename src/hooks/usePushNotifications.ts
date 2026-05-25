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
type PushPhase =
  | "idle"
  | "permission"
  | "service_worker"
  | "subscription"
  | "database"
  | "done"
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

function uint8ArrayToUrlBase64(value: ArrayBuffer | null) {
  if (!value) return "";
  const bytes = new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function normalizeVapidKey(value?: string | null) {
  return (value || "").trim().replace(/=+$/, "");
}

function getPushSupportStatus(): PushStatus {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  if (!VAPID_PUBLIC_KEY) return "missing_key";
  return Notification.permission as PushStatus;
}

async function getServiceWorkerRegistration() {
  const timeout = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), 4000);
  });
  const readyRegistration = await Promise.race([navigator.serviceWorker.ready, timeout]);
  if (readyRegistration) return readyRegistration;

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    throw new Error(
      `Service worker nao registrado. Recarregue o app apos publicar a nova versao. Detalhe: ${
        error instanceof Error ? error.message : "erro desconhecido"
      }`
    );
  }
}

export function usePushNotifications(userId?: string | null) {
  const [status, setStatus] = useState<PushStatus>(() => getPushSupportStatus());
  const [phase, setPhase] = useState<PushPhase>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const supported = useMemo(
    () => !["unsupported", "missing_key"].includes(status),
    [status]
  );

  const syncSubscription = useCallback(
    async (subscription: PushSubscription) => {
      if (!userId) return;
      setPhase("database");
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

      if (error) {
        throw new Error(`Falha ao salvar o dispositivo no Supabase: ${error.message}`);
      }
    },
    [userId]
  );

  const enablePushNotifications = useCallback(
    async ({ requestPermission = true } = {}) => {
      try {
        setLastError(null);
        const currentStatus = getPushSupportStatus();
        setStatus(currentStatus);

        if (!userId) {
          throw new Error("Usuario ainda nao autenticado para salvar este dispositivo.");
        }

        if (currentStatus === "unsupported") {
          throw new Error("Este navegador ou modo de instalacao nao oferece suporte a Web Push.");
        }

        if (currentStatus === "missing_key") {
          throw new Error("VITE_VAPID_PUBLIC_KEY nao esta disponivel no build do frontend.");
        }

        setPhase("permission");
        let permission = Notification.permission;
        if (permission === "default" && requestPermission) {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          setStatus(permission as PushStatus);
          setPhase("idle");
          return false;
        }

        setPhase("service_worker");
        const registration = await getServiceWorkerRegistration();
        let subscription = await registration.pushManager.getSubscription();
        const expectedKey = normalizeVapidKey(VAPID_PUBLIC_KEY);
        const currentKey = normalizeVapidKey(
          subscription ? uint8ArrayToUrlBase64(subscription.options.applicationServerKey) : null
        );

        if (subscription && currentKey && currentKey !== expectedKey) {
          await subscription.unsubscribe();
          subscription = null;
        }

        setPhase("subscription");
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
          });
        }

        await syncSubscription(subscription);
        setStatus("subscribed");
        setPhase("done");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido ao ativar notificacoes.";
        setLastError(message);
        setStatus("error");
        setPhase("error");
        throw error;
      }
    },
    [syncSubscription, userId]
  );

  useEffect(() => {
    const currentStatus = getPushSupportStatus();
    setStatus(currentStatus);

    if (userId && currentStatus === "granted") {
      enablePushNotifications({ requestPermission: false }).catch((error) => {
        console.error("Erro ao sincronizar notificacoes push:", error);
      });
    }
  }, [enablePushNotifications, userId]);

  return {
    status,
    supported,
    missingVapidKey: status === "missing_key",
    enabled: status === "subscribed",
    phase,
    lastError,
    enablePushNotifications,
  };
}
