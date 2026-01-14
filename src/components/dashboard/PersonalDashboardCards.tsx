import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Clock,
  AlertTriangle,
  CreditCard,
  Users,
  TrendingUp,
  Dumbbell,
  Calendar,
  UserX,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PersonalDashboardCardsProps {
  personalId: string;
  themeColor?: string;
}

interface TreinoEmAndamento {
  id: string;
  aluno_nome: string;
  aluno_id: string;
  inicio: string;
  status: string;
}

interface AlunoInativo {
  id: string;
  nome: string;
  ultimo_treino: string | null;
  dias_inativo: number;
}

interface VencimentoProximo {
  id: string;
  aluno_nome: string;
  aluno_id: string;
  data_expiracao: string;
  dias_para_vencer: number;
  plano: string;
}

export function PersonalDashboardCards({
  personalId,
  themeColor,
}: PersonalDashboardCardsProps) {
  const navigate = useNavigate();
  const [treinosAndamento, setTreinosAndamento] = useState<TreinoEmAndamento[]>([]);
  const [alunosInativos, setAlunosInativos] = useState<AlunoInativo[]>([]);
  const [vencimentosProximos, setVencimentosProximos] = useState<VencimentoProximo[]>([]);
  const [stats, setStats] = useState({
    totalAlunos: 0,
    alunosAtivos: 0,
    treinosHoje: 0,
    treinosSemana: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (personalId) {
      fetchDashboardData();
    }
  }, [personalId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTreinosEmAndamento(),
        fetchAlunosInativos(),
        fetchVencimentosProximos(),
        fetchStats(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreinosEmAndamento = async () => {
    const { data } = await supabase
      .from("treino_sessoes")
      .select(`
        id,
        inicio,
        status,
        profile_id,
        profiles:profile_id (nome)
      `)
      .eq("personal_id", personalId)
      .in("status", ["em_andamento", "pausado"])
      .order("inicio", { ascending: false })
      .limit(10);

    if (data) {
      setTreinosAndamento(
        data.map((t: any) => ({
          id: t.id,
          aluno_nome: t.profiles?.nome || "Aluno",
          aluno_id: t.profile_id,
          inicio: t.inicio,
          status: t.status,
        }))
      );
    }
  };

  const fetchAlunosInativos = async () => {
    // Buscar alunos do personal
    const { data: alunos } = await supabase
      .from("profiles")
      .select("id, nome")
      .eq("personal_id", personalId)
      .eq("is_active", true);

    if (!alunos) return;

    // Para cada aluno, buscar último treino
    const alunosComUltimoTreino = await Promise.all(
      alunos.map(async (aluno) => {
        const { data: ultimaSessao } = await supabase
          .from("treino_sessoes")
          .select("fim")
          .eq("profile_id", aluno.id)
          .eq("status", "finalizado")
          .order("fim", { ascending: false })
          .limit(1)
          .single();

        const ultimoTreino = ultimaSessao?.fim || null;
        const diasInativo = ultimoTreino
          ? differenceInDays(new Date(), parseISO(ultimoTreino))
          : 999; // Se nunca treinou, considera muito inativo

        return {
          id: aluno.id,
          nome: aluno.nome,
          ultimo_treino: ultimoTreino,
          dias_inativo: diasInativo,
        };
      })
    );

    // Filtrar alunos inativos (mais de 7 dias sem treinar)
    setAlunosInativos(
      alunosComUltimoTreino
        .filter((a) => a.dias_inativo > 7)
        .sort((a, b) => b.dias_inativo - a.dias_inativo)
        .slice(0, 5)
    );
  };

  const fetchVencimentosProximos = async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select(`
        id,
        data_expiracao,
        plano,
        student_id,
        profiles:student_id (nome)
      `)
      .eq("personal_id", personalId)
      .gte("data_expiracao", new Date().toISOString())
      .order("data_expiracao", { ascending: true })
      .limit(10);

    if (data) {
      const vencimentos = data
        .map((s: any) => ({
          id: s.id,
          aluno_nome: s.profiles?.nome || "Aluno",
          aluno_id: s.student_id,
          data_expiracao: s.data_expiracao,
          dias_para_vencer: differenceInDays(parseISO(s.data_expiracao), new Date()),
          plano: s.plano,
        }))
        .filter((v) => v.dias_para_vencer <= 7); // Próximos 7 dias

      setVencimentosProximos(vencimentos);
    }
  };

  const fetchStats = async () => {
    // Total de alunos
    const { count: totalAlunos } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("personal_id", personalId);

    // Alunos ativos
    const { count: alunosAtivos } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("personal_id", personalId)
      .eq("is_active", true);

    // Treinos finalizados hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const { count: treinosHoje } = await supabase
      .from("treino_sessoes")
      .select("*", { count: "exact", head: true })
      .eq("personal_id", personalId)
      .eq("status", "finalizado")
      .gte("fim", hoje.toISOString());

    // Treinos finalizados na semana
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay() + 1);
    inicioSemana.setHours(0, 0, 0, 0);
    const { count: treinosSemana } = await supabase
      .from("treino_sessoes")
      .select("*", { count: "exact", head: true })
      .eq("personal_id", personalId)
      .eq("status", "finalizado")
      .gte("fim", inicioSemana.toISOString());

    setStats({
      totalAlunos: totalAlunos || 0,
      alunosAtivos: alunosAtivos || 0,
      treinosHoje: treinosHoje || 0,
      treinosSemana: treinosSemana || 0,
    });
  };

  const formatarTempo = (inicio: string) => {
    const diff = differenceInDays(new Date(), parseISO(inicio));
    if (diff === 0) {
      const minutos = Math.floor(
        (new Date().getTime() - parseISO(inicio).getTime()) / 60000
      );
      if (minutos < 60) return `${minutos}min`;
      return `${Math.floor(minutos / 60)}h ${minutos % 60}min`;
    }
    return `${diff} dias`;
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAlunos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.alunosAtivos} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Treinos Hoje</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.treinosHoje}</div>
            <p className="text-xs text-muted-foreground">
              {treinosAndamento.length} em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Treinos na Semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.treinosSemana}</div>
            <p className="text-xs text-muted-foreground">treinos finalizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alunosInativos.length + vencimentosProximos.length}
            </div>
            <p className="text-xs text-muted-foreground">
              requerem atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards Detalhados */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Treinos em Andamento */}
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Dumbbell className="h-4 w-4" style={{ color: themeColor }} />
                Treinos em Andamento
              </CardTitle>
              <Badge variant="secondary">{treinosAndamento.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              {treinosAndamento.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum treino em andamento
                </p>
              ) : (
                <div className="space-y-3">
                  {treinosAndamento.map((treino) => (
                    <div
                      key={treino.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => navigate(`/alunos/${treino.aluno_id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{treino.aluno_nome}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatarTempo(treino.inicio)}
                        </p>
                      </div>
                      <Badge
                        variant={treino.status === "pausado" ? "outline" : "default"}
                        className={cn(
                          treino.status === "em_andamento" && "bg-green-500"
                        )}
                      >
                        {treino.status === "pausado" ? "Pausado" : "Ativo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Alunos Inativos */}
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserX className="h-4 w-4 text-orange-500" />
                Alunos Inativos
              </CardTitle>
              <Badge variant="destructive">{alunosInativos.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              {alunosInativos.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Todos os alunos treinando regularmente!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alunosInativos.map((aluno) => (
                    <div
                      key={aluno.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10 cursor-pointer hover:bg-orange-500/20 transition-colors"
                      onClick={() => navigate(`/alunos/${aluno.id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{aluno.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {aluno.ultimo_treino
                            ? `Último: ${format(parseISO(aluno.ultimo_treino), "dd/MM", { locale: ptBR })}`
                            : "Nunca treinou"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-600">
                        {aluno.dias_inativo} dias
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Vencimentos Próximos */}
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-yellow-500" />
                Vencimentos Próximos
              </CardTitle>
              <Badge
                variant={vencimentosProximos.length > 0 ? "destructive" : "secondary"}
              >
                {vencimentosProximos.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              {vencimentosProximos.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum vencimento nos próximos 7 dias
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vencimentosProximos.map((venc) => (
                    <div
                      key={venc.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 cursor-pointer hover:bg-yellow-500/20 transition-colors"
                      onClick={() => navigate(`/alunos/${venc.aluno_id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{venc.aluno_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {venc.plano} • {format(parseISO(venc.data_expiracao), "dd/MM", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge
                        variant={venc.dias_para_vencer <= 3 ? "destructive" : "outline"}
                        className={cn(
                          venc.dias_para_vencer <= 3 && "bg-red-500"
                        )}
                      >
                        {venc.dias_para_vencer === 0
                          ? "Hoje"
                          : `${venc.dias_para_vencer}d`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
