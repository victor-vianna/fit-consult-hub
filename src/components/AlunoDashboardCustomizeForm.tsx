import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sparkles, MessageSquare, Home } from "lucide-react";
import {
  usePersonalSettings,
  DEFAULT_CARDS_VISIVEIS,
} from "@/hooks/usePersonalSettings";

interface Props {
  personalId: string;
  onSaved?: () => void;
}

const CARDS_DISPONIVEIS: { id: string; label: string }[] = [
  { id: "treinos", label: "Treinos" },
  { id: "historico", label: "Histórico" },
  { id: "avaliacao", label: "Avaliação" },
  { id: "materiais", label: "Materiais" },
  { id: "plano", label: "Meu Plano" },
  { id: "biblioteca", label: "Biblioteca" },
  { id: "chat", label: "Chat" },
];

const NOME_EXEMPLO = "João";

export function AlunoDashboardCustomizeForm({ personalId, onSaved }: Props) {
  const { settings, updateSettings, loading } = usePersonalSettings(personalId);

  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [jornadaTitle, setJornadaTitle] = useState("");
  const [jornadaMessage, setJornadaMessage] = useState("");
  const [mensagemConclusao, setMensagemConclusao] = useState("");
  const [chatWelcome, setChatWelcome] = useState("");
  const [cards, setCards] = useState<string[]>([...DEFAULT_CARDS_VISIVEIS]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setWelcomeTitle(settings.welcome_title ?? "");
    setWelcomeMessage(settings.welcome_message ?? "");
    setJornadaTitle(settings.jornada_title ?? "");
    setJornadaMessage(settings.jornada_message ?? "");
    setMensagemConclusao(settings.mensagem_conclusao_treino ?? "");
    setChatWelcome((settings as any).chat_welcome_message ?? "");
    setCards(
      Array.isArray(settings.cards_visiveis) && settings.cards_visiveis.length
        ? settings.cards_visiveis
        : [...DEFAULT_CARDS_VISIVEIS]
    );
  }, [settings]);

  const toggleCard = (id: string) => {
    setCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        welcome_title: welcomeTitle.trim() || null,
        welcome_message: welcomeMessage.trim() || null,
        jornada_title: jornadaTitle.trim() || null,
        jornada_message: jornadaMessage.trim() || null,
        mensagem_conclusao_treino: mensagemConclusao.trim() || null,
        chat_welcome_message: chatWelcome.trim() || null,
        cards_visiveis: cards as any,
      } as any);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const chatPreview = (chatWelcome.trim() || "")
    .replace(/\{nome\}/gi, NOME_EXEMPLO);

  const visibleCards = CARDS_DISPONIVEIS.filter((c) => cards.includes(c.id));

  return (
    <div className="grid gap-6 pt-2 lg:grid-cols-[1fr_minmax(280px,360px)]">
      {/* COLUNA 1: Formulários */}
      <div className="space-y-6 min-w-0">
        {/* DESTAQUE: Mensagem automática de boas-vindas no chat */}
        <div className="space-y-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <div className="rounded-md bg-primary/15 p-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                Mensagem automática no chat
                <span className="text-[10px] font-medium uppercase tracking-wide bg-primary text-primary-foreground rounded px-1.5 py-0.5">
                  Destaque
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Enviada automaticamente no chat assim que o aluno fizer o
                primeiro acesso. Use{" "}
                <code className="px-1 rounded bg-muted text-foreground">
                  {"{nome}"}
                </code>{" "}
                para personalizar com o primeiro nome dele.
              </p>
            </div>
          </div>
          <Textarea
            value={chatWelcome}
            onChange={(e) => setChatWelcome(e.target.value)}
            placeholder={
              "Oi {nome}, seja bem-vindo(a)! 👋 Aqui é o nosso canal direto. Qualquer dúvida sobre treino ou rotina, é só me chamar por aqui."
            }
            rows={4}
            maxLength={500}
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="msg_conclusao">Mensagem ao concluir treino</Label>
          <Textarea
            id="msg_conclusao"
            value={mensagemConclusao}
            onChange={(e) => setMensagemConclusao(e.target.value)}
            placeholder='Ex.: "Mais um treino concluído. Constância é o segredo."'
            rows={2}
            maxLength={140}
          />
          <p className="text-xs text-muted-foreground">
            Aparece na tela final do treino. Se vazio, será usado o padrão
            "Treino finalizado com excelência."
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm font-semibold">Boas-vindas no início</p>
          <div className="space-y-2">
            <Label htmlFor="wt">Título</Label>
            <Input
              id="wt"
              value={welcomeTitle}
              onChange={(e) => setWelcomeTitle(e.target.value)}
              placeholder="Bem-vindo(a) à minha consultoria! 🎉"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wm">Mensagem</Label>
            <Textarea
              id="wm"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Apresente sua consultoria, sua proposta e diferenciais."
              rows={4}
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm font-semibold">Card "Sua Jornada"</p>
          <div className="space-y-2">
            <Label htmlFor="jt">Título</Label>
            <Input
              id="jt"
              value={jornadaTitle}
              onChange={(e) => setJornadaTitle(e.target.value)}
              placeholder="Sua Jornada Começa Agora"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jm">Mensagem</Label>
            <Textarea
              id="jm"
              value={jornadaMessage}
              onChange={(e) => setJornadaMessage(e.target.value)}
              placeholder="Texto motivacional para abrir a jornada do aluno."
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <p className="text-sm font-semibold">Cards visíveis no painel</p>
          <p className="text-xs text-muted-foreground">
            Desmarque os cards que não devem aparecer para o aluno.
          </p>
          <div className="space-y-2 pt-2">
            {CARDS_DISPONIVEIS.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <Label htmlFor={`card-${c.id}`} className="cursor-pointer">
                  {c.label}
                </Label>
                <Switch
                  id={`card-${c.id}`}
                  checked={cards.includes(c.id)}
                  onCheckedChange={() => toggleCard(c.id)}
                />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      {/* COLUNA 2: Pré-visualização */}
      <div className="lg:sticky lg:top-2 self-start space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span className="h-px flex-1 bg-border" />
          Pré-visualização do aluno
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
          {/* Mock dashboard header */}
          <div className="rounded-lg bg-card border p-3">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">
                Painel do aluno
              </span>
            </div>
            <p className="text-sm font-bold">
              {welcomeTitle || "Bem-vindo(a)!"}
            </p>
            {welcomeMessage && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                {welcomeMessage}
              </p>
            )}
          </div>

          {/* Jornada card */}
          {(jornadaTitle || jornadaMessage) && (
            <div
              className="rounded-lg p-3 border"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)/0.12), hsl(var(--primary)/0.03))",
              }}
            >
              <p className="text-sm font-semibold">
                {jornadaTitle || "Sua Jornada"}
              </p>
              {jornadaMessage && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                  {jornadaMessage}
                </p>
              )}
            </div>
          )}

          {/* Visible cards grid */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
              Cards visíveis ({visibleCards.length})
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {visibleCards.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border bg-card text-[11px] font-medium px-2 py-2 text-center"
                >
                  {c.label}
                </div>
              ))}
              {visibleCards.length === 0 && (
                <p className="col-span-2 text-[11px] text-muted-foreground italic">
                  Nenhum card visível.
                </p>
              )}
            </div>
          </div>

          {/* Chat preview destaque */}
          <div className="rounded-lg border-2 border-primary/40 bg-background p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <MessageSquare className="h-3 w-3" />
              CHAT — 1ª MENSAGEM AUTOMÁTICA
            </div>
            <div className="flex items-start gap-2">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                P
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 max-w-full">
                {chatPreview ? (
                  <p className="text-xs whitespace-pre-wrap break-words">
                    {chatPreview}
                  </p>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    Escreva uma mensagem ao lado para vê-la aqui.
                  </p>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Exemplo com nome: <strong>{NOME_EXEMPLO}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
