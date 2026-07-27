import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDisplayMonthYear } from "@/utils/dateFormat";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type FinancialSubscriptionRow = {
  id: string;
  student_id?: string | null;
  plano?: string | null;
  valor?: number | null;
  parcelas?: number | null;
  status_pagamento?: string | null;
  data_expiracao?: string | null;
  stripe_account_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_subscription_id?: string | null;
};

type FinancialPaymentRow = {
  id: string;
  subscription_id: string;
  student_id: string;
  personal_id: string;
  valor: number;
  data_pagamento: string;
  metodo_pagamento: string | null;
  observacoes: string | null;
  created_at?: string | null;
  stripe_account_id?: string | null;
  stripe_invoice_id?: string | null;
  stripe_application_fee_amount?: number | null;
  stripe_payment_method_type?: string | null;
  stripe_processing_fee_amount?: number | null;
  stripe_net_amount?: number | null;
};

export interface FinancialMetrics {
  receitaMesAtual: number;
  receitaMesAnterior: number;
  previsaoReceita: number;
  taxaInadimplencia: number;
  totalAlunosAtivos: number;
  totalAlunosInadimplentes: number;
  comparacaoPercentual: number;
  receitaMesmoMesAnoAnterior: number;
  comparacaoAnual: number;
  receitaUltimos12Meses: number;
  receitaUltimos12MesesAnoAnterior: number;
  crescimentoAnual12Meses: number;
}

export interface MonthlyRevenue {
  mes: string;
  receita: number;
  receitaAnoAnterior: number;
  pagamentos: number;
}

export interface StudentPaymentStatus {
  id: string;
  nome: string;
  email: string;
  valor: number;
  status_pagamento: "pago" | "pendente" | "atrasado";
  data_expiracao: string;
  diasAtraso: number;
}

export interface PaymentDetail {
  id: string;
  studentName: string;
  plano: string;
  valorTotal: number;
  parcelas: number;
  valorParcela: number;
  parcelaAtual: string;
  dataPagamento: string;
  status: string;
  metodo: string;
  platformFeeAmount: number | null;
  stripePaymentMethodType: string | null;
  stripeProcessingFeeAmount: number | null;
  stripeNetAmount: number | null;
  isStripePayment: boolean;
  paymentOrigin: "stripe" | "manual";
}

const normalizePaymentText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const roundCurrency = (value: number) => Math.round(Number(value || 0) * 100) / 100;

const getPaymentDateKey = (date: string) => {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return String(date || "");
  return parsed.toISOString().split("T")[0];
};

const getPaymentTimestamp = (payment: FinancialPaymentRow) => {
  const paymentTime = new Date(payment.data_pagamento).getTime();
  if (Number.isFinite(paymentTime)) return paymentTime;
  const createdTime = payment.created_at ? new Date(payment.created_at).getTime() : NaN;
  return Number.isFinite(createdTime) ? createdTime : 0;
};

const hasInstallmentMarker = (payment: FinancialPaymentRow) =>
  /parcela\s+\d+\s*\/\s*\d+/i.test(payment.observacoes ?? "");

const isAutoEditGeneratedPayment = (payment: FinancialPaymentRow) => {
  const observation = normalizePaymentText(payment.observacoes);
  const method = normalizePaymentText(payment.metodo_pagamento);

  return (
    !method &&
    observation.includes("pagamento registrado") &&
    observation.includes("assinatura")
  );
};

const getPlanRepeatIntervalDays = (subscription?: FinancialSubscriptionRow) => {
  switch (subscription?.plano) {
    case "mensal":
      return 25;
    case "trimestral":
      return 75;
    case "semestral":
      return 150;
    case "anual":
      return 300;
    default:
      return 2;
  }
};

const isFullPlanPayment = (
  payment: FinancialPaymentRow,
  subscription?: FinancialSubscriptionRow
) => {
  if (typeof subscription?.valor !== "number") return false;
  return Math.abs(roundCurrency(payment.valor) - roundCurrency(subscription.valor)) <= 0.01;
};

const getCanonicalPaymentScore = (payment: FinancialPaymentRow) => {
  let score = 0;
  if (!isAutoEditGeneratedPayment(payment)) score += 4;
  if (normalizePaymentText(payment.metodo_pagamento)) score += 2;
  if (normalizePaymentText(payment.observacoes)) score += 1;
  return score;
};

const shouldReplaceCanonicalPayment = (
  current: FinancialPaymentRow,
  candidate: FinancialPaymentRow
) => getCanonicalPaymentScore(candidate) > getCanonicalPaymentScore(current);

function getCanonicalRevenuePayments(
  payments: FinancialPaymentRow[],
  subscriptions: FinancialSubscriptionRow[]
) {
  const subscriptionsById = new Map(subscriptions.map((sub) => [sub.id, sub]));
  const exactKeys = new Set<string>();
  const stripeInvoiceKeys = new Set<string>();
  const acceptedFullCyclePayments = new Map<string, FinancialPaymentRow[]>();
  const acceptedPayments: FinancialPaymentRow[] = [];

  for (const payment of [...payments].sort(
    (a, b) => getPaymentTimestamp(a) - getPaymentTimestamp(b)
  )) {
    const stripeInvoiceId = payment.stripe_invoice_id;
    if (stripeInvoiceId) {
      const stripeKey = `${payment.stripe_account_id ?? "platform"}:${stripeInvoiceId}`;
      if (stripeInvoiceKeys.has(stripeKey)) continue;
      stripeInvoiceKeys.add(stripeKey);
    }

    const exactKey = [
      payment.subscription_id,
      payment.student_id,
      getPaymentDateKey(payment.data_pagamento),
      roundCurrency(payment.valor).toFixed(2),
      normalizePaymentText(payment.metodo_pagamento),
      normalizePaymentText(payment.observacoes),
      stripeInvoiceId ?? "",
    ].join("|");

    if (exactKeys.has(exactKey)) continue;
    exactKeys.add(exactKey);

    const subscription = subscriptionsById.get(payment.subscription_id);
    if (
      subscription &&
      !stripeInvoiceId &&
      !hasInstallmentMarker(payment) &&
      isFullPlanPayment(payment, subscription)
    ) {
      const fullCycleKey = `${payment.subscription_id}:${roundCurrency(payment.valor).toFixed(2)}`;
      const accepted = acceptedFullCyclePayments.get(fullCycleKey) ?? [];
      const paymentTime = getPaymentTimestamp(payment);
      const minIntervalMs = getPlanRepeatIntervalDays(subscription) * DAY_IN_MS;
      const duplicate = accepted.find(
        (acceptedPayment) =>
          Math.abs(paymentTime - getPaymentTimestamp(acceptedPayment)) < minIntervalMs
      );

      if (duplicate) {
        if (shouldReplaceCanonicalPayment(duplicate, payment)) {
          const acceptedIndex = accepted.findIndex((item) => item.id === duplicate.id);
          const paymentIndex = acceptedPayments.findIndex((item) => item.id === duplicate.id);

          if (acceptedIndex >= 0) accepted[acceptedIndex] = payment;
          if (paymentIndex >= 0) acceptedPayments[paymentIndex] = payment;
        }
        continue;
      }

      accepted.push(payment);
      acceptedFullCyclePayments.set(fullCycleKey, accepted);
    }

    acceptedPayments.push(payment);
  }

  return acceptedPayments;
}

export function useFinancialDashboard(personalId: string) {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    receitaMesAtual: 0,
    receitaMesAnterior: 0,
    previsaoReceita: 0,
    taxaInadimplencia: 0,
    totalAlunosAtivos: 0,
    totalAlunosInadimplentes: 0,
    comparacaoPercentual: 0,
    receitaMesmoMesAnoAnterior: 0,
    comparacaoAnual: 0,
    receitaUltimos12Meses: 0,
    receitaUltimos12MesesAnoAnterior: 0,
    crescimentoAnual12Meses: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [inadimplentesList, setInadimplentesList] = useState<StudentPaymentStatus[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFinancialData = useCallback(async () => {
    if (!personalId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("personal_id", personalId);
      if (subsError) throw subsError;

      const { data: payments, error: paymentsError } = await supabase
        .from("payment_history")
        .select("*")
        .eq("personal_id", personalId);
      if (paymentsError) throw paymentsError;

      const subscriptionRows = (subscriptions || []) as unknown as FinancialSubscriptionRow[];
      const revenuePayments = getCanonicalRevenuePayments(
        (payments || []) as unknown as FinancialPaymentRow[],
        subscriptionRows
      );

      const studentIds = Array.from(
        new Set([
          ...((subscriptions || []).map((s) => s.student_id)),
          ...revenuePayments.map((payment) => payment.student_id),
        ])
      );
      let profiles: { id: string; nome: string; email: string }[] = [];
      if (studentIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, nome, email")
          .in("id", studentIds);
        if (profilesError) throw profilesError;
        profiles = profilesData || [];
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const getPaymentsForMonth = (month: number, year: number) =>
        revenuePayments.filter((p) => {
          const d = new Date(p.data_pagamento);
          return d.getMonth() === month && d.getFullYear() === year;
        });

      // Receita mês atual e anterior
      const currentMonthPayments = getPaymentsForMonth(currentMonth, currentYear);
      const receitaMesAtual = currentMonthPayments.reduce((sum, p) => sum + p.valor, 0);

      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const receitaMesAnterior = getPaymentsForMonth(lastMonth, lastMonthYear).reduce((sum, p) => sum + p.valor, 0);

      const receitaMesmoMesAnoAnterior = getPaymentsForMonth(currentMonth, currentYear - 1).reduce((sum, p) => sum + p.valor, 0);

      const comparacaoPercentual =
        receitaMesAnterior > 0
          ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100
          : 0;

      const comparacaoAnual =
        receitaMesmoMesAnoAnterior > 0
          ? ((receitaMesAtual - receitaMesmoMesAnoAnterior) / receitaMesmoMesAnoAnterior) * 100
          : 0;

      // Receita últimos 12 meses
      let receitaUltimos12Meses = 0;
      let receitaUltimos12MesesAnoAnterior = 0;

      const monthlyRevenueData: MonthlyRevenue[] = [];
      for (let i = 11; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - i);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        const monthPayments = getPaymentsForMonth(targetMonth, targetYear);
        const receita = monthPayments.reduce((sum, p) => sum + p.valor, 0);
        receitaUltimos12Meses += receita;

        const prevYearPayments = getPaymentsForMonth(targetMonth, targetYear - 1);
        const receitaAnoAnterior = prevYearPayments.reduce((sum, p) => sum + p.valor, 0);
        receitaUltimos12MesesAnoAnterior += receitaAnoAnterior;

        monthlyRevenueData.push({
          mes: formatDisplayMonthYear(targetDate),
          receita,
          receitaAnoAnterior,
          pagamentos: monthPayments.length,
        });
      }

      const crescimentoAnual12Meses =
        receitaUltimos12MesesAnoAnterior > 0
          ? ((receitaUltimos12Meses - receitaUltimos12MesesAnoAnterior) / receitaUltimos12MesesAnoAnterior) * 100
          : 0;

      // Assinaturas ativas e inadimplentes
      const assinaturasAtivas = subscriptions?.filter(
        (s) => s.status_pagamento === "pago" && new Date(s.data_expiracao) > now
      ) || [];

      // Previsão mensal = receita já recebida no mês + valor esperado das
      // assinaturas (ativas ou pendentes) que renovam dentro do mês atual e
      // ainda não foram pagas neste mês.
      const inicioMes = new Date(currentYear, currentMonth, 1);
      const fimMes = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      const subsIdsPagasNoMes = new Set(currentMonthPayments.map((p) => p.subscription_id));
      const aReceberNoMes = (subscriptions ?? [])
        .filter((s) => {
          if (s.status_pagamento === "atrasado") return true;
          const exp = new Date(s.data_expiracao);
          const venceNoMes = exp >= inicioMes && exp <= fimMes;
          return venceNoMes && !subsIdsPagasNoMes.has(s.id);
        })
        .reduce((sum, s) => sum + (s.valor || 0), 0);
      const previsaoReceita = receitaMesAtual + aReceberNoMes;

      const inadimplentes = subscriptions?.filter(
        (s) =>
          s.status_pagamento === "atrasado" ||
          (s.status_pagamento === "pendente" && new Date(s.data_expiracao) < now)
      ) || [];

      const totalAlunos = subscriptions?.length || 0;
      const taxaInadimplencia = totalAlunos > 0 ? (inadimplentes.length / totalAlunos) * 100 : 0;

      const inadimplentesMapped: StudentPaymentStatus[] = inadimplentes.map((sub) => {
        const profile = profiles?.find((p) => p.id === sub.student_id);
        const dataExpiracao = new Date(sub.data_expiracao);
        const diasAtraso = Math.floor((now.getTime() - dataExpiracao.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: sub.student_id,
          nome: profile?.nome || "Desconhecido",
          email: profile?.email || "",
          valor: sub.valor,
          status_pagamento: sub.status_pagamento as "pago" | "pendente" | "atrasado",
          data_expiracao: sub.data_expiracao,
          diasAtraso: diasAtraso > 0 ? diasAtraso : 0,
        };
      });

      // Detalhes de pagamentos com info de parcelas
      const recentPayments = [...revenuePayments].sort(
        (a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime()
      );

      const paymentDetailsMapped: PaymentDetail[] = recentPayments.map((p) => {
        const sub = subscriptions?.find((s) => s.id === p.subscription_id);
        const profile = profiles?.find((pr) => pr.id === p.student_id);

        // Extract parcela info from observacoes (e.g. "Parcela 1/3")
        const parcelaMatch = p.observacoes?.match(/Parcela (\d+\/\d+)/);
        const parcelaAtual = parcelaMatch ? parcelaMatch[1] : "1/1";
        const isStripePayment =
          !!p.stripe_invoice_id ||
          !!p.stripe_account_id ||
          !!p.stripe_payment_method_type ||
          normalizePaymentText(p.metodo_pagamento).includes("stripe");

        return {
          id: p.id,
          studentName: profile?.nome || "Desconhecido",
          plano: sub?.plano || "—",
          valorTotal: sub?.valor || p.valor,
          parcelas: sub?.parcelas || 1,
          valorParcela: p.valor,
          parcelaAtual,
          dataPagamento: p.data_pagamento,
          status: "pago",
          metodo: p.stripe_payment_method_type
            ? `stripe_${p.stripe_payment_method_type}`
            : p.metodo_pagamento || "—",
          platformFeeAmount:
            typeof p.stripe_application_fee_amount === "number"
              ? Number(p.stripe_application_fee_amount)
              : null,
          stripePaymentMethodType: p.stripe_payment_method_type ?? null,
          stripeProcessingFeeAmount:
            typeof p.stripe_processing_fee_amount === "number"
              ? Number(p.stripe_processing_fee_amount)
              : null,
          stripeNetAmount:
            typeof p.stripe_net_amount === "number"
              ? Number(p.stripe_net_amount)
              : null,
          isStripePayment,
          paymentOrigin: isStripePayment ? "stripe" : "manual",
        };
      });

      // Add pending subscriptions as upcoming payments
      const pendingSubs = ((subscriptions || []) as unknown as FinancialSubscriptionRow[]).filter(
        (s) =>
          s.status_pagamento === "pendente" &&
          !!s.data_expiracao &&
          new Date(s.data_expiracao) >= now &&
          !!(s.stripe_checkout_session_id || s.stripe_subscription_id || s.stripe_account_id)
      ) || [];

      for (const sub of pendingSubs) {
        const profile = profiles?.find((pr) => pr.id === sub.student_id);
        paymentDetailsMapped.push({
          id: `pending-${sub.id}`,
          studentName: profile?.nome || "Desconhecido",
          plano: sub.plano || "—",
          valorTotal: sub.valor || 0,
          parcelas: sub.parcelas || 1,
          valorParcela: (sub.valor || 0) / (sub.parcelas || 1),
          parcelaAtual: "—",
          dataPagamento: sub.data_expiracao || new Date().toISOString(),
          status: "pendente",
          metodo: "stripe_pending",
          platformFeeAmount: null,
          stripePaymentMethodType: null,
          stripeProcessingFeeAmount: null,
          stripeNetAmount: null,
          isStripePayment: true,
          paymentOrigin: "stripe",
        });
      }

      setMetrics({
        receitaMesAtual,
        receitaMesAnterior,
        previsaoReceita,
        taxaInadimplencia,
        totalAlunosAtivos: assinaturasAtivas.length,
        totalAlunosInadimplentes: inadimplentes.length,
        comparacaoPercentual,
        receitaMesmoMesAnoAnterior,
        comparacaoAnual,
        receitaUltimos12Meses,
        receitaUltimos12MesesAnoAnterior,
        crescimentoAnual12Meses,
      });

      setMonthlyRevenue(monthlyRevenueData);
      setInadimplentesList(inadimplentesMapped);
      setPaymentDetails(paymentDetailsMapped);

      return { success: true };
    } catch (error: any) {
      console.error("Erro ao buscar dados financeiros:", error);
      return { success: false, error: "Não foi possível carregar os dados financeiros" };
    } finally {
      setLoading(false);
    }
  }, [personalId]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const result = await fetchFinancialData();
      if (isMounted && result && !result.success) {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [fetchFinancialData, toast]);

  return {
    metrics,
    monthlyRevenue,
    inadimplentesList,
    paymentDetails,
    loading,
    refetch: fetchFinancialData,
  };
}
