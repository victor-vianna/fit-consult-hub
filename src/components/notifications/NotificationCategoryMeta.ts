import {
  AlertTriangle,
  Bell,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileText,
  MessageCircle,
  Star,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type NotificationCategoryKey =
  | "chat"
  | "treino"
  | "avaliacao"
  | "plano"
  | "pagamento"
  | "material"
  | "feedback"
  | "aluno"
  | "sistema";

export type NotificationCategoryMeta = {
  key: NotificationCategoryKey;
  label: string;
  icon: LucideIcon;
  containerClassName: string;
  iconClassName: string;
};

const CATEGORY_META: Record<NotificationCategoryKey, NotificationCategoryMeta> = {
  chat: {
    key: "chat",
    label: "Mensagens de chat",
    icon: MessageCircle,
    containerClassName: "bg-sky-950/80",
    iconClassName: "text-sky-300",
  },
  treino: {
    key: "treino",
    label: "Treinos",
    icon: Dumbbell,
    containerClassName: "bg-amber-950/80",
    iconClassName: "text-amber-300",
  },
  avaliacao: {
    key: "avaliacao",
    label: "Avaliacoes",
    icon: ClipboardList,
    containerClassName: "bg-amber-950/80",
    iconClassName: "text-amber-300",
  },
  plano: {
    key: "plano",
    label: "Plano",
    icon: AlertTriangle,
    containerClassName: "bg-red-950/80",
    iconClassName: "text-red-300",
  },
  pagamento: {
    key: "pagamento",
    label: "Pagamento",
    icon: CreditCard,
    containerClassName: "bg-red-950/80",
    iconClassName: "text-red-300",
  },
  material: {
    key: "material",
    label: "Materiais",
    icon: FileText,
    containerClassName: "bg-violet-950/80",
    iconClassName: "text-violet-300",
  },
  feedback: {
    key: "feedback",
    label: "Feedbacks",
    icon: Star,
    containerClassName: "bg-amber-950/80",
    iconClassName: "text-amber-300",
  },
  aluno: {
    key: "aluno",
    label: "Aluno",
    icon: UserPlus,
    containerClassName: "bg-sky-950/80",
    iconClassName: "text-sky-300",
  },
  sistema: {
    key: "sistema",
    label: "Sistema",
    icon: Bell,
    containerClassName: "bg-slate-900/80",
    iconClassName: "text-slate-300",
  },
};

export function getNotificationCategoryMeta(
  tipo?: string | null,
  action?: unknown
): NotificationCategoryMeta {
  const normalized = String(tipo || "").toLowerCase();
  const normalizedAction = typeof action === "string" ? action : "";

  if (normalized.includes("mensagem") || normalizedAction === "chat") {
    return CATEGORY_META.chat;
  }
  if (normalized.includes("pagamento")) return CATEGORY_META.pagamento;
  if (normalized.includes("plano") || normalizedAction === "plano") return CATEGORY_META.plano;
  if (
    normalized.includes("avaliacao") ||
    normalized.includes("composicao") ||
    normalized.includes("checkin") ||
    normalizedAction === "avaliacao"
  ) {
    return CATEGORY_META.avaliacao;
  }
  if (
    normalized.includes("treino") ||
    normalized.startsWith("planilha_") ||
    normalizedAction === "treino"
  ) {
    return CATEGORY_META.treino;
  }
  if (normalized.includes("material") || normalizedAction === "material") {
    return CATEGORY_META.material;
  }
  if (normalized.includes("feedback")) return CATEGORY_META.feedback;
  if (normalized.includes("aluno")) return CATEGORY_META.aluno;

  return CATEGORY_META.sistema;
}

export function getNotificationSummary(
  count: number,
  category: NotificationCategoryKey,
  unread = 0
) {
  const value = unread > 0 ? unread : count;

  switch (category) {
    case "chat":
      return `${value} ${value === 1 ? "nova mensagem" : "novas mensagens"}`;
    case "treino":
      return `${value} ${value === 1 ? "atualizacao" : "atualizacoes"}`;
    case "avaliacao":
      return `${value} ${value === 1 ? "avaliacao disponivel" : "avaliacoes disponiveis"}`;
    case "plano":
      return `${value} ${value === 1 ? "aviso de plano" : "avisos de plano"}`;
    case "pagamento":
      return `${value} ${value === 1 ? "aviso de pagamento" : "avisos de pagamento"}`;
    case "material":
      return `${value} ${value === 1 ? "novo material" : "novos materiais"}`;
    case "feedback":
      return `${value} ${value === 1 ? "feedback" : "feedbacks"}`;
    case "aluno":
      return `${value} ${value === 1 ? "notificacao de aluno" : "notificacoes de aluno"}`;
    default:
      return `${value} ${value === 1 ? "notificacao" : "notificacoes"}`;
  }
}
