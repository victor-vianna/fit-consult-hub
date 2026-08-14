import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StudentAccessState } from "@/hooks/useStudentAccess";

export function usePlatformAccess(userId?: string) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean>(true);
  const [state, setState] = useState<StudentAccessState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setLoading(false);
      setAllowed(true);
      setState(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("get_student_access_state", {
          _student_id: userId,
        });

        if (!mounted) return;
        if (error) {
          console.error("get_student_access_state", error);
          setAllowed(false);
          setState(null);
          setError(error.message ?? "Nao foi possivel verificar o acesso.");
        } else {
          const accessState = data as StudentAccessState;
          setState(accessState);
          setAllowed(accessState?.allowed !== false);
          setError(null);
        }
      } catch (err) {
        if (!mounted) return;
        console.error("get_student_access_state", err);
        setAllowed(false);
        setState(null);
        setError("Nao foi possivel verificar o acesso.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { loading, allowed, state, error };
}
