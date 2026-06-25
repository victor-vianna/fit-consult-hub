import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  personalId: string;
}

const LABELS: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const ECONOMIA: Record<string, string | null> = {
  mensal: null,
  trimestral: "3 meses",
  semestral: "6 meses",
  anual: "Melhor valor",
};

export function AlunoCheckoutPlanos({ personalId }: Props) {
  const { toast } = useToast();
  const [loadingPlano, setLoadingPlano] = useState<string | null>(null);

  const { data: prices, isLoading } = useQuery({
    queryKey: ["aluno_planos", personalId],
    enabled: !!personalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_plan_prices")
        .select("*")
        .eq("personal_id", personalId)
        .eq("ativo", true)
        .order("valor");
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleCheckout = async (plano: string) => {
    try {
      setLoadingPlano(plano);
      const { data, error } = await supabase.functions.invoke(
        "stripe-create-checkout",
        { body: { plano } }
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any)?.url;
      if (!url) throw new Error("URL de checkout não recebida");
      window.location.href = url;
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao iniciar pagamento",
        description: err?.message ?? "Tente novamente",
        variant: "destructive",
      });
      setLoadingPlano(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!prices || prices.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Escolha seu plano
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {prices.map((p: any) => (
            <div
              key={p.id}
              className="border rounded-lg p-4 flex flex-col gap-3 bg-card hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{LABELS[p.plano] ?? p.plano}</h4>
                  <p className="text-2xl font-bold mt-1">
                    R$ {Number(p.valor).toFixed(2)}
                  </p>
                </div>
                {ECONOMIA[p.plano] && (
                  <Badge variant="secondary">{ECONOMIA[p.plano]}</Badge>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => handleCheckout(p.plano)}
                disabled={loadingPlano === p.plano}
              >
                {loadingPlano === p.plano && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Assinar
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Pagamento seguro via Stripe. Renovação automática conforme o plano escolhido.
        </p>
      </CardContent>
    </Card>
  );
}
