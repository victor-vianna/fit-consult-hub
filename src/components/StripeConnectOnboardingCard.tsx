import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStripeConnectAccount } from "@/hooks/useStripeConnectAccount";
import { CheckCircle2, CreditCard, ExternalLink, Loader2, ShieldAlert } from "lucide-react";

interface StripeConnectOnboardingCardProps {
  personalId?: string;
}

export function StripeConnectOnboardingCard({ personalId }: StripeConnectOnboardingCardProps) {
  const { data, isLoading, startOnboarding, openDashboard } = useStripeConnectAccount(personalId);
  const account = data?.account ?? null;
  const ready = !!account?.charges_enabled && !!account?.payouts_enabled;
  const hasPendingRequirements =
    (account?.requirements_currently_due?.length ?? 0) > 0 ||
    (account?.requirements_past_due?.length ?? 0) > 0 ||
    !!account?.disabled_reason;

  return (
    <Card className={ready ? "border-green-500/40" : "border-amber-500/40"}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Recebimentos via Stripe Connect
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Stripe para receber diretamente dos alunos, com a comissao da plataforma aplicada automaticamente.
            </p>
          </div>
          {isLoading ? (
            <Badge variant="outline">Verificando</Badge>
          ) : ready ? (
            <Badge className="bg-green-600 text-white">Pronto para receber</Badge>
          ) : account ? (
            <Badge variant="secondary">Configuracao pendente</Badge>
          ) : (
            <Badge variant="outline">Nao conectado</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Consultando status da conta Stripe...
          </div>
        ) : ready ? (
          <div className="flex items-start gap-2 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                Conta liberada para cobrancas e repasses.
              </p>
              <p className="text-muted-foreground">
                Os novos checkouts serao criados diretamente na sua conta conectada.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Complete o onboarding antes de vender planos.
              </p>
              <p className="text-muted-foreground">
                O checkout fica bloqueado enquanto a Stripe nao confirmar cobrancas e repasses para sua conta.
              </p>
              {hasPendingRequirements && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Pendencias: {account?.disabled_reason || "informacoes de verificacao solicitadas pela Stripe"}.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => startOnboarding.mutate()}
            disabled={startOnboarding.isPending || isLoading}
          >
            {startOnboarding.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {account ? "Continuar configuracao" : "Conectar Stripe"}
          </Button>
          {account && (
            <Button
              type="button"
              variant="outline"
              onClick={() => openDashboard.mutate()}
              disabled={openDashboard.isPending}
            >
              {openDashboard.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Abrir Stripe
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
