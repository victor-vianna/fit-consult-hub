import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !role) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirecionar para a página correta baseado na role
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'personal') return <Navigate to="/" replace />;
    if (role === 'aluno') return <Navigate to="/aluno" replace />;
  }

  return <>{children}</>;
};
