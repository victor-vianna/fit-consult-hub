import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePlatformAccess(userId?: string) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.rpc("pode_acessar_plataforma", {
          _user_id: userId,
        });
        if (!mounted) return;
        if (error) {
          console.error("pode_acessar_plataforma", error);
          setAllowed(true);
        } else {
          setAllowed(!!data);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  return { loading, allowed };
}
