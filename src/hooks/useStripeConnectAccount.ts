import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StripeConnectAccount {
  id: string;
  personal_id: string;
  stripe_account_id: string;
  account_type: "standard" | "express" | string;
  country: string | null;
  default_currency: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  card_payments_active: boolean;
  transfers_active: boolean;
  requirements_currently_due: string[];
  requirements_past_due: string[];
  disabled_reason: string | null;
  last_synced_at: string | null;
}

async function getFunctionErrorMessage(error: any) {
  const fallback = error?.message ?? "Tente novamente.";
  const context = error?.context;

  if (!context || typeof context.json !== "function") return fallback;

  try {
    const body = await context.json();
    return body?.error || body?.message || fallback;
  } catch {
    return fallback;
  }
}

export function useStripeConnectAccount(personalId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["stripe_connect_account", personalId],
    enabled: !!personalId,
    queryFn: async (): Promise<{ connected: boolean; account: StripeConnectAccount | null }> => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-account", {
        body: { action: "status" },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      return {
        connected: !!(data as any)?.connected,
        account: ((data as any)?.account ?? null) as StripeConnectAccount | null,
      };
    },
  });

  const startOnboarding = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-account", {
        body: { action: "onboard", origin: window.location.origin },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { url?: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stripe_connect_account", personalId] });
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao conectar Stripe",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const openDashboard = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-account", {
        body: { action: "dashboard" },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { url?: string };
    },
    onSuccess: (data) => {
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao abrir Stripe",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return { ...query, startOnboarding, openDashboard };
}
