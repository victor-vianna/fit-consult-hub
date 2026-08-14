import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, Info, Loader2, Repeat, ShieldCheck, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  personalId: string;
}

type PlanPrice = {
  id: string;
  plano: string;
  valor: number | string;
};

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

const RECORRENCIA: Record<string, string> = {
  mensal: "Renova todo mes",
  trimestral: "Renova a cada 3 meses",
  semestral: "Renova a cada 6 meses",
  anual: "Renova uma vez por ano",
};

export function AlunoCheckoutPlanos({ personalId }: Props) {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loadingPlano, setLoadingPlano] = useState<string | null>(null);
  const selectedPlan = searchParams.get("plan");

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
      if (!url) throw new Error("URL de checkout nao recebida");
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

  const planPrices = prices as PlanPrice[];
  const orderedPrices = selectedPlan
    ? [...planPrices].sort((a, b) =>
        a.plano === selectedPlan ? -1 : b.plano === selectedPlan ? 1 : 0
      )
    : planPrices;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Escolha seu plano
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertTitle>Antes de assinar</AlertTitle>
          <AlertDescription className="space-y-2 text-sm">
            <p>
              Os planos abaixo funcionam como uma assinatura com renovacao automatica.
              A cobranca se repete conforme o periodo escolhido ate que a assinatura seja cancelada.
            </p>
            <p>
              Se voce cancelar, o acesso continua ate o fim do periodo ja pago e depois a renovacao e encerrada.
            </p>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {orderedPrices.map((p) => {
            const isSelected = p.plano === selectedPlan;

            return (
              <div
                key={p.id}
                className={`border rounded-lg p-4 flex flex-col gap-3 bg-card hover:border-primary transition-colors ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{LABELS[p.plano] ?? p.plano}</h4>
                  <p className="text-2xl font-bold mt-1">
                    R$ {Number(p.valor).toFixed(2)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Repeat className="h-3.5 w-3.5" />
                    {RECORRENCIA[p.plano] ?? "Renovacao automatica"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isSelected && <Badge>Selecionado</Badge>}
                  {ECONOMIA[p.plano] && (
                    <Badge variant="secondary">{ECONOMIA[p.plano]}</Badge>
                  )}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => handleCheckout(p.plano)}
                disabled={loadingPlano === p.plano}
              >
                {loadingPlano === p.plano && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isSelected ? "Assinar plano selecionado" : "Assinar com renovacao automatica"}
              </Button>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-green-600" />
            <span>Pagamento seguro via Stripe. Seus dados de cartao sao processados pela Stripe.</span>
          </div>
          <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-3">
            <CreditCard className="mt-0.5 h-4 w-4 text-primary" />
            <span>Em caso de troca ou bloqueio de cartao, atualize o pagamento para manter o acesso ativo.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
