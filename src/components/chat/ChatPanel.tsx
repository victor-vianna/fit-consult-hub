import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, X, Pencil, Reply, Trash2, Check } from "lucide-react";
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
import { useChatMessages, type ChatMessage } from "@/hooks/useChatMessages";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  personalId: string;
  alunoId: string;
  currentUserId: string;
  themeColor?: string;
}

type DeleteTarget = { id: string; isMine: boolean } | null;

export function ChatPanel({ personalId, alunoId, currentUserId, themeColor }: ChatPanelProps) {
  const [texto, setTexto] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const findMsg = (id: string | null) => (id ? mensagens.find((m) => m.id === id) : undefined);

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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape") {
      setEditingId(null);
      setReplyTo(null);
      setTexto("");
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-lg overflow-hidden bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1">Envie a primeira mensagem!</p>
          </div>
        ) : (
          mensagens.map((msg) => {
            const isMe = msg.remetente_id === currentUserId;
            const isDeleted = msg.deleted_for_all;
            const replied = findMsg(msg.reply_to);

            const bubble = (
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm select-text",
                  isMe ? "rounded-br-md text-white" : "rounded-bl-md bg-muted text-foreground",
                  isDeleted && "italic opacity-70"
                )}
                style={isMe && !isDeleted ? { backgroundColor: themeColor || "hsl(var(--primary))" } : undefined}
              >
                {replied && !isDeleted && (
                  <div
                    className={cn(
                      "rounded-md border-l-2 pl-2 py-1 text-xs mb-1.5 truncate",
                      isMe
                        ? "border-white/60 bg-white/10 text-white/90"
                        : "border-primary/50 bg-background/60 text-muted-foreground"
                    )}
                  >
                    <div className="font-semibold opacity-80">
                      {replied.remetente_id === currentUserId ? "Você" : "Resposta"}
                    </div>
                    <div className="truncate">{replied.deleted_for_all ? "mensagem apagada" : replied.conteudo}</div>
                  </div>
                )}
                {isDeleted ? (
                  <p className="text-sm">Esta mensagem foi apagada</p>
                ) : (
                  <MessageContent conteudo={msg.conteudo} isMe={isMe} themeColor={themeColor} />
                )}
                <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "")}>
                  <p className={cn("text-[10px]", isMe ? "text-white/70" : "text-muted-foreground")}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                  {msg.edited_at && !isDeleted && (
                    <span className={cn("text-[10px]", isMe ? "text-white/70" : "text-muted-foreground")}>
                      · editada
                    </span>
                  )}
                  {isMe && !isDeleted && (
                    <span className={cn("text-[10px]", msg.lida ? "text-white/90" : "text-white/50")}>
                      {msg.lida ? "✔✔" : "✔"}
                    </span>
                  )}
                </div>
              </div>
            );

            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="max-w-[75%] text-left">{bubble}</button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isMe ? "end" : "start"} side="bottom">
                    {!isDeleted && (
                      <DropdownMenuItem onClick={() => startReply(msg)}>
                        <Reply className="h-4 w-4 mr-2" /> Responder
                      </DropdownMenuItem>
                    )}
                    {isMe && !isDeleted && (
                      <DropdownMenuItem onClick={() => startEdit(msg)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                    )}
                    {!isMe && msg.lida && !isDeleted && (
                      <DropdownMenuItem onClick={() => marcarComoNaoLida(msg.id)}>
                        <Check className="h-4 w-4 mr-2" /> Marcar como não lida
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget({ id: msg.id, isMine: isMe })}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>

      {/* Banner de edição/resposta */}
      {(editingId || replyTo) && (
        <div className="border-t border-b bg-muted/40 px-3 py-2 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {editingId ? "Editando mensagem" : `Respondendo ${replyTo?.remetente_id === currentUserId ? "você" : "mensagem"}`}
            </div>
            <div className="text-xs text-foreground/80 truncate">
              {editingId ? findMsg(editingId)?.conteudo : replyTo?.conteudo}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => {
              setEditingId(null);
              setReplyTo(null);
              setTexto("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="border-t p-3 flex gap-2 items-end bg-card">
        <textarea
          ref={inputRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={editingId ? "Editar mensagem..." : "Digite sua mensagem..."}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ maxHeight: "120px" }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!texto.trim() || sending}
          className="rounded-xl h-10 w-10 shrink-0"
          style={{ backgroundColor: themeColor || undefined }}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Diálogo de exclusão (escolhe entre só para mim ou para todos) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.isMine
                ? "Você pode excluir só para você ou apagar para todos os participantes."
                : "Esta mensagem ficará oculta apenas para você."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={async () => {
                if (deleteTarget) await excluirParaMim(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Excluir só para mim
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

function MessageContent({
  conteudo,
  isMe,
  themeColor,
}: {
  conteudo: string;
  isMe: boolean;
  themeColor?: string;
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
                "rounded-md border-l-2 pl-2 py-1 text-xs whitespace-pre-wrap break-words",
                isMe ? "border-white/60 bg-white/10 text-white/90" : "border-primary/50 bg-background/60 text-muted-foreground"
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
          <p key={i} className="text-sm whitespace-pre-wrap break-words">
            {texto}
          </p>
        );
      })}
    </div>
  );
}
