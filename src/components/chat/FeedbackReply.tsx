import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackReplyProps {
  checkinId: string;
  alunoId: string;
  personalId: string;
  alunoNome: string;
  themeColor?: string;
}

export function FeedbackReply({ checkinId, alunoId, personalId, alunoNome, themeColor }: FeedbackReplyProps) {
  const [resposta, setResposta] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!resposta.trim() || sending) return;
    setSending(true);

    try {
      const conversaKey = `${personalId}::${alunoId}`;

      // Send as chat message
      await supabase.from("mensagens_chat").insert({
        conversa_key: conversaKey,
        remetente_id: personalId,
        destinatario_id: alunoId,
        conteudo: `📝 Resposta ao feedback semanal:\n\n${resposta.trim()}`,
        tipo: "texto",
      });

      // Create notification
      const { data: personalProfile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", personalId)
        .single();

      await supabase.from("notificacoes").insert({
        destinatario_id: alunoId,
        tipo: "nova_mensagem",
        titulo: `${personalProfile?.nome || "Personal"} respondeu seu feedback`,
        mensagem: resposta.trim().substring(0, 100),
        dados: { aluno_id: alunoId, profile_id: personalId },
      });

      toast({
        title: "Resposta enviada!",
        description: `Mensagem enviada para ${alunoNome}`,
      });

      setResposta("");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar resposta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" style={{ color: themeColor }} />
          Responder feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          placeholder={`Escreva sua resposta para ${alunoNome}...`}
          rows={3}
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
      </CardContent>
    </Card>
  );
}
