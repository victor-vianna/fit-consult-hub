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
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [inadimplentesList, setInadimplentesList] = useState<
    StudentPaymentStatus[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFinancialData = useCallback(async () => {
    if (!personalId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar todas as assinaturas do personal
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("personal_id", personalId);

      if (subsError) throw subsError;

      // Buscar histórico de pagamentos dos últimos 25 meses (12 atuais + 12 ano anterior + 1 margem)
      const twentyFiveMonthsAgo = new Date();
      twentyFiveMonthsAgo.setMonth(twentyFiveMonthsAgo.getMonth() - 25);

      const { data: payments, error: paymentsError } = await supabase
        .from("payment_history")
        .select("*")
        .eq("personal_id", personalId)
        .gte("data_pagamento", twentyFiveMonthsAgo.toISOString());

      if (paymentsError) throw paymentsError;

      // Buscar perfis dos alunos
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

      // Calcular métricas
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Helper: filtrar pagamentos por mês/ano
      const getPaymentsForMonth = (month: number, year: number) =>
        payments?.filter((p) => {
          const d = new Date(p.data_pagamento);
          return d.getMonth() === month && d.getFullYear() === year;
        }) || [];

      // Receita do mês atual
      const currentMonthPayments = getPaymentsForMonth(currentMonth, currentYear);
      const receitaMesAtual = currentMonthPayments.reduce((sum, p) => sum + p.valor, 0);

      // Receita do mês anterior
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const receitaMesAnterior = getPaymentsForMonth(lastMonth, lastMonthYear).reduce((sum, p) => sum + p.valor, 0);

      // Receita do mesmo mês no ano anterior
      const receitaMesmoMesAnoAnterior = getPaymentsForMonth(currentMonth, currentYear - 1).reduce((sum, p) => sum + p.valor, 0);

      // Comparação percentual (vs mês anterior)
      const comparacaoPercentual =
        receitaMesAnterior > 0
          ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100
          : 0;

      // Comparação anual (vs mesmo mês ano anterior)
      const comparacaoAnual =
        receitaMesmoMesAnoAnterior > 0
          ? ((receitaMesAtual - receitaMesmoMesAnoAnterior) / receitaMesmoMesAnoAnterior) * 100
          : 0;

      // Assinaturas ativas
      const assinaturasAtivas =
        subscriptions?.filter(
          (s) =>
            s.status_pagamento === "pago" && new Date(s.data_expiracao) > now
        ) || [];

      const previsaoReceita = assinaturasAtivas.reduce((sum, s) => sum + s.valor, 0);

      // Inadimplentes
      const inadimplentes =
        subscriptions?.filter(
          (s) =>
            s.status_pagamento === "atrasado" ||
            (s.status_pagamento === "pendente" && new Date(s.data_expiracao) < now)
        ) || [];

      const totalAlunos = subscriptions?.length || 0;
      const taxaInadimplencia =
        totalAlunos > 0 ? (inadimplentes.length / totalAlunos) * 100 : 0;

      const inadimplentesMapped: StudentPaymentStatus[] = inadimplentes.map((sub) => {
        const profile = profiles?.find((p) => p.id === sub.student_id);
        const dataExpiracao = new Date(sub.data_expiracao);
        const diasAtraso = Math.floor(
          (now.getTime() - dataExpiracao.getTime()) / (1000 * 60 * 60 * 24)
        );
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

      // Receita mensal dos últimos 12 meses + ano anterior
      const monthlyRevenueData: MonthlyRevenue[] = [];
      for (let i = 11; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - i);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        const monthPayments = getPaymentsForMonth(targetMonth, targetYear);
        const receita = monthPayments.reduce((sum, p) => sum + p.valor, 0);

        // Mesmo mês do ano anterior
        const prevYearPayments = getPaymentsForMonth(targetMonth, targetYear - 1);
        const receitaAnoAnterior = prevYearPayments.reduce((sum, p) => sum + p.valor, 0);

        monthlyRevenueData.push({
          mes: targetDate.toLocaleDateString("pt-BR", {
            month: "short",
            year: "numeric",
          }),
          receita,
          receitaAnoAnterior,
          pagamentos: monthPayments.length,
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
      });

      setMonthlyRevenue(monthlyRevenueData);
      setInadimplentesList(inadimplentesMapped);

      return { success: true };
    } catch (error: any) {
      console.error("Erro ao buscar dados financeiros:", error);
      return {
        success: false,
        error: "Não foi possível carregar os dados financeiros",
      };
    } finally {
      setLoading(false);
    }
  }, [personalId]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const result = await fetchFinancialData();
      if (isMounted && result && !result.success) {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive",
        });
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchFinancialData, toast]);

  return {
    metrics,
    monthlyRevenue,
    inadimplentesList,
    loading,
    refetch: fetchFinancialData,
  };
}
