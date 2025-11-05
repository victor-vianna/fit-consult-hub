// src/components/admin/sections/DashboardOverview.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  UserCheck,
  Calendar,
  CheckCircle2,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

interface Metrics {
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
}

interface ChurnData {
  mes: string;
  assinaturasInicio: number;
  cancelamentos: number;
  taxaChurn: number;
}

interface AssinaturaDetalhada {
  id: string;
  personal: {
    nome: string;
    email: string;
  };
  plano: {
    nome: string;
    preco: number;
  };
  status: string;
  dataInicio: string;
  trial: boolean;
}

function getMonthName(monthIndex: number): string {
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return months[monthIndex];
}

function getStatusColor(status: string) {
  switch (status) {
    case "ativa":
      return "bg-green-100 text-green-800 border-green-200";
    case "trial":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "ativa":
      return <CheckCircle2 className="h-3 w-3" />;
    case "trial":
      return <Activity className="h-3 w-3" />;
    default:
      return null;
  }
}

export default function DashboardOverview() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<Metrics>({
    totalPersonals: 0,
    totalAlunos: 0,
    totalAdmins: 0,
    totalUsuarios: 0,
    assinaturasAtivas: 0,
    assinaturasTrial: 0,
    mrrTotal: 0,
    receitaMesAtual: 0,
    cancelamentosMes: 0,
    novosPersonalsMes: 0,
  });
  const [churnData, setChurnData] = useState<ChurnData[]>([]);
  const [assinaturas, setAssinaturas] = useState<AssinaturaDetalhada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role, user_id");

      let personalCount = 0;
      let alunoCount = 0;
      let adminCount = 0;
      let uniqueUsers = new Set();

      if (rolesData) {
        personalCount = rolesData.filter((r) => r.role === "personal").length;
        alunoCount = rolesData.filter((r) => r.role === "aluno").length;
        adminCount = rolesData.filter((r) => r.role === "admin").length;
        uniqueUsers = new Set(rolesData.map((r) => r.user_id));
      }

      const { data: assinaturasData } = await supabase
        .from("assinaturas")
        .select(
          `
          *,
          personal:profiles!assinaturas_personal_id_fkey(nome, email),
          plano:planos(nome, preco_mensal)
        `
        )
        .order("created_at", { ascending: false });

      const assinaturasAtivas =
        assinaturasData?.filter((a) => a.status === "ativa").length || 0;
      const assinaturasTrial =
        assinaturasData?.filter((a) => a.status === "trial").length || 0;

      const mrrTotal =
        assinaturasData
          ?.filter((a) => a.status === "ativa")
          .reduce((sum, a) => sum + (a.valor_mensal || 0), 0) || 0;

      const now = new Date();
      const mesAtual = now.getMonth();
      const anoAtual = now.getFullYear();
      const primeiroDiaMes = new Date(anoAtual, mesAtual, 1);
      const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0);

      const { data: pagamentosData } = await supabase
        .from("pagamentos")
        .select("valor, data_pagamento")
        .eq("status", "pago")
        .gte("data_pagamento", primeiroDiaMes.toISOString())
        .lte("data_pagamento", ultimoDiaMes.toISOString());

      const receitaMesAtual =
        pagamentosData?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0;

      const { data: cancelamentosData } = await supabase
        .from("assinaturas")
        .select("data_cancelamento")
        .eq("status", "cancelada")
        .gte("data_cancelamento", primeiroDiaMes.toISOString())
        .lte("data_cancelamento", ultimoDiaMes.toISOString());

      const cancelamentosMes = cancelamentosData?.length || 0;

      const { data: novosPersonalsData } = await supabase
        .from("profiles")
        .select("id, created_at")
        .gte("created_at", primeiroDiaMes.toISOString())
        .lte("created_at", ultimoDiaMes.toISOString());

      const personalIds =
        rolesData?.filter((r) => r.role === "personal").map((r) => r.user_id) ||
        [];
      const novosPersonalsMes =
        novosPersonalsData?.filter((p) => personalIds.includes(p.id)).length ||
        0;

      setMetrics({
        totalPersonals: personalCount,
        totalAlunos: alunoCount,
        totalAdmins: adminCount,
        totalUsuarios: uniqueUsers.size,
        assinaturasAtivas,
        assinaturasTrial,
        mrrTotal,
        receitaMesAtual,
        cancelamentosMes,
        novosPersonalsMes,
      });

      // Churn Data
      const churnHistory: ChurnData[] = [];
      for (let i = 5; i >= 0; i--) {
        const mesRef = new Date(anoAtual, mesAtual - i, 1);
        const mesRefAno = mesRef.getFullYear();
        const mesRefMes = mesRef.getMonth();
        const inicioMes = new Date(mesRefAno, mesRefMes, 1);
        const fimMes = new Date(mesRefAno, mesRefMes + 1, 0);

        const { data: assinaturasInicioMes } = await supabase
          .from("assinaturas")
          .select("id")
          .lt("data_inicio", inicioMes.toISOString());

        const { data: cancelamentosMesRef } = await supabase
          .from("assinaturas")
          .select("id")
          .gte("data_cancelamento", inicioMes.toISOString())
          .lte("data_cancelamento", fimMes.toISOString());

        const assinaturasInicio = assinaturasInicioMes?.length || 0;
        const cancelamentos = cancelamentosMesRef?.length || 0;
        const taxaChurn =
          assinaturasInicio > 0 ? (cancelamentos / assinaturasInicio) * 100 : 0;

        churnHistory.push({
          mes: `${getMonthName(mesRefMes)}/${mesRefAno.toString().slice(2)}`,
          assinaturasInicio,
          cancelamentos,
          taxaChurn: Number(taxaChurn.toFixed(2)),
        });
      }

      setChurnData(churnHistory);

      const assinaturasFormatadas: AssinaturaDetalhada[] =
        assinaturasData
          ?.filter((a) => a.status === "ativa" || a.status === "trial")
          .slice(0, 5)
          .map((a) => ({
            id: a.id,
            personal: {
              nome: a.personal?.nome || "N/A",
              email: a.personal?.email || "N/A",
            },
            plano: {
              nome: a.plano?.nome || "N/A",
              preco: a.plano?.preco_mensal || a.valor_mensal || 0,
            },
            status: a.status,
            dataInicio: a.data_inicio,
            trial: a.trial || false,
          })) || [];

      setAssinaturas(assinaturasFormatadas);
    } catch (error: any) {
      console.error("Erro ao carregar dashboard:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Usuários
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalUsuarios}</div>
            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
              <span>{metrics.totalPersonals} personals</span>
              <span>•</span>
              <span>{metrics.totalAlunos} alunos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50/50 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-900">
                MRR Total
              </CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {formatCurrency(metrics.mrrTotal)}
            </div>
            <p className="text-xs text-green-700 mt-2">
              Receita Recorrente Mensal
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50/50 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-900">
                Assinaturas Ativas
              </CardTitle>
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {metrics.assinaturasAtivas}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-blue-700">
              <Activity className="h-3 w-3" />
              <span>{metrics.assinaturasTrial} em trial</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-orange-50/50 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-900">
                Taxa de Churn
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">
              {churnData.length > 0
                ? `${churnData[churnData.length - 1].taxaChurn}%`
                : "0%"}
            </div>
            <p className="text-xs text-orange-700 mt-2">
              {metrics.cancelamentosMes} cancelamentos este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda Linha de Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Receita do Mês Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary mb-4">
              {formatCurrency(metrics.receitaMesAtual)}
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>MRR Projetado:</span>
                <span className="font-semibold">
                  {formatCurrency(metrics.mrrTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Assinaturas Ativas:</span>
                <span className="font-semibold">
                  {metrics.assinaturasAtivas}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ticket Médio:</span>
                <span className="font-semibold">
                  {metrics.assinaturasAtivas > 0
                    ? formatCurrency(
                        metrics.mrrTotal / metrics.assinaturasAtivas
                      )
                    : formatCurrency(0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Crescimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    Novos Personals (mês)
                  </span>
                  <Badge variant="secondary">{metrics.novosPersonalsMes}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (metrics.novosPersonalsMes / 10) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    Assinaturas em Trial
                  </span>
                  <Badge variant="outline">{metrics.assinaturasTrial}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (metrics.assinaturasTrial /
                          (metrics.assinaturasAtivas || 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    Cancelamentos (mês)
                  </span>
                  <Badge variant="destructive">
                    {metrics.cancelamentosMes}
                  </Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (metrics.cancelamentosMes /
                          (metrics.assinaturasAtivas || 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Churn */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Histórico de Churn (Últimos 6 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {churnData.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium text-muted-foreground">
                  {item.mes}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">
                      {item.cancelamentos} de {item.assinaturasInicio}{" "}
                      assinaturas
                    </span>
                    <Badge
                      variant={item.taxaChurn > 5 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {item.taxaChurn}%
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        item.taxaChurn > 5 ? "bg-red-500" : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(item.taxaChurn * 10, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assinaturas Recentes */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Últimas Assinaturas Ativas ({assinaturas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assinaturas.map((assinatura) => (
              <div
                key={assinatura.id}
                className="p-4 border-2 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">
                        {assinatura.personal.nome}
                      </h4>
                      <Badge className={getStatusColor(assinatura.status)}>
                        {getStatusIcon(assinatura.status)}
                        <span className="ml-1">
                          {assinatura.status.toUpperCase()}
                        </span>
                      </Badge>
                      {assinatura.trial && (
                        <Badge variant="outline" className="text-xs">
                          Trial
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {assinatura.personal.email}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        Plano: <strong>{assinatura.plano.nome}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Início:{" "}
                        {format(new Date(assinatura.dataInicio), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(assinatura.plano.preco)}
                    </div>
                    <p className="text-xs text-muted-foreground">por mês</p>
                  </div>
                </div>
              </div>
            ))}

            {assinaturas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma assinatura ativa no momento</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
