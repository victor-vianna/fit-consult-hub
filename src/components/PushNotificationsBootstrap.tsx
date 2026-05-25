import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationsBootstrap() {
  const { user, role } = useAuth();
  const { status, supported, missingVapidKey, enablePushNotifications } =
    usePushNotifications(user?.id);
  const toastId = user?.id ? `push-permission-${user.id}` : "push-permission";

  useEffect(() => {
    if (status !== "default") {
      toast.dismiss(toastId);
    }
  }, [status, toastId]);

  useEffect(() => {
    if (!user?.id || !role || !["personal", "aluno"].includes(role)) return;
    if (!supported || missingVapidKey || status !== "default") return;
    if (typeof window === "undefined") return;

    const timeout = window.setTimeout(() => {
      toast("Receba notificacoes mesmo com o app fechado", {
        id: toastId,
        duration: Infinity,
        description:
          role === "aluno"
            ? "Ative para saber quando seu personal enviar mensagem."
            : "Ative para receber mensagens dos alunos e treinos concluidos.",
        action: {
          label: "Ativar",
          onClick: async () => {
            try {
              const enabled = await enablePushNotifications();
              if (enabled) {
                toast.dismiss(toastId);
                toast.success("Notificacoes ativadas com sucesso.");
              }
            } catch (error) {
              console.error("Erro ao ativar notificacoes push:", error);
              toast.error("Nao foi possivel ativar as notificacoes push.");
            }
          },
        },
      });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [enablePushNotifications, missingVapidKey, role, status, supported, toastId, user?.id]);

  return null;
}
