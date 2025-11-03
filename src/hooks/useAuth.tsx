import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export type UserRole = "admin" | "personal" | "aluno";

export type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  personal_id?: string | null;
  is_active?: boolean;
  [key: string]: any; // para evitar erros caso existam mais colunas
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔵 Auth event:", event);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        initializeUserData(session.user.id);
      } else {
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        initializeUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeUserData = async (userId: string) => {
    setLoading(true);
    await Promise.all([fetchUserRole(userId), fetchUserProfile(userId)]);
    setLoading(false);
  };

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
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Erro ao buscar profile:", error);
      setProfile(null);
    }
  };

  // 🔁 Listener de mudanças no perfil do aluno
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
            if (payload.new.is_active === false) {
              console.log("Aluno foi bloqueado, redirecionando...");
              window.location.href = "/acesso-suspenso";
            }

            setProfile(payload.new as Profile);
          }
        )

        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, role]);

  const signOut = async () => {
    console.log("🔵 Iniciando logout...");

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          localStorage.removeItem(key);
        }
      });

      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
      setLoading(false);

      navigate("/auth", { replace: true });
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      console.error("Erro no logout:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  return { user, session, role, profile, loading, signOut };
};
