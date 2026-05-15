import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Plano = "mensal" | "trimestral" | "semestral" | "anual";

export interface PersonalPlanPrice {
  id: string;
  personal_id: string;
  plano: Plano;
  valor: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function usePersonalPlanPrices(personalId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["personal_plan_prices", personalId],
    enabled: !!personalId,
    queryFn: async (): Promise<PersonalPlanPrice[]> => {
      const { data, error } = await supabase
        .from("personal_plan_prices")
        .select("*")
        .eq("personal_id", personalId!)
        .order("plano");
      if (error) throw error;
      return (data || []) as PersonalPlanPrice[];
    },
  });

  const savePrices = useMutation({
    mutationFn: async (
      prices: Array<{ plano: Plano; valor: number; ativo?: boolean }>
    ) => {
      const { data, error } = await supabase.functions.invoke(
        "stripe-create-prices",
        { body: { prices } }
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal_plan_prices", personalId] });
      toast({ title: "Preços salvos", description: "Seus planos foram sincronizados com o Stripe." });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao salvar",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return { ...query, savePrices };
}
