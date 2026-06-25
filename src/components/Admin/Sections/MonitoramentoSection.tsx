import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Link as LinkIcon,
  RefreshCw,
  ShieldAlert,
  UserX,
  Webhook,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RoleRow = { user_id: string; role: string };
type ProfileRow = {
  id: string;
  nome: string | null;
  email: string | null;
  personal_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
};
type StripeAccountRow = {
  personal_id: string;
  stripe_account_id: string;
  account_type: string | null;
  charges_enabled: boolean | null;
  payouts_enabled: boolean | null;
  details_submitted: boolean | null;
  requirements_currently_due: string[] | null;
  requirements_past_due: string[] | null;
  disabled_reason: string | null;
  last_synced_at: string | null;
};
type FailedWebhookRow = {
  id: string;
  stripe_account_id: string | null;
  event_type: string;
  processing_status: string;
  error_message: string | null;
  processing_attempts: number | null;
  last_error_at: string | null;
  last_attempt_at: string | null;
  created_at: string | null;
};
type SubscriptionRow = {
  id: string;
  student_id: string;
  personal_id: string;
  plano: string;
  valor: number;
  status_pagamento: string;
  data_expiracao: string;
  stripe_subscription_id?: string | null;
};
type PlanPriceRow = {
  id: string;
  personal_id: string;
  plano: string;
  valor: number;
  ativo: boolean;
  stripe_price_id: string | null;
  stripe_account_id?: string | null;
  updated_at: string | null;
};

function formatDateDistance(value?: string | null) {
  if (!value) return "Nunca";
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function nameOf(profilesById: Map<string, ProfileRow>, id: string) {
  const profile = profilesById.get(id);
  return profile?.nome || profile?.email || "Sem nome";
}

function connectStatus(account?: StripeAccountRow) {
  if (!account) {
    return {
      label: "Nao conectado",
      className: "bg-muted text-muted-foreground border-border",
    };
  }
  if (account.disabled_reason || (account.requirements_past_due?.length ?? 0) > 0) {
    return {
      label: "Bloqueado",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }
  if (account.charges_enabled && account.payouts_enabled) {
    return {
      label: "Pronto",
      className: "bg-success-muted text-success border-success/20",
    };
  }
  if (account.details_submitted) {
    return {
      label: "Em analise",
      className: "bg-info-muted text-info border-info/20",
    };
  }
  return {
    label: "Onboarding pendente",
    className: "bg-warning-muted text-warning border-warning/20",
  };
}

async function fetchMonitoramento() {
  const nowIso = new Date().toISOString();

  const [
    rolesRes,
    profilesRes,
    accountsRes,
    webhooksRes,
    expiredSubsRes,
    missingPricesRes,
  ] = await Promise.all([
    supabase.from("user_roles").select("user_id, role"),
    supabase
      .from("profiles")
      .select("id, nome, email, personal_id, is_active, created_at")
      .order("created_at", { ascending: false }),
    (supabase as any)
      .from("personal_stripe_accounts")
      .select(
        "personal_id, stripe_account_id, account_type, charges_enabled, payouts_enabled, details_submitted, requirements_currently_due, requirements_past_due, disabled_reason, last_synced_at"
      ),
    (supabase as any)
      .from("stripe_webhook_events")
      .select(
        "id, stripe_account_id, event_type, processing_status, error_message, processing_attempts, last_error_at, last_attempt_at, created_at"
      )
      .eq("processing_status", "failed")
      .order("last_error_at", { ascending: false })
      .limit(25),
    supabase
      .from("subscriptions")
      .select("id, student_id, personal_id, plano, valor, status_pagamento, data_expiracao, stripe_subscription_id")
      .eq("status_pagamento", "pago")
      .lte("data_expiracao", nowIso)
      .order("data_expiracao", { ascending: true })
      .limit(50),
    (supabase as any)
      .from("personal_plan_prices")
      .select("id, personal_id, plano, valor, ativo, stripe_price_id, stripe_account_id, updated_at")
      .eq("ativo", true)
      .is("stripe_price_id", null)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const errors = [
    rolesRes.error,
    profilesRes.error,
    accountsRes.error,
    webhooksRes.error,
    expiredSubsRes.error,
    missingPricesRes.error,
  ].filter(Boolean);
  if (errors.length) throw errors[0];

  const roles = (rolesRes.data ?? []) as RoleRow[];
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const accounts = (accountsRes.data ?? []) as StripeAccountRow[];
  const failedWebhooks = (webhooksRes.data ?? []) as FailedWebhookRow[];
  const expiredSubscriptions = (expiredSubsRes.data ?? []) as SubscriptionRow[];
  const missingPrices = (missingPricesRes.data ?? []) as PlanPriceRow[];

  const personalIds = new Set(
    roles.filter((r) => r.role === "personal").map((r) => r.user_id)
  );
  const studentIds = new Set(
    roles.filter((r) => r.role === "aluno").map((r) => r.user_id)
  );
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  const accountsByPersonal = new Map(accounts.map((a) => [a.personal_id, a]));

  const connectRows = Array.from(personalIds)
    .map((personalId) => ({
      personal: profilesById.get(personalId) ?? null,
      account: accountsByPersonal.get(personalId),
    }))
    .sort((a, b) => {
      const aReady = a.account?.charges_enabled && a.account?.payouts_enabled;
      const bReady = b.account?.charges_enabled && b.account?.payouts_enabled;
      return Number(aReady) - Number(bReady);
    });

  const studentsWithoutPersonal = profiles
    .filter((p) => studentIds.has(p.id) && !p.personal_id)
    .slice(0, 50);

  return {
    profilesById,
    connectRows,
    failedWebhooks,
    expiredSubscriptions,
    studentsWithoutPersonal,
    missingPrices,
    summary: {
      personals: personalIds.size,
      connectReady: connectRows.filter(
        (row) => row.account?.charges_enabled && row.account?.payouts_enabled
      ).length,
      failedWebhooks: failedWebhooks.length,
      expiredSubscriptions: expiredSubscriptions.length,
      studentsWithoutPersonal: studentsWithoutPersonal.length,
      missingPrices: missingPrices.length,
    },
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export default function MonitoramentoSection() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "monitoramento-operacional"],
    queryFn: fetchMonitoramento,
    staleTime: 30_000,
  });

  const connectWarnings = useMemo(() => {
    if (!data) return 0;
    return data.connectRows.filter(
      (row) => !(row.account?.charges_enabled && row.account?.payouts_enabled)
    ).length;
  }, [data]);

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !data) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-destructive" />
          <div>
            <h2 className="font-semibold">Nao foi possivel carregar o monitoramento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {(error as any)?.message ?? "Tente atualizar a pagina."}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Saude operacional de Stripe, assinaturas, vinculos de alunos e planos.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-fit"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Connect pendente</p>
              <LinkIcon className="h-4 w-4 text-warning" />
            </div>
            <p className="mt-2 text-2xl font-bold">{connectWarnings}</p>
            <p className="text-xs text-muted-foreground">
              de {data.summary.personals} personal trainers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Webhooks falhos</p>
              <Webhook className="h-4 w-4 text-destructive" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data.summary.failedWebhooks}</p>
            <p className="text-xs text-muted-foreground">ultimos registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Assinaturas vencidas</p>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data.summary.expiredSubscriptions}</p>
            <p className="text-xs text-muted-foreground">ainda marcadas como pagas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Alunos sem personal</p>
              <UserX className="h-4 w-4 text-destructive" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data.summary.studentsWithoutPersonal}</p>
            <p className="text-xs text-muted-foreground">sem vinculo ativo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Planos sem Stripe</p>
              <CreditCard className="h-4 w-4 text-warning" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data.summary.missingPrices}</p>
            <p className="text-xs text-muted-foreground">ativos sem price_id</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LinkIcon className="h-4 w-4" />
            Status Connect dos personal trainers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conta Stripe</TableHead>
                <TableHead>Pendencias</TableHead>
                <TableHead>Ultima sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.connectRows.slice(0, 25).map(({ personal, account }) => {
                const status = connectStatus(account);
                const pending = [
                  ...(account?.requirements_currently_due ?? []),
                  ...(account?.requirements_past_due ?? []),
                ];

                return (
                  <TableRow key={personal?.id ?? account?.personal_id}>
                    <TableCell>
                      <div className="font-medium">{personal?.nome || "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground">{personal?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {account?.stripe_account_id ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                      {account?.disabled_reason || pending.join(", ") || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateDistance(account?.last_synced_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4" />
              Webhooks falhos
            </CardTitle>
        </CardHeader>
          <CardContent>
            {data.failedWebhooks.length === 0 ? (
              <EmptyState text="Nenhum webhook falho registrado." />
            ) : (
              <div className="space-y-3">
                {data.failedWebhooks.map((event) => (
                  <div key={event.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{event.event_type}</p>
                        <p className="truncate text-xs text-muted-foreground">{event.id}</p>
                      </div>
                      <Badge variant="destructive">Falhou</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {event.error_message || "Erro sem mensagem registrada."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{event.processing_attempts ?? 1} tentativa(s)</span>
                      <span>{formatDateDistance(event.last_error_at)}</span>
                      {event.stripe_account_id && <span>{event.stripe_account_id}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Assinaturas vencidas marcadas como pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.expiredSubscriptions.length === 0 ? (
              <EmptyState text="Nenhuma assinatura vencida com status pago." />
            ) : (
              <div className="space-y-3">
                {data.expiredSubscriptions.map((sub) => (
                  <div key={sub.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {nameOf(data.profilesById, sub.student_id)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Personal: {nameOf(data.profilesById, sub.personal_id)}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-warning-muted text-warning border-warning/20">
                        {sub.plano}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Expirou {formatDateDistance(sub.data_expiracao)}</span>
                      <span>{formatCurrency(sub.valor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserX className="h-4 w-4" />
              Alunos sem personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.studentsWithoutPersonal.length === 0 ? (
              <EmptyState text="Todos os alunos possuem personal vinculado." />
            ) : (
              <div className="divide-y rounded-lg border">
                {data.studentsWithoutPersonal.map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{student.nome || "Sem nome"}</p>
                      <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                    </div>
                    <Badge variant="outline">Sem vinculo</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Planos ativos sem stripe_price_id
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.missingPrices.length === 0 ? (
              <EmptyState text="Todos os planos ativos estao sincronizados com Stripe." />
            ) : (
              <div className="divide-y rounded-lg border">
                {data.missingPrices.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {nameOf(data.profilesById, plan.personal_id)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {plan.plano} - {formatCurrency(plan.valor)}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-warning-muted text-warning border-warning/20">
                      Sem price
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Use esta tela como checklist operacional antes de vender: Connect pronto,
            webhooks sem falha, alunos vinculados e planos sincronizados.
          </p>
        </div>
      </div>
    </div>
  );
}
