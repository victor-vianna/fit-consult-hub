import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  NotificationCategoryIcon,
} from "@/components/notifications/NotificationCategoryIcon";
import {
  getNotificationCategoryMeta,
  getNotificationSummary,
  type NotificationCategoryKey,
} from "@/components/notifications/NotificationCategoryMeta";
import { cn } from "@/lib/utils";

interface AlunoNotificacoesDropdownProps {
  userId: string;
  onNavigateSection: (section: string) => void;
}

type NotificationMeta = {
  section: string;
  label: string;
  category: NotificationCategoryKey;
};

type NotificationData = Record<string, unknown> & {
  tipo_acao?: unknown;
};

type AlunoNotificacao = {
  id: string;
  tipo?: string | null;
  titulo: string;
  mensagem?: string | null;
  dados?: NotificationData | null;
  lida?: boolean | null;
  created_at?: string | null;
};

const DEFAULT_META: NotificationMeta = {
  section: "inicio",
  label: "Sistema",
  category: "sistema",
};

function getNotificationMeta(tipo?: string | null, dados?: NotificationData | null): NotificationMeta {
  const action = typeof dados?.tipo_acao === "string" ? dados.tipo_acao : undefined;
  const categoryMeta = getNotificationCategoryMeta(tipo, action);
  const normalized = String(tipo || "").toLowerCase();

  if (normalized.includes("mensagem") || action === "chat") {
    return { section: "chat", label: categoryMeta.label, category: categoryMeta.key };
  }

  if (
    normalized.includes("treino") ||
    normalized.startsWith("planilha_") ||
    action === "treino"
  ) {
    return { section: "treinos", label: categoryMeta.label, category: categoryMeta.key };
  }

  if (
    normalized.includes("avaliacao") ||
    normalized.includes("composicao") ||
    action === "avaliacao"
  ) {
    return { section: "dados", label: categoryMeta.label, category: categoryMeta.key };
  }

  if (normalized.includes("material") || action === "material") {
    return { section: "materiais", label: categoryMeta.label, category: categoryMeta.key };
  }

  if (
    normalized.includes("pagamento") ||
    normalized.includes("plano") ||
    action === "plano"
  ) {
    return { section: "plano", label: categoryMeta.label, category: categoryMeta.key };
  }

  if (normalized.startsWith("planilha_")) {
    return { section: "treinos", label: categoryMeta.label, category: categoryMeta.key };
  }

  return DEFAULT_META;
}

function getTimestamp(createdAt?: string | null) {
  const date = new Date(createdAt || "");
  if (!Number.isFinite(date.getTime())) return "";

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: ptBR,
  });
}

function getGroupKey(notificacao: AlunoNotificacao) {
  const meta = getNotificationMeta(notificacao.tipo, notificacao.dados);
  return `${meta.section}:${notificacao.dados?.tipo_acao || notificacao.tipo || "sistema"}`;
}

function NotificationCard({
  notificacao,
  compact = false,
  onClick,
}: {
  notificacao: AlunoNotificacao;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
        compact ? "min-h-[76px]" : "min-h-[88px]",
        !notificacao.lida
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      )}
    >
      <NotificationCategoryIcon
        tipo={notificacao.tipo}
        action={notificacao.dados?.tipo_acao}
        unread={!notificacao.lida}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight">
            {notificacao.titulo}
          </h4>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {getTimestamp(notificacao.created_at)}
          </span>
        </div>
        {notificacao.mensagem && (
          <p className={cn("mt-1 text-xs text-muted-foreground", compact ? "line-clamp-1" : "line-clamp-2")}>
            {notificacao.mensagem}
          </p>
        )}
      </div>
    </button>
  );
}

export function AlunoNotificacoesDropdown({
  userId,
  onNavigateSection,
}: AlunoNotificacoesDropdownProps) {
  const {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
  } = useNotificacoes(userId);
  const {
    status: pushStatus,
    supported: pushSupported,
    missingVapidKey,
    enabled: pushEnabled,
    enablePushNotifications,
  } = usePushNotifications(userId);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const notificationGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        title: string;
        latest: AlunoNotificacao;
        items: AlunoNotificacao[];
        unread: number;
        meta: NotificationMeta;
      }
    >();

    notificacoes.forEach((notificacao) => {
      const typedNotification = notificacao as AlunoNotificacao;
      const key = getGroupKey(typedNotification);
      const meta = getNotificationMeta(typedNotification.tipo, typedNotification.dados);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: meta.label,
          latest: typedNotification,
          items: [],
          unread: 0,
          meta,
        });
      }

      const group = groups.get(key)!;
      group.items.push(typedNotification);
      if (!typedNotification.lida) group.unread += 1;
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      latest: group.items[0],
    }));
  }, [notificacoes]);

  const handleNotificationClick = (notificacao: AlunoNotificacao) => {
    if (!notificacao.lida) marcarComoLida(notificacao.id);
    const meta = getNotificationMeta(notificacao.tipo, notificacao.dados);
    onNavigateSection(meta.section);
  };

  const markGroupAsRead = (items: AlunoNotificacao[]) => {
    items.filter((item) => !item.lida).forEach((item) => marcarComoLida(item.id));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {naoLidas > 9 ? "9+" : naoLidas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[calc(100vw-1rem)] max-w-96">
        <DropdownMenuLabel className="flex items-center justify-between gap-3">
          <span>Notificacoes</span>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={marcarTodasComoLidas}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar lidas
            </Button>
          )}
        </DropdownMenuLabel>

        {pushSupported && !missingVapidKey && !pushEnabled && pushStatus !== "denied" && (
          <div className="px-2 pb-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() =>
                enablePushNotifications().catch((error) => {
                  console.error("Erro ao ativar notificacoes push:", error);
                })
              }
            >
              <Bell className="mr-2 h-3.5 w-3.5" />
              Ativar notificacoes com app fechado
            </Button>
          </div>
        )}

        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : notificationGroups.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="mx-auto mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma notificacao</p>
          </div>
        ) : (
          <ScrollArea className="h-[420px] p-2">
            {notificationGroups.map((group) => {
              const isStacked = group.items.length > 1;
              const expanded = expandedGroup === group.key;

              return (
                <div key={group.key} className="mb-3">
                  <div
                    className={cn(
                      "relative transition-all",
                      isStacked && !expanded && "pb-3"
                    )}
                  >
                    {isStacked && !expanded && (
                      <>
                        <div className="absolute inset-x-3 bottom-1 h-[72px] rounded-lg border bg-card/55 shadow-sm" />
                        <div className="absolute inset-x-1.5 bottom-2 h-[72px] rounded-lg border bg-card/80 shadow-sm" />
                      </>
                    )}

                    <div className="relative z-10 overflow-hidden rounded-lg">
                      {isStacked ? (
                        <button
                          type="button"
                          onClick={() => setExpandedGroup(expanded ? null : group.key)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                            group.unread > 0
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-card"
                          )}
                        >
                          <NotificationCategoryIcon
                            tipo={group.latest.tipo}
                            action={group.latest.dados?.tipo_acao}
                            unread={group.unread > 0}
                          />

                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold leading-tight">
                              {group.title}
                            </h4>
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {getNotificationSummary(group.items.length, group.meta.category, group.unread)}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {group.unread > 0 && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                                {group.unread}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                              {group.items.length}
                            </Badge>
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      ) : (
                        <NotificationCard
                          notificacao={group.latest}
                          onClick={() => handleNotificationClick(group.latest)}
                        />
                      )}
                    </div>
                  </div>

                  {isStacked && expanded && (
                    <div className="mt-2 space-y-1.5 border-l pl-2">
                      {group.unread > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => markGroupAsRead(group.items)}
                          className="h-auto p-1 text-xs"
                        >
                          <CheckCheck className="mr-1 h-3 w-3" />
                          Marcar grupo como lido
                        </Button>
                      )}

                      {group.items.map((notificacao) => (
                        <NotificationCard
                          key={notificacao.id}
                          notificacao={notificacao}
                          compact
                          onClick={() => handleNotificationClick(notificacao)}
                        />
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
  );
}
