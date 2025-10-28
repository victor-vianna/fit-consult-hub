import { useState, useEffect } from "react";
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
}

export interface MonthlyRevenue {
  mes: string;
  receita: number;
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
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [inadimplentesList, setInadimplentesList] = useState<
    StudentPaymentStatus[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (personalId) {
      fetchFinancialData();
    }
  }, [personalId]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Buscar todas as assinaturas do personal
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("personal_id", personalId);

      if (subsError) throw subsError;

      // Buscar histórico de pagamentos dos últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: payments, error: paymentsError } = await supabase
        .from("payment_history")
        .select("*")
        .eq("personal_id", personalId)
        .gte("data_pagamento", sixMonthsAgo.toISOString());

      if (paymentsError) throw paymentsError;

      // Buscar perfis dos alunos
      const studentIds = subscriptions?.map((s) => s.student_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", studentIds);

      if (profilesError) throw profilesError;

      // Calcular métricas
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Receita do mês atual
      const receitaMesAtual =
        payments
          ?.filter((p) => {
            const paymentDate = new Date(p.data_pagamento);
            return (
              paymentDate.getMonth() === currentMonth &&
              paymentDate.getFullYear() === currentYear
            );
          })
          .reduce((sum, p) => sum + p.valor, 0) || 0;

      // Receita do mês anterior
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const receitaMesAnterior =
        payments
          ?.filter((p) => {
            const paymentDate = new Date(p.data_pagamento);
            return (
              paymentDate.getMonth() === lastMonth &&
              paymentDate.getFullYear() === lastMonthYear
            );
          })
          .reduce((sum, p) => sum + p.valor, 0) || 0;

      // Comparação percentual
      const comparacaoPercentual =
        receitaMesAnterior > 0
          ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100
          : 0;

      // Assinaturas ativas (pagas e não expiradas)
      const assinaturasAtivas =
        subscriptions?.filter(
          (s) =>
            s.status_pagamento === "pago" && new Date(s.data_expiracao) > now
        ) || [];

      // Previsão de receita (soma dos valores das assinaturas ativas)
      const previsaoReceita = assinaturasAtivas.reduce(
        (sum, s) => sum + s.valor,
        0
      );

      // Alunos inadimplentes (status atrasado ou expirado)
      const inadimplentes =
        subscriptions?.filter(
          (s) =>
            s.status_pagamento === "atrasado" ||
            (s.status_pagamento === "pendente" &&
              new Date(s.data_expiracao) < now)
        ) || [];

      // Taxa de inadimplência
      const totalAlunos = subscriptions?.length || 0;
      const taxaInadimplencia =
        totalAlunos > 0 ? (inadimplentes.length / totalAlunos) * 100 : 0;

      // Criar lista de inadimplentes com informações dos alunos
      const inadimplentesList: StudentPaymentStatus[] = inadimplentes.map(
        (sub) => {
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
            status_pagamento: sub.status_pagamento,
            data_expiracao: sub.data_expiracao,
            diasAtraso: diasAtraso > 0 ? diasAtraso : 0,
          };
        }
      );

      // Receita mensal dos últimos 6 meses
      const monthlyRevenueData: MonthlyRevenue[] = [];
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - i);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        const monthPayments =
          payments?.filter((p) => {
            const paymentDate = new Date(p.data_pagamento);
            return (
              paymentDate.getMonth() === targetMonth &&
              paymentDate.getFullYear() === targetYear
            );
          }) || [];

        const receita = monthPayments.reduce((sum, p) => sum + p.valor, 0);

        monthlyRevenueData.push({
          mes: targetDate.toLocaleDateString("pt-BR", {
            month: "short",
            year: "numeric",
          }),
          receita,
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
      });

      setMonthlyRevenue(monthlyRevenueData);
      setInadimplentesList(inadimplentesList);
    } catch (error: any) {
      console.error("Erro ao buscar dados financeiros:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    monthlyRevenue,
    inadimplentesList,
    loading,
    refetch: fetchFinancialData,
  };
}
