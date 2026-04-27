// components/NotificacoesDropdown.tsx
import { useMemo, useState } from "react";
import { Bell, CheckCheck, X, User, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { FeedbackDetailModal } from "@/components/dashboard/FeedbackDetailModal";

interface NotificacoesDropdownProps {
  userId: string;
}

const FEEDBACK_TYPES = ["feedback_semanal", "checkin_semanal", "feedback_treino"];

export function NotificacoesDropdown({ userId }: NotificacoesDropdownProps) {
  const navigate = useNavigate();
  const { settings } = usePersonalSettings(userId);
  const {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
  } = useNotificacoes(userId);

  const [grupoExpandido, setGrupoExpandido] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean;
    feedbackId: string | null;
    alunoId: string;
    alunoNome: string;
  }>({ open: false, feedbackId: null, alunoId: "", alunoNome: "" });

  const getIcone = (tipo: string) => {
    switch (tipo) {
      case "treino_concluido":
        return "🎉";
      case "novo_aluno":
        return "👤";
      case "mensagem":
      case "nova_mensagem":
        return "💬";
      case "planilha_expira_7dias":
      case "planilha_expira_3dias":
        return "⏰";
      case "planilha_expirou":
        return "⚠️";
      case "planilha_aluno_lembrete":
      case "planilha_aluno_fim":
        return "📋";
      case "feedback_semanal":
      case "checkin_semanal":
        return "📝";
      case "feedback_treino":
        return "⭐";
      default:
        return "🔔";
    }
  };

  const getAlunoId = (n: any): string | null =>
    n.dados?.aluno_id || n.dados?.profile_id || null;
  const getAlunoNome = (n: any): string | null =>
    n.dados?.aluno_nome || n.dados?.nome_aluno || null;

  // Agrupa por aluno (quando houver), demais ficam em "Sistema"
  const grupos = useMemo(() => {
    const map = new Map<
      string,
      { key: string; alunoId: string | null; nome: string; itens: any[]; naoLidas: number }
    >();
    for (const n of notificacoes) {
      const alunoId = getAlunoId(n);
      const key = alunoId || "__sistema__";
      const nome = alunoId ? getAlunoNome(n) || "Aluno" : "Sistema";
      if (!map.has(key)) {
        map.set(key, { key, alunoId, nome, itens: [], naoLidas: 0 });
      }
      const g = map.get(key)!;
      g.itens.push(n);
      if (!n.lida) g.naoLidas += 1;
      // Atualiza o nome se aparecer um melhor
      if (alunoId && !g.nome && getAlunoNome(n)) g.nome = getAlunoNome(n)!;
    }
    return Array.from(map.values()).sort((a, b) => {
      // Ordena: com não lidas primeiro, depois mais recentes
      if (a.naoLidas !== b.naoLidas) return b.naoLidas - a.naoLidas;
      const aTime = new Date(a.itens[0].created_at).getTime();
      const bTime = new Date(b.itens[0].created_at).getTime();
      return bTime - aTime;
    });
  }, [notificacoes]);

  const handleNotificacaoClick = (n: any) => {
    if (!n.lida) marcarComoLida(n.id);

    const alunoId = getAlunoId(n);
    const alunoNome = getAlunoNome(n) || "Aluno";

    // Feedback → abre modal
    if (FEEDBACK_TYPES.includes(n.tipo) && alunoId) {
      const feedbackId = n.dados?.checkin_id || n.dados?.feedback_id || null;
      if (feedbackId) {
        setFeedbackModal({ open: true, feedbackId, alunoId, alunoNome });
        return;
      }
      // Sem checkin_id → vai para histórico
      navigate(`/aluno/${alunoId}?tab=historico`);
      return;
    }

    // Mensagem → chat
    if (n.tipo === "nova_mensagem" && alunoId) {
      navigate(`/aluno/${alunoId}?tab=chat`);
      return;
    }

    // Demais com aluno_id → perfil
    if (alunoId) navigate(`/aluno/${alunoId}`);
  };

  const marcarGrupoComoLido = (grupo: typeof grupos[number]) => {
    grupo.itens.filter((i) => !i.lida).forEach((i) => marcarComoLida(i.id));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
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

        <DropdownMenuContent align="end" className="w-96">
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

          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : grupos.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <ScrollArea className="h-[450px] p-1">
              {grupos.map((grupo) => {
                const expandido = grupoExpandido === grupo.key;
                return (
                  <div key={grupo.key} className="mx-2 my-1.5">
                    {/* Cabeçalho do grupo */}
                    <button
                      type="button"
                      onClick={() =>
                        setGrupoExpandido(expandido ? null : grupo.key)
                      }
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        grupo.naoLidas > 0
                          ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                          : "bg-card border-border hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {expandido ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {grupo.nome}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {grupo.naoLidas > 0 && (
                          <Badge variant="destructive" className="h-5 text-xs px-1.5">
                            {grupo.naoLidas}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {grupo.itens.length}
                        </span>
                      </div>
                    </button>

                    {/* Itens do grupo */}
                    {expandido && (
                      <div className="ml-3 mt-1 space-y-1 border-l-2 border-border pl-2">
                        {grupo.naoLidas > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => marcarGrupoComoLido(grupo)}
                            className="h-auto p-1 text-xs w-full justify-start"
                          >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Marcar grupo como lido
                          </Button>
                        )}
                        {grupo.itens.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-md border text-sm cursor-pointer transition-colors hover:bg-accent/50 ${
                              !n.lida
                                ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/60"
                                : "bg-card border-border"
                            }`}
                            onClick={() => handleNotificacaoClick(n)}
                          >
                            <div className="flex items-start gap-2">
                              <div className="text-lg flex-shrink-0 leading-none mt-0.5">
                                {getIcone(n.tipo)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-medium text-sm leading-tight">
                                    {n.titulo}
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 flex-shrink-0 -mt-0.5 -mr-0.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletarNotificacao(n.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                {n.mensagem && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {n.mensagem}
                                  </p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(n.created_at), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </ScrollArea>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de detalhes do feedback */}
      <FeedbackDetailModal
        open={feedbackModal.open}
        onOpenChange={(open) =>
          setFeedbackModal((prev) => ({ ...prev, open }))
        }
        feedbackId={feedbackModal.feedbackId}
        alunoId={feedbackModal.alunoId}
        alunoNome={feedbackModal.alunoNome}
        personalId={userId}
        themeColor={settings?.theme_color}
      />
    </>
  );
}
