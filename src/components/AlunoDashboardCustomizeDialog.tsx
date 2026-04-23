import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { LayoutDashboard } from "lucide-react";
import {
  usePersonalSettings,
  DEFAULT_CARDS_VISIVEIS,
} from "@/hooks/usePersonalSettings";

interface Props {
  personalId: string;
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

export function AlunoDashboardCustomizeDialog({ personalId }: Props) {
  const { settings, updateSettings, loading } = usePersonalSettings(personalId);
  const [open, setOpen] = useState(false);

  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [jornadaTitle, setJornadaTitle] = useState("");
  const [jornadaMessage, setJornadaMessage] = useState("");
  const [mensagemConclusao, setMensagemConclusao] = useState("");
  const [cards, setCards] = useState<string[]>([...DEFAULT_CARDS_VISIVEIS]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setWelcomeTitle(settings.welcome_title ?? "");
    setWelcomeMessage(settings.welcome_message ?? "");
    setJornadaTitle(settings.jornada_title ?? "");
    setJornadaMessage(settings.jornada_message ?? "");
    setMensagemConclusao(settings.mensagem_conclusao_treino ?? "");
    setCards(
      Array.isArray(settings.cards_visiveis) && settings.cards_visiveis.length
        ? settings.cards_visiveis
        : [...DEFAULT_CARDS_VISIVEIS]
    );
  }, [settings, open]);

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
        cards_visiveis: cards as any,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Personalizar área do aluno
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar área do aluno</DialogTitle>
          <DialogDescription>
            Ajuste textos de boas-vindas, frase final do treino e quais cards o aluno vê no painel inicial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Frase final do treino */}
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
              Aparece na tela final do treino. Se vazio, será usado o padrão "Treino finalizado com excelência."
            </p>
          </div>

          {/* Boas-vindas */}
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

          {/* Jornada */}
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

          {/* Cards visíveis */}
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
      </DialogContent>
    </Dialog>
  );
}
