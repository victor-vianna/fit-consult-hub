import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Edit3,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { format, formatDistanceToNow, isSameDay, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useChatMessages, type ChatMessage } from "@/hooks/useChatMessages";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  personalId: string;
  alunoId: string;
  currentUserId: string;
  themeColor?: string;
  fullHeight?: boolean;
}

type DeleteTarget = { id: string; isMine: boolean } | null;
type ProfileSummary = { nome: string | null; telefone?: string | null };

const QUICK_EMOJIS = ["👍", "💪", "🔥", "👏", "✅"];

export function ChatPanel({
  personalId,
  alunoId,
  currentUserId,
  themeColor,
  fullHeight = false,
}: ChatPanelProps) {
  const [texto, setTexto] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const {
    mensagens,
    loading,
    sending,
    enviarMensagem,
    marcarComoLidas,
    marcarComoNaoLida,
    editarMensagem,
    excluirParaMim,
    excluirParaTodos,
  } = useChatMessages({ personalId, alunoId, currentUserId });

  const otherUserId = currentUserId === personalId ? alunoId : personalId;
  const currentName = profiles[currentUserId]?.nome || "Voce";
  const otherName =
    profiles[otherUserId]?.nome || (currentUserId === personalId ? "Aluno" : "Personal");
  const initials = getInitials(otherName);
  const accent = themeColor || "hsl(var(--primary))";

  useEffect(() => {
    marcarComoLidas();
  }, [marcarComoLidas]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") marcarComoLidas();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [marcarComoLidas]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const ids = Array.from(new Set([personalId, alunoId, currentUserId].filter(Boolean)));
      if (!ids.length) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, nome, telefone")
        .in("id", ids);

      const mapped = (data || []).reduce<Record<string, ProfileSummary>>((acc, profile: any) => {
        acc[profile.id] = { nome: profile.nome, telefone: profile.telefone };
        return acc;
      }, {});
      setProfiles(mapped);
    };

    fetchProfiles();
  }, [personalId, alunoId, currentUserId]);

  useEffect(() => {
    scrollToBottom("auto");
  }, [mensagens.length]);

  const findMsg = (id: string | null) => (id ? mensagens.find((m) => m.id === id) : undefined);

  const visibleMessages = useMemo(() => {
    if (!searchTerm.trim()) return mensagens;
    const term = searchTerm.trim().toLowerCase();
    return mensagens.filter((msg) => msg.conteudo.toLowerCase().includes(term));
  }, [mensagens, searchTerm]);

  const groupedMessages = useMemo(() => {
    return visibleMessages.map((msg, index) => {
      const previous = visibleMessages[index - 1];
      const showDate =
        !previous || !isSameDay(new Date(previous.created_at), new Date(msg.created_at));
      const showAvatar =
        msg.remetente_id !== currentUserId &&
        (!previous ||
          previous.remetente_id !== msg.remetente_id ||
          !isSameDay(new Date(previous.created_at), new Date(msg.created_at)));

      return { msg, showDate, showAvatar };
    });
  }, [visibleMessages, currentUserId]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 180);
    if (distanceFromBottom < 80) marcarComoLidas();
  };

  const handleSend = async () => {
    if (!texto.trim() || sending) return;
    const conteudo = texto;
    setTexto("");

    if (editingId) {
      await editarMensagem(editingId, conteudo);
      setEditingId(null);
    } else {
      await enviarMensagem(conteudo, replyTo?.id ?? null);
      setReplyTo(null);
    }

    inputRef.current?.focus();
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape") {
      clearComposer();
    }
  };

  const clearComposer = () => {
    setEditingId(null);
    setReplyTo(null);
    setTexto("");
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setReplyTo(null);
    setTexto(msg.conteudo);
    inputRef.current?.focus();
  };

  const startReply = (msg: ChatMessage) => {
    setReplyTo(msg);
    setEditingId(null);
    inputRef.current?.focus();
  };

  const copyMessage = async (msg: ChatMessage) => {
    await navigator.clipboard?.writeText(msg.conteudo);
    toast({ title: "Mensagem copiada" });
  };

  const appendEmoji = (emoji: string) => {
    setTexto((prev) => `${prev}${emoji}`);
    inputRef.current?.focus();
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-background",
          fullHeight
            ? "h-full min-h-0 rounded-none border-0"
            : "h-[580px] rounded-lg border"
        )}
      >
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">Carregando conversa...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-background",
        fullHeight
          ? "h-full min-h-0 rounded-none border-0 shadow-none"
          : "h-[min(76vh,720px)] min-h-[540px] rounded-lg border shadow-sm"
      )}
    >
      <div className="border-b bg-card">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {initials || <UserCircle className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold sm:text-base">{otherName}</h3>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Conversa centralizada na plataforma
            </p>
          </div>
          <Button
            type="button"
            variant={searchOpen ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setSearchOpen((prev) => !prev)}
            title="Buscar mensagens"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {searchOpen && (
          <div className="border-t px-3 py-2 sm:px-4">
            <div className="flex items-center gap-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar nesta conversa"
                className="h-9"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  setSearchTerm("");
                  setSearchOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden bg-muted/20">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-3 py-4 sm:px-4"
        >
          {mensagens.length === 0 ? (
            <EmptyChat otherName={otherName} />
          ) : visibleMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Nenhuma mensagem encontrada para "{searchTerm}".
            </div>
          ) : (
            <div className="space-y-2">
              {groupedMessages.map(({ msg, showDate, showAvatar }) => {
                const isMe = msg.remetente_id === currentUserId;
                const isDeleted = msg.deleted_for_all;
                const replied = findMsg(msg.reply_to);
                const senderName = isMe ? currentName : otherName;

                return (
                  <div key={msg.id} className="space-y-2">
                    {showDate && <DateSeparator date={new Date(msg.created_at)} />}
                    <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                      {!isMe && (
                        <div className="h-7 w-7 shrink-0">
                          {showAvatar && (
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                              style={{ backgroundColor: accent }}
                            >
                              {initials}
                            </div>
                          )}
                        </div>
                      )}

                      <MessageActions
                        isMe={isMe}
                        isDeleted={isDeleted}
                        isRead={!!msg.lida}
                        onReply={() => startReply(msg)}
                        onEdit={() => startEdit(msg)}
                        onCopy={() => copyMessage(msg)}
                        onMarkUnread={() => marcarComoNaoLida(msg.id)}
                        onDelete={() => setDeleteTarget({ id: msg.id, isMine: isMe })}
                      >
                        <MessageBubble
                          msg={msg}
                          replied={replied}
                          isMe={isMe}
                          senderName={senderName}
                          currentUserId={currentUserId}
                          themeColor={themeColor}
                          searchTerm={searchTerm}
                        />
                      </MessageActions>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showScrollButton && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute bottom-4 right-4 h-9 w-9 rounded-full shadow-md"
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(editingId || replyTo) && (
        <div className="border-t bg-card px-3 py-2 sm:px-4">
          <div className="flex items-start gap-2 rounded-lg border-l-4 bg-muted/50 px-3 py-2" style={{ borderLeftColor: accent }}>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {editingId
                  ? "Editando mensagem"
                  : `Respondendo ${replyTo?.remetente_id === currentUserId ? "voce" : otherName}`}
              </div>
              <div className="truncate text-xs text-foreground/80">
                {editingId ? findMsg(editingId)?.conteudo : replyTo?.conteudo}
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clearComposer}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="border-t bg-card px-3 py-3 sm:px-4">
        <div className="mb-2 flex items-center gap-1">
          {QUICK_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-base"
              onClick={() => appendEmoji(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                <Paperclip className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() =>
                  toast({
                    title: "Envio de arquivos",
                    description: "Por enquanto, cole links ou envie materiais pela area de Materiais.",
                  })
                }
              >
                Anexar arquivo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => appendEmoji("📌 ")}>
                Enviar destaque
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={editingId ? "Editar mensagem..." : "Mensagem"}
              rows={1}
              className="max-h-[140px] min-h-10 w-full resize-none rounded-2xl border border-input bg-background px-4 py-2.5 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Smile className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>

          <Button
            size="icon"
            onClick={handleSend}
            disabled={!texto.trim() || sending}
            className="h-10 w-10 shrink-0 rounded-full"
            style={{ backgroundColor: texto.trim() ? accent : undefined }}
          >
            {sending ? <Clock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 hidden text-[11px] text-muted-foreground sm:block">
          Enter envia. Shift + Enter quebra linha.
        </p>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.isMine
                ? "Voce pode excluir so para voce ou apagar para todos os participantes."
                : "Esta mensagem ficara oculta apenas para voce."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={async () => {
                if (deleteTarget) await excluirParaMim(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Excluir so para mim
            </Button>
            {deleteTarget?.isMine && (
              <AlertDialogAction
                onClick={async () => {
                  if (deleteTarget) await excluirParaTodos(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir para todos
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyChat({ otherName }: { otherName: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-sm">
        <MessageSquare className="h-8 w-8 opacity-40" />
      </div>
      <p className="text-sm font-medium text-foreground">Comece a conversa com {otherName}</p>
      <p className="mt-1 max-w-xs text-xs">
        Mensagens, orientacoes e combinados ficam centralizados aqui.
      </p>
    </div>
  );
}

function MessageActions({
  children,
  isMe,
  isDeleted,
  isRead,
  onReply,
  onEdit,
  onCopy,
  onMarkUnread,
  onDelete,
}: {
  children: React.ReactNode;
  isMe: boolean;
  isDeleted: boolean;
  isRead: boolean;
  onReply: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn("group flex max-w-[86%] items-center gap-1", isMe && "flex-row-reverse")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isMe ? "end" : "start"} side="bottom">
          {!isDeleted && (
            <>
              <DropdownMenuItem onClick={onReply}>
                <Reply className="mr-2 h-4 w-4" /> Responder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="mr-2 h-4 w-4" /> Copiar
              </DropdownMenuItem>
            </>
          )}
          {isMe && !isDeleted && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit3 className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
          )}
          {!isMe && isRead && !isDeleted && (
            <DropdownMenuItem onClick={onMarkUnread}>
              <Check className="mr-2 h-4 w-4" /> Marcar como nao lida
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {children}
    </div>
  );
}

function MessageBubble({
  msg,
  replied,
  isMe,
  senderName,
  currentUserId,
  themeColor,
  searchTerm,
}: {
  msg: ChatMessage;
  replied?: ChatMessage;
  isMe: boolean;
  senderName: string;
  currentUserId: string;
  themeColor?: string;
  searchTerm: string;
}) {
  const isDeleted = msg.deleted_for_all;

  return (
    <div
      className={cn(
        "min-w-[120px] max-w-full rounded-2xl px-3 py-2 shadow-sm select-text",
        isMe
          ? "rounded-br-sm text-white"
          : "rounded-bl-sm border bg-card text-foreground",
        isDeleted && "italic opacity-70"
      )}
      style={isMe && !isDeleted ? { backgroundColor: themeColor || "hsl(var(--primary))" } : undefined}
    >
      {!isMe && <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">{senderName}</p>}
      {replied && !isDeleted && (
        <div
          className={cn(
            "mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs",
            isMe
              ? "border-white/70 bg-white/10 text-white/90"
              : "border-primary/50 bg-muted/60 text-muted-foreground"
          )}
        >
          <div className="font-semibold opacity-90">
            {replied.remetente_id === currentUserId ? "Voce" : "Resposta"}
          </div>
          <div className="line-clamp-2 break-words">
            {replied.deleted_for_all ? "mensagem apagada" : replied.conteudo}
          </div>
        </div>
      )}

      {isDeleted ? (
        <p className="text-sm">Esta mensagem foi apagada</p>
      ) : (
        <MessageContent conteudo={msg.conteudo} isMe={isMe} themeColor={themeColor} searchTerm={searchTerm} />
      )}

      <div className={cn("mt-1 flex items-center gap-1", isMe ? "justify-end" : "justify-end")}>
        <p className={cn("text-[10px]", isMe ? "text-white/75" : "text-muted-foreground")}>
          {format(new Date(msg.created_at), "HH:mm")}
        </p>
        {msg.edited_at && !isDeleted && (
          <span className={cn("text-[10px]", isMe ? "text-white/75" : "text-muted-foreground")}>
            editada
          </span>
        )}
        {isMe && !isDeleted && (
          <span className={cn("text-[10px]", msg.lida ? "text-cyan-100" : "text-white/55")}>
            {msg.lida ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </span>
        )}
      </div>
    </div>
  );
}

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date)
    ? "Hoje"
    : isYesterday(date)
    ? "Ontem"
    : format(date, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="sticky top-2 z-[1] flex justify-center py-1">
      <span className="rounded-full border bg-background/95 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
        {label}
      </span>
    </div>
  );
}

function MessageContent({
  conteudo,
  isMe,
  themeColor,
  searchTerm,
}: {
  conteudo: string;
  isMe: boolean;
  themeColor?: string;
  searchTerm: string;
}) {
  const linhas = conteudo.split("\n");
  const blocos: Array<{ tipo: "quote" | "texto"; linhas: string[] }> = [];

  for (const linha of linhas) {
    const isQuote = linha.startsWith("> ") || linha === ">";
    const conteudoLinha = isQuote ? linha.replace(/^>\s?/, "") : linha;
    const ultimo = blocos[blocos.length - 1];
    const tipo = isQuote ? "quote" : "texto";
    if (ultimo && ultimo.tipo === tipo) {
      ultimo.linhas.push(conteudoLinha);
    } else {
      blocos.push({ tipo, linhas: [conteudoLinha] });
    }
  }

  return (
    <div className="space-y-1.5">
      {blocos.map((bloco, i) => {
        if (bloco.tipo === "quote") {
          return (
            <div
              key={i}
              className={cn(
                "rounded-md border-l-2 py-1 pl-2 text-xs whitespace-pre-wrap break-words",
                isMe
                  ? "border-white/60 bg-white/10 text-white/90"
                  : "border-primary/50 bg-muted/60 text-muted-foreground"
              )}
              style={!isMe && themeColor ? { borderLeftColor: themeColor } : undefined}
            >
              {bloco.linhas.join("\n")}
            </div>
          );
        }
        const texto = bloco.linhas.join("\n");
        if (!texto.trim()) return null;
        return (
          <p key={i} className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            <RichText text={texto} isMe={isMe} searchTerm={searchTerm} />
          </p>
        );
      })}
    </div>
  );
}

function RichText({
  text,
  isMe,
  searchTerm,
}: {
  text: string;
  isMe: boolean;
  searchTerm: string;
}) {
  const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g);
  return (
    <>
      {parts.map((part, index) => {
        const isUrl = /^(https?:\/\/|www\.)/.test(part);
        const content = highlightText(part, searchTerm);
        if (isUrl) {
          const href = part.startsWith("http") ? part : `https://${part}`;
          return (
            <a
              key={`${part}-${index}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className={cn("underline underline-offset-2", isMe ? "text-white" : "text-primary")}
            >
              {content}
            </a>
          );
        }
        return <span key={`${part}-${index}`}>{content}</span>;
      })}
    </>
  );
}

function highlightText(text: string, searchTerm: string) {
  if (!searchTerm.trim()) return text;
  const escaped = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "ig");
  return text.split(regex).map((part, index) =>
    regex.test(part) ? (
      <mark key={`${part}-${index}`} className="rounded bg-yellow-300 px-0.5 text-yellow-950">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
