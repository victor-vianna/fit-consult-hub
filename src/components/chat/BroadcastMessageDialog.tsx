import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Megaphone, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BroadcastMessageDialogProps {
  personalId: string;
  themeColor?: string;
}

export function BroadcastMessageDialog({ personalId, themeColor }: BroadcastMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!texto.trim() || sending) return;
    setSending(true);

    try {
      // Fetch all active students
      const { data: alunos, error: alunosError } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("personal_id", personalId)
        .eq("is_active", true);

      if (alunosError) throw alunosError;
      if (!alunos || alunos.length === 0) {
        toast({ title: "Nenhum aluno ativo encontrado", variant: "destructive" });
        setSending(false);
        return;
      }

      const { data: personalProfile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", personalId)
        .single();

      // Insert messages for all students
      const mensagens = alunos.map((aluno) => ({
        conversa_key: `${personalId}::${aluno.id}`,
        remetente_id: personalId,
        destinatario_id: aluno.id,
        conteudo: texto.trim(),
        tipo: "texto",
      }));

      const { error: msgError } = await supabase
        .from("mensagens_chat")
        .insert(mensagens);

      if (msgError) throw msgError;

      // Create notifications for all students
      const notificacoes = alunos.map((aluno) => ({
        destinatario_id: aluno.id,
        tipo: "nova_mensagem",
        titulo: `Nova mensagem de ${personalProfile?.nome || "Personal"}`,
        mensagem: texto.trim().substring(0, 100),
        dados: { aluno_id: aluno.id, profile_id: personalId },
      }));

      await supabase.from("notificacoes").insert(notificacoes);

      toast({
        title: "Mensagem enviada!",
        description: `Enviada para ${alunos.length} aluno${alunos.length > 1 ? "s" : ""}`,
      });

      setTexto("");
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Enviar para todos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Enviar mensagem para todos os alunos
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Digite sua mensagem para todos os alunos..."
            rows={4}
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={!texto.trim() || sending}
              style={{ backgroundColor: themeColor || undefined }}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? "Enviando..." : "Enviar para todos"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
