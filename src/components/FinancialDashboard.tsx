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
  BarChart3,
  Receipt,
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
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function ComparisonBadge({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center text-xs mt-1">
      {value >= 0 ? (
        <>
          <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
          <span className="text-green-500">+{value.toFixed(1)}%</span>
        </>
      ) : (
        <>
          <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
          <span className="text-red-500">{value.toFixed(1)}%</span>
        </>
      )}
      <span className="text-muted-foreground ml-1">{label}</span>
    </div>
  );
}

export function FinancialDashboard() {
  const { user } = useAuth();
  const userId = useMemo(() => user?.id || "", [user?.id]);

  const { metrics, monthlyRevenue, inadimplentesList, paymentDetails, loading } =
    useFinancialDashboard(userId);

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando informações do usuário...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-2">
      <div>
        <h1 className="text-muted-foreground">
          Visão geral das suas finanças e pagamentos
        </h1>
      </div>

      {/* Cards principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Receita Mês Atual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.receitaMesAtual)}</div>
            <ComparisonBadge value={metrics.comparacaoPercentual} label="vs mês anterior" />
          </CardContent>
        </Card>

        {/* Receita Mês Passado */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mês Passado</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.receitaMesAnterior)}</div>
            <p className="text-xs text-muted-foreground mt-1">Comparação direta</p>
          </CardContent>
        </Card>

        {/* Receita Últimos 12 Meses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimos 12 Meses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.receitaUltimos12Meses)}</div>
            <ComparisonBadge value={metrics.crescimentoAnual12Meses} label="vs 12 meses ant." />
          </CardContent>
        </Card>

        {/* Previsão */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previsão Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.previsaoReceita)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalAlunosAtivos} assinaturas ativas
            </p>
          </CardContent>
        </Card>

        {/* vs Ano Anterior (mesmo mês) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">vs Ano Anterior</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.receitaMesmoMesAnoAnterior)}</div>
            <ComparisonBadge value={metrics.comparacaoAnual} label="mesmo mês" />
          </CardContent>
        </Card>

        {/* Inadimplência */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.taxaInadimplencia.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalAlunosInadimplentes} inadimplente(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Receita Mensal (Fluxo de Caixa)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Baseado nas parcelas efetivamente recebidas em cada mês
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickMargin={10} angle={-30} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "receita" ? "Este ano" : "Ano anterior",
                  ]}
                />
                <Legend formatter={(value) => (value === "receita" ? "Este ano" : "Ano anterior")} />
                <Line
                  type="monotone"
                  dataKey="receita"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="receitaAnoAnterior"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(var(--muted-foreground))", r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Número de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickMargin={10} angle={-30} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value, "Pagamentos"]} />
                <Bar dataKey="pagamentos" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de pagamentos com detalhes de parcelas */}
      {paymentDetails.length > 0 && (
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg md:text-xl">Histórico de Pagamentos</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Detalhamento de parcelas e pagamentos recebidos
            </p>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">Aluno</th>
                    <th className="text-left py-3 px-2 font-medium">Plano</th>
                    <th className="text-right py-3 px-2 font-medium">Valor Total</th>
                    <th className="text-center py-3 px-2 font-medium">Parcela</th>
                    <th className="text-right py-3 px-2 font-medium">Valor Parcela</th>
                    <th className="text-center py-3 px-2 font-medium">Data</th>
                    <th className="text-center py-3 px-2 font-medium">Método</th>
                    <th className="text-center py-3 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentDetails.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-medium">{p.studentName}</td>
                      <td className="py-3 px-2">{p.plano}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(p.valorTotal)}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="outline" className="text-xs">
                          {p.parcelaAtual}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {formatCurrency(p.valorParcela)}
                      </td>
                      <td className="py-3 px-2 text-center text-muted-foreground">
                        {format(new Date(p.dataPagamento), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-2 text-center capitalize">{p.metodo}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant={p.status === "pago" ? "default" : "secondary"}
                          className={
                            p.status === "pago"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }
                        >
                          {p.status === "pago" ? "Pago" : "Pendente"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inadimplentes */}
      {inadimplentesList.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg md:text-xl">Alunos Inadimplentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-3 md:space-y-4">
              {inadimplentesList.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-base md:text-sm">{student.nome}</h4>
                      <Badge variant="destructive" className="text-xs">
                        {student.diasAtraso} dias de atraso
                      </Badge>
                    </div>
                    <p className="text-sm md:text-xs text-muted-foreground truncate">{student.email}</p>
                    <p className="text-sm md:text-xs text-muted-foreground">
                      Valor: {formatCurrency(student.valor)} • Vencimento:{" "}
                      {format(new Date(student.data_expiracao), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="h-10 md:h-9 w-full sm:w-auto">
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
                <p className="text-2xl font-bold">{metrics.totalAlunosAtivos}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inadimplentes</p>
                <p className="text-2xl font-bold">{metrics.totalAlunosInadimplentes}</p>
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
