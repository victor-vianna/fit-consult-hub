import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalPlanPrices, Plano } from "@/hooks/usePersonalPlanPrices";

const PLANOS: { plano: Plano; label: string; descricao: string }[] = [
  { plano: "mensal", label: "Mensal", descricao: "Cobrado a cada mes" },
  { plano: "trimestral", label: "Trimestral", descricao: "Cobrado a cada 3 meses" },
  { plano: "semestral", label: "Semestral", descricao: "Cobrado a cada 6 meses" },
  { plano: "anual", label: "Anual", descricao: "Cobrado a cada 12 meses" },
];

interface FormState {
  valor: string;
  ativo: boolean;
}

export function PersonalPlanPricingForm() {
  const { user } = useAuth();
  const { data: prices, isLoading, savePrices } = usePersonalPlanPrices(user?.id);
  const [form, setForm] = useState<Record<Plano, FormState>>({
    mensal: { valor: "", ativo: true },
    trimestral: { valor: "", ativo: true },
    semestral: { valor: "", ativo: true },
    anual: { valor: "", ativo: true },
  });

  useEffect(() => {
    if (!prices) return;
    const next = { ...form };
    PLANOS.forEach(({ plano }) => {
      const found = prices.find((p) => p.plano === plano);
      if (found) {
        next[plano] = {
          valor: String(found.valor),
          ativo: found.ativo,
        };
      }
    });
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);

  const handleSave = () => {
    const payload = PLANOS
      .map(({ plano }) => ({
        plano,
        valor: Number(form[plano].valor),
        ativo: form[plano].ativo,
      }))
      .filter((p) => !isNaN(p.valor) && p.valor > 0);

    if (payload.length === 0) return;
    savePrices.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Precos dos Planos
            </CardTitle>
            <CardDescription>
              Defina os valores que seus alunos pagarao pela sua mentoria.
              Os precos sao sincronizados com a conta Stripe conectada.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {PLANOS.map(({ plano, label, descricao }) => {
                const existing = prices?.find((p) => p.plano === plano);
                return (
                  <div key={plano} className="space-y-3 rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{label}</h4>
                          {existing?.stripe_price_id && existing?.stripe_account_id && (
                            <Badge variant="secondary" className="text-xs">
                              Sincronizado
                            </Badge>
                          )}
                          {existing?.stripe_price_id && !existing?.stripe_account_id && (
                            <Badge variant="outline" className="text-xs">
                              Legado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{descricao}</p>
                      </div>
                      <Switch
                        checked={form[plano].ativo}
                        onCheckedChange={(v) =>
                          setForm({ ...form, [plano]: { ...form[plano], ativo: v } })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`valor-${plano}`} className="text-xs">
                        Valor (R$)
                      </Label>
                      <Input
                        id={`valor-${plano}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={form[plano].valor}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [plano]: { ...form[plano], valor: e.target.value },
                          })
                        }
                        disabled={!form[plano].ativo}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={savePrices.isPending}>
                {savePrices.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar e sincronizar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Ao salvar, criamos os produtos e precos na conta Stripe conectada.
              Mudar um valor desativa o preco antigo e cria um novo (assinaturas existentes seguem com o valor original).
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
