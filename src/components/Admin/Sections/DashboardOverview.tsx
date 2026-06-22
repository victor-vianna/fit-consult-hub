import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  Users,
  DollarSign,
  TrendingDown,
  UserCheck,
  Calendar,
  Activity,
  UserX,
  RefreshCw,
  ArrowRight,
  UserPlus,
  Bell,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import { KpiCard } from "../KpiCard";
import { ChurnChart } from "../Charts/ChurnChart";
import { RevenueChart } from "../Charts/RevenueChart";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

function statusVariant(status: string) {
  if (status === "ativa") return { label: "Ativa", className: "bg-success-muted text-success border-success/20" };
  if (status === "trial") return { label: "Trial", className: "bg-info-muted text-info border-info/20" };
  return { label: status, className: "" };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function DashboardOverview() {
  const { data, isLoading, refetch, isFetching } = useAdminDashboard();

  if (isLoading || !data) return <LoadingSkeleton />;

  const { metrics, churnSerie, receitaSerie, assinaturasRecentes } = data;

  return (
    <div className="space-y-6">
      {/* Top bar com refresh */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="touch-target"
        >
          <RefreshCw className={`h-4 w-4 md:mr-2 ${isFetching ? "animate-spin" : ""}`} />
          <span className="hidden md:inline">Atualizar</span>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          title="Usuários"
          value={metrics.totalUsuarios}
          icon={Users}
          hint={`${metrics.totalPersonals} personals · ${metrics.totalAlunos} alunos`}
        />
        <KpiCard
          title="MRR"
          value={formatCurrency(metrics.mrrTotal)}
          icon={DollarSign}
          tone="success"
          hint="Receita mensal recorrente"
        />
        <KpiCard
          title="Assinaturas"
          value={metrics.assinaturasAtivas}
          icon={UserCheck}
          tone="info"
          hint={`${metrics.assinaturasTrial} em trial`}
        />
        <KpiCard
          title="Churn"
          value={`${metrics.churnAtual.toFixed(1)}%`}
          icon={TrendingDown}
          tone={metrics.churnAtual > 5 ? "destructive" : "warning"}
          hint={`${metrics.cancelamentosMes} cancelamentos este mês`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              Receita (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={receitaSerie} />
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Mês atual</p>
                <p className="font-semibold text-base">
                  {formatCurrency(metrics.receitaMesAtual)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ticket médio</p>
                <p className="font-semibold text-base">
                  {formatCurrency(metrics.ticketMedio)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Taxa de Churn (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChurnChart data={churnSerie} />
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Cancelamentos (mês)</p>
                <p className="font-semibold text-base">
                  {metrics.cancelamentosMes}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Novos personals (mês)</p>
                <p className="font-semibold text-base">
                  +{metrics.novosPersonalsMes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ações rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 touch-target">
            <Link to="/admin/usuarios">
              <UserPlus className="h-5 w-5" />
              <span className="text-xs">Novo usuário</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 touch-target">
            <Link to="/admin/pagamentos">
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">Pagamentos</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 touch-target">
            <Link to="/admin/notificacoes">
              <Bell className="h-5 w-5" />
              <span className="text-xs">Notificações</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 touch-target">
            <Link to="/admin/monitoramento">
              <Activity className="h-5 w-5" />
              <span className="text-xs">Monitoramento</span>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Assinaturas recentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Assinaturas recentes
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/assinaturas" className="text-xs">
                Ver todas <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assinaturasRecentes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <UserX className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma assinatura ativa no momento</p>
            </div>
          ) : (
            <div className="divide-y">
              {assinaturasRecentes.map((a) => {
                const sv = statusVariant(a.status);
                return (
                  <div
                    key={a.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm truncate">
                          {a.nome}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${sv.className}`}>
                          {sv.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.plano} · {format(new Date(a.dataInicio), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm text-primary">
                        {formatCurrency(a.preco)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">/mês</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
