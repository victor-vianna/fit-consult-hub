import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

      const twentyFiveMonthsAgo = new Date();
      twentyFiveMonthsAgo.setMonth(twentyFiveMonthsAgo.getMonth() - 25);

      const { data: payments, error: paymentsError } = await supabase
        .from("payment_history")
        .select("*")
        .eq("personal_id", personalId)
        .gte("data_pagamento", twentyFiveMonthsAgo.toISOString());
      if (paymentsError) throw paymentsError;

      const studentIds = subscriptions?.map((s) => s.student_id) || [];
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
        payments?.filter((p) => {
          const d = new Date(p.data_pagamento);
          return d.getMonth() === month && d.getFullYear() === year;
        }) || [];

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
          mes: targetDate.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
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

      const previsaoReceita = assinaturasAtivas.reduce((sum, s) => sum + s.valor, 0);

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
      const recentPayments = payments
        ?.sort((a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime())
        .slice(0, 50) || [];

      const paymentDetailsMapped: PaymentDetail[] = recentPayments.map((p) => {
        const sub = subscriptions?.find((s) => s.id === p.subscription_id);
        const profile = profiles?.find((pr) => pr.id === p.student_id);

        // Extract parcela info from observacoes (e.g. "Parcela 1/3")
        const parcelaMatch = p.observacoes?.match(/Parcela (\d+\/\d+)/);
        const parcelaAtual = parcelaMatch ? parcelaMatch[1] : "1/1";

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
          metodo: p.metodo_pagamento || "—",
        };
      });

      // Add pending subscriptions as upcoming payments
      const pendingSubs = subscriptions?.filter(
        (s) => s.status_pagamento === "pendente" && new Date(s.data_expiracao) >= now
      ) || [];

      for (const sub of pendingSubs) {
        const profile = profiles?.find((pr) => pr.id === sub.student_id);
        paymentDetailsMapped.push({
          id: `pending-${sub.id}`,
          studentName: profile?.nome || "Desconhecido",
          plano: sub.plano,
          valorTotal: sub.valor,
          parcelas: sub.parcelas || 1,
          valorParcela: sub.valor / (sub.parcelas || 1),
          parcelaAtual: "—",
          dataPagamento: sub.data_expiracao,
          status: "pendente",
          metodo: "—",
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
