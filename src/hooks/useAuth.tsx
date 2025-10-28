import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export type UserRole = "admin" | "personal" | "aluno";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Listener de mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔵 Auth event:", event);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchUserRole(session.user.id);
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setRole(data.role as UserRole);
    } catch (error) {
      console.error("Erro ao buscar role:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log("🔵 Iniciando logout...");

      // ✅ 1. Obter sessão atual antes de tentar deslogar
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.warn(
          "⚠️ Nenhuma sessão ativa encontrada. Encerrando localmente..."
        );
        setUser(null);
        setSession(null);
        setRole(null);
        navigate("/auth", { replace: true });
        return;
      }

      // ✅ 2. Fazer logout real no Supabase (sem scope: 'global')
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("🔴 Erro no signOut:", error.message);
        toast.error("Erro ao sair da conta.");
      } else {
        console.log("✅ Logout concluído");
        toast.success("Logout realizado com sucesso!");
      }

      // ✅ 3. Limpar estado local e redirecionar
      setUser(null);
      setSession(null);
      setRole(null);
      navigate("/auth", { replace: true });
    } catch (error: any) {
      console.error("🔴 Erro inesperado ao fazer logout:", error.message);
      setUser(null);
      setSession(null);
      setRole(null);
      navigate("/auth", { replace: true });
      toast.error(
        "Erro ao fazer logout, mas você foi desconectado localmente."
      );
    }
  };

  return { user, session, role, loading, signOut };
};
