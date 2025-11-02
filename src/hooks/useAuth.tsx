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

  // Listener para mudanças no perfil do aluno
  useEffect(() => {
    if (user && role === "aluno") {
      const channel = supabase
        .channel("profile-changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Perfil atualizado:", payload);

            // Se is_active mudou para false, redireciona
            if (payload.new.is_active === false) {
              console.log("Aluno foi bloqueado, redirecionando...");
              window.location.href = "/acesso-suspenso";
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, role]);

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
    console.log("🔵 Iniciando logout...");

    try {
      // Limpar token manualmente do localStorage
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          localStorage.removeItem(key);
        }
      });

      console.log("✅ Tokens locais removidos");

      // Limpar estado
      setUser(null);
      setSession(null);
      setRole(null);
      setLoading(false);

      // Redirecionar
      navigate("/auth", { replace: true });
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      console.error("Erro no logout:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  return { user, session, role, loading, signOut };
};
