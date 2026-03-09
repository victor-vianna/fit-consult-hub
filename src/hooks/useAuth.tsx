import { useState, useEffect, useCallback, useRef } from "react";
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
  [key: string]: any;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const initializedRef = useRef(false);

  const initializeUserData = useCallback(async (userId: string) => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setLoading(true);
    try {
      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single(),
      ]);

      if (roleResult.error) {
        console.error("Erro ao buscar role:", roleResult.error);
        setRole(null);
      } else {
        setRole(roleResult.data.role as UserRole);
      }

      if (profileResult.error) {
        console.error("Erro ao buscar profile:", profileResult.error);
        setProfile(null);
      } else {
        setProfile(profileResult.data);
      }
    } catch (error) {
      console.error("Erro ao inicializar dados do usuário:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        initializeUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Then listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔵 Auth event:", event);
      setSession(session);
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        // Reset initialized flag on new sign-in to reload data
        initializedRef.current = false;
        initializeUserData(session.user.id);
      } else if (event === "SIGNED_OUT") {
        initializedRef.current = false;
        setRole(null);
        setProfile(null);
        setLoading(false);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Session was refreshed (e.g. returning to app), ensure data is loaded
        if (!initializedRef.current) {
          initializeUserData(session.user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [initializeUserData]);

  // Listener for student profile changes (blocked status)
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

  // Re-initialize on visibility change (returning from background on mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if session is still valid when returning to app
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            if (!initializedRef.current || !role) {
              initializeUserData(session.user.id);
            }
          }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [role, initializeUserData]);

  const signOut = async () => {
    console.log("🔵 Iniciando logout...");

    try {
      // Call supabase signOut first - this properly clears the session
      await supabase.auth.signOut();

      initializedRef.current = false;
      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
      setLoading(false);

      navigate("/auth", { replace: true });
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      console.error("Erro no logout:", error);
      // Even if signOut fails, clear local state
      initializedRef.current = false;
      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      navigate("/auth", { replace: true });
      toast.error("Erro ao fazer logout");
    }
  };

  return { user, session, role, profile, loading, signOut };
};
