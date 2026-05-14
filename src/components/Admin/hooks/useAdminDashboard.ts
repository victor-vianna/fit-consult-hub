import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MONTHS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export interface DashboardData {
  metrics: {
    totalPersonals: number;
    totalAlunos: number;
    totalAdmins: number;
    totalUsuarios: number;
    assinaturasAtivas: number;
    assinaturasTrial: number;
    mrrTotal: number;
    receitaMesAtual: number;
    cancelamentosMes: number;
    novosPersonalsMes: number;
    ticketMedio: number;
    churnAtual: number;
  };
  churnSerie: { mes: string; taxaChurn: number; cancelamentos: number; assinaturasInicio: number }[];
  receitaSerie: { mes: string; receita: number }[];
  assinaturasRecentes: {
    id: string;
    nome: string;
    email: string;
    plano: string;
    preco: number;
    status: string;
    trial: boolean;
    dataInicio: string;
  }[];
}

async function fetchDashboard(): Promise<DashboardData> {
  const now = new Date();
  const anoAtual = now.getFullYear();
  const mesAtual = now.getMonth();
  const inicioMes = new Date(anoAtual, mesAtual, 1);
  const fimMes = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59);
  const inicio6m = new Date(anoAtual, mesAtual - 5, 1);

  // Tudo em paralelo
  const [
    rolesRes,
    assinaturasRes,
    pagamentosMesRes,
    pagamentos6mRes,
    cancelamentosMesRes,
    novosProfilesRes,
  ] = await Promise.all([
    supabase.from("user_roles").select("role, user_id"),
    supabase
      .from("assinaturas")
      .select(`*, personal:profiles!assinaturas_personal_id_fkey(nome, email), plano:planos(nome, preco_mensal)`)
      .order("created_at", { ascending: false }),
    supabase
      .from("pagamentos")
      .select("valor")
      .eq("status", "pago")
      .gte("data_pagamento", inicioMes.toISOString())
      .lte("data_pagamento", fimMes.toISOString()),
    supabase
      .from("pagamentos")
      .select("valor, data_pagamento")
      .eq("status", "pago")
      .gte("data_pagamento", inicio6m.toISOString()),
    supabase
      .from("assinaturas")
      .select("id")
      .eq("status", "cancelada")
      .gte("data_cancelamento", inicioMes.toISOString())
      .lte("data_cancelamento", fimMes.toISOString()),
    supabase
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", inicioMes.toISOString())
      .lte("created_at", fimMes.toISOString()),
  ]);

  const roles = rolesRes.data ?? [];
  const personals = roles.filter((r) => r.role === "personal");
  const alunos = roles.filter((r) => r.role === "aluno");
  const admins = roles.filter((r) => r.role === "admin");
  const personalIds = new Set(personals.map((r) => r.user_id));

  const assinaturas = assinaturasRes.data ?? [];
  const ativas = assinaturas.filter((a) => a.status === "ativa");
  const trial = assinaturas.filter((a) => a.status === "trial");

  const mrrTotal = ativas.reduce((s, a) => s + (a.valor_mensal || 0), 0);
  const receitaMesAtual = (pagamentosMesRes.data ?? []).reduce(
    (s, p) => s + (p.valor || 0),
    0
  );
  const cancelamentosMes = cancelamentosMesRes.data?.length ?? 0;
  const novosPersonalsMes = (novosProfilesRes.data ?? []).filter((p) =>
    personalIds.has(p.id)
  ).length;

  // Série de receita 6 meses (cliente-side, agrupando)
  const receitaSerie: { mes: string; receita: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(anoAtual, mesAtual - i, 1);
    const refFim = new Date(anoAtual, mesAtual - i + 1, 0, 23, 59, 59);
    const total = (pagamentos6mRes.data ?? [])
      .filter((p) => {
        const d = new Date(p.data_pagamento);
        return d >= ref && d <= refFim;
      })
      .reduce((s, p) => s + (p.valor || 0), 0);
    receitaSerie.push({
      mes: `${MONTHS_PT[ref.getMonth()]}`,
      receita: total,
    });
  }

  // Série de churn 6 meses (paralelo via RPC)
  const churnRefs = Array.from({ length: 6 }, (_, idx) => {
    const ref = new Date(anoAtual, mesAtual - (5 - idx), 1);
    return ref;
  });
  const churnResults = await Promise.all(
    churnRefs.map((ref) =>
      supabase.rpc("calcular_churn_mensal", {
        mes_referencia: ref.toISOString().slice(0, 10),
      })
    )
  );
  const churnSerie = churnRefs.map((ref, idx) => {
    const row = (churnResults[idx].data as any)?.[0];
    return {
      mes: MONTHS_PT[ref.getMonth()],
      taxaChurn: Number(row?.taxa_churn ?? 0),
      cancelamentos: Number(row?.cancelamentos ?? 0),
      assinaturasInicio: Number(row?.assinaturas_inicio ?? 0),
    };
  });

  const churnAtual = churnSerie[churnSerie.length - 1]?.taxaChurn ?? 0;

  const assinaturasRecentes = assinaturas
    .filter((a) => a.status === "ativa" || a.status === "trial")
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      nome: a.personal?.nome ?? "N/A",
      email: a.personal?.email ?? "N/A",
      plano: a.plano?.nome ?? "N/A",
      preco: a.plano?.preco_mensal ?? a.valor_mensal ?? 0,
      status: a.status,
      trial: a.trial ?? false,
      dataInicio: a.data_inicio,
    }));

  return {
    metrics: {
      totalPersonals: personals.length,
      totalAlunos: alunos.length,
      totalAdmins: admins.length,
      totalUsuarios: new Set(roles.map((r) => r.user_id)).size,
      assinaturasAtivas: ativas.length,
      assinaturasTrial: trial.length,
      mrrTotal,
      receitaMesAtual,
      cancelamentosMes,
      novosPersonalsMes,
      ticketMedio: ativas.length ? mrrTotal / ativas.length : 0,
      churnAtual,
    },
    churnSerie,
    receitaSerie,
    assinaturasRecentes,
  };
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchDashboard,
    staleTime: 60_000,
  });
}
