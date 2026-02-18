import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  UserX,
  ChevronRight,
  X
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface AlertasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunosInativos: AlunoInativo[];
  vencimentosProximos: VencimentoProximo[];
  planilhasExpirando: PlanilhaExpirando[];
  feedbacksPendentes: FeedbackPendente[];
  personalId: string;
  alertasDescartados: Set<string>;
  onAlertaDescartado: (tipo: string, referenciaId: string) => void;
  themeColor?: string;
}

export function AlertasModal({
  open,
  onOpenChange,
  alunosInativos,
  vencimentosProximos,
  planilhasExpirando,
  feedbacksPendentes,
  personalId,
  alertasDescartados,
  onAlertaDescartado,
  themeColor,
}: AlertasModalProps) {
  const navigate = useNavigate();

  const handleAlunoClick = (alunoId: string, tab?: string) => {
    onOpenChange(false);
    navigate(`/aluno/${alunoId}${tab ? `?tab=${tab}` : ""}`);
  };

  const handleDescartar = async (e: React.MouseEvent, tipoAlerta: string, referenciaId: string) => {
    e.stopPropagation();
    try {
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + 10);

      const { error } = await supabase
        .from("alertas_descartados")
        .insert({
          personal_id: personalId,
          tipo_alerta: tipoAlerta,
          referencia_id: referenciaId,
          expira_em: expiraEm.toISOString(),
        });

      if (error) throw error;
      onAlertaDescartado(tipoAlerta, referenciaId);
      toast.success("Alerta descartado por 10 dias");
    } catch (err) {
      console.error("Erro ao descartar alerta:", err);
      toast.error("Erro ao descartar alerta");
    }
  };

  // Filter out dismissed alerts
  const filteredInativos = alunosInativos.filter(a => !alertasDescartados.has(`inativo_${a.id}`));
  const filteredPlanilhas = planilhasExpirando.filter(p => !alertasDescartados.has(`planilha_${p.id}`));
  const filteredVencimentos = vencimentosProximos.filter(v => !alertasDescartados.has(`vencimento_${v.id}`));
  const filteredFeedbacks = feedbacksPendentes.filter(f => !alertasDescartados.has(`feedback_${f.id}`));

  const totalAlertas = 
    filteredInativos.length + 
    filteredVencimentos.length + 
    filteredPlanilhas.length + 
    filteredFeedbacks.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Central de Alertas
            <Badge variant="destructive" className="ml-2">{totalAlertas}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="inativos" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inativos" className="text-xs">
              <UserX className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Inativos</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1">{filteredInativos.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="planilhas" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Treinos</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1">{filteredPlanilhas.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="assinaturas" className="text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Pagtos</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1">{filteredVencimentos.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Feedbacks</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1">{filteredFeedbacks.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Alunos Inativos */}
          <TabsContent value="inativos">
            <ScrollArea className="h-[300px]">
              {filteredInativos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Todos os alunos estão treinando regularmente! 🎉
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredInativos.map((aluno) => (
                    <div
                      key={aluno.id}
                      className="p-3 rounded-lg bg-orange-500/10"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{aluno.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {aluno.ultimo_treino
                              ? `Último treino: ${format(parseISO(aluno.ultimo_treino), "dd/MM/yyyy", { locale: ptBR })}`
                              : "Nunca treinou"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            {aluno.dias_inativo === 999 ? "Novo" : `${aluno.dias_inativo} dias`}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => handleDescartar(e, "inativo", aluno.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleAlunoClick(aluno.id)}>
                          Ver perfil
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleAlunoClick(aluno.id, "chat")}>
                          <MessageSquare className="h-3 w-3 mr-1" /> Mensagem
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Planilhas Expirando */}
          <TabsContent value="planilhas">
            <ScrollArea className="h-[300px]">
              {filteredPlanilhas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma planilha próxima de expirar
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredPlanilhas.map((planilha) => (
                    <div
                      key={planilha.id}
                      className="p-3 rounded-lg bg-blue-500/10"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{planilha.aluno_nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {planilha.nome_planilha} • Expira em {format(parseISO(planilha.data_fim), "dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={planilha.dias_para_expirar <= 3 ? "destructive" : "outline"}
                            className={cn(planilha.dias_para_expirar <= 3 ? "" : "text-blue-600 border-blue-600")}
                          >
                            {planilha.dias_para_expirar === 0 ? "Hoje" : `${planilha.dias_para_expirar}d`}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => handleDescartar(e, "planilha", planilha.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleAlunoClick(planilha.aluno_id, "treinos")}>
                          Ver treinos
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Vencimentos de Assinatura */}
          <TabsContent value="assinaturas">
            <ScrollArea className="h-[300px]">
              {filteredVencimentos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum vencimento nos próximos dias
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredVencimentos.map((venc) => (
                    <div
                      key={venc.id}
                      className="p-3 rounded-lg bg-yellow-500/10"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{venc.aluno_nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {venc.plano} • Vence em {format(parseISO(venc.data_expiracao), "dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={venc.dias_para_vencer <= 3 ? "destructive" : "outline"}
                            className={cn(venc.dias_para_vencer <= 3 ? "" : "text-yellow-600 border-yellow-600")}
                          >
                            {venc.dias_para_vencer === 0 ? "Hoje" : `${venc.dias_para_vencer}d`}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => handleDescartar(e, "vencimento", venc.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleAlunoClick(venc.aluno_id, "financeiro")}>
                          Ver financeiro
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Feedbacks Pendentes */}
          <TabsContent value="feedbacks">
            <ScrollArea className="h-[300px]">
              {filteredFeedbacks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum feedback recente para revisar
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredFeedbacks.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="p-3 rounded-lg bg-purple-500/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{feedback.aluno_nome}</p>
                          {feedback.comentario ? (
                            <p className="text-xs text-muted-foreground truncate">
                              "{feedback.comentario}"
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Feedback semanal • {format(parseISO(feedback.data), "dd/MM", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-purple-600 border-purple-600">
                            Novo
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => handleDescartar(e, "feedback", feedback.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleAlunoClick(feedback.aluno_id, "checkins")}>
                          Ver feedback
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleAlunoClick(feedback.aluno_id, "chat")}>
                          <MessageSquare className="h-3 w-3 mr-1" /> Responder
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
