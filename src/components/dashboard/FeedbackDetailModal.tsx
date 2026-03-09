import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Dumbbell,
  Utensils,
  Moon,
  AlertTriangle,
  MessageSquare,
  Calendar,
  Heart,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackReply } from "@/components/chat/FeedbackReply";

interface FeedbackDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackId: string | null;
  alunoId: string;
  alunoNome: string;
  personalId: string;
  themeColor?: string;
}

interface FullCheckin {
  id: string;
  ano: number;
  numero_semana: number;
  data_inicio: string;
  data_fim: string;
  peso_atual?: number;
  nota_empenho: number;
  justificativa_empenho?: string;
  nota_alimentacao: number;
  justificativa_alimentacao?: string;
  nota_sono: number;
  justificativa_sono?: string;
  dores_corpo?: string;
  estado_emocional?: string;
  saude_geral: number;
  comentario_saude?: string;
  qualidade_vida: number;
  nivel_dificuldade: number;
  mudanca_rotina?: string;
  semana_planejamento?: string;
  duvidas?: string;
  preenchido_em: string;
}

const getNotaColor = (nota: number) => {
  if (nota <= 4) return "text-red-600 bg-red-50 dark:bg-red-950/30";
  if (nota <= 7) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30";
  return "text-green-600 bg-green-50 dark:bg-green-950/30";
};

const getNotaEmoji = (nota: number) => {
  if (nota <= 4) return "😞";
  if (nota <= 7) return "😐";
  return "😊";
};

export function FeedbackDetailModal({
  open,
  onOpenChange,
  feedbackId,
  alunoId,
  alunoNome,
  personalId,
  themeColor,
}: FeedbackDetailModalProps) {
  const [checkin, setCheckin] = useState<FullCheckin | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && feedbackId) {
      fetchCheckin();
    } else {
      setCheckin(null);
    }
  }, [open, feedbackId]);

  const fetchCheckin = async () => {
    if (!feedbackId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checkins_semanais")
        .select("*")
        .eq("id", feedbackId)
        .single();

      if (error) throw error;
      setCheckin(data);
    } catch (err) {
      console.error("Erro ao buscar feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  const NotaBlock = ({
    icon,
    label,
    nota,
    justificativa,
  }: {
    icon: React.ReactNode;
    label: string;
    nota: number;
    justificativa?: string;
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-lg font-bold ${getNotaColor(nota)}`}>
        {nota} {getNotaEmoji(nota)}
      </div>
      {justificativa && (
        <p className="text-sm text-muted-foreground pl-1">"{justificativa}"</p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        {/* Header com cor do tema */}
        <div
          className="px-6 pt-6 pb-4"
          style={{
            background: themeColor
              ? `linear-gradient(135deg, ${themeColor}15, ${themeColor}05)`
              : undefined,
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
              >
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <span>Feedback de {alunoNome}</span>
                {checkin && (
                  <p className="text-sm font-normal text-muted-foreground mt-0.5">
                    Semana {checkin.numero_semana}/{checkin.ano} •{" "}
                    {format(new Date(checkin.preenchido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="px-6 pb-6 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-2"
                  style={{
                    borderColor: `${themeColor || "hsl(var(--primary))"}40`,
                    borderTopColor: themeColor || "hsl(var(--primary))",
                  }}
                />
              </div>
            ) : checkin ? (
              <>
                {/* Notas principais */}
                <div className="grid grid-cols-3 gap-4">
                  <NotaBlock
                    icon={<Dumbbell className="h-4 w-4 text-blue-600" />}
                    label="Empenho"
                    nota={checkin.nota_empenho}
                    justificativa={checkin.justificativa_empenho}
                  />
                  <NotaBlock
                    icon={<Utensils className="h-4 w-4 text-green-600" />}
                    label="Alimentação"
                    nota={checkin.nota_alimentacao}
                    justificativa={checkin.justificativa_alimentacao}
                  />
                  <NotaBlock
                    icon={<Moon className="h-4 w-4 text-purple-600" />}
                    label="Sono"
                    nota={checkin.nota_sono}
                    justificativa={checkin.justificativa_sono}
                  />
                </div>

                {/* Métricas secundárias */}
                <div className="grid grid-cols-2 gap-3">
                  {checkin.peso_atual && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Peso</p>
                        <p className="font-semibold">{checkin.peso_atual} kg</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Heart className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Saúde Geral</p>
                      <p className="font-semibold">{checkin.saude_geral}/10 {getNotaEmoji(checkin.saude_geral)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Qualidade de Vida</p>
                      <p className="font-semibold">{checkin.qualidade_vida}/10 {getNotaEmoji(checkin.qualidade_vida)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Dumbbell className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dificuldade</p>
                      <p className="font-semibold">{checkin.nivel_dificuldade}/10</p>
                    </div>
                  </div>
                </div>

                {/* Alertas */}
                {(checkin.dores_corpo || checkin.estado_emocional) && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Alertas Importantes
                      </div>
                      {checkin.dores_corpo && (
                        <div>
                          <p className="text-xs font-medium text-destructive">⚠️ Dores:</p>
                          <p className="text-sm">{checkin.dores_corpo}</p>
                        </div>
                      )}
                      {checkin.estado_emocional && (
                        <div>
                          <p className="text-xs font-medium text-destructive">🧠 Estado emocional:</p>
                          <p className="text-sm">{checkin.estado_emocional}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Comentários livres */}
                {(checkin.mudanca_rotina || checkin.semana_planejamento || checkin.duvidas || checkin.comentario_saude) && (
                  <Card className="border-2">
                    <CardContent className="pt-4 space-y-3">
                      {checkin.mudanca_rotina && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">🔄 Mudança na rotina</p>
                          <p className="text-sm">{checkin.mudanca_rotina}</p>
                        </div>
                      )}
                      {checkin.semana_planejamento && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">📋 Planejamento da semana</p>
                          <p className="text-sm">{checkin.semana_planejamento}</p>
                        </div>
                      )}
                      {checkin.duvidas && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">❓ Dúvidas</p>
                          <p className="text-sm">{checkin.duvidas}</p>
                        </div>
                      )}
                      {checkin.comentario_saude && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">💊 Saúde</p>
                          <p className="text-sm">{checkin.comentario_saude}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Reply inline */}
                <FeedbackReply
                  checkinId={checkin.id}
                  alunoId={alunoId}
                  personalId={personalId}
                  alunoNome={alunoNome}
                  themeColor={themeColor}
                />
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Feedback não encontrado
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
