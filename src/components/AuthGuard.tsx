import { ReactNode, useEffect, useState } from "react";
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

  useEffect(() => {
    if (!loading) {
      checkStudentAccess();
    }
  }, [user, role, loading, location.pathname]); // Adiciona location.pathname

  const checkStudentAccess = async () => {
    // Se não há usuário ou role, não precisa checar is_active
    if (!user || !role) {
      setCheckingAccess(false);
      return;
    }

    // Apenas alunos precisam ter is_active verificado
    if (role === "aluno") {
      try {
        // Busca o perfil do aluno usando o user.id (que é o mesmo profiles.id)
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

        // Se aluno está bloqueado, redireciona para página de acesso suspenso
        if (profile && profile.is_active === false) {
          console.log("Aluno bloqueado, redirecionando...");
          setIsBlocked(true);
          setCheckingAccess(false);
          navigate("/acesso-suspenso", { replace: true });
          return;
        }

        console.log("Aluno ativo, acesso permitido");
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
      }
    }

    setCheckingAccess(false);
  };

  // Loading inicial do auth
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

  // Se aluno está bloqueado, não renderiza nada (já foi redirecionado)
  if (isBlocked) {
    return null;
  }

  // Se não está autenticado
  if (!user || !role) {
    return <Navigate to="/auth" replace />;
  }

  // Se há restrição de roles e o usuário não tem permissão
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirecionar para a página correta baseado na role
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "personal") return <Navigate to="/" replace />;
    if (role === "aluno") return <Navigate to="/aluno" replace />;
  }

  return <>{children}</>;
};
