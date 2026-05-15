import { ReactNode, useEffect, useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const checkedRef = useRef(false);

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

    if (checkedRef.current) {
      setCheckingAccess(false);
      return;
    }
    checkedRef.current = true;

    try {
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
    } catch (e) {
      console.error("Erro ao verificar acesso:", e);
    }

    setCheckingAccess(false);
  };

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
    if (role === "personal") return <Navigate to="/" replace />;
    if (role === "aluno") return <Navigate to="/aluno" replace />;
  }

  return <>{children}</>;
};
