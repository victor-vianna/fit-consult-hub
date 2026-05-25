import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const PROMPT_INTERVAL_MS = 1000 * 60 * 60 * 24 * 7;

export function PushNotificationsBootstrap() {
  const { user, role } = useAuth();
  const { status, supported, missingVapidKey, enablePushNotifications } =
    usePushNotifications(user?.id);

  useEffect(() => {
    if (!user?.id || !role || !["personal", "aluno"].includes(role)) return;
    if (!supported || missingVapidKey || status !== "default") return;
    if (typeof window === "undefined") return;

    const storageKey = `pf:push-permission-prompt:${user.id}`;
    const lastPrompt = Number(window.localStorage.getItem(storageKey) || 0);
    if (Date.now() - lastPrompt < PROMPT_INTERVAL_MS) return;

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, String(Date.now()));
      toast("Receba notificacoes mesmo com o app fechado", {
        description:
          role === "aluno"
            ? "Ative para saber quando seu personal enviar mensagem."
            : "Ative para receber mensagens dos alunos e treinos concluidos.",
        action: {
          label: "Ativar",
          onClick: () => {
            enablePushNotifications().catch((error) => {
              console.error("Erro ao ativar notificacoes push:", error);
              toast.error("Nao foi possivel ativar as notificacoes push.");
            });
          },
        },
      });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [enablePushNotifications, missingVapidKey, role, status, supported, user?.id]);

  return null;
}
