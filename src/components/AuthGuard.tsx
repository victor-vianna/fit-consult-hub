import { ReactNode, useEffect, useState, useRef } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!loading) {
      checkStudentAccess();
    }
  }, [user, role, loading]);

  const checkStudentAccess = async () => {
    if (!user || !role) {
      setCheckingAccess(false);
      return;
    }

    // Only check is_active for students, and only once per mount
    if (role === "aluno" && !checkedRef.current) {
      checkedRef.current = true;
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Erro ao verificar status do aluno:", error);
          setCheckingAccess(false);
          return;
        }

        if (profile && profile.is_active === false) {
          console.log("Aluno bloqueado, redirecionando...");
          setIsBlocked(true);
          setCheckingAccess(false);
          navigate("/acesso-suspenso", { replace: true });
          return;
        }
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
      }
    }

    setCheckingAccess(false);
  };

  // Loading
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

  if (isBlocked) {
    return null;
  }

  // Not authenticated
  if (!user || !role) {
    return <Navigate to="/auth" replace />;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "personal") return <Navigate to="/" replace />;
    if (role === "aluno") return <Navigate to="/aluno" replace />;
  }

  return <>{children}</>;
};
