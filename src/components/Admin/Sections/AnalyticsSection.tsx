// src/components/admin/sections/AnalyticsSection.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Percent,
  Clock,
  Award,
} from "lucide-react";
import { subMonths, format } from "date-fns";

interface MetricasAvancadas {
  ltv: number;
  cac: number;
  taxaConversao: number;
  tempoMedioPermanencia: number;
  arpu: number;
  arr: number;
}

interface DadosGrafico {
  mes: string;
  receita: number;
  usuarios: number;
  assinaturas: number;
}

interface SegmentacaoUsuarios {
  tipo: string;
  quantidade: number;
  percentual: number;
}

export default function AnalyticsSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<MetricasAvancadas>({
    ltv: 0,
    cac: 0,
    taxaConversao: 0,
    tempoMedioPermanencia: 0,
    arpu: 0,
    arr: 0,
  });
  const [dadosGrafico, setDadosGrafico] = useState<DadosGrafico[]>([]);
  const [segmentacao, setSegmentacao] = useState<SegmentacaoUsuarios[]>([]);

  useEffect(() => {
    calcularMetricas();
  }, []);

  const calcularMetricas = async () => {
    try {
      setLoading(true);

      // Buscar dados necessários
      const { data: assinaturas } = await supabase
        .from("assinaturas")
        .select("*");

      const { data: pagamentos } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("status", "pago");

      const { data: usuarios } = await supabase.from("profiles").select("*");

      const { data: roles } = await supabase.from("user_roles").select("*");

      // Calcular LTV (Lifetime Value)
      const receitaTotal =
        pagamentos?.reduce((sum, p) => sum + p.valor, 0) || 0;
      const clientesAtivos =
        assinaturas?.filter((a) => a.status === "ativa").length || 1;
      const ltv = receitaTotal / clientesAtivos;

      // Calcular CAC (Customer Acquisition Cost) - simulado
      const custoMarketing = 50000; // Valor exemplo
      const novosClientes = assinaturas?.length || 1;
      const cac = custoMarketing / novosClientes;

      // Taxa de Conversão (Trial -> Pago)
      const assinaturasTrial = assinaturas?.filter((a) => a.trial).length || 1;
      const assinaturasAtivas =
        assinaturas?.filter((a) => a.status === "ativa").length || 0;
      const taxaConversao = (assinaturasAtivas / assinaturasTrial) * 100;

      // Tempo Médio de Permanência (em meses)
      const temposAtivos =
        assinaturas
          ?.filter((a) => a.status === "ativa")
          .map((a) => {
            const inicio = new Date(a.data_inicio);
            const agora = new Date();
            return (
              (agora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
            );
          }) || [];
      const tempoMedioPermanencia =
        temposAtivos.length > 0
          ? temposAtivos.reduce((sum, t) => sum + t, 0) / temposAtivos.length
          : 0;

      // ARPU (Average Revenue Per User)
      const mrrTotal =
        assinaturas
          ?.filter((a) => a.status === "ativa")
          .reduce((sum, a) => sum + (a.valor_mensal || 0), 0) || 0;
      const arpu = clientesAtivos > 0 ? mrrTotal / clientesAtivos : 0;

      // ARR (Annual Recurring Revenue)
      const arr = mrrTotal * 12;

      setMetricas({
        ltv,
        cac,
        taxaConversao,
        tempoMedioPermanencia,
        arpu,
        arr,
      });

      // Dados para gráfico de evolução (últimos 6 meses)
      const dadosEvolucao: DadosGrafico[] = [];
      for (let i = 5; i >= 0; i--) {
        const data = subMonths(new Date(), i);
        const mesAno = format(data, "MMM/yy");

        const receitaMes =
          pagamentos
            ?.filter((p) => {
              const dataPgto = new Date(p.data_pagamento);
              return (
                dataPgto.getMonth() === data.getMonth() &&
                dataPgto.getFullYear() === data.getFullYear()
              );
            })
            .reduce((sum, p) => sum + p.valor, 0) || 0;

        const usuariosMes =
          usuarios?.filter((u) => {
            const dataCadastro = new Date(u.created_at);
            return (
              dataCadastro.getMonth() === data.getMonth() &&
              dataCadastro.getFullYear() === data.getFullYear()
            );
          }).length || 0;

        const assinaturasMes =
          assinaturas?.filter((a) => {
            const dataInicio = new Date(a.data_inicio);
            return (
              dataInicio.getMonth() === data.getMonth() &&
              dataInicio.getFullYear() === data.getFullYear()
            );
          }).length || 0;

        dadosEvolucao.push({
          mes: mesAno,
          receita: receitaMes,
          usuarios: usuariosMes,
          assinaturas: assinaturasMes,
        });
      }
      setDadosGrafico(dadosEvolucao);

      // Segmentação de Usuários
      const totalUsuarios = usuarios?.length || 0;
      const personals = roles?.filter((r) => r.role === "personal").length || 0;
      const alunos = roles?.filter((r) => r.role === "aluno").length || 0;
      const admins = roles?.filter((r) => r.role === "admin").length || 0;

      setSegmentacao([
        {
          tipo: "Personals",
          quantidade: personals,
          percentual: (personals / totalUsuarios) * 100,
        },
        {
          tipo: "Alunos",
          quantidade: alunos,
          percentual: (alunos / totalUsuarios) * 100,
        },
        {
          tipo: "Admins",
          quantidade: admins,
          percentual: (admins / totalUsuarios) * 100,
        },
      ]);
    } catch (error: any) {
      console.error("Erro ao calcular métricas:", error);
      toast({
        title: "Erro ao calcular métricas",
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

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Calculando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-purple-200 bg-purple-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-900">LTV</span>
              <Award className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(metricas.ltv)}
            </div>
            <p className="text-xs text-purple-700 mt-1">Lifetime Value</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-orange-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-orange-900">CAC</span>
              <Target className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-700">
              {formatCurrency(metricas.cac)}
            </div>
            <p className="text-xs text-orange-700 mt-1">Custo de Aquisição</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-900">Taxa Conversão</span>
              <Percent className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700">
              {metricas.taxaConversao.toFixed(1)}%
            </div>
            <p className="text-xs text-green-700 mt-1">Trial → Pago</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-900">Permanência</span>
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {metricas.tempoMedioPermanencia.toFixed(1)}
            </div>
            <p className="text-xs text-blue-700 mt-1">meses (média)</p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda Linha de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">ARPU</span>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(metricas.arpu)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita Média por Usuário
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">ARR</span>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(metricas.arr)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita Recorrente Anual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">LTV/CAC</span>
              <Badge variant="default" className="ml-auto">
                {(metricas.ltv / metricas.cac).toFixed(2)}x
              </Badge>
            </div>
            <div className="mt-4">
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full"
                  style={{
                    width: `${Math.min(
                      (metricas.ltv / metricas.cac / 5) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Ideal: 3x ou mais
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Receita */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução da Receita (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="receita"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Receita"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Usuários (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="usuarios" fill="#82ca9d" name="Novos Usuários" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Assinaturas */}
        <Card>
          <CardHeader>
            <CardTitle>Novas Assinaturas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="assinaturas"
                  stroke="#ffc658"
                  strokeWidth={2}
                  name="Assinaturas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Segmentação de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Segmentação de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={segmentacao}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.tipo}: ${entry.quantidade}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantidade"
                >
                  {segmentacao.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Análise Comparativa */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Relação LTV/CAC (Ideal: 3x+)
                </span>
                <Badge
                  variant={
                    metricas.ltv / metricas.cac >= 3 ? "default" : "destructive"
                  }
                >
                  {(metricas.ltv / metricas.cac).toFixed(2)}x
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    metricas.ltv / metricas.cac >= 3
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (metricas.ltv / metricas.cac / 5) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Taxa de Conversão (Ideal: 20%+)
                </span>
                <Badge
                  variant={
                    metricas.taxaConversao >= 20 ? "default" : "secondary"
                  }
                >
                  {metricas.taxaConversao.toFixed(1)}%
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    metricas.taxaConversao >= 20
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                  style={{
                    width: `${Math.min(metricas.taxaConversao * 5, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Tempo de Permanência (Ideal: 12+ meses)
                </span>
                <Badge
                  variant={
                    metricas.tempoMedioPermanencia >= 12
                      ? "default"
                      : "secondary"
                  }
                >
                  {metricas.tempoMedioPermanencia.toFixed(1)} meses
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    metricas.tempoMedioPermanencia >= 12
                      ? "bg-green-500"
                      : "bg-blue-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (metricas.tempoMedioPermanencia / 24) * 100,
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
  );
}
