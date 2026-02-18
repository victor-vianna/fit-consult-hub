import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
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
  } = useChatMessages({ personalId, alunoId, currentUserId });

  // Marcar como lidas ao abrir
  useEffect(() => {
    marcarComoLidas();
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
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                    isMe
                      ? "rounded-br-md text-white"
                      : "rounded-bl-md bg-muted text-foreground"
                  )}
                  style={isMe ? { backgroundColor: themeColor || "hsl(var(--primary))" } : undefined}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.conteudo}</p>
                  <p className={cn(
                    "text-[10px] mt-1",
                    isMe ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
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
