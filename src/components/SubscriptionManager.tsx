import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSubscriptions, Subscription } from "@/hooks/useSubscriptions";
import { usePersonalPlanPrices, Plano } from "@/hooks/usePersonalPlanPrices";
import { useStripeConnectAccount } from "@/hooks/useStripeConnectAccount";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  calculatePlanDiscount,
  calculateNetAfterFees,
  DEFAULT_STRIPE_PROCESSING_FEES,
  formatCurrencyBRL,
  formatPercentBR,
  formatTotalStripeFeeRule,
  normalizeStripePaymentMethod,
} from "@/utils/billing";
import {
  CreditCard,
  Plus,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar as CalendarIcon,
  Edit,
  Trash2,
  MoreHorizontal,
  Ban,
  RotateCcw,
  ArrowLeftRight,
  ExternalLink,
  Copy,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  dateInputToIsoString,
  formatDateForInput,
  formatDisplayDateOnly,
  parseDateInputValue,
} from "@/utils/dateFormat";

interface SubscriptionManagerProps {
  studentId: string;
  personalId: string;
  studentName: string;
  embedded?: boolean;
  createButtonLabel?: string;
  showCreateButton?: boolean;
  openCreateSignal?: number;
  onChanged?: () => void;
}

const PLANOS = [
  { value: "mensal", label: "Mensal", meses: 1 },
  { value: "trimestral", label: "Trimestral", meses: 3 },
  { value: "semestral", label: "Semestral", meses: 6 },
  { value: "anual", label: "Anual", meses: 12 },
];

type StripeSubscriptionAction = "cancel_at_period_end" | "resume_renewal" | "cancel_now";

const STRIPE_ACTION_COPY: Record<
  StripeSubscriptionAction,
  { title: string; description: string; confirm: string; destructive?: boolean }
> = {
  cancel_at_period_end: {
    title: "Cancelar renovacao?",
    description:
      "A assinatura continua ativa ate o fim do ciclo atual e nao sera renovada automaticamente.",
    confirm: "Cancelar renovacao",
  },
  resume_renewal: {
    title: "Reativar renovacao?",
    description:
      "A assinatura volta a renovar automaticamente na Stripe enquanto o pagamento estiver ativo.",
    confirm: "Reativar",
  },
  cancel_now: {
    title: "Cancelar agora?",
    description:
      "A assinatura sera encerrada imediatamente na Stripe. Use apenas quando o acesso tambem deve ser encerrado agora.",
    confirm: "Cancelar agora",
    destructive: true,
  },
};

async function getFunctionErrorMessage(error: any) {
  const fallback = error?.message ?? "Tente novamente.";
  const context = error?.context;

  if (!context || typeof context.json !== "function") return fallback;

  try {
    const body = await context.json();
    return body?.error || body?.message || fallback;
  } catch {
    return fallback;
  }
}

export function SubscriptionManager({
  studentId,
  personalId,
  studentName,
  embedded = false,
  createButtonLabel = "Nova Assinatura",
  showCreateButton = true,
  openCreateSignal = 0,
  onChanged,
}: SubscriptionManagerProps) {
  const {
    subscriptions,
    loading,
    createSubscription,
    updateSubscription,
    registerPayment,
    deleteSubscription,
    getActiveSubscription,
    refetch,
  } = useSubscriptions(studentId, personalId);
  const { data: planPrices } = usePersonalPlanPrices(personalId);
  const { data: stripeStatus } = useStripeConnectAccount(personalId);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<string>("");
  const [subscriptionToEdit, setSubscriptionToEdit] = useState<Subscription | null>(null);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);
  const [stripeAction, setStripeAction] = useState<StripeSubscriptionAction | null>(null);
  const [stripeActionTarget, setStripeActionTarget] = useState<Subscription | null>(null);
  const [stripeActionLoading, setStripeActionLoading] = useState(false);
  const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false);
  const [changePlanTarget, setChangePlanTarget] = useState<Subscription | null>(null);
  const [newStripePlan, setNewStripePlan] = useState<Plano>("mensal");
  const [copyingPortalFor, setCopyingPortalFor] = useState<string | null>(null);

  // Form states
  const [plano, setPlano] = useState<string>("mensal");
  const [valor, setValor] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>(formatDateForInput(new Date()));
  const [observacoes, setObservacoes] = useState<string>("");

  // Edit form states
  const [editPlano, setEditPlano] = useState<string>("mensal");
  const [editValor, setEditValor] = useState<string>("");
  const [editDataExpiracao, setEditDataExpiracao] = useState<string>("");
  const [editDataPagamento, setEditDataPagamento] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("pendente");
  const [editObservacoes, setEditObservacoes] = useState<string>("");

  // Payment form states
  const [valorPagamento, setValorPagamento] = useState<string>("");
  const [dataPagamento, setDataPagamento] = useState<string>(formatDateForInput(new Date()));
  const [metodoPagamento, setMetodoPagamento] = useState<string>("");
  const [observacoesPagamento, setObservacoesPagamento] = useState<string>("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const platformFeePercent = stripeStatus?.billing_config.application_fee_percent ?? 0;
  const stripeProcessingFees =
    stripeStatus?.billing_config.stripe_processing_fees ?? DEFAULT_STRIPE_PROCESSING_FEES;
  const monthlyPlanValue = Number(
    planPrices?.find((price) => price.plano === "mensal")?.valor ?? 0
  );

  useEffect(() => {
    if (openCreateSignal > 0) {
      setDialogOpen(true);
    }
  }, [openCreateSignal]);

  const handleCreateSubscription = async () => {
    if (!valor || !plano) return;

    const dataExpiracao = parseDateInputValue(dataInicio);
    if (!dataExpiracao) return;

    const meses = PLANOS.find((p) => p.value === plano)?.meses || 1;
    dataExpiracao.setMonth(dataExpiracao.getMonth() + meses);

    await createSubscription({
      student_id: studentId,
      personal_id: personalId,
      plano: plano as any,
      valor: parseFloat(valor),
      data_pagamento: null,
      data_expiracao: dataExpiracao.toISOString(),
      observacoes: observacoes || null,
    });

    // Reset form
    setPlano("mensal");
    setValor("");
    setDataInicio(formatDateForInput(new Date()));
    setObservacoes("");
    setDialogOpen(false);
    onChanged?.();
  };

  const handleRegisterPayment = async () => {
    if (!selectedSubscription || !valorPagamento || paymentSubmitting) return;

    setPaymentSubmitting(true);
    try {
      await registerPayment(selectedSubscription, {
        valor: parseFloat(valorPagamento),
        data_pagamento: dataPagamento,
        metodo_pagamento: metodoPagamento || undefined,
        observacoes: observacoesPagamento || undefined,
      });

      // Reset form
      setValorPagamento("");
      setDataPagamento(formatDateForInput(new Date()));
      setMetodoPagamento("");
      setObservacoesPagamento("");
      setPaymentDialogOpen(false);
      onChanged?.();
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleOpenEdit = (sub: Subscription) => {
    setSubscriptionToEdit(sub);
    setEditPlano(sub.plano);
    setEditValor(sub.valor.toString());
    setEditDataExpiracao(formatDateForInput(sub.data_expiracao));
    setEditDataPagamento(formatDateForInput(sub.data_pagamento));
    setEditStatus(sub.status_pagamento);
    setEditObservacoes(sub.observacoes || "");
    setEditDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!subscriptionToEdit || !editValor) return;

    const novaDataPagamento = dateInputToIsoString(editDataPagamento);
    const novaDataExpiracao = dateInputToIsoString(editDataExpiracao);
    if (!novaDataExpiracao) return;

    await updateSubscription(subscriptionToEdit.id, {
      plano: editPlano as any,
      valor: parseFloat(editValor),
      data_expiracao: novaDataExpiracao,
      data_pagamento: novaDataPagamento,
      status_pagamento: editStatus as any,
      observacoes: editObservacoes || null,
    });

    setEditDialogOpen(false);
    setSubscriptionToEdit(null);
    onChanged?.();
  };

  const handleConfirmDelete = async () => {
    if (!subscriptionToDelete) return;
    await deleteSubscription(subscriptionToDelete);
    setDeleteDialogOpen(false);
    setSubscriptionToDelete(null);
    onChanged?.();
  };

  const refreshAfterStripeAction = async () => {
    await refetch();
    onChanged?.();
  };

  const invokeStripeAction = async (
    action: StripeSubscriptionAction | "change_plan" | "customer_portal",
    sub: Subscription,
    body: Record<string, unknown> = {}
  ) => {
    const { data, error } = await supabase.functions.invoke("stripe-manage-subscription", {
      body: {
        action,
        subscription_id: sub.id,
        return_url: window.location.href,
        ...body,
      },
    });

    if (error) throw new Error(await getFunctionErrorMessage(error));
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const openStripeActionConfirm = (sub: Subscription, action: StripeSubscriptionAction) => {
    setStripeActionTarget(sub);
    setStripeAction(action);
  };

  const handleConfirmStripeAction = async () => {
    if (!stripeAction || !stripeActionTarget) return;

    setStripeActionLoading(true);
    try {
      await invokeStripeAction(stripeAction, stripeActionTarget);
      const copy = STRIPE_ACTION_COPY[stripeAction];
      toast({
        title: "Acao enviada para a Stripe",
        description: copy.confirm,
      });
      await refreshAfterStripeAction();
      setStripeAction(null);
      setStripeActionTarget(null);
    } catch (e: any) {
      toast({
        title: "Erro na acao Stripe",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setStripeActionLoading(false);
    }
  };

  const handleOpenChangePlan = (sub: Subscription) => {
    setChangePlanTarget(sub);
    setNewStripePlan(sub.plano as Plano);
    setChangePlanDialogOpen(true);
  };

  const handleChangeStripePlan = async () => {
    if (!changePlanTarget || !newStripePlan) return;

    setStripeActionLoading(true);
    try {
      await invokeStripeAction("change_plan", changePlanTarget, { plano: newStripePlan });
      toast({
        title: "Plano alterado",
        description: "A assinatura foi atualizada na Stripe com rateio proporcional desativado.",
      });
      await refreshAfterStripeAction();
      setChangePlanDialogOpen(false);
      setChangePlanTarget(null);
    } catch (e: any) {
      toast({
        title: "Erro ao trocar plano",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setStripeActionLoading(false);
    }
  };

  const getCustomerPortalUrl = async (sub: Subscription) => {
    const data = await invokeStripeAction("customer_portal", sub);
    if (!data?.url) throw new Error("A Stripe nao retornou o link do portal.");
    return data.url as string;
  };

  const handleOpenCustomerPortal = async (sub: Subscription) => {
    setCopyingPortalFor(sub.id);
    try {
      const url = await getCustomerPortalUrl(sub);
      window.open(url, "_blank", "noopener,noreferrer");
      toast({
        title: "Portal do aluno aberto",
        description: "Use este link para atualizar pagamento, faturas e dados de cobranca.",
      });
    } catch (e: any) {
      toast({
        title: "Erro ao abrir portal",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCopyingPortalFor(null);
    }
  };

  const handleCopyCustomerPortal = async (sub: Subscription) => {
    setCopyingPortalFor(sub.id);
    try {
      const url = await getCustomerPortalUrl(sub);
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado",
        description: "Envie ao aluno para atualizar dados de pagamento ou consultar faturas.",
      });
    } catch (e: any) {
      toast({
        title: "Erro ao copiar link",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCopyingPortalFor(null);
    }
  };

  const getSubscriptionReferenceTime = (sub: Subscription) => {
    const value = sub.data_pagamento || sub.created_at || sub.data_expiracao;
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  };

  const hasLaterPaidSubscription = (sub: Subscription) => {
    const currentTime = getSubscriptionReferenceTime(sub);
    return subscriptions.some((other) => {
      if (other.id === sub.id || other.status_pagamento !== "pago") return false;
      return getSubscriptionReferenceTime(other) > currentTime;
    });
  };

  const getStatusBadge = (sub: Subscription) => {
    const expirada = new Date(sub.data_expiracao) < new Date();
    // Se a assinatura está marcada como paga mas a data já passou,
    // exibe "Não renovado" em vez de "Pago".
    if (sub.status_pagamento === "pago" && expirada) {
      if (hasLaterPaidSubscription(sub)) {
        return (
          <Badge className="bg-blue-500 text-white hover:bg-blue-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Renovado
          </Badge>
        );
      }

      return (
        <Badge className="bg-red-500 text-white hover:bg-red-500">
          <AlertCircle className="h-3 w-3 mr-1" />
          Vencido
        </Badge>
      );
    }
    switch (sub.status_pagamento) {
      case "pago":
        return (
          <Badge className="bg-green-500 text-white hover:bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pago
          </Badge>
        );
      case "pendente":
        return (
          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "atrasado":
        return (
          <Badge className="bg-red-500 text-white hover:bg-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            Vencido
          </Badge>
        );
      default:
        return null;
    }
  };

  const activeSubscription = getActiveSubscription();
  const activeStripePlanPrices = (planPrices ?? []).filter(
    (price) => price.ativo && price.stripe_price_id
  );
  const selectedChangePlanPrice = activeStripePlanPrices.find(
    (price) => price.plano === newStripePlan
  );
  const selectedChangePlanValue = Number(selectedChangePlanPrice?.valor ?? 0);
  const selectedChangeFee = calculateNetAfterFees({
    grossValue: selectedChangePlanValue,
    platformFeePercent,
    stripeMethod: "card",
    stripeFeeConfig: stripeProcessingFees,
  });
  const selectedChangeDiscount = calculatePlanDiscount(
    newStripePlan,
    selectedChangePlanValue,
    monthlyPlanValue
  );
  const stripeActionCopy = stripeAction ? STRIPE_ACTION_COPY[stripeAction] : null;

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Status Atual */}
      {activeSubscription && !embedded && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Plano Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plano:</span>
              <span className="font-semibold capitalize">
                {activeSubscription.plano}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-semibold">
                R$ {activeSubscription.valor.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expira em:</span>
              <span className="font-semibold">
                {formatDisplayDateOnly(activeSubscription.data_expiracao)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Nova Assinatura */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {showCreateButton && (
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {createButtonLabel}
            </Button>
          </DialogTrigger>
        )}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Assinatura</DialogTitle>
            <DialogDescription>
              Criar assinatura para {studentName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="plano">Plano</Label>
              <Select value={plano} onValueChange={setPlano}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANOS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="dataInicio">Data de Início</Label>
              <LocalizedDateInput
                id="dataInicio"
                value={dataInicio}
                onChange={setDataInicio}
                placeholder="Selecione a data de inicio"
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubscription}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de Assinaturas */}
      <Card className={embedded ? "border-0 bg-transparent shadow-none" : undefined}>
        <CardHeader className={embedded ? "px-0 pb-3" : undefined}>
          <CardTitle>{embedded ? "Pagamentos registrados" : "Historico de Assinaturas"}</CardTitle>
          {!embedded && (
            <CardDescription>
              Todas as assinaturas de {studentName}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={embedded ? "px-0" : undefined}>
          <div className="space-y-3">
            {subscriptions.map((sub) => {
              const isStripeSubscription = !!sub.stripe_subscription_id;
              const stripeMethod = normalizeStripePaymentMethod(
                sub.observacoes,
                isStripeSubscription,
              );
              const fee = calculateNetAfterFees({
                grossValue: Number(sub.valor) || 0,
                platformFeePercent,
                stripeMethod,
                stripeFeeConfig: stripeProcessingFees,
              });
              const cancellationScheduled = !!sub.cancela_no_fim_do_ciclo;
              const portalLoading = copyingPortalFor === sub.id;

              return (
              <Card
                key={sub.id}
                className={cn(
                  "transition-colors",
                  sub.status_pagamento === "pago" && new Date(sub.data_expiracao) > new Date()
                    ? "border-green-500/45 bg-green-500/5"
                    : "bg-card"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-semibold capitalize">
                          {sub.plano}
                        </span>
                        {getStatusBadge(sub)}
                        {isStripeSubscription && (
                          <Badge variant="outline" className="gap-1">
                            <CreditCard className="h-3 w-3" />
                            Stripe
                          </Badge>
                        )}
                        {cancellationScheduled && (
                          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                            Renovacao cancelada
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {sub.data_pagamento
                          ? `Pago em ${formatDisplayDateOnly(sub.data_pagamento)}`
                          : "Pagamento ainda nao registrado"}{" "}
                        - {new Date(sub.data_expiracao) < new Date() ? "Venceu" : "Vence"} em{" "}
                        {formatDisplayDateOnly(sub.data_expiracao)}
                        {sub.observacoes ? ` - ${sub.observacoes}` : ""}
                      </p>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                        <div className="rounded-md border bg-background/80 px-3 py-2">
                          <p className="text-muted-foreground">Cobrado</p>
                          <p className="font-semibold">{formatCurrencyBRL(fee.gross)}</p>
                        </div>
                        <div className="rounded-md border bg-background/80 px-3 py-2">
                          <p className="text-muted-foreground">Taxa Stripe</p>
                          <p className="font-semibold">{formatCurrencyBRL(fee.totalFees)}</p>
                          <p className="text-muted-foreground">
                            {formatTotalStripeFeeRule(platformFeePercent, fee.stripeFee)}
                          </p>
                        </div>
                        <div className="rounded-md border bg-background/80 px-3 py-2">
                          <p className="text-muted-foreground">Liquido final est.</p>
                          <p className="font-semibold">{formatCurrencyBRL(fee.netAfterFees)}</p>
                          <p className="text-muted-foreground">Apos taxas</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="min-w-[86px] text-right text-lg font-bold leading-tight">
                        {formatCurrencyBRL(Number(sub.valor) || 0)}
                      </div>
                      {sub.status_pagamento !== "pago" && (
                        <Dialog
                          open={
                            paymentDialogOpen && selectedSubscription === sub.id
                          }
                          onOpenChange={(open) => {
                            if (paymentSubmitting) return;
                            setPaymentDialogOpen(open);
                            if (open) {
                              setSelectedSubscription(sub.id);
                              setValorPagamento(sub.valor.toString());
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pagar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Registrar Pagamento</DialogTitle>
                              <DialogDescription>
                                Registrar pagamento da assinatura {sub.plano}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="valorPagamento">Valor (R$)</Label>
                                <Input
                                  id="valorPagamento"
                                  type="number"
                                  step="0.01"
                                  value={valorPagamento}
                                  onChange={(e) =>
                                    setValorPagamento(e.target.value)
                                  }
                                />
                              </div>

                              <div>
                                <Label htmlFor="dataPagamento">
                                  Data do Pagamento
                                </Label>
                                <LocalizedDateInput
                                  id="dataPagamento"
                                  value={dataPagamento}
                                  onChange={setDataPagamento}
                                  placeholder="Selecione a data do pagamento"
                                />
                              </div>

                              <div>
                                <Label htmlFor="metodoPagamento">
                                  Método de Pagamento
                                </Label>
                                <Select
                                  value={metodoPagamento}
                                  onValueChange={setMetodoPagamento}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="cartao">
                                      Cartão de Crédito
                                    </SelectItem>
                                    <SelectItem value="boleto">Boleto</SelectItem>
                                    <SelectItem value="dinheiro">
                                      Dinheiro
                                    </SelectItem>
                                    <SelectItem value="transferencia">
                                      Transferência
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="observacoesPagamento">
                                  Observações
                                </Label>
                                <Textarea
                                  id="observacoesPagamento"
                                  value={observacoesPagamento}
                                  onChange={(e) =>
                                    setObservacoesPagamento(e.target.value)
                                  }
                                  placeholder="Observações sobre o pagamento..."
                                />
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setPaymentDialogOpen(false)}
                                disabled={paymentSubmitting}
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleRegisterPayment}
                                disabled={paymentSubmitting || !valorPagamento}
                              >
                                {paymentSubmitting ? "Registrando..." : "Confirmar Pagamento"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {isStripeSubscription && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              disabled={stripeActionLoading || portalLoading}
                            >
                              {portalLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel>Ações Stripe</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleOpenChangePlan(sub)}>
                              <ArrowLeftRight className="mr-2 h-4 w-4" />
                              Trocar plano
                            </DropdownMenuItem>
                            {cancellationScheduled ? (
                              <DropdownMenuItem
                                onSelect={() => openStripeActionConfirm(sub, "resume_renewal")}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reativar renovação
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onSelect={() => openStripeActionConfirm(sub, "cancel_at_period_end")}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Cancelar renovação
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(event) => {
                                event.preventDefault();
                                handleOpenCustomerPortal(sub);
                              }}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Abrir portal do aluno
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(event) => {
                                event.preventDefault();
                                handleCopyCustomerPortal(sub);
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar link do portal
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => openStripeActionConfirm(sub, "cancel_now")}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar agora
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Botão Editar */}
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => handleOpenEdit(sub)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {/* Botão Excluir */}
                      <Button 
                        size="icon" 
                        variant="outline"
                        className="border-red-500/30 text-destructive hover:bg-red-500/10 hover:text-destructive"
                        onClick={() => {
                          setSubscriptionToDelete(sub.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                </CardContent>
              </Card>
              );
            })}

            {subscriptions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma assinatura registrada
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription>
              Altere os dados da assinatura
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Plano</Label>
              <Select value={editPlano} onValueChange={setEditPlano}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANOS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={editValor}
                onChange={(e) => setEditValor(e.target.value)}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de Pagamento</Label>
              <LocalizedDateInput
                value={editDataPagamento}
                onChange={setEditDataPagamento}
                placeholder="Selecione a data do pagamento"
                allowClear
              />
            </div>

            <div>
              <Label>Data de Expiração</Label>
              <LocalizedDateInput
                value={editDataExpiracao}
                onChange={setEditDataExpiracao}
                placeholder="Selecione a data de expiracao"
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                placeholder="Observações..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateSubscription}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={changePlanDialogOpen}
        onOpenChange={(open) => {
          setChangePlanDialogOpen(open);
          if (!open) setChangePlanTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar plano na Stripe</DialogTitle>
            <DialogDescription>
              Atualiza a assinatura real do aluno com rateio proporcional desativado. Em troca de
              periodicidade, a Stripe pode reiniciar o ciclo e cobrar o novo periodo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Novo plano</Label>
              <Select
                value={newStripePlan}
                onValueChange={(value) => setNewStripePlan(value as Plano)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANOS.map((p) => {
                    const price = activeStripePlanPrices.find((item) => item.plano === p.value);
                    return (
                      <SelectItem key={p.value} value={p.value} disabled={!price}>
                        {p.label}
                        {price ? ` - ${formatCurrencyBRL(Number(price.valor) || 0)}` : " - nao sincronizado"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-md border bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Novo valor</p>
                <p className="font-semibold">{formatCurrencyBRL(selectedChangeFee.gross)}</p>
              </div>
              <div className="rounded-md border bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Taxa Stripe</p>
                <p className="font-semibold">{formatCurrencyBRL(selectedChangeFee.totalFees)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTotalStripeFeeRule(platformFeePercent, selectedChangeFee.stripeFee)}
                </p>
              </div>
              <div className="rounded-md border bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Liquido final est.</p>
                <p className="font-semibold">{formatCurrencyBRL(selectedChangeFee.netAfterFees)}</p>
                <p className="text-xs text-muted-foreground">Apos taxas</p>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Desconto vs mensal</p>
              <p className="text-muted-foreground">
                Valor cheio: {formatCurrencyBRL(selectedChangeDiscount.fullValue)}. Desconto:{" "}
                {formatCurrencyBRL(selectedChangeDiscount.discountValue)} (
                {formatPercentBR(selectedChangeDiscount.discountPercent)}).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangePlanDialogOpen(false)}
              disabled={stripeActionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangeStripePlan}
              disabled={stripeActionLoading || !selectedChangePlanPrice}
            >
              {stripeActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Trocar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!stripeAction}
        onOpenChange={(open) => {
          if (!open && !stripeActionLoading) {
            setStripeAction(null);
            setStripeActionTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{stripeActionCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {stripeActionCopy?.description}
              {stripeActionTarget?.data_expiracao
                ? ` Ciclo atual: ${formatDisplayDateOnly(stripeActionTarget.data_expiracao)}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stripeActionLoading}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleConfirmStripeAction();
              }}
              disabled={stripeActionLoading}
              className={
                stripeActionCopy?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {stripeActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {stripeActionCopy?.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta assinatura? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface LocalizedDateInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  allowClear?: boolean;
}

function LocalizedDateInput({
  id,
  value,
  onChange,
  placeholder,
  allowClear = false,
}: LocalizedDateInputProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateInputValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          <span>{value ? formatDisplayDateOnly(value) : placeholder}</span>
          <CalendarIcon className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DateCalendar
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={(date) => {
            if (!date) return;
            onChange(formatDateForInput(date));
            setOpen(false);
          }}
          initialFocus
        />
        {allowClear && value && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Limpar data
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

