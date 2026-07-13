import { ReactNode, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { StudentAccessState } from "@/hooks/useStudentAccess";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [manualReleaseUntil, setManualReleaseUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      checkAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, loading]);

  const checkAccess = async () => {
    if (!user || !role) {
      setCheckingAccess(false);
      return;
    }

    // Admin nunca é bloqueado, sai cedo
    if (role === "admin") {
      setCheckingAccess(false);
      return;
    }

    try {
      if (role === "aluno") {
        const { data, error } = await (supabase as any).rpc("get_student_access_state", {
          _student_id: user.id,
        });

        if (error) {
          console.error("get_student_access_state:", error);
          setCheckingAccess(false);
          return;
        }

        const accessState = data as StudentAccessState | null;
        setManualReleaseUntil(accessState?.manual_release_until ?? null);

        if (accessState?.allowed === false) {
          setIsBlocked(true);
          setCheckingAccess(false);
          navigate("/acesso-suspenso", { replace: true });
          return;
        }

        setIsBlocked(false);
        setCheckingAccess(false);
        return;
      }

      const { data, error } = await supabase.rpc("pode_acessar_plataforma", {
        _user_id: user.id,
      });

      if (error) {
        console.error("pode_acessar_plataforma:", error);
        setCheckingAccess(false);
        return;
      }

      if (data === false) {
        setIsBlocked(true);
        setCheckingAccess(false);
        navigate("/acesso-suspenso", { replace: true });
        return;
      }

      setIsBlocked(false);
    } catch (e) {
      console.error("Erro ao verificar acesso:", e);
    }

    setCheckingAccess(false);
  };

  useEffect(() => {
    if (!manualReleaseUntil || role !== "aluno") return;

    const delay = new Date(manualReleaseUntil).getTime() - Date.now() + 1000;
    if (delay <= 0) {
      checkAccess();
      return;
    }

    const timer = window.setTimeout(() => {
      checkAccess();
    }, Math.min(delay, 2_147_483_647));

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualReleaseUntil, role]);

  useEffect(() => {
    if (!user || role !== "aluno") return;

    const channel = supabase
      .channel(`student-access-state:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_access_state",
          filter: `student_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new?.allowed === false) {
            setIsBlocked(true);
            navigate("/acesso-suspenso", { replace: true });
          } else if (payload.new?.allowed === true) {
            setIsBlocked(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, role, user]);

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) return null;

  if (!user || !role) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "personal") return <Navigate to="/personal" replace />;
    if (role === "aluno") return <Navigate to="/aluno" replace />;
  }

  return <>{children}</>;
};
