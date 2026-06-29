import { useMemo, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  Pause,
  ShieldAlert,
  ChevronDown,
  History,
  CreditCard,
  Lock,
  Unlock,
  Settings,
} from "lucide-react";
import {
  AccessStatus,
  getAccessReasonLabel,
  useStudentAccess,
} from "@/hooks/useStudentAccess";
import { ManageAccessDialog } from "./ManageAccessDialog";
import { AccessHistoryList } from "./AccessHistoryList";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { formatDisplayDateTime } from "@/utils/dateFormat";

interface Props {
  studentId: string;
  personalId: string;
  studentName: string;
}

const STATUS_META: Record<
  AccessStatus,
  { label: string; icon: typeof CheckCircle2; classes: string; desc: string }
> = {
  ativo: {
    label: "Liberado",
    icon: CheckCircle2,
    classes: "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/30",
    desc: "O aluno pode acessar a plataforma.",
  },
  pausado: {
    label: "Bloqueado",
    icon: Pause,
    classes: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
    desc: "Acesso pausado manualmente.",
  },
  suspenso: {
    label: "Bloqueado",
    icon: ShieldAlert,
    classes: "text-destructive bg-destructive/10 border-destructive/30",
    desc: "Acesso suspenso manualmente.",
  },
  pagamento_pendente: {
    label: "Bloqueado",
    icon: ShieldAlert,
    classes: "text-destructive bg-destructive/10 border-destructive/30",
    desc: "Acesso bloqueado por pagamento pendente.",
  },
};

function getSourceLabel(source?: string | null) {
  if (source === "manual") return "acao manual";
  if (source === "payment") return "pagamento";
  if (source === "settings") return "regra de acesso";
  return "sistema";
}

function getFactorBadgeClasses(active: boolean, winning: boolean) {
  if (winning) return "border-primary/60 bg-primary/10 text-primary";
  if (active) return "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400";
  return "border-border bg-muted/40 text-muted-foreground";
}

export function AccessControlPanel({ studentId, personalId, studentName }: Props) {
  const { status, state, lastLog, logs, loading, mutate, isMutating, refresh } =
    useStudentAccess(studentId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [subscriptionsOpen, setSubscriptionsOpen] = useState(false);
  const [openCreateSignal, setOpenCreateSignal] = useState(0);

  const meta = STATUS_META[status] ?? STATUS_META.suspenso;
  const StatusIcon = meta.icon;
  const motivoLabel =
    getAccessReasonLabel(state?.reason_code) || getAccessReasonLabel(lastLog?.reason_code);
  const isManualBlock = state?.allowed === false && state.source === "manual";
  const isPaymentWinner = state?.allowed === false && state.source === "payment";
  const hasManualRelease = state?.allowed === true && state.source === "manual";

  const decisionText = useMemo(() => {
    if (!state) return meta.desc;
    if (state.allowed && hasManualRelease) {
      return "Liberado por liberacao manual. O resultado acima vence outras regras de acesso.";
    }
    if (state.allowed && state.has_active_payment) {
      return "Liberado por pagamento ativo.";
    }
    if (state.allowed) {
      return "Liberado porque nenhuma regra ativa esta bloqueando o aluno.";
    }
    if (isManualBlock) {
      const actor = lastLog?.actor_name ? ` por ${lastLog.actor_name}` : "";
      return `Bloqueado por ${state.status === "pausado" ? "pausa" : "suspensao"} manual${actor}.`;
    }
    if (isPaymentWinner) {
      return state.reason || "Bloqueado porque o pagamento necessario nao esta ativo.";
    }
    return state.reason || meta.desc;
  }, [hasManualRelease, isManualBlock, isPaymentWinner, lastLog?.actor_name, meta.desc, state]);

  const factors = [
    {
      label: "Pagamento",
      icon: CreditCard,
      active: !!state?.payment_required,
      winning: isPaymentWinner,
      badge: state?.payment_required
        ? state.has_active_payment
          ? "Em dia"
          : "Pendente"
        : "Nao exigido",
      description: state?.payment_required
        ? state.has_active_payment
          ? "Existe uma assinatura paga e vigente."
          : "A regra atual exige pagamento ativo."
        : "Pagamento nao esta sendo usado para bloquear este aluno.",
    },
    {
      label: "Liberacao manual",
      icon: Unlock,
      active: hasManualRelease,
      winning: hasManualRelease,
      badge: hasManualRelease ? "Ativa" : "Inativa",
      description: hasManualRelease
        ? "Ultima acao manual liberou o aluno."
        : "Nenhuma liberacao manual esta vencendo agora.",
    },
    {
      label: "Suspensao manual",
      icon: Lock,
      active: isManualBlock,
      winning: isManualBlock,
      badge: isManualBlock ? "Ativa" : "Inativa",
      description: isManualBlock
        ? "Esta suspensao tem prioridade sobre pagamento."
        : "Nenhuma suspensao manual esta bloqueando agora.",
    },
  ];

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Acesso do aluno
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Uma unica visao para status, pagamento, acoes manuais e historico.
            </p>
          </div>
          <Badge variant="outline" className={`${meta.classes} border gap-1.5 px-3 py-1`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {meta.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className={`p-3 rounded-md border ${meta.classes}`}>
          <p className="text-sm font-medium">{decisionText}</p>
          {motivoLabel && (
            <p className="mt-1 text-sm">
              <span className="font-medium">Motivo:</span> {motivoLabel}
            </p>
          )}
          {(state?.message_aluno || lastLog?.message_aluno) && (
            <p className="mt-1 text-sm">
              <span className="font-medium">Mensagem ao aluno:</span>{" "}
              {state?.message_aluno || lastLog?.message_aluno}
            </p>
          )}
          {state && (
            <p className="mt-1 text-xs opacity-80">
              Fonte atual: {getSourceLabel(state.source)} - Recalculado em{" "}
              {formatDisplayDateTime(state.calculated_at)}
            </p>
          )}
          {lastLog?.created_at && (
            <p className="mt-1 text-xs opacity-80">
              Ultimo evento{" "}
              {formatDistanceToNow(parseISO(lastLog.created_at), {
                locale: ptBR,
                addSuffix: true,
              })}
              {lastLog.actor_name ? ` por ${lastLog.actor_name}` : ""}
            </p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {factors.map((factor) => {
            const FactorIcon = factor.icon;
            return (
              <div
                key={factor.label}
                className={`rounded-md border p-3 ${getFactorBadgeClasses(
                  factor.active,
                  factor.winning
                )}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <FactorIcon className="h-4 w-4" />
                    {factor.label}
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-background/70">
                    {factor.winning ? "Decidindo" : factor.badge}
                  </Badge>
                </div>
                <p className="mt-2 text-xs opacity-85">{factor.description}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={() => setDialogOpen(true)} disabled={loading}>
            <ShieldAlert className="h-4 w-4 mr-2" />
            Suspender acesso manualmente
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSubscriptionsOpen(true);
              setOpenCreateSignal((value) => value + 1);
            }}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Criar assinatura/pagamento
          </Button>
        </div>

        {isManualBlock && (
          <Button
            onClick={() =>
              mutate({
                acao: "reativar",
                observacao: "Suspensao manual desfeita pelo painel do aluno.",
              })
            }
            disabled={isMutating}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Desfazer suspensao manual
          </Button>
        )}

        <Collapsible open={subscriptionsOpen} onOpenChange={setSubscriptionsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <CreditCard className="h-4 w-4" />
              Assinaturas e pagamentos
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  subscriptionsOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <SubscriptionManager
              studentId={studentId}
              personalId={personalId}
              studentName={studentName}
              embedded
              createButtonLabel="Nova assinatura"
              openCreateSignal={openCreateSignal}
              onChanged={refresh}
            />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <History className="h-4 w-4" />
              Historico unificado de acesso ({logs.length})
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  historyOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <AccessHistoryList logs={logs} />
          </CollapsibleContent>
        </Collapsible>

        <ManageAccessDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          studentName={studentName}
          status={status}
          isMutating={isMutating}
          onConfirm={(p) => mutate(p)}
        />
      </CardContent>
    </Card>
  );
}

export function AccessStatusBadge({ studentId }: { studentId: string }) {
  const { status, loading } = useStudentAccess(studentId);
  if (loading) return null;
  const meta = STATUS_META[status] ?? STATUS_META.suspenso;
  const StatusIcon = meta.icon;
  return (
    <Badge variant="outline" className={`${meta.classes} border gap-1`}>
      <StatusIcon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}
