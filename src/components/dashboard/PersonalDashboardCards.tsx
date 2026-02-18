import { useEffect, useState, useCallback } from "react";
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
  UserX,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { TreinosHojeModal } from "./TreinosHojeModal";
import { AlertasModal } from "./AlertasModal";

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

interface PlanilhaExpirando {
  id: string;
  aluno_nome: string;
  aluno_id: string;
  data_fim: string;
  dias_para_expirar: number;
  nome_planilha: string;
}

interface FeedbackPendente {
  id: string;
  aluno_nome: string;
  aluno_id: string;
  data: string;
  comentario?: string;
  tipo: string;
}

interface AlunoTreinoHoje {
  id: string;
  nome: string;
  treinou: boolean;
  horario_treino?: string;
  duracao_minutos?: number;
}

export function PersonalDashboardCards({
  personalId,
  themeColor,
}: PersonalDashboardCardsProps) {
  const navigate = useNavigate();
  const [treinosAndamento, setTreinosAndamento] = useState<TreinoEmAndamento[]>([]);
  const [alunosInativos, setAlunosInativos] = useState<AlunoInativo[]>([]);
  const [vencimentosProximos, setVencimentosProximos] = useState<VencimentoProximo[]>([]);
  const [planilhasExpirando, setPlanilhasExpirando] = useState<PlanilhaExpirando[]>([]);
  const [feedbacksPendentes, setFeedbacksPendentes] = useState<FeedbackPendente[]>([]);
  const [alunosTreinaramHoje, setAlunosTreinaramHoje] = useState<AlunoTreinoHoje[]>([]);
  const [alunosNaoTreinaramHoje, setAlunosNaoTreinaramHoje] = useState<AlunoTreinoHoje[]>([]);
  const [stats, setStats] = useState({
    totalAlunos: 0,
    alunosAtivos: 0,
    treinosHoje: 0,
    treinosSemana: 0,
  });
  const [loading, setLoading] = useState(true);
  const [alertasDescartados, setAlertasDescartados] = useState<Set<string>>(new Set());
  
  // Modal states
  const [treinosHojeModalOpen, setTreinosHojeModalOpen] = useState(false);
  const [alertasModalOpen, setAlertasModalOpen] = useState(false);

  useEffect(() => {
    if (personalId) {
      fetchDashboardData();
      fetchAlertasDescartados();
    }
  }, [personalId]);

  const fetchAlertasDescartados = async () => {
    try {
      const { data, error } = await supabase
        .from("alertas_descartados")
        .select("tipo_alerta, referencia_id")
        .eq("personal_id", personalId)
        .gte("expira_em", new Date().toISOString());

      if (error) throw error;
      
      const descartados = new Set<string>();
      data?.forEach((d: any) => {
        descartados.add(`${d.tipo_alerta}_${d.referencia_id}`);
      });
      setAlertasDescartados(descartados);
    } catch (err) {
      console.error("Erro ao buscar alertas descartados:", err);
    }
  };

  const handleAlertaDescartado = useCallback((tipo: string, referenciaId: string) => {
    setAlertasDescartados(prev => {
      const next = new Set(prev);
      next.add(`${tipo}_${referenciaId}`);
      return next;
    });
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTreinosEmAndamento(),
        fetchAlunosInativos(),
        fetchVencimentosProximos(),
        fetchPlanilhasExpirando(),
        fetchFeedbacksPendentes(),
        fetchTreinosHoje(),
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
    // Buscar alunos ativos do personal
    const { data: alunos } = await supabase
      .from("profiles")
      .select("id, nome")
      .eq("personal_id", personalId)
      .eq("is_active", true);

    if (!alunos) return;

    // Para cada aluno, buscar último treino FINALIZADO
    const alunosComUltimoTreino = await Promise.all(
      alunos.map(async (aluno) => {
        const { data: ultimaSessao } = await supabase
          .from("treino_sessoes")
          .select("fim")
          .eq("profile_id", aluno.id)
          .eq("status", "finalizado")
          .not("fim", "is", null)
          .order("fim", { ascending: false })
          .limit(1)
          .maybeSingle();

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
      .limit(20);

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
        .filter((v) => v.dias_para_vencer <= 7);

      setVencimentosProximos(vencimentos);
    }
  };

  const fetchPlanilhasExpirando = async () => {
    const { data } = await supabase
      .from("planilhas_treino")
      .select(`
        id,
        nome,
        data_prevista_fim,
        profile_id,
        profiles:profile_id (nome)
      `)
      .eq("personal_id", personalId)
      .eq("status", "ativa")
      .not("data_prevista_fim", "is", null)
      .gte("data_prevista_fim", new Date().toISOString().split("T")[0])
      .order("data_prevista_fim", { ascending: true })
      .limit(20);

    if (data) {
      const planilhas = data
        .map((p: any) => ({
          id: p.id,
          aluno_nome: p.profiles?.nome || "Aluno",
          aluno_id: p.profile_id,
          data_fim: p.data_prevista_fim,
          dias_para_expirar: differenceInDays(parseISO(p.data_prevista_fim), new Date()),
          nome_planilha: p.nome,
        }))
        .filter((p) => p.dias_para_expirar <= 7);

      setPlanilhasExpirando(planilhas);
    }
  };

  const fetchFeedbacksPendentes = async () => {
    // Buscar check-ins/feedbacks recentes (últimos 7 dias) com comentários
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const { data } = await supabase
      .from("checkins_semanais")
      .select(`
        id,
        preenchido_em,
        duvidas,
        dores_corpo,
        mudanca_rotina,
        profile_id,
        profiles:profile_id (nome)
      `)
      .eq("personal_id", personalId)
      .gte("preenchido_em", seteDiasAtras.toISOString())
      .order("preenchido_em", { ascending: false })
      .limit(20);

    if (data) {
      const feedbacks = data
        .filter((f: any) => f.duvidas || f.dores_corpo || f.mudanca_rotina)
        .map((f: any) => ({
          id: f.id,
          aluno_nome: f.profiles?.nome || "Aluno",
          aluno_id: f.profile_id,
          data: f.preenchido_em,
          comentario: f.duvidas || f.dores_corpo || f.mudanca_rotina,
          tipo: "feedback_semanal",
        }));

      setFeedbacksPendentes(feedbacks);
    }
  };

  const fetchTreinosHoje = async () => {
    // Buscar todos os alunos ativos
    const { data: alunos } = await supabase
      .from("profiles")
      .select("id, nome")
      .eq("personal_id", personalId)
      .eq("is_active", true);

    if (!alunos) return;

    const hoje = startOfDay(new Date());
    
    // Para cada aluno, verificar se treinou hoje
    const alunosComStatus = await Promise.all(
      alunos.map(async (aluno) => {
        const { data: sessaoHoje } = await supabase
          .from("treino_sessoes")
          .select("id, fim, inicio")
          .eq("profile_id", aluno.id)
          .eq("status", "finalizado")
          .gte("fim", hoje.toISOString())
          .order("fim", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessaoHoje) {
          const duracao = sessaoHoje.inicio && sessaoHoje.fim
            ? Math.round((new Date(sessaoHoje.fim).getTime() - new Date(sessaoHoje.inicio).getTime()) / 60000)
            : undefined;

          return {
            id: aluno.id,
            nome: aluno.nome,
            treinou: true,
            horario_treino: sessaoHoje.fim,
            duracao_minutos: duracao,
          };
        }

        return {
          id: aluno.id,
          nome: aluno.nome,
          treinou: false,
        };
      })
    );

    setAlunosTreinaramHoje(alunosComStatus.filter((a) => a.treinou));
    setAlunosNaoTreinaramHoje(alunosComStatus.filter((a) => !a.treinou));
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
    const hoje = startOfDay(new Date());
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

  const totalAlertas = 
    alunosInativos.length + 
    vencimentosProximos.length + 
    planilhasExpirando.length + 
    feedbacksPendentes.length;

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
      {/* Acesso Rápido aos Alunos - PRIMEIRO */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow border-2"
        style={{ borderColor: themeColor ? `${themeColor}40` : undefined }}
        onClick={() => navigate("/alunos")}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: themeColor }} />
              Meus Alunos
            </CardTitle>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold" style={{ color: themeColor }}>
                {stats.totalAlunos}
              </p>
              <p className="text-sm text-muted-foreground">
                {stats.alunosAtivos} ativos • {stats.totalAlunos - stats.alunosAtivos} inativos
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                navigate("/alunos");
              }}
            >
              Gerenciar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Interativos (sem duplicação do card de alunos) */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Treinos Hoje - INTERATIVO - Mostra apenas treinos finalizados */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setTreinosHojeModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Treinos Hoje</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alunosTreinaramHoje.length}</div>
            <p className="text-xs text-muted-foreground">
              alunos já treinaram hoje
            </p>
          </CardContent>
        </Card>

        {/* Treinos na Semana */}
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

        {/* Alertas - INTERATIVO */}
        <Card 
          className={cn(
            "cursor-pointer hover:shadow-md transition-shadow",
            totalAlertas > 0 && "border-orange-500/50"
          )}
          onClick={() => setAlertasModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className={cn(
              "h-4 w-4",
              totalAlertas > 0 ? "text-orange-500" : "text-muted-foreground"
            )} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAlertas}</div>
            <p className="text-xs text-muted-foreground">
              requerem atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards Detalhados */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Treinos em Andamento - Sessões que estão acontecendo agora */}
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Dumbbell className="h-4 w-4" style={{ color: themeColor }} />
                Treinos em Andamento
              </CardTitle>
              <Badge variant="secondary">{treinosAndamento.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Alunos treinando neste momento
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[160px]">
              {treinosAndamento.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum aluno treinando agora
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
                          Iniciou há {formatarTempo(treino.inicio)}
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

        {/* Alunos Inativos - Baseado no último treino FINALIZADO */}
        <Card 
          className="col-span-1 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setAlertasModalOpen(true)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserX className="h-4 w-4 text-orange-500" />
                Alunos Inativos
              </CardTitle>
              <Badge variant="destructive">{alunosInativos.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sem treino finalizado há mais de 7 dias
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[160px]">
              {alunosInativos.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Todos os alunos treinando regularmente!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alunosInativos.slice(0, 5).map((aluno) => (
                    <div
                      key={aluno.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10 cursor-pointer hover:bg-orange-500/20 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/alunos/${aluno.id}`);
                      }}
                    >
                      <div>
                        <p className="font-medium text-sm">{aluno.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {aluno.ultimo_treino
                            ? `Último treino: ${format(parseISO(aluno.ultimo_treino), "dd/MM", { locale: ptBR })}`
                            : "Ainda não iniciou os treinos"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-600">
                        {aluno.dias_inativo === 999 ? "Novo" : `${aluno.dias_inativo} dias`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Feedbacks Recentes */}
        <Card 
          className="col-span-1 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setAlertasModalOpen(true)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                Feedbacks Recentes
              </CardTitle>
              <Badge variant={feedbacksPendentes.length > 0 ? "default" : "secondary"} 
                className={feedbacksPendentes.length > 0 ? "bg-purple-500" : ""}>
                {feedbacksPendentes.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              {feedbacksPendentes.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum feedback recente
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbacksPendentes.slice(0, 5).map((feedback) => (
                    <div
                      key={feedback.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 cursor-pointer hover:bg-purple-500/20 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/alunos/${feedback.aluno_id}`);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{feedback.aluno_nome}</p>
                        {feedback.comentario && (
                          <p className="text-xs text-muted-foreground truncate">
                            "{feedback.comentario.substring(0, 40)}..."
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-purple-600 shrink-0">
                        {format(parseISO(feedback.data), "dd/MM", { locale: ptBR })}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <TreinosHojeModal
        open={treinosHojeModalOpen}
        onOpenChange={setTreinosHojeModalOpen}
        alunosTreinaram={alunosTreinaramHoje}
        alunosNaoTreinaram={alunosNaoTreinaramHoje}
        themeColor={themeColor}
      />

      <AlertasModal
        open={alertasModalOpen}
        onOpenChange={setAlertasModalOpen}
        alunosInativos={alunosInativos}
        vencimentosProximos={vencimentosProximos}
        planilhasExpirando={planilhasExpirando}
        feedbacksPendentes={feedbacksPendentes}
        personalId={personalId}
        alertasDescartados={alertasDescartados}
        onAlertaDescartado={handleAlertaDescartado}
        themeColor={themeColor}
      />
    </div>
  );
}
