import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalPlanPrices, Plano } from "@/hooks/usePersonalPlanPrices";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

function formatCurrency(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parsed);
}

export function PersonalPlanPricingForm() {
  const { user } = useAuth();
  const { data: prices, isLoading, savePrices } = usePersonalPlanPrices(user?.id);
  const [editingPlan, setEditingPlan] = useState<Plano | null>(null);
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
    <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Precos dos Planos</CardTitle>
              <CardDescription>
                Gerencie valores, disponibilidade e sincronizacao dos planos vendidos pelo Stripe.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5 rounded-full px-3 py-1">
            <RefreshCw className="h-3.5 w-3.5" />
            Stripe Connect
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {PLANOS.map(({ plano, label, descricao }) => {
                const existing = prices?.find((p) => p.plano === plano);
                const isActive = form[plano].ativo;
                const isEditing = editingPlan === plano;
                const isSynced = existing?.stripe_price_id && existing?.stripe_account_id;
                return (
                  <div
                    key={plano}
                    className={cn(
                      "rounded-xl border bg-background/70 p-5 shadow-sm transition-all",
                      isActive
                        ? "border-primary/35 ring-1 ring-primary/10"
                        : "border-border/70 bg-muted/30 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h4 className="text-base font-semibold leading-none">{label}</h4>
                          <span className="text-xs text-muted-foreground">{descricao}</span>
                          {isSynced && (
                            <Badge className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Sincronizado
                            </Badge>
                          )}
                          {existing?.stripe_price_id && !existing?.stripe_account_id && (
                            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs">
                              Legado
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {isActive ? "Disponivel para checkout" : "Oculto para novos alunos"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {isActive ? "Ativo" : "Inativo"}
                        </span>
                        <Switch
                          checked={isActive}
                          onCheckedChange={(v) =>
                            setForm({ ...form, [plano]: { ...form[plano], ativo: v } })
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      {isEditing && isActive ? (
                        <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-background px-3 py-2 shadow-sm ring-2 ring-primary/10">
                          <span className="text-sm font-medium text-muted-foreground">R$</span>
                          <Input
                            id={`valor-${plano}`}
                            autoFocus
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
                            onBlur={() => setEditingPlan(null)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === "Escape") {
                                event.currentTarget.blur();
                              }
                            }}
                            className="h-10 border-0 bg-transparent px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!isActive}
                          onClick={() => setEditingPlan(plano)}
                          className={cn(
                            "group flex w-full items-end justify-between gap-3 rounded-lg border border-transparent bg-muted/30 px-4 py-3 text-left transition-colors",
                            isActive && "hover:border-primary/40 hover:bg-primary/5",
                            !isActive && "cursor-not-allowed"
                          )}
                        >
                          <span className="text-3xl font-bold tracking-normal">
                            {formatCurrency(form[plano].valor)}
                          </span>
                          <span className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 -mx-6 border-t bg-card/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground sm:mr-auto">
                        <Info className="h-3.5 w-3.5" />
                        Valores enviados para a Stripe ao salvar.
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Mudar um valor desativa o preco antigo e cria um novo. Assinaturas existentes seguem com o valor original.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button onClick={handleSave} disabled={savePrices.isPending} className="gap-2">
                  {savePrices.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Salvar e sincronizar
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
