import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  Calendar,
  Check,
  CreditCard,
  Dumbbell,
  FileText,
  GripVertical,
  Home,
  Library,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ALUNO_CARD_LABELS,
  ALUNO_DASHBOARD_COMPONENT_LABELS,
  DEFAULT_ALUNO_DASHBOARD_COMPONENTES,
  DEFAULT_CARDS_VISIVEIS,
  usePersonalSettings,
} from "@/hooks/usePersonalSettings";

interface Props {
  personalId: string;
  onSaved?: () => void;
}

const CARD_ICONS: Record<string, any> = {
  treinos: Dumbbell,
  chat: MessageSquare,
  avaliacao: Activity,
  historico: Calendar,
  materiais: FileText,
  plano: CreditCard,
  biblioteca: Library,
};

const NOME_EXEMPLO = "Joao";

function SortableRow({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 50 : "auto",
      }}
      className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label={`Reordenar ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Label htmlFor={`item-${id}`} className="flex-1 cursor-pointer text-sm">
        {label}
      </Label>
      <Switch
        id={`item-${id}`}
        checked={checked}
        onCheckedChange={() => onToggle(id)}
      />
    </div>
  );
}

function SwitchRow({
  id,
  label,
  onToggle,
}: {
  id: string;
  label: string;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed bg-muted/40 px-3 py-2">
      <span className="h-4 w-4" />
      <Label htmlFor={`hidden-item-${id}`} className="flex-1 cursor-pointer text-sm">
        {label}
      </Label>
      <Switch
        id={`hidden-item-${id}`}
        checked={false}
        onCheckedChange={() => onToggle(id)}
      />
    </div>
  );
}

export function AlunoDashboardCustomizeForm({ personalId, onSaved }: Props) {
  const { settings, updateSettings, loading } = usePersonalSettings(personalId);

  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [jornadaTitle, setJornadaTitle] = useState("");
  const [jornadaMessage, setJornadaMessage] = useState("");
  const [mensagemConclusao, setMensagemConclusao] = useState("");
  const [chatWelcome, setChatWelcome] = useState("");
  const [cards, setCards] = useState<string[]>([...DEFAULT_CARDS_VISIVEIS]);
  const [componentes, setComponentes] = useState<string[]>([
    ...DEFAULT_ALUNO_DASHBOARD_COMPONENTES,
  ]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!settings) return;
    setWelcomeTitle(settings.welcome_title ?? "");
    setWelcomeMessage(settings.welcome_message ?? "");
    setJornadaTitle(settings.jornada_title ?? "");
    setJornadaMessage(settings.jornada_message ?? "");
    setMensagemConclusao(settings.mensagem_conclusao_treino ?? "");
    setChatWelcome(settings.chat_welcome_message ?? "");
    setCards(
      Array.isArray(settings.cards_visiveis) && settings.cards_visiveis.length
        ? settings.cards_visiveis
        : [...DEFAULT_CARDS_VISIVEIS]
    );
    setComponentes(
      Array.isArray(settings.aluno_dashboard_componentes) &&
        settings.aluno_dashboard_componentes.length
        ? settings.aluno_dashboard_componentes
        : [...DEFAULT_ALUNO_DASHBOARD_COMPONENTES]
    );
  }, [settings]);

  const toggleItem = (
    id: string,
    setter: Dispatch<SetStateAction<string[]>>,
    fallbackOrder: readonly string[]
  ) => {
    setter((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      const next = [...prev, id];
      return next.sort(
        (a, b) => fallbackOrder.indexOf(a) - fallbackOrder.indexOf(b)
      );
    });
  };

  const moveItem = (
    id: string,
    direction: -1 | 1,
    setter: Dispatch<SetStateAction<string[]>>
  ) => {
    setter((prev) => {
      const current = prev.indexOf(id);
      const nextIndex = current + direction;
      if (current < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      return arrayMove(prev, current, nextIndex);
    });
  };

  const handleDragEnd = (
    event: DragEndEvent,
    setter: Dispatch<SetStateAction<string[]>>
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setter((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
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
        aluno_dashboard_componentes: componentes as any,
      } as any);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const chatPreview = (chatWelcome.trim() || "").replace(
    /\{nome\}/gi,
    NOME_EXEMPLO
  );

  const cardRows = useMemo(
    () =>
      [...DEFAULT_CARDS_VISIVEIS].map((id) => ({
        id,
        label: ALUNO_CARD_LABELS[id],
      })),
    []
  );

  const activeCardRows = cards
    .map((id) => cardRows.find((item) => item.id === id))
    .filter(Boolean) as { id: string; label: string }[];
  const hiddenCardRows = cardRows.filter((item) => !cards.includes(item.id));
  const hiddenComponentes = [...DEFAULT_ALUNO_DASHBOARD_COMPONENTES].filter(
    (id) => !componentes.includes(id)
  );

  if (loading) return null;

  return (
    <div className="grid gap-6 pt-2 lg:grid-cols-[1fr_minmax(300px,390px)]">
      <div className="min-w-0 space-y-6">
        <div className="space-y-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <div className="rounded-md bg-primary/15 p-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                Mensagem automatica no chat
                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary-foreground">
                  Destaque
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Enviada assim que o aluno fizer o primeiro acesso. Use{" "}
                <code className="rounded bg-muted px-1 text-foreground">
                  {"{nome}"}
                </code>{" "}
                para personalizar com o primeiro nome.
              </p>
            </div>
          </div>
          <Textarea
            value={chatWelcome}
            onChange={(e) => setChatWelcome(e.target.value)}
            placeholder="Oi {nome}, seja bem-vindo(a)! Aqui e o nosso canal direto."
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
            placeholder='Ex.: "Mais um treino concluido. Constancia e o segredo."'
            rows={2}
            maxLength={140}
          />
          <p className="text-xs text-muted-foreground">
            Aparece na tela final do treino. Se vazio, sera usado o padrao.
          </p>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div>
            <p className="text-sm font-semibold">Cards e menus da area do aluno</p>
            <p className="text-xs text-muted-foreground">
              A mesma ordem sera usada nos cards, menu lateral e navegacao mobile.
            </p>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, setCards)}
          >
            <SortableContext items={cards} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {activeCardRows.map((item) => (
                  <SortableRow
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    checked
                    onToggle={(id) =>
                      toggleItem(id, setCards, DEFAULT_CARDS_VISIVEIS)
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {hiddenCardRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Ocultos
              </p>
              {hiddenCardRows.map((item) => (
                <SwitchRow
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  onToggle={(id) =>
                    toggleItem(id, setCards, DEFAULT_CARDS_VISIVEIS)
                  }
                />
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alteracoes"}
        </Button>
      </div>

      <div className="self-start space-y-3 lg:sticky lg:top-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Pre-visualizacao editavel
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
          {componentes.map((id, index) => {
            if (id === "frequencia") {
              return (
                <PreviewBlock
                  key={id}
                  title="Frequencia de treinos"
                  onHide={() =>
                    toggleItem(id, setComponentes, DEFAULT_ALUNO_DASHBOARD_COMPONENTES)
                  }
                  onUp={() => moveItem(id, -1, setComponentes)}
                  onDown={() => moveItem(id, 1, setComponentes)}
                  isFirst={index === 0}
                  isLast={index === componentes.length - 1}
                >
                  <div className="grid grid-cols-7 gap-1.5">
                    {["S", "T", "Q", "Q", "S", "S", "D"].map((dia, dayIndex) => (
                      <div
                        key={`${dia}-${dayIndex}`}
                        className="flex h-14 flex-col items-center justify-between rounded-md border bg-background p-1.5 text-[10px]"
                      >
                        <span className="font-semibold">{dia}</span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            dayIndex < 4
                              ? "border-primary bg-primary text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {dayIndex < 4 ? <Check className="h-3 w-3" /> : dayIndex + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </PreviewBlock>
              );
            }

            if (id === "mensagens") {
              return (
                <PreviewBlock
                  key={id}
                  title="Preview de mensagens"
                  onHide={() =>
                    toggleItem(id, setComponentes, DEFAULT_ALUNO_DASHBOARD_COMPONENTES)
                  }
                  onUp={() => moveItem(id, -1, setComponentes)}
                  onDown={() => moveItem(id, 1, setComponentes)}
                  isFirst={index === 0}
                  isLast={index === componentes.length - 1}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 rounded-lg bg-background px-3 py-2 text-xs">
                      <p className="font-medium">Mensagem do personal</p>
                      <p className="truncate text-muted-foreground">
                        Sua ultima conversa aparece aqui.
                      </p>
                    </div>
                  </div>
                </PreviewBlock>
              );
            }

            if (id === "boas_vindas") {
              return (
                <PreviewBlock
                  key={id}
                  title="Boas-vindas"
                  onHide={() =>
                    toggleItem(id, setComponentes, DEFAULT_ALUNO_DASHBOARD_COMPONENTES)
                  }
                  onUp={() => moveItem(id, -1, setComponentes)}
                  onDown={() => moveItem(id, 1, setComponentes)}
                  isFirst={index === 0}
                  isLast={index === componentes.length - 1}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <Home className="h-3.5 w-3.5" />
                      Painel do aluno
                    </div>
                    <Input
                      value={welcomeTitle}
                      onChange={(e) => setWelcomeTitle(e.target.value)}
                      placeholder="Bem-vindo(a)!"
                      className="h-8 text-sm font-semibold"
                    />
                    <Textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="Mensagem de boas-vindas"
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </PreviewBlock>
              );
            }

            if (id === "cards") {
              return (
                <PreviewBlock
                  key={id}
                  title={`Cards visiveis (${cards.length})`}
                  onHide={() =>
                    toggleItem(id, setComponentes, DEFAULT_ALUNO_DASHBOARD_COMPONENTES)
                  }
                  onUp={() => moveItem(id, -1, setComponentes)}
                  onDown={() => moveItem(id, 1, setComponentes)}
                  isFirst={index === 0}
                  isLast={index === componentes.length - 1}
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {cards.map((cardId) => {
                      const Icon = CARD_ICONS[cardId] || FileText;
                      return (
                        <div
                          key={cardId}
                          className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-2 text-[11px] font-medium"
                        >
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="min-w-0 truncate">
                            {ALUNO_CARD_LABELS[cardId]}
                          </span>
                        </div>
                      );
                    })}
                    {cards.length === 0 && (
                      <p className="col-span-2 text-[11px] italic text-muted-foreground">
                        Nenhum card visivel.
                      </p>
                    )}
                  </div>
                </PreviewBlock>
              );
            }

            return (
              <PreviewBlock
                key={id}
                title="Sua Jornada"
                onHide={() =>
                  toggleItem(id, setComponentes, DEFAULT_ALUNO_DASHBOARD_COMPONENTES)
                }
                onUp={() => moveItem(id, -1, setComponentes)}
                onDown={() => moveItem(id, 1, setComponentes)}
                isFirst={index === 0}
                isLast={index === componentes.length - 1}
              >
                <div className="space-y-2">
                  <Input
                    value={jornadaTitle}
                    onChange={(e) => setJornadaTitle(e.target.value)}
                    placeholder="Sua Jornada"
                    className="h-8 text-sm font-semibold"
                  />
                  <Textarea
                    value={jornadaMessage}
                    onChange={(e) => setJornadaMessage(e.target.value)}
                    placeholder="Mensagem da jornada"
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </PreviewBlock>
            );
          })}

          {hiddenComponentes.length > 0 && (
            <div className="rounded-lg border border-dashed bg-background p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Componentes ocultos
              </p>
              <div className="flex flex-wrap gap-2">
                {hiddenComponentes.map((id) => (
                  <Button
                    key={id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() =>
                      toggleItem(
                        id,
                        setComponentes,
                        DEFAULT_ALUNO_DASHBOARD_COMPONENTES
                      )
                    }
                  >
                    Mostrar {ALUNO_DASHBOARD_COMPONENT_LABELS[id]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border-2 border-primary/40 bg-background p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <MessageSquare className="h-3 w-3" />
              Chat - 1a mensagem automatica
            </div>
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                P
              </div>
              <div className="max-w-full rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                {chatPreview ? (
                  <p className="break-words text-xs whitespace-pre-wrap">
                    {chatPreview}
                  </p>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    Escreva uma mensagem para ve-la aqui.
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

function PreviewBlock({
  title,
  children,
  onHide,
  onUp,
  onDown,
  isFirst,
  isLast,
}: {
  title: string;
  children: ReactNode;
  onHide: () => void;
  onUp: () => void;
  onDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-muted-foreground">
          {title}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={onUp}
            disabled={isFirst}
          >
            Subir
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={onDown}
            disabled={isLast}
          >
            Descer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={onHide}
          >
            Ocultar
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
