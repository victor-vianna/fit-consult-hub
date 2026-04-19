import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, MessageSquare, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackReplyProps {
  checkinId: string;
  alunoId: string;
  personalId: string;
  alunoNome: string;
  themeColor?: string;
  /** Dados do checkin para permitir citar a pergunta/resposta original */
  checkin?: Record<string, any> | null;
}

// Mapeia campos do checkin para rótulos legíveis (a "pergunta" original)
const CAMPOS_CITAVEIS: Array<{ key: string; label: string; tipo: "texto" | "nota" }> = [
  { key: "duvidas", label: "❓ Dúvidas", tipo: "texto" },
  { key: "comentario_saude", label: "💊 Saúde", tipo: "texto" },
  { key: "dores_corpo", label: "⚠️ Dores no corpo", tipo: "texto" },
  { key: "estado_emocional", label: "🧠 Estado emocional", tipo: "texto" },
  { key: "mudanca_rotina", label: "🔄 Mudança na rotina", tipo: "texto" },
  { key: "semana_planejamento", label: "📋 Planejamento da semana", tipo: "texto" },
  { key: "justificativa_empenho", label: "💪 Justificativa do empenho", tipo: "texto" },
  { key: "justificativa_alimentacao", label: "🥗 Justificativa da alimentação", tipo: "texto" },
  { key: "justificativa_sono", label: "😴 Justificativa do sono", tipo: "texto" },
  { key: "nota_empenho", label: "💪 Nota de empenho", tipo: "nota" },
  { key: "nota_alimentacao", label: "🥗 Nota de alimentação", tipo: "nota" },
  { key: "nota_sono", label: "😴 Nota de sono", tipo: "nota" },
  { key: "saude_geral", label: "❤️ Saúde geral", tipo: "nota" },
  { key: "qualidade_vida", label: "✨ Qualidade de vida", tipo: "nota" },
  { key: "nivel_dificuldade", label: "🏋️ Nível de dificuldade", tipo: "nota" },
];

const GERAL = "__geral__";

export function FeedbackReply({ checkinId, alunoId, personalId, alunoNome, themeColor, checkin }: FeedbackReplyProps) {
  const [resposta, setResposta] = useState("");
  const [campoSelecionado, setCampoSelecionado] = useState<string>(GERAL);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Filtra apenas campos preenchidos do checkin
  const camposDisponiveis = useMemo(() => {
    if (!checkin) return [];
    return CAMPOS_CITAVEIS.filter((c) => {
      const v = checkin[c.key];
      return v !== null && v !== undefined && v !== "";
    });
  }, [checkin]);

  const buildCitacao = (): string | null => {
    if (campoSelecionado === GERAL || !checkin) return null;
    const campo = CAMPOS_CITAVEIS.find((c) => c.key === campoSelecionado);
    if (!campo) return null;
    const valor = checkin[campo.key];
    if (valor === null || valor === undefined || valor === "") return null;
    const valorFmt = campo.tipo === "nota" ? `${valor}/10` : String(valor);
    return `${campo.label}: ${valorFmt}`;
  };

  const handleSend = async () => {
    if (!resposta.trim() || sending) return;
    setSending(true);

    try {
      const conversaKey = `${personalId}::${alunoId}`;
      const semanaInfo =
        checkin?.numero_semana && checkin?.ano
          ? ` (Semana ${checkin.numero_semana}/${checkin.ano})`
          : "";
      const citacao = buildCitacao();

      // Monta mensagem com bloco de citação (linhas com "> " são renderizadas como quote no ChatPanel)
      let conteudo = `📝 Resposta ao feedback semanal${semanaInfo}\n`;
      if (citacao) {
        conteudo += citacao
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n");
        conteudo += "\n\n";
      } else {
        conteudo += "\n";
      }
      conteudo += resposta.trim();

      await supabase.from("mensagens_chat").insert({
        conversa_key: conversaKey,
        remetente_id: personalId,
        destinatario_id: alunoId,
        conteudo,
        tipo: "texto",
      });

      // Notificação para o aluno
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
        dados: { aluno_id: alunoId, profile_id: personalId, checkin_id: checkinId },
      });

      toast({
        title: "Resposta enviada!",
        description: `Mensagem enviada para ${alunoNome}`,
      });

      setResposta("");
      setCampoSelecionado(GERAL);
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

  const previewCitacao = buildCitacao();

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" style={{ color: themeColor }} />
          Responder feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Seletor de qual item está sendo respondido */}
        {camposDisponiveis.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Responder sobre:
            </label>
            <Select value={campoSelecionado} onValueChange={setCampoSelecionado}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GERAL}>Feedback geral (sem citação)</SelectItem>
                {camposDisponiveis.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Preview da citação que será enviada */}
        {previewCitacao && (
          <div
            className="rounded-lg border-l-4 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex gap-2"
            style={{ borderLeftColor: themeColor || "hsl(var(--primary))" }}
          >
            <Quote className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
            <span className="whitespace-pre-wrap">{previewCitacao}</span>
          </div>
        )}

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
