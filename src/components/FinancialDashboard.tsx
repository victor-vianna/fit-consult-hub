import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useFinancialDashboard } from "@/hooks/useFinancialDashboard";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function FinancialDashboard() {
  const { user } = useAuth();
  const { metrics, monthlyRevenue, inadimplentesList, loading } =
    useFinancialDashboard(user?.id || "");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Carregando dados financeiros...
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
        <p className="text-muted-foreground">
          Visão geral das suas finanças e pagamentos
        </p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Receita Mês Atual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita do Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.receitaMesAtual)}
            </div>
            <div className="flex items-center text-xs mt-1">
              {metrics.comparacaoPercentual >= 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">
                    +{metrics.comparacaoPercentual.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500">
                    {metrics.comparacaoPercentual.toFixed(1)}%
                  </span>
                </>
              )}
              <span className="text-muted-foreground ml-1">
                vs mês anterior
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Previsão de Receita */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Previsão Mensal
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.previsaoReceita)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado em {metrics.totalAlunosAtivos} assinaturas ativas
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Inadimplência */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Inadimplência
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.taxaInadimplencia.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalAlunosInadimplentes} aluno(s) inadimplente(s)
            </p>
          </CardContent>
        </Card>

        {/* Comparação Mês Anterior */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mês Anterior</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.receitaMesAnterior)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita do mês passado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de Receita Mensal */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Receita dos Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickMargin={10} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Receita",
                  ]}
                  labelStyle={{ color: "#000" }}
                />
                <Line
                  type="monotone"
                  dataKey="receita"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: "#f97316", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pagamentos */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Número de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickMargin={10} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [value, "Pagamentos"]}
                  labelStyle={{ color: "#000" }}
                />
                <Bar
                  dataKey="pagamentos"
                  fill="#f97316"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Inadimplentes */}
      {inadimplentesList.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle>Alunos Inadimplentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inadimplentesList.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{student.nome}</h4>
                      <Badge variant="destructive">
                        {student.diasAtraso} dias de atraso
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {student.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Valor: {formatCurrency(student.valor)} • Vencimento:{" "}
                      {format(new Date(student.data_expiracao), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enviar Lembrete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alunos Ativos</p>
                <p className="text-2xl font-bold">
                  {metrics.totalAlunosAtivos}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inadimplentes</p>
                <p className="text-2xl font-bold">
                  {metrics.totalAlunosInadimplentes}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    metrics.totalAlunosAtivos > 0
                      ? metrics.previsaoReceita / metrics.totalAlunosAtivos
                      : 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
