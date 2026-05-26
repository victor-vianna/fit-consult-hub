import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationsBootstrap() {
  const { user, role } = useAuth();
  const { status, supported, missingVapidKey, phase, lastError, enablePushNotifications } =
    usePushNotifications(user?.id);
  const toastId = user?.id ? `push-permission-${user.id}` : "push-permission";
  const [enabling, setEnabling] = useState(false);
  const [installHintDismissed, setInstallHintDismissed] = useState(false);
  const [deniedHintDismissed, setDeniedHintDismissed] = useState(false);
  const canPrompt = !!user?.id && !!role && ["personal", "aluno"].includes(role);
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);
  const isLikelyMobileBrowser = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);
  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    );
  }, []);
  const needsActivation =
    supported &&
    !missingVapidKey &&
    !(isIOS && !isStandalone) &&
    ["default", "granted", "error"].includes(status);
  const permissionDenied = supported && status === "denied" && !deniedHintDismissed;
  const showInstallHint =
    canPrompt &&
    (status === "unsupported" || isIOS) &&
    (isLikelyMobileBrowser || isIOS) &&
    !isStandalone &&
    !installHintDismissed;

  const phaseLabel =
    phase === "permission"
      ? "Solicitando permissao do navegador..."
      : phase === "service_worker"
      ? "Preparando o app para receber notificacoes..."
      : phase === "subscription"
      ? "Criando assinatura push deste dispositivo..."
      : phase === "database"
      ? "Salvando este dispositivo no Supabase..."
      : phase === "error"
      ? "Nao foi possivel concluir a ativacao."
      : null;

  useEffect(() => {
    if (!needsActivation) {
      toast.dismiss(toastId);
    }
  }, [needsActivation, toastId]);

  useEffect(() => {
    if (!canPrompt || !needsActivation) return;
    if (typeof window === "undefined") return;

    const timeout = window.setTimeout(() => {
      toast("Receba notificacoes mesmo com o app fechado", {
        id: toastId,
        duration: Infinity,
        description:
          lastError ||
          phaseLabel ||
          (role === "aluno"
            ? "Ative para saber quando seu personal enviar mensagem."
            : "Ative para receber mensagens dos alunos e treinos concluidos."),
        action: {
          label: enabling ? "Ativando..." : "Ativar",
          onClick: async () => {
            if (enabling) return;
            try {
              setEnabling(true);
              const enabled = await enablePushNotifications();
              if (enabled) {
                toast.dismiss(toastId);
                toast.success("Notificacoes ativadas com sucesso.");
              }
            } catch (error) {
              console.error("Erro ao ativar notificacoes push:", error);
              const message =
                error instanceof Error
                  ? error.message
                  : "Nao foi possivel ativar as notificacoes push.";
              toast.error(message);
            } finally {
              setEnabling(false);
            }
          },
        },
      });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [
    canPrompt,
    enablePushNotifications,
    enabling,
    lastError,
    needsActivation,
    phaseLabel,
    role,
    toastId,
  ]);

  useEffect(() => {
    if (!canPrompt || !permissionDenied) return;
    toast("Notificacoes bloqueadas", {
      id: `${toastId}-denied`,
      duration: Infinity,
      description:
        "Voce ja bloqueou este site/app no navegador. Clique no cadeado da barra de endereco, libere Notificacoes para o FitConsult e recarregue a pagina.",
      action: {
        label: "Entendi",
        onClick: () => {
          setDeniedHintDismissed(true);
          toast.dismiss(`${toastId}-denied`);
        },
      },
    });
  }, [canPrompt, permissionDenied, toastId]);

  useEffect(() => {
    if (!showInstallHint) return;
    toast(isIOS ? "Instale o app no iPhone" : "Instale o app para receber notificacoes", {
      id: `${toastId}-install`,
      duration: Infinity,
      description:
        isIOS
          ? "No iPhone, as notificacoes web so podem ser ativadas pelo app adicionado a Tela de Inicio. Abra pelo icone instalado e toque em ativar."
          : "No mobile, as notificacoes push podem exigir o app instalado na tela inicial. Abra pelo icone instalado e toque em ativar novamente.",
      action: {
        label: "Entendi",
        onClick: () => {
          setInstallHintDismissed(true);
          toast.dismiss(`${toastId}-install`);
        },
      },
    });
  }, [showInstallHint, toastId]);

  return null;
}
