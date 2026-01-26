import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  UserX,
  ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  themeColor?: string;
}

export function AlertasModal({
  open,
  onOpenChange,
  alunosInativos,
  vencimentosProximos,
  planilhasExpirando,
  feedbacksPendentes,
  themeColor,
}: AlertasModalProps) {
  const navigate = useNavigate();

  const handleAlunoClick = (alunoId: string) => {
    onOpenChange(false);
    navigate(`/alunos/${alunoId}`);
  };

  const totalAlertas = 
    alunosInativos.length + 
    vencimentosProximos.length + 
    planilhasExpirando.length + 
    feedbacksPendentes.length;

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
              <Badge variant="secondary" className="ml-1 h-5 px-1">{alunosInativos.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="planilhas" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Treinos</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1">{planilhasExpirando.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="assinaturas" className="text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Pagtos</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1">{vencimentosProximos.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Feedbacks</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1">{feedbacksPendentes.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Alunos Inativos */}
          <TabsContent value="inativos">
            <ScrollArea className="h-[300px]">
              {alunosInativos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Todos os alunos estão treinando regularmente! 🎉
                </p>
              ) : (
                <div className="space-y-2">
                  {alunosInativos.map((aluno) => (
                    <div
                      key={aluno.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 cursor-pointer hover:bg-orange-500/20 transition-colors"
                      onClick={() => handleAlunoClick(aluno.id)}
                    >
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
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
              {planilhasExpirando.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma planilha próxima de expirar
                </p>
              ) : (
                <div className="space-y-2">
                  {planilhasExpirando.map((planilha) => (
                    <div
                      key={planilha.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 transition-colors"
                      onClick={() => handleAlunoClick(planilha.aluno_id)}
                    >
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
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
              {vencimentosProximos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum vencimento nos próximos dias
                </p>
              ) : (
                <div className="space-y-2">
                  {vencimentosProximos.map((venc) => (
                    <div
                      key={venc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 cursor-pointer hover:bg-yellow-500/20 transition-colors"
                      onClick={() => handleAlunoClick(venc.aluno_id)}
                    >
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
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
              {feedbacksPendentes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum feedback recente para revisar
                </p>
              ) : (
                <div className="space-y-2">
                  {feedbacksPendentes.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 cursor-pointer hover:bg-purple-500/20 transition-colors"
                      onClick={() => handleAlunoClick(feedback.aluno_id)}
                    >
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
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
