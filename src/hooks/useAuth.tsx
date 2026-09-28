import { useState, useEffect, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { decideAuthEvent } from "@/utils/authSessionEvents";

export type UserRole = "admin" | "personal" | "aluno";

export type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  personal_id?: string | null;
  is_active?: boolean;
  [key: string]: unknown;
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
  const loadedUserIdRef = useRef<string | null>(null);
  const initializingUserIdRef = useRef<string | null>(null);
  const roleRef = useRef<UserRole | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const updateAuthState = useCallback((nextSession: Session | null) => {
    const currentSession = sessionRef.current;
    const currentUserId = currentSession?.user.id ?? null;
    const nextUserId = nextSession?.user.id ?? null;
    const accessTokenChanged =
      currentSession?.access_token !== nextSession?.access_token;
    const userChanged = currentUserId !== nextUserId;

    if (!accessTokenChanged && !userChanged) return;

    sessionRef.current = nextSession;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  }, []);

  const clearUserData = useCallback(() => {
    initializedRef.current = false;
    loadedUserIdRef.current = null;
    initializingUserIdRef.current = null;
    roleRef.current = null;
    setRole(null);
    setProfile(null);
    setLoading(false);
  }, []);

  const initializeUserData = useCallback(
    async (userId: string, { showLoading }: { showLoading: boolean }) => {
      if (initializingUserIdRef.current === userId) return;
      if (
        initializedRef.current &&
        loadedUserIdRef.current === userId &&
        roleRef.current
      ) {
        return;
      }

      const accountChanged =
        loadedUserIdRef.current !== null &&
        loadedUserIdRef.current !== userId;

      initializingUserIdRef.current = userId;
      initializedRef.current = true;
      loadedUserIdRef.current = userId;

      if (accountChanged) {
        roleRef.current = null;
        setRole(null);
        setProfile(null);
      }
      if (showLoading) setLoading(true);

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

        if (loadedUserIdRef.current !== userId) return;

        if (roleResult.error) {
          console.error("Erro ao buscar role:", roleResult.error);
          roleRef.current = null;
          setRole(null);
        } else {
          const nextRole = roleResult.data.role as UserRole;
          roleRef.current = nextRole;
          setRole(nextRole);
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
        if (initializingUserIdRef.current === userId) {
          initializingUserIdRef.current = null;
        }
        if (loadedUserIdRef.current === userId) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // Load initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);

      if (session?.user) {
        const decision = decideAuthEvent({
          event: "INITIAL_SESSION",
          currentUserId: loadedUserIdRef.current,
          nextUserId: session.user.id,
          initialized: initializedRef.current,
          hasRole: roleRef.current !== null,
        });

        if (decision.reinitialize) {
          void initializeUserData(session.user.id, {
            showLoading: decision.showLoading,
          });
        }
      } else {
        setLoading(false);
      }
    });

    // Then listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      updateAuthState(session);

      const decision = decideAuthEvent({
        event,
        currentUserId: loadedUserIdRef.current,
        nextUserId: session?.user.id ?? null,
        initialized: initializedRef.current,
        hasRole: roleRef.current !== null,
      });

      if (decision.clear) {
        clearUserData();
      } else if (decision.reinitialize && session?.user) {
        void initializeUserData(session.user.id, {
          showLoading: decision.showLoading,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [clearUserData, initializeUserData, updateAuthState]);

  // Re-initialize on visibility change (returning from background on mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if session is still valid when returning to app
        supabase.auth.getSession().then(({ data: { session } }) => {
          updateAuthState(session);

          const decision = decideAuthEvent({
            event: session?.user ? "TOKEN_REFRESHED" : "SIGNED_OUT",
            currentUserId: loadedUserIdRef.current,
            nextUserId: session?.user.id ?? null,
            initialized: initializedRef.current,
            hasRole: roleRef.current !== null,
          });

          if (decision.clear) {
            clearUserData();
          } else if (decision.reinitialize && session?.user) {
            void initializeUserData(session.user.id, {
              showLoading: decision.showLoading,
            });
          }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [clearUserData, initializeUserData, updateAuthState]);

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
