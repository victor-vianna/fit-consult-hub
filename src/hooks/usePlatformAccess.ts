import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StudentAccessState } from "@/hooks/useStudentAccess";

export function usePlatformAccess(userId?: string) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean>(true);
  const [state, setState] = useState<StudentAccessState | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setLoading(false);
      setAllowed(true);
      setState(null);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("get_student_access_state", {
          _student_id: userId,
        });

        if (!mounted) return;
        if (error) {
          console.error("get_student_access_state", error);
          setAllowed(true);
          setState(null);
        } else {
          const accessState = data as StudentAccessState;
          setState(accessState);
          setAllowed(accessState?.allowed !== false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { loading, allowed, state };
}
