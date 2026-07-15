import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ShieldAlert,
  WalletCards,
  XCircle,
} from "lucide-react";
import { AccessStatus, useStudentAccess } from "@/hooks/useStudentAccess";
import { useSubscriptions, Subscription } from "@/hooks/useSubscriptions";
import { ManageAccessDialog } from "./ManageAccessDialog";
import { AccessHistoryList } from "./AccessHistoryList";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { formatDisplayDateOnly } from "@/utils/dateFormat";

interface Props {
  studentId: string;
  personalId: string;
  studentName: string;
}

const ACCESS_META: Record<
  AccessStatus,
  { label: string; classes: string; icon: typeof CheckCircle2 }
> = {
  ativo: {
    label: "Liberado",
    icon: CheckCircle2,
    classes: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300",
  },
  pausado: {
    label: "Suspenso",
    icon: ShieldAlert,
    classes: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  suspenso: {
    label: "Suspenso",
    icon: ShieldAlert,
    classes: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  pagamento_pendente: {
    label: "Bloqueado",
    icon: XCircle,
    classes: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

const PLAN_LABELS: Record<Subscription["plano"], string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getReferenceTime(sub: Subscription) {
  const value = sub.data_pagamento || sub.created_at || sub.data_expiracao;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function getLatestSubscription(subscriptions: Subscription[]) {
  return [...subscriptions].sort((a, b) => getReferenceTime(b) - getReferenceTime(a))[0];
}

function getFinanceSummary(subscriptions: Subscription[]) {
  const now = new Date();
  const active = [...subscriptions]
    .filter((sub) => sub.status_pagamento === "pago" && new Date(sub.data_expiracao) > now)
    .sort((a, b) => new Date(b.data_expiracao).getTime() - new Date(a.data_expiracao).getTime())[0];

  const latest = active ?? getLatestSubscription(subscriptions);

  if (!latest) {
    return {
      status: "Pagamento pendente",
      tone: "pending" as const,
      dueText: "Sem vencimento cadastrado",
      planText: "Nenhum plano ativo",
      valueText: "Valor nao informado",
    };
  }

  const expired = new Date(latest.data_expiracao) < now;
  const isPending = latest.status_pagamento === "pendente" || latest.status_pagamento === "atrasado";
  const status = active ? "Em dia" : expired ? "Vencido" : isPending ? "Pagamento pendente" : "Pagamento pendente";

  return {
    status,
    tone: active ? ("ok" as const) : expired ? ("danger" as const) : ("pending" as const),
    dueText: `${expired ? "Venceu em" : "Vence em"} ${formatDisplayDateOnly(latest.data_expiracao)}`,
    planText: `Plano ${PLAN_LABELS[latest.plano] ?? latest.plano}`,
    valueText: formatCurrency(latest.valor),
  };
}

function getBannerClasses(tone: "ok" | "pending" | "danger") {
  if (tone === "ok") {
    return {
      shell: "border-green-500/35 bg-green-500/10",
      icon: "bg-green-500/15 text-green-700 dark:text-green-300",
    };
  }
  if (tone === "danger") {
    return {
      shell: "border-red-500/35 bg-red-500/10",
      icon: "bg-red-500/15 text-red-700 dark:text-red-300",
    };
  }
  return {
    shell: "border-amber-500/35 bg-amber-500/10",
    icon: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  };
}

export function AccessControlPanel({ studentId, personalId, studentName }: Props) {
  const { status, logs, loading, mutate, isMutating, refresh } = useStudentAccess(studentId);
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions(studentId, personalId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openCreateSignal, setOpenCreateSignal] = useState(0);

  const accessMeta = ACCESS_META[status] ?? ACCESS_META.suspenso;
  const AccessIcon = accessMeta.icon;
  const finance = useMemo(() => getFinanceSummary(subscriptions), [subscriptions]);
  const bannerClasses = getBannerClasses(finance.tone);
  const FinanceIcon = finance.tone === "ok" ? CheckCircle2 : finance.tone === "danger" ? XCircle : WalletCards;

  return (
    <section className="space-y-5">
      <div className={`rounded-xl border p-4 sm:p-5 ${bannerClasses.shell}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bannerClasses.icon}`}
            >
              <FinanceIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Situacao financeira</p>
              <h3 className="mt-1 text-2xl font-semibold leading-tight text-foreground">
                {subscriptionsLoading ? "Carregando..." : finance.status}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {finance.dueText} - {finance.planText} - {finance.valueText}
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`w-fit gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${accessMeta.classes}`}
          >
            <AccessIcon className="h-4 w-4" />
            {accessMeta.label}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          size="lg"
          className="gap-2"
          onClick={() => setOpenCreateSignal((value) => value + 1)}
          disabled={loading}
        >
          <CreditCard className="h-4 w-4" />
          Registrar novo pagamento
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="gap-2 border-red-500/35 text-red-700 hover:bg-red-500/10 hover:text-red-700 dark:text-red-300"
          onClick={() => setDialogOpen(true)}
          disabled={loading || isMutating}
        >
          <ShieldAlert className="h-4 w-4" />
          Suspender acesso
        </Button>
      </div>

      <SubscriptionManager
        studentId={studentId}
        personalId={personalId}
        studentName={studentName}
        embedded
        showCreateButton={false}
        openCreateSignal={openCreateSignal}
        onChanged={refresh}
      />

      <div className="border-t pt-5">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Historico de acesso</h3>
        </div>
        <AccessHistoryList logs={logs} />
      </div>

      <ManageAccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        studentName={studentName}
        status={status}
        isMutating={isMutating}
        onConfirm={(p) => mutate(p)}
      />
    </section>
  );
}

export function AccessStatusBadge({ studentId }: { studentId: string }) {
  const { status, loading } = useStudentAccess(studentId);
  if (loading) return null;
  const meta = ACCESS_META[status] ?? ACCESS_META.suspenso;
  const StatusIcon = meta.icon;

  return (
    <Badge variant="outline" className={`gap-1 rounded-full border ${meta.classes}`}>
      <StatusIcon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}
