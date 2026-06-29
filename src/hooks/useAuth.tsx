import { useState, useEffect, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
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

const clearPersistedAuthSession = () => {
  if (typeof window === "undefined") return;

  const clearStorage = (storage: Storage) => {
    Object.keys(storage)
      .filter((key) => key.startsWith("sb-") && key.includes("auth-token"))
      .forEach((key) => storage.removeItem(key));
  };

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Listener for the unified student access state.
  useEffect(() => {
    if (user && role === "aluno") {
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
              console.log("Aluno foi bloqueado pela fonte unica de acesso, redirecionando...");
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("Logout global falhou, limpando sessao local:", error);
        await supabase.auth.signOut({ scope: "local" });
      }

      clearPersistedAuthSession();

      initializedRef.current = false;
      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
      setLoading(false);

      toast.success("Logout realizado com sucesso!");
      window.location.replace("/auth");
    } catch (error) {
      console.error("Erro no logout:", error);
      clearPersistedAuthSession();
      initializedRef.current = false;
      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      toast.success("Logout realizado com sucesso!");
      window.location.replace("/auth");
    }
  };

  return { user, session, role, profile, loading, signOut };
};
