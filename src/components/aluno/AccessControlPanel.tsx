import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ShieldAlert,
  Unlock,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  AccessMotivo,
  AccessStatus,
  useStudentAccess,
} from "@/hooks/useStudentAccess";
import { useSubscriptions, Subscription } from "@/hooks/useSubscriptions";
import { ManageAccessDialog } from "./ManageAccessDialog";
import { ManualAccessReleaseDialog } from "./ManualAccessReleaseDialog";
import { AccessHistoryList } from "./AccessHistoryList";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { formatDisplayDateOnly } from "@/utils/dateFormat";
import {
  getStudentAccessHeadline,
  getStudentFinanceSummary,
  type StudentFinanceTone,
} from "@/utils/studentFinancialStatus";

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
  carencia: {
    label: "Carência de 24h",
    icon: CalendarDays,
    classes: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  pausado: {
    label: "Pausado",
    icon: ShieldAlert,
    classes: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
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

function getBannerClasses(tone: "ok" | "danger" | "neutral") {
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
    shell: "border-border bg-muted/20",
    icon: "bg-muted text-muted-foreground",
  };
}

function getFinanceBadgeClasses(tone: StudentFinanceTone) {
  if (tone === "ok") {
    return "border-green-500/35 bg-green-500/10 text-green-700 dark:text-green-300";
  }
  if (tone === "danger") {
    return "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (tone === "pending") {
    return "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-border bg-background/60 text-muted-foreground";
}

export function AccessControlPanel({ studentId, personalId, studentName }: Props) {
  const { state, status, logs, loading, mutate, isMutating, refresh, error: accessError } =
    useStudentAccess(studentId);
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions(studentId, personalId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [openCreateSignal, setOpenCreateSignal] = useState(0);

  const accessMeta = ACCESS_META[status] ?? ACCESS_META.suspenso;
  const AccessIcon = accessMeta.icon;
  const finance = useMemo(
    () => getStudentFinanceSummary(subscriptions, state),
    [state, subscriptions]
  );
  const accessPresentation = getStudentAccessHeadline(state, loading);
  const bannerClasses = getBannerClasses(accessPresentation.tone);
  const FinanceIcon = finance.tone === "ok" ? CheckCircle2 : finance.tone === "danger" ? XCircle : WalletCards;
  const financeSubscription = finance.subscription;
  const planText = financeSubscription
    ? `Plano ${PLAN_LABELS[financeSubscription.plano] ?? financeSubscription.plano}`
    : "Sem plano";
  const valueText = financeSubscription
    ? formatCurrency(financeSubscription.valor)
    : "Valor não informado";
  const dueText = financeSubscription && finance.dueLabel.startsWith("Vence")
    ? `${finance.dueLabel} ${formatDisplayDateOnly(financeSubscription.data_expiracao)}`
    : finance.dueLabel;
  const canSuspend = status === "ativo" || status === "carencia";

  return (
    <section className="space-y-5">
      <div className={`rounded-xl border p-4 sm:p-5 ${bannerClasses.shell}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bannerClasses.icon}`}
            >
              <AccessIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Controle de acesso</p>
              <h3 className="mt-1 text-2xl font-semibold leading-tight text-foreground">
                {accessPresentation.label}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{planText}</span>
                <span aria-hidden="true">•</span>
                <span>{valueText}</span>
                <span aria-hidden="true">•</span>
                <span>{subscriptionsLoading ? "Carregando financeiro..." : dueText}</span>
              </div>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`w-fit gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${getFinanceBadgeClasses(finance.tone)}`}
          >
            <FinanceIcon className="h-4 w-4" />
            {finance.status}
          </Badge>
        </div>
      </div>

      {accessError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Nao foi possivel verificar o acesso deste aluno. Confira a conexao e tente novamente.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={refresh}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

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
          className={
            canSuspend
              ? "gap-2 border-red-500/35 text-red-700 hover:bg-red-500/10 hover:text-red-700 dark:text-red-300"
              : "gap-2 border-green-500/35 text-green-700 hover:bg-green-500/10 hover:text-green-700 dark:text-green-300"
          }
          onClick={() => (canSuspend ? setDialogOpen(true) : setReleaseDialogOpen(true))}
          disabled={loading || isMutating}
        >
          {canSuspend ? <ShieldAlert className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          {canSuspend ? "Pausar ou suspender acesso" : "Liberar acesso sem pagamento"}
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
        onConfirm={async (p) => {
          await mutate(p);
        }}
      />

      <ManualAccessReleaseDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        studentName={studentName}
        isSubmitting={isMutating}
        onConfirm={async ({ reasonCode, observation, manualReleaseUntil }) => {
          await mutate({
            acao: "reativar",
            motivo: reasonCode as AccessMotivo,
            observacao: observation,
            manualReleaseUntil,
          });
        }}
      />
    </section>
  );
}

export function AccessStatusBadge({ studentId }: { studentId: string }) {
  const { status, loading, error } = useStudentAccess(studentId);
  if (loading) return null;
  if (error) {
    return (
      <Badge variant="outline" className="gap-1 rounded-full border-destructive/40 bg-destructive/10 text-destructive">
        <ShieldAlert className="h-3 w-3" />
        Erro ao verificar
      </Badge>
    );
  }
  const meta = ACCESS_META[status] ?? ACCESS_META.suspenso;
  const StatusIcon = meta.icon;

  return (
    <Badge variant="outline" className={`gap-1 rounded-full border ${meta.classes}`}>
      <StatusIcon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}
