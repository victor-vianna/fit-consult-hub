import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { StudentAccessState } from "@/hooks/useStudentAccess";
import { Button } from "@/components/ui/button";
import {
  backgroundErrorKeepsScreen,
  shouldShowBlockingLoader,
  shouldStartBackgroundCheck,
} from "@/utils/accessRevalidation";

const BACKGROUND_CHECK_MIN_INTERVAL_MS = 15_000;

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

interface StudentAccessRpcClient {
  rpc(
    functionName: "get_student_access_state",
    args: { _student_id: string }
  ): Promise<{ data: unknown; error: unknown }>;
}

function blockedDestination(state: StudentAccessState) {
  const paymentBlock = state.source === "payment" || state.source === "settings";
  if (paymentBlock && state.plans_path?.startsWith("/planos/")) {
    return state.plans_path;
  }
  return "/acesso-suspenso";
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isBlocked, setIsBlocked] = useState(true);
  const [accessState, setAccessState] = useState<StudentAccessState | null>(null);
  const [accessCheckError, setAccessCheckError] = useState<string | null>(null);
  const [firstCheckDone, setFirstCheckDone] = useState(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastCheckAtRef = useRef(0);

  const checkAccess = useCallback(
    (options: { background?: boolean } = {}): Promise<void> => {
      const background = options.background === true;

      if (inFlightRef.current) return inFlightRef.current;

      if (
        background &&
        !shouldStartBackgroundCheck({
          now: Date.now(),
          lastCheckAt: lastCheckAtRef.current,
          inFlight: false,
          minIntervalMs: BACKGROUND_CHECK_MIN_INTERVAL_MS,
        })
      ) {
        return Promise.resolve();
      }

      if (!background && !firstCheckDone) setCheckingAccess(true);

      const request = Promise.resolve()
        .then(async () => {
          if (!user || !role) {
            setAccessState(null);
            setIsBlocked(true);
            return;
          }

          if (role === "admin") {
            setAccessState(null);
            if (!background) setAccessCheckError(null);
            setIsBlocked(false);
            return;
          }

          if (role === "aluno") {
            const { data, error } = await (
              supabase as unknown as StudentAccessRpcClient
            ).rpc("get_student_access_state", { _student_id: user.id });

            if (error) throw error;
            if (!data || typeof data !== "object") {
              throw new Error("Resposta de acesso inválida");
            }

            const nextState = data as StudentAccessState;
            setAccessState(nextState);
            if (!background) setAccessCheckError(null);

            if (nextState.allowed !== true) {
              setIsBlocked(true);
              navigate(blockedDestination(nextState), { replace: true });
              return;
            }

            setIsBlocked(false);
            return;
          }

          const { data, error } = await supabase.rpc("pode_acessar_plataforma", {
            _user_id: user.id,
          });

          if (error) throw error;
          if (data !== true) {
            if (!background) setAccessCheckError(null);
            setIsBlocked(true);
            navigate("/acesso-suspenso", { replace: true });
            return;
          }

          setAccessState(null);
          if (!background) setAccessCheckError(null);
          setIsBlocked(false);
        })
        .catch((error) => {
          if (background && backgroundErrorKeepsScreen()) {
            console.warn("Erro ao revalidar acesso em segundo plano:", error);
            return;
          }

          console.error("Erro ao verificar acesso:", error);
          setIsBlocked(true);
          setAccessCheckError(
            "Não foi possível verificar seu acesso. Confira sua conexão e tente novamente."
          );
        })
        .finally(() => {
          lastCheckAtRef.current = Date.now();
          setCheckingAccess(false);
          setFirstCheckDone(true);
          inFlightRef.current = null;
        });

      inFlightRef.current = request;
      return request;
    },
    [firstCheckDone, navigate, role, user]
  );

  useEffect(() => {
    if (!loading) void checkAccess({ background: firstCheckDone });
  }, [checkAccess, firstCheckDone, loading]);

  useEffect(() => {
    if (role !== "aluno" || accessState?.allowed !== true) return;

    const expirationTimes = [
      accessState.expires_at,
      accessState.manual_release_until,
    ]
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime())
      .filter(Number.isFinite);

    if (expirationTimes.length === 0) return;
    const delay = Math.min(...expirationTimes) - Date.now() + 1_000;

    if (delay <= 0) {
      void checkAccess({ background: true });
      return;
    }

    const timer = window.setTimeout(
      () => void checkAccess({ background: true }),
      Math.min(delay, 2_147_483_647)
    );
    return () => window.clearTimeout(timer);
  }, [accessState, checkAccess, role]);

  useEffect(() => {
    if (!firstCheckDone || !user || role !== "aluno") return;

    const recheck = () => void checkAccess({ background: true });
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") recheck();
    };
    const interval = window.setInterval(recheck, 60_000);

    window.addEventListener("focus", recheck);
    window.addEventListener("online", recheck);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const channel = supabase
      .channel(`student-access-guard:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_access_state",
          filter: `student_id=eq.${user.id}`,
        },
        recheck
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("online", recheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [checkAccess, firstCheckDone, role, user]);

  if (
    shouldShowBlockingLoader({
      firstCheckDone,
      authLoading: loading,
      checkingAccess,
    })
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user || !role) return <Navigate to="/auth" replace />;

  if (accessCheckError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Verificação de acesso indisponível
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{accessCheckError}</p>
          <Button onClick={() => void checkAccess()} className="mt-6 w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (isBlocked) return null;

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "personal") return <Navigate to="/personal" replace />;
    if (role === "aluno") return <Navigate to="/aluno" replace />;
  }

  return <>{children}</>;
};
