import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Receipt,
  Search,
  FilterX,
} from "lucide-react";
import { useFinancialDashboard } from "@/hooks/useFinancialDashboard";
import { useAuth } from "@/hooks/useAuth";
import { PersonalPlanPricingForm } from "@/components/PersonalPlanPricingForm";
import { StripeConnectOnboardingCard } from "@/components/StripeConnectOnboardingCard";
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
import { useMemo, useState } from "react";
import { formatDisplayDate } from "@/utils/dateFormat";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const DEFAULT_PAYMENT_FILTERS = {
  search: "",
  status: "all",
  plan: "all",
  method: "all",
  period: "all",
  startDate: "",
  endDate: "",
  minValue: "",
  maxValue: "",
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getDateTime = (value: string, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(endOfDay ? `${value}T23:59:59` : `${value}T00:00:00`);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
};

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
  const [paymentFilters, setPaymentFilters] = useState(DEFAULT_PAYMENT_FILTERS);

  const { metrics, monthlyRevenue, inadimplentesList, paymentDetails, loading } =
    useFinancialDashboard(userId);

  const planOptions = useMemo(
    () =>
      Array.from(new Set(paymentDetails.map((p) => p.plano).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [paymentDetails]
  );

  const methodOptions = useMemo(
    () =>
      Array.from(
        new Set(paymentDetails.map((p) => p.metodo).filter((method) => method && method !== "—"))
      ).sort((a, b) => a.localeCompare(b)),
    [paymentDetails]
  );

  const filteredPaymentDetails = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);
    const last90Days = new Date(now);
    last90Days.setDate(now.getDate() - 90);

    const customStart = getDateTime(paymentFilters.startDate);
    const customEnd = getDateTime(paymentFilters.endDate, true);
    const minValue = paymentFilters.minValue ? Number(paymentFilters.minValue) : null;
    const maxValue = paymentFilters.maxValue ? Number(paymentFilters.maxValue) : null;
    const search = normalizeText(paymentFilters.search);

    return paymentDetails.filter((payment) => {
      const paymentTime = new Date(payment.dataPagamento).getTime();
      const searchableText = normalizeText(
        [
          payment.studentName,
          payment.plano,
          payment.metodo,
          payment.status,
          payment.parcelaAtual,
          payment.valorTotal,
          payment.valorParcela,
        ].join(" ")
      );

      if (search && !searchableText.includes(search)) return false;
      if (paymentFilters.status !== "all" && payment.status !== paymentFilters.status) return false;
      if (paymentFilters.plan !== "all" && payment.plano !== paymentFilters.plan) return false;
      if (paymentFilters.method !== "all" && payment.metodo !== paymentFilters.method) return false;
      if (minValue !== null && Number.isFinite(minValue) && payment.valorParcela < minValue) return false;
      if (maxValue !== null && Number.isFinite(maxValue) && payment.valorParcela > maxValue) return false;

      if (paymentFilters.period === "current_month" && paymentTime < startOfCurrentMonth) return false;
      if (paymentFilters.period === "last_30" && paymentTime < last30Days.getTime()) return false;
      if (paymentFilters.period === "last_90" && paymentTime < last90Days.getTime()) return false;
      if (paymentFilters.period === "custom") {
        if (customStart !== null && paymentTime < customStart) return false;
        if (customEnd !== null && paymentTime > customEnd) return false;
      }

      return true;
    });
  }, [paymentDetails, paymentFilters]);

  const filteredReceivedTotal = useMemo(
    () =>
      filteredPaymentDetails
        .filter((payment) => payment.status === "pago")
        .reduce((sum, payment) => sum + payment.valorParcela, 0),
    [filteredPaymentDetails]
  );

  const filteredPendingTotal = useMemo(
    () =>
      filteredPaymentDetails
        .filter((payment) => payment.status !== "pago")
        .reduce((sum, payment) => sum + payment.valorParcela, 0),
    [filteredPaymentDetails]
  );

  const hasActivePaymentFilters = useMemo(
    () => JSON.stringify(paymentFilters) !== JSON.stringify(DEFAULT_PAYMENT_FILTERS),
    [paymentFilters]
  );

  const updatePaymentFilter = (key: keyof typeof DEFAULT_PAYMENT_FILTERS, value: string) => {
    setPaymentFilters((current) => ({ ...current, [key]: value }));
  };

  const clearPaymentFilters = () => {
    setPaymentFilters(DEFAULT_PAYMENT_FILTERS);
  };

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

      <StripeConnectOnboardingCard personalId={userId} />
      <PersonalPlanPricingForm />

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
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyRevenue} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickMargin={10} angle={-30} height={60} interval={0} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  width={80}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(v)
                  }
                />
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
                  stroke="hsl(var(--info))"
                  strokeWidth={2.5}
                  dot={{ fill: "hsl(var(--info))", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="receitaAnoAnterior"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(var(--warning))", r: 2 }}
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
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyRevenue} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickMargin={10} angle={-30} height={60} interval={0} />
                <YAxis tick={{ fontSize: 12 }} width={40} allowDecimals={false} />
                <Tooltip formatter={(value: number) => [value, "Pagamentos"]} />
                <Bar dataKey="pagamentos" fill="hsl(var(--info))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de pagamentos com detalhes de parcelas */}
      {paymentDetails.length > 0 && (
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg md:text-xl">Histórico de Pagamentos</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Detalhamento de parcelas e pagamentos recebidos
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {filteredPaymentDetails.length} de {paymentDetails.length} registro(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Filtros</h3>
                    <p className="text-xs text-muted-foreground">
                      Busque por aluno, plano, método, status, período ou valor da parcela.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={clearPaymentFilters}
                    disabled={!hasActivePaymentFilters}
                  >
                    <FilterX className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="payment-search">Buscar</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="payment-search"
                        value={paymentFilters.search}
                        onChange={(event) => updatePaymentFilter("search", event.target.value)}
                        placeholder="Aluno, plano, método, parcela..."
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={paymentFilters.status}
                      onValueChange={(value) => updatePaymentFilter("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Plano</Label>
                    <Select
                      value={paymentFilters.plan}
                      onValueChange={(value) => updatePaymentFilter("plan", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {planOptions.map((plan) => (
                          <SelectItem key={plan} value={plan}>
                            {plan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Método</Label>
                    <Select
                      value={paymentFilters.method}
                      onValueChange={(value) => updatePaymentFilter("method", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {methodOptions.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Período</Label>
                    <Select
                      value={paymentFilters.period}
                      onValueChange={(value) => updatePaymentFilter("period", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="current_month">Mês atual</SelectItem>
                        <SelectItem value="last_30">Últimos 30 dias</SelectItem>
                        <SelectItem value="last_90">Últimos 90 dias</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentFilters.period === "custom" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="payment-start-date">Data inicial</Label>
                        <Input
                          id="payment-start-date"
                          type="date"
                          value={paymentFilters.startDate}
                          onChange={(event) => updatePaymentFilter("startDate", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="payment-end-date">Data final</Label>
                        <Input
                          id="payment-end-date"
                          type="date"
                          value={paymentFilters.endDate}
                          onChange={(event) => updatePaymentFilter("endDate", event.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="payment-min-value">Valor mín.</Label>
                    <Input
                      id="payment-min-value"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={paymentFilters.minValue}
                      onChange={(event) => updatePaymentFilter("minValue", event.target.value)}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="payment-max-value">Valor máx.</Label>
                    <Input
                      id="payment-max-value"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={paymentFilters.maxValue}
                      onChange={(event) => updatePaymentFilter("maxValue", event.target.value)}
                      placeholder="R$ 999,00"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Registros encontrados</p>
                  <p className="text-xl font-semibold">{filteredPaymentDetails.length}</p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Recebido no filtro</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(filteredReceivedTotal)}
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Pendente no filtro</p>
                  <p className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(filteredPendingTotal)}
                  </p>
                </div>
              </div>

              {filteredPaymentDetails.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="font-medium">Nenhum pagamento encontrado</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajuste os filtros para ampliar a busca.
                  </p>
                </div>
              ) : (
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
                      {filteredPaymentDetails.map((p) => (
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
                            {formatDisplayDate(p.dataPagamento)}
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
              )}
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
                      {formatDisplayDate(student.data_expiracao)}
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
