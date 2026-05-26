import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Send, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createNotificationId, dispatchPushNotification } from "@/utils/pushNotifications";

interface TreinoFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunoId: string;
  alunoNome: string;
  personalId: string;
  themeColor?: string;
  rating?: number | null;
  comentario?: string | null;
  treinoId?: string | null;
  createdAt?: string;
}

export function TreinoFeedbackModal({
  open,
  onOpenChange,
  alunoId,
  alunoNome,
  personalId,
  themeColor,
  rating,
  comentario,
  treinoId,
}: TreinoFeedbackModalProps) {
  const [resposta, setResposta] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!resposta.trim() || sending) return;
    setSending(true);
    try {
      const conversaKey = `${personalId}::${alunoId}`;
      const citacao = [
        rating ? `⭐ Avaliação: ${"⭐".repeat(rating)}` : null,
        comentario ? `💬 "${comentario}"` : null,
      ]
        .filter(Boolean)
        .map((l) => `> ${l}`)
        .join("\n");

      const conteudo =
        `📝 Resposta ao feedback de treino\n` +
        (citacao ? `${citacao}\n\n` : "\n") +
        resposta.trim();

      await supabase.from("mensagens_chat").insert({
        conversa_key: conversaKey,
        remetente_id: personalId,
        destinatario_id: alunoId,
        conteudo,
        tipo: "texto",
      });

      const { data: personalProfile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", personalId)
        .single();

      const notificacaoId = createNotificationId();
      const { error: notificacaoError } = await supabase.from("notificacoes").insert({
        id: notificacaoId,
        destinatario_id: alunoId,
        tipo: "nova_mensagem",
        titulo: `${personalProfile?.nome || "Personal"} respondeu seu feedback`,
        mensagem: resposta.trim().substring(0, 100),
        dados: {
          aluno_id: alunoId,
          aluno_nome: alunoNome,
          profile_id: personalId,
          treino_id: treinoId,
          tipo_acao: "chat",
        },
      });
      if (notificacaoError) throw notificacaoError;

      await dispatchPushNotification(notificacaoId);

      toast({
        title: "Resposta enviada!",
        description: `Mensagem enviada para ${alunoNome}`,
      });
      setResposta("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao enviar resposta",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
            >
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>Feedback de treino</span>
              <p className="text-sm font-normal text-muted-foreground">{alunoNome}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {rating ? (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-muted-foreground">Avaliação:</span>
                  <span className="text-lg">{"⭐".repeat(rating)}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem avaliação</p>
              )}
              {comentario ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Comentário</p>
                  <p className="text-sm whitespace-pre-wrap">{comentario}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem comentário</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <label className="text-sm font-medium">Responder para {alunoNome}</label>
            <textarea
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="Escreva sua resposta..."
              rows={4}
              className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSend}
                disabled={!resposta.trim() || sending}
                size="sm"
                style={{ backgroundColor: themeColor || undefined }}
                className="gap-2"
              >
                <Send className="h-3 w-3" />
                {sending ? "Enviando..." : "Enviar resposta"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
