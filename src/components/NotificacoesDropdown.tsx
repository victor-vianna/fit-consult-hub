// components/NotificacoesDropdown.tsx
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificacoesDropdownProps {
  userId: string;
}

export function NotificacoesDropdown({ userId }: NotificacoesDropdownProps) {
  const {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
  } = useNotificacoes(userId);

  // ✅ Ícone baseado no tipo de notificação
  const getIcone = (tipo: string) => {
    switch (tipo) {
      case "treino_concluido":
        return "🎉";
      case "novo_aluno":
        return "👤";
      case "mensagem":
        return "💬";
      default:
        return "🔔";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* ✅ Badge com contador de não lidas */}
          {naoLidas > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {naoLidas > 9 ? "9+" : naoLidas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        {/* ✅ Cabeçalho */}
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={marcarTodasComoLidas}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* ✅ Lista de notificações */}
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {notificacoes.map((notificacao) => (
              <div
                key={notificacao.id}
                className={`p-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors ${
                  !notificacao.lida ? "bg-blue-50 dark:bg-blue-950/20" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Ícone */}
                  <div className="text-2xl flex-shrink-0">
                    {getIcone(notificacao.tipo)}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm leading-tight">
                        {notificacao.titulo}
                      </h4>

                      {/* Botão deletar */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => deletarNotificacao(notificacao.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {notificacao.mensagem && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {notificacao.mensagem}
                      </p>
                    )}

                    {/* Tempo relativo */}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notificacao.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>

                    {/* Botão marcar como lida */}
                    {!notificacao.lida && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 mt-2 text-xs"
                        onClick={() => marcarComoLida(notificacao.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
