import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatMessages } from "@/hooks/useChatMessages";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  personalId: string;
  alunoId: string;
  currentUserId: string;
  themeColor?: string;
}

export function ChatPanel({ personalId, alunoId, currentUserId, themeColor }: ChatPanelProps) {
  const [texto, setTexto] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    mensagens,
    loading,
    sending,
    enviarMensagem,
    marcarComoLidas,
    marcarComoNaoLida,
  } = useChatMessages({ personalId, alunoId, currentUserId });

  // Marcar como lidas ao abrir
  useEffect(() => {
    marcarComoLidas();
  }, [marcarComoLidas]);

  // Marcar como lidas ao voltar a aba (usuário deixou aba aberta)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        marcarComoLidas();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [marcarComoLidas]);

  // Scroll para baixo ao receber mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const handleSend = async () => {
    if (!texto.trim() || sending) return;
    const msg = texto;
    setTexto("");
    await enviarMensagem(msg);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      {/* Mensagens */}
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
            const podeMarcarNaoLida = !isMe && msg.lida;
            const bubble = (
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm cursor-default select-text",
                  isMe
                    ? "rounded-br-md text-white"
                    : "rounded-bl-md bg-muted text-foreground"
                )}
                style={isMe ? { backgroundColor: themeColor || "hsl(var(--primary))" } : undefined}
              >
                <MessageContent conteudo={msg.conteudo} isMe={isMe} themeColor={themeColor} />
                <div className={cn(
                  "flex items-center gap-1 mt-1",
                  isMe ? "justify-end" : ""
                )}>
                  <p className={cn(
                    "text-[10px]",
                    isMe ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                  {isMe && (
                    <span className={cn("text-[10px]", msg.lida ? "text-white/90" : "text-white/50")}>
                      {msg.lida ? "✔✔" : "✔"}
                    </span>
                  )}
                </div>
              </div>
            );

            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                {podeMarcarNaoLida ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="max-w-[75%] text-left">
                        {bubble}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="bottom">
                      <DropdownMenuItem onClick={() => marcarComoNaoLida(msg.id)}>
                        Marcar como não lida
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  bubble
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2 items-end bg-card">
        <textarea
          ref={inputRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
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
    </div>
  );
}

/**
 * Renderiza o conteúdo de uma mensagem, destacando blocos de citação
 * (linhas iniciadas com "> ") como quotes visuais.
 */
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
