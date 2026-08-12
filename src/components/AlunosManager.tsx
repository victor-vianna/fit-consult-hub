import { useState, useEffect, useMemo, useCallback, type CSSProperties, type ComponentType } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { differenceInCalendarDays, formatDistanceToNow, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  UserPlus,
  Trash2,
  UserCheck,
  UserX,
  Search,
  ArrowUpDown,
  Filter,
  Mail,
  Users,
  Dumbbell,
  Activity,
  AlertTriangle,
  Flame,
  Clock,
  Calendar,
  FileWarning,
  Palette,
  Bell,
  Settings as SettingsIcon,
  CreditCard,
  MessageSquare,
  MoreVertical,
  Edit,
  Lock,
  Unlock,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";

import { AppLayout } from "@/components/AppLayout";
import { usePriorityStudents, type PriorityFlag, type PriorityReason } from "@/hooks/usePriorityStudents";
import { useAlunosQuickStatus } from "@/hooks/useAlunosQuickStatus";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAccountMenu } from "@/components/mobile/MobileAccountMenu";
import type { StudentAccessState } from "@/hooks/useStudentAccess";
import { CHAT_CONVERSATION_SEPARATOR, getAlunoIdFromConversationKey } from "@/utils/chat";
import { formatDisplayDate } from "@/utils/dateFormat";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  is_active: boolean;
  aluno_card_color: string | null;
  archived_at: string | null;
  created_at: string;
}

type IndicatorTone = "alert" | "warn" | "ok" | "neutral";

const COR_LABELS: Record<string, string> = {
  "#ef4444": "Vermelho",
  "#f59e0b": "Laranja",
  "#eab308": "Amarelo",
  "#22c55e": "Verde",
  "#06b6d4": "Ciano",
  "#3b82f6": "Azul",
  "#a855f7": "Roxo",
  "#ec4899": "Rosa",
};

const COR_PALETTE = [
  "#ef4444",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

const normalizeHexColor = (color: string | null) => color?.toLowerCase() || null;

const getCorLabel = (color: string) => COR_LABELS[color] || color.toUpperCase();

type IndicatorItem = {
  id: string;
  title: string;
  label: string;
  detail?: string;
  tone: IndicatorTone;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
};

const FLAG_INDICATOR_CONFIG: Record<
  PriorityReason,
  {
    title: string;
    icon: ComponentType<{ className?: string }>;
    path: (alunoId: string) => string;
  }
> = {
  plano_vencendo: {
    title: "Plano",
    icon: Calendar,
    path: (alunoId) => `/aluno/${alunoId}?tab=financeiro`,
  },
  plano_vencido: {
    title: "Plano",
    icon: AlertTriangle,
    path: (alunoId) => `/aluno/${alunoId}?tab=financeiro`,
  },
  pagamento_pendente: {
    title: "Financeiro",
    icon: CreditCard,
    path: (alunoId) => `/aluno/${alunoId}?tab=financeiro`,
  },
  feedback_nao_respondido: {
    title: "Feedback",
    icon: MessageSquare,
    path: (alunoId) => `/aluno/${alunoId}?tab=checkins`,
  },
  mensagem_nao_lida: {
    title: "Chat",
    icon: MessageSquare,
    path: (alunoId) => `/chat?aluno=${alunoId}`,
  },
  planilha_vencendo: {
    title: "Planilha",
    icon: FileWarning,
    path: (alunoId) => `/aluno/${alunoId}?tab=treinos`,
  },
  planilha_vencida: {
    title: "Planilha",
    icon: FileWarning,
    path: (alunoId) => `/aluno/${alunoId}?tab=treinos`,
  },
};

const getFlagTone = (flag: PriorityFlag): IndicatorTone =>
  flag.severity === "alta" ? "alert" : "warn";

const normalizeAttentionTone = (tone: IndicatorTone): IndicatorTone =>
  tone === "ok" ? "ok" : tone === "alert" ? "alert" : "warn";

const shouldShowSummaryAttention = (summary: { tone: IndicatorTone; label: string }) =>
  summary.tone !== "ok" && summary.label !== "Sem mensagens";

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getAlunoCardColorStyle = (color: string | null): CSSProperties | undefined => {
  if (!color) return undefined;

  return {
    background: `linear-gradient(0deg, ${hexToRgba(color, 0.18)}, ${hexToRgba(color, 0.18)}), hsl(var(--card))`,
    borderColor: color,
    boxShadow: `0 14px 30px ${hexToRgba(color, 0.14)}`,
  };
};

interface StudentCardSummary {
  chat: {
    tone: IndicatorTone;
    label: string;
    detail?: string;
    unread: number;
    lastMessageAt?: string | null;
  };
  treino: {
    tone: IndicatorTone;
    label: string;
    detail?: string;
  };
  planilha: {
    tone: IndicatorTone;
    label: string;
    detail?: string;
  };
  financeiro: {
    tone: IndicatorTone;
    label: string;
    detail?: string;
  };
}

export default function AlunosManager() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 🔧 Filtros persistidos em sessionStorage para preservar estado entre navegações
  const FILTERS_KEY = "alunos-filters";
  const initialFilters = (() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { searchTerm: "", filtroStatus: "todos", filtroCor: "todas", ordenacao: "nome" };
  })();

  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>(initialFilters.searchTerm);
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "ativos" | "inativos" | "arquivados"
  >(initialFilters.filtroStatus);
  const [filtroCor, setFiltroCor] = useState<string>(
    initialFilters.filtroCor || "todas"
  );
  const [ordenacao, setOrdenacao] = useState<"nome" | "recente" | "antigo">(
    initialFilters.ordenacao
  );

  const [novoAluno, setNovoAluno] = useState({
    nome: "",
    email: "",
    password: "",
    telefone: "",
  });
  const [editandoAluno, setEditandoAluno] = useState<Aluno | null>(null);
  const [editAlunoForm, setEditAlunoForm] = useState({ nome: "", telefone: "" });
  const [alunoCorDialog, setAlunoCorDialog] = useState<Aluno | null>(null);

  const { settings: personalSettings } = usePersonalSettings(user?.id);
  const { flagsByStudent } = usePriorityStudents(user?.id);
  const { statusByAluno } = useAlunosQuickStatus(user?.id);

  const setCorAluno = async (id: string, cor: string | null) => {
    if (!user?.id) return;
    if (cor && !/^#[0-9A-Fa-f]{6}$/.test(cor)) {
      toast({
        title: "Cor invalida",
        description: "Escolha uma cor no formato hexadecimal.",
        variant: "destructive",
      });
      return;
    }

    const queryKey = ["alunos", user.id];
    const previous = queryClient.getQueryData<Aluno[]>(queryKey);

    queryClient.setQueryData<Aluno[]>(queryKey, (current = []) =>
      current.map((aluno) =>
        aluno.id === id ? { ...aluno, aluno_card_color: cor } : aluno
      )
    );

    const { error } = await supabase
      .from("profiles")
      .update({ aluno_card_color: cor })
      .eq("id", id)
      .eq("personal_id", user.id);

    if (error) {
      queryClient.setQueryData(queryKey, previous);
      toast({
        title: "Nao foi possivel salvar a cor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 🔔 Preferências de notificações exibidas nos cards (persistidas)
  const openEditarAluno = (aluno: Aluno) => {
    setEditandoAluno(aluno);
    setEditAlunoForm({
      nome: aluno.nome,
      telefone: aluno.telefone || "",
    });
  };

  const handleUpdateAluno = async () => {
    if (!user?.id || !editandoAluno) return;

    const nome = editAlunoForm.nome.trim();
    const telefone = editAlunoForm.telefone.trim() || null;

    if (!nome) {
      toast({
        title: "Nome obrigatorio",
        description: "Informe o nome do aluno.",
        variant: "destructive",
      });
      return;
    }

    const queryKey = ["alunos", user.id];
    const previous = queryClient.getQueryData<Aluno[]>(queryKey);

    queryClient.setQueryData<Aluno[]>(queryKey, (current = []) =>
      current.map((aluno) =>
        aluno.id === editandoAluno.id ? { ...aluno, nome, telefone } : aluno
      )
    );

    const { error } = await supabase
      .from("profiles")
      .update({ nome, telefone })
      .eq("id", editandoAluno.id)
      .eq("personal_id", user.id);

    if (error) {
      queryClient.setQueryData(queryKey, previous);
      toast({
        title: "Nao foi possivel editar o aluno",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setEditandoAluno(null);
    toast({ title: "Aluno atualizado" });
  };

  const handleToggleAlunoAccess = async (aluno: Aluno, shouldAllow: boolean) => {
    if (!user?.id) return;

    const alunosKey = ["alunos", user.id];
    const previousAlunos = queryClient.getQueryData<Aluno[]>(alunosKey);
    const previousAccessQueries = queryClient.getQueriesData<StudentAccessState[]>({
      queryKey: ["students-access-states", user.id],
    });
    const now = new Date().toISOString();

    queryClient.setQueryData<Aluno[]>(alunosKey, (current = []) =>
      current.map((item) =>
        item.id === aluno.id ? { ...item, is_active: shouldAllow } : item
      )
    );

    queryClient.setQueriesData<StudentAccessState[]>(
      { queryKey: ["students-access-states", user.id] },
      (current) =>
        current?.map((state) =>
          state.student_id === aluno.id
            ? {
                ...state,
                allowed: shouldAllow,
                status: shouldAllow ? "ativo" : "suspenso",
                status_label: shouldAllow ? "Liberado" : "Suspenso",
                reason_code: shouldAllow ? "manual_release" : "manual_suspend",
                reason: shouldAllow
                  ? "Aluno liberado manualmente pelo personal."
                  : "Aluno bloqueado manualmente pelo personal.",
                source: "manual",
                manual_release_until: null,
                calculated_at: now,
                updated_at: now,
              }
            : state
        )
    );

    const { error } = await (supabase as any).rpc("register_student_access_event", {
      _student_id: aluno.id,
      _event_type: shouldAllow ? "manual_release" : "manual_suspend",
      _reason_code: shouldAllow ? "manual_release" : "outro",
      _message_aluno: shouldAllow
        ? null
        : "Seu acesso foi temporariamente suspenso. Entre em contato com seu personal trainer.",
      _observation: shouldAllow
        ? "Acesso liberado pelo menu do card do aluno."
        : "Bloqueio executado pelo menu do card do aluno.",
    });

    if (error) {
      queryClient.setQueryData(alunosKey, previousAlunos);
      previousAccessQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast({
        title: "Erro ao alterar acesso",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    refreshStudentsAndAccess();
    toast({ title: shouldAllow ? "Aluno desbloqueado" : "Aluno bloqueado" });
  };

  const handleToggleAlunoArchive = async (aluno: Aluno, shouldArchive: boolean) => {
    if (!user?.id) return;

    if (shouldArchive && resolveAccessAllowed(aluno) !== false) {
      toast({
        title: "Bloqueie antes de arquivar",
        description: "O arquivamento organiza a lista, mas o bloqueio controla o acesso do aluno.",
        variant: "destructive",
      });
      return;
    }

    const alunosKey = ["alunos", user.id];
    const previousAlunos = queryClient.getQueryData<Aluno[]>(alunosKey);
    const now = new Date().toISOString();

    queryClient.setQueryData<Aluno[]>(alunosKey, (current = []) =>
      current.map((item) =>
        item.id === aluno.id
          ? { ...item, archived_at: shouldArchive ? item.archived_at || now : null }
          : item
      )
    );

    const { error } = await supabase.rpc("set_student_archived", {
      _student_id: aluno.id,
      _archived: shouldArchive,
    });

    if (error) {
      queryClient.setQueryData(alunosKey, previousAlunos);
      toast({
        title: shouldArchive ? "Nao foi possivel arquivar" : "Nao foi possivel restaurar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    refreshStudentsAndAccess();
    toast({
      title: shouldArchive ? "Aluno arquivado" : "Aluno restaurado",
      description: shouldArchive
        ? "Ele saiu da lista principal e continua disponivel em Arquivados."
        : "Ele voltou para a lista principal.",
    });
  };

  const NOTIF_PREFS_KEY = "alunos-card-notif-prefs";
  const NOTIF_TYPES: { id: string; label: string }[] = [
    { id: "treino_hoje", label: "Treinou hoje / Sem treino" },
    { id: "dias_ultimo_treino", label: "Dias desde último treino" },
    { id: "semana_treinos", label: "Treinos concluídos na semana" },
    { id: "plano_vencendo", label: "Plano vencendo" },
    { id: "plano_vencido", label: "Plano vencido" },
    { id: "pagamento_pendente", label: "Pagamento pendente/atrasado" },
    { id: "planilha_vencendo", label: "Planilha expirando" },
    { id: "planilha_vencida", label: "Planilha vencida" },
    { id: "feedback_nao_respondido", label: "Feedback sem resposta" },
    { id: "mensagem_nao_lida", label: "Mensagem não lida" },
  ];
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return Object.fromEntries(NOTIF_TYPES.map((n) => [n.id, true]));
  });
  const [openNotifSettings, setOpenNotifSettings] = useState(false);
  const toggleNotifPref = (id: string) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // 🔧 Persistir filtros sempre que mudarem
  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({ searchTerm, filtroStatus, filtroCor, ordenacao })
      );
    } catch {}
  }, [searchTerm, filtroStatus, filtroCor, ordenacao]);

  // 🔧 React Query: cache compartilhado, sem refetch desnecessário entre navegações
  const { data: alunos = [] } = useQuery<Aluno[]>({
    queryKey: ["alunos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("personal_id", user.id)
        .order("nome");
      if (error) throw error;
      return (data as Aluno[]) || [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const alunosNaoArquivados = useMemo(
    () => alunos.filter((aluno) => !aluno.archived_at),
    [alunos]
  );
  const alunosArquivadosLista = useMemo(
    () => alunos.filter((aluno) => Boolean(aluno.archived_at)),
    [alunos]
  );
  const coresDisponiveis = useMemo(() => {
    const colors = new Set<string>();

    alunos.forEach((aluno) => {
      const color = normalizeHexColor(aluno.aluno_card_color);
      if (color) colors.add(color);
    });

    return Array.from(colors).sort((a, b) => {
      const paletteA = COR_PALETTE.indexOf(a);
      const paletteB = COR_PALETTE.indexOf(b);

      if (paletteA !== -1 && paletteB !== -1) return paletteA - paletteB;
      if (paletteA !== -1) return -1;
      if (paletteB !== -1) return 1;

      return a.localeCompare(b);
    });
  }, [alunos]);
  const alunosParaDadosDoCard =
    filtroStatus === "arquivados" ? alunosArquivadosLista : alunosNaoArquivados;

  const refreshStudentsAndAccess = useCallback(() => {
    if (!user?.id) return;
    queryClient.invalidateQueries({ queryKey: ["alunos", user.id] });
    queryClient.invalidateQueries({ queryKey: ["students-access-states", user.id] });
  }, [queryClient, user?.id]);

  const fetchAlunos = refreshStudentsAndAccess;

  const { data: accessStates = [] } = useQuery<StudentAccessState[]>({
    queryKey: [
      "students-access-states",
      user?.id,
      alunosParaDadosDoCard.map((aluno) => aluno.id).join("|"),
    ],
    queryFn: async () => {
      if (!user) return [];

      const statesByStudent = new Map<string, StudentAccessState>();
      const { data, error } = await (supabase as any).rpc(
        "get_students_access_states",
        { _personal_id: user.id }
      );

      if (error) {
        console.error("Erro ao buscar acessos em lote:", error);
      } else {
        ((data || []) as StudentAccessState[]).forEach((state) => {
          statesByStudent.set(state.student_id, state);
        });
      }

      const missingStudents = alunosParaDadosDoCard.filter((aluno) => !statesByStudent.has(aluno.id));
      if (missingStudents.length > 0) {
        const individualStates = await Promise.all(
          missingStudents.map(async (aluno) => {
            const { data: state, error: stateError } = await (supabase as any).rpc(
              "get_student_access_state",
              { _student_id: aluno.id }
            );

            if (stateError) {
              console.error(`Erro ao buscar acesso de ${aluno.nome}:`, stateError);
              return null;
            }

            return state as StudentAccessState | null;
          })
        );

        individualStates.forEach((state) => {
          if (state?.student_id) {
            statesByStudent.set(state.student_id, state);
          }
        });
      }

      return Array.from(statesByStudent.values());
    },
    enabled: !!user && alunosParaDadosDoCard.length > 0,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user?.id) return;

    const refreshAccessList = () => {
      refreshStudentsAndAccess();
    };

    const accessStateChannel = supabase
      .channel(`students-access-list-state:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_access_state",
          filter: `personal_id=eq.${user.id}`,
        },
        refreshAccessList
      )
      .subscribe();

    const accessEventsChannel = supabase
      .channel(`students-access-list-events:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "student_access_events",
          filter: `personal_id=eq.${user.id}`,
        },
        refreshAccessList
      )
      .subscribe();

    const profilesChannel = supabase
      .channel(`students-access-list-profiles:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `personal_id=eq.${user.id}`,
        },
        refreshAccessList
      )
      .subscribe();

    return () => {
      supabase.removeChannel(accessStateChannel);
      supabase.removeChannel(accessEventsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [refreshStudentsAndAccess, user?.id]);

  const accessByStudent = useMemo(() => {
    return Object.fromEntries(accessStates.map((state) => [state.student_id, state]));
  }, [accessStates]);

  const { data: cardSummaries = {} } = useQuery<Record<string, StudentCardSummary>>({
    queryKey: [
      "alunos-card-summaries",
      user?.id,
      alunosParaDadosDoCard.map((aluno) => aluno.id).join("|"),
    ],
    queryFn: async () => {
      if (!user?.id || alunosParaDadosDoCard.length === 0) return {};

      const studentIds = alunosParaDadosDoCard.map((aluno) => aluno.id);
      const today = startOfDay(new Date());
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));

      const [
        { data: mensagens },
        { data: treinos },
        { data: planilhas },
        { data: subscriptions },
      ] = await Promise.all([
        supabase
          .from("mensagens_chat")
          .select("conversa_key, remetente_id, destinatario_id, conteudo, lida, created_at")
          .like("conversa_key", `${user.id}${CHAT_CONVERSATION_SEPARATOR}%`)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("treinos_semanais")
          .select("profile_id, semana, updated_at")
          .eq("personal_id", user.id)
          .in("profile_id", studentIds)
          .order("semana", { ascending: false }),
        supabase
          .from("planilhas_treino")
          .select("profile_id, data_prevista_fim, status")
          .eq("personal_id", user.id)
          .in("profile_id", studentIds)
          .order("data_prevista_fim", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("student_id, data_expiracao, status_pagamento")
          .eq("personal_id", user.id)
          .in("student_id", studentIds)
          .order("data_expiracao", { ascending: false }),
      ]);

      const chatByStudent = new Map<string, StudentCardSummary["chat"]>();
      (mensagens || []).forEach((msg: any) => {
        const alunoId = getAlunoIdFromConversationKey(msg.conversa_key);
        if (!alunoId || !studentIds.includes(alunoId)) return;
        const current =
          chatByStudent.get(alunoId) ||
          ({
            tone: "neutral",
            label: "Sem mensagens",
            unread: 0,
            lastMessageAt: null,
          } as StudentCardSummary["chat"]);

        if (!current.lastMessageAt) {
          current.lastMessageAt = msg.created_at;
          current.detail = formatDistanceToNow(new Date(msg.created_at), {
            addSuffix: true,
            locale: ptBR,
          });
        }
        if (msg.destinatario_id === user.id && !msg.lida) {
          current.unread += 1;
        }
        chatByStudent.set(alunoId, current);
      });

      chatByStudent.forEach((chat) => {
        if (chat.unread > 0) {
          chat.tone = "warn";
          chat.label =
            chat.unread === 1 ? "1 nova mensagem" : `${chat.unread} novas mensagens`;
        } else if (chat.lastMessageAt) {
          chat.tone = "ok";
          chat.label = "Chat em dia";
        }
      });

      const treinoByStudent = new Map<string, StudentCardSummary["treino"]>();
      (treinos || []).forEach((treino: any) => {
        if (treinoByStudent.has(treino.profile_id)) return;
        const semana = startOfDay(parseISO(treino.semana));
        const diffWeeks = Math.floor(
          differenceInCalendarDays(currentWeekStart, semana) / 7
        );
        if (diffWeeks <= 0) {
          treinoByStudent.set(treino.profile_id, {
            tone: "ok",
            label: "Treino ativo",
            detail: "Semana atual",
          });
        } else {
          treinoByStudent.set(treino.profile_id, {
            tone: "warn",
            label: "Treino expirado",
            detail: diffWeeks === 1 ? "ha 1 semana" : `ha ${diffWeeks} semanas`,
          });
        }
      });

      const planilhaByStudent = new Map<string, StudentCardSummary["planilha"]>();
      (planilhas || []).forEach((planilha: any) => {
        if (planilhaByStudent.has(planilha.profile_id) || !planilha.data_prevista_fim) return;
        const fim = startOfDay(parseISO(planilha.data_prevista_fim));
        const dias = differenceInCalendarDays(fim, today);
        if (dias < 0) {
          planilhaByStudent.set(planilha.profile_id, {
            tone: "alert",
            label: "Planilha expirada",
            detail: `ha ${Math.abs(dias)}d`,
          });
        } else if (dias <= 5) {
          planilhaByStudent.set(planilha.profile_id, {
            tone: "warn",
            label: "Proxima do vencimento",
            detail: dias === 0 ? "expira hoje" : `expira em ${dias}d`,
          });
        } else {
          planilhaByStudent.set(planilha.profile_id, {
            tone: "ok",
            label: "Planilha valida",
            detail: `expira em ${dias}d`,
          });
        }
      });

      const financeiroByStudent = new Map<string, StudentCardSummary["financeiro"]>();
      (subscriptions || []).forEach((sub: any) => {
        if (financeiroByStudent.has(sub.student_id)) return;
        const expiration = startOfDay(parseISO(sub.data_expiracao));
        const dias = differenceInCalendarDays(expiration, today);
        const isPendente = ["pendente", "atrasado"].includes(String(sub.status_pagamento));
        if (dias < 0 || sub.status_pagamento === "atrasado") {
          financeiroByStudent.set(sub.student_id, {
            tone: "alert",
            label: "Atrasado",
            detail: "acesso bloqueado",
          });
        } else if (isPendente || dias <= 3) {
          financeiroByStudent.set(sub.student_id, {
            tone: "warn",
            label: dias <= 1 ? "Vence amanha" : "Vence em breve",
            detail: formatDisplayDate(sub.data_expiracao),
          });
        } else {
          financeiroByStudent.set(sub.student_id, {
            tone: "ok",
            label: "Pagamento em dia",
            detail: `proximo em ${formatDisplayDate(sub.data_expiracao)}`,
          });
        }
      });

      const result: Record<string, StudentCardSummary> = {};
      studentIds.forEach((studentId) => {
        result[studentId] = {
          chat: chatByStudent.get(studentId) || {
            tone: "neutral",
            label: "Sem mensagens",
            unread: 0,
          },
          treino: treinoByStudent.get(studentId) || {
            tone: "alert",
            label: "Sem treino cadastrado",
          },
          planilha: planilhaByStudent.get(studentId) || {
            tone: "neutral",
            label: "Sem planilha",
          },
          financeiro: financeiroByStudent.get(studentId) || {
            tone: "neutral",
            label: "Sem financeiro",
          },
        };
      });

      return result;
    },
    enabled: !!user?.id && alunosParaDadosDoCard.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const resolveAccessAllowed = useCallback(
    (aluno: Aluno): boolean | null => {
      const officialState = accessByStudent[aluno.id];
      if (officialState) return officialState.allowed;
      if (aluno.is_active === false) return false;
      return null;
    },
    [accessByStudent]
  );

  const alunosFiltrados = useMemo(() => {
    let resultado =
      filtroStatus === "arquivados" ? [...alunosArquivadosLista] : [...alunosNaoArquivados];

    if (searchTerm) {
      resultado = resultado.filter(
        (aluno) =>
          aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          aluno.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filtroStatus === "ativos") {
      resultado = resultado.filter((aluno) => resolveAccessAllowed(aluno) === true);
    } else if (filtroStatus === "inativos") {
      resultado = resultado.filter((aluno) => resolveAccessAllowed(aluno) === false);
    }

    if (filtroCor === "com-cor") {
      resultado = resultado.filter((aluno) => Boolean(aluno.aluno_card_color));
    } else if (filtroCor === "sem-cor") {
      resultado = resultado.filter((aluno) => !aluno.aluno_card_color);
    } else if (filtroCor !== "todas") {
      resultado = resultado.filter(
        (aluno) => normalizeHexColor(aluno.aluno_card_color) === filtroCor
      );
    }

    resultado.sort((a, b) => {
      if (ordenacao === "nome") {
        return a.nome.localeCompare(b.nome);
      } else if (ordenacao === "recente") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
    });

    return resultado;
  }, [
    alunosArquivadosLista,
    alunosNaoArquivados,
    searchTerm,
    filtroStatus,
    filtroCor,
    ordenacao,
    resolveAccessAllowed,
  ]);

  const handleCreateAluno = async () => {
    if (!novoAluno.nome || !novoAluno.email || !novoAluno.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const dados = {
      ...novoAluno,
      personal_id: user?.id,
    };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const { data, error } = await supabase.functions.invoke(
        "create-aluno-user",
        {
          body: dados,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        if (
          error.message?.includes("Email já cadastrado") ||
          error.message?.includes("already been registered")
        ) {
          throw new Error(
            "Este email já está cadastrado. Use um email diferente."
          );
        }
        throw error;
      }

      if (data?.error) {
        if (data.error.includes("Email já cadastrado")) {
          throw new Error(
            "Este email já está cadastrado. Use um email diferente."
          );
        }
        throw new Error(data.error);
      }

      toast({
        title: "✅ Aluno criado!",
        description: "Aluno cadastrado com sucesso",
      });

      setNovoAluno({ nome: "", email: "", password: "", telefone: "" });
      setOpenDialog(false);
      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao criar aluno:", error);
      toast({
        title: "❌ Erro ao criar aluno",
        description: error.message || "Ocorreu um erro ao criar o aluno",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAluno = async (alunoId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const { data, error } = await supabase.functions.invoke(
        "delete-aluno-user",
        {
          body: { aluno_id: alunoId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "✅ Aluno removido",
        description: "Aluno e todos os dados foram removidos com sucesso",
      });

      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao remover aluno:", error);
      toast({
        title: "❌ Erro ao remover aluno",
        description: error.message || "Ocorreu um erro ao remover o aluno",
        variant: "destructive",
      });
    }
  };

  const totalAlunosGerenciados = alunosNaoArquivados.length;
  const alunosAtivos = alunosNaoArquivados.filter(
    (a) => resolveAccessAllowed(a) === true
  ).length;
  const alunosInativos = alunosNaoArquivados.filter(
    (a) => resolveAccessAllowed(a) === false
  ).length;
  const alunosArquivados = alunosArquivadosLista.length;
  const hasAlunoFilters =
    searchTerm.trim().length > 0 || filtroStatus !== "todos" || filtroCor !== "todas";
  const alunoCorAtual = alunoCorDialog
    ? alunos.find((aluno) => aluno.id === alunoCorDialog.id) || alunoCorDialog
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header
        className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm"
        style={{
          borderColor: personalSettings?.theme_color
            ? `${personalSettings.theme_color}20`
            : undefined,
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 header-safe-top pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Gerenciar Alunos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {hasAlunoFilters
                  ? `${alunosFiltrados.length} alunos encontrados`
                  : "Acompanhe seus alunos cadastrados"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isMobile && <MobileAccountMenu userName={profile?.nome} />}
              {false && <Dialog open={openNotifSettings} onOpenChange={setOpenNotifSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="default" title="Gerenciar notificações dos cards">
                    <SettingsIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Notificações</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notificações exibidas nos cards</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Selecione quais informações devem aparecer ao clicar em "Notificações" no card de cada aluno.
                  </p>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {NOTIF_TYPES.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/40"
                      >
                        <Label htmlFor={`notif-${t.id}`} className="text-sm font-normal cursor-pointer">
                          {t.label}
                        </Label>
                        <Switch
                          id={`notif-${t.id}`}
                          checked={!!notifPrefs[t.id]}
                          onCheckedChange={() => toggleNotifPref(t.id)}
                        />
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>}

              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button
                  size="default"
                  style={{
                    backgroundColor: personalSettings?.theme_color || undefined,
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo Aluno
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={novoAluno.nome}
                      onChange={(e) =>
                        setNovoAluno({ ...novoAluno, nome: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={novoAluno.email}
                      onChange={(e) =>
                        setNovoAluno({ ...novoAluno, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha Inicial *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={novoAluno.password}
                      onChange={(e) =>
                        setNovoAluno({
                          ...novoAluno,
                          password: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo 6 caracteres
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={novoAluno.telefone}
                      onChange={(e) =>
                        setNovoAluno({
                          ...novoAluno,
                          telefone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Button
                    onClick={handleCreateAluno}
                    className="w-full"
                    disabled={loading}
                    style={{
                      backgroundColor:
                        personalSettings?.theme_color || undefined,
                    }}
                  >
                    {loading ? "Cadastrando..." : "Cadastrar Aluno"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-4 rounded-xl border bg-card/70 px-3 py-2 shadow-sm sm:mb-5 sm:px-4">
          <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:divide-x sm:divide-border/70">
            <div className="flex min-w-0 items-center gap-2 pr-2">
              <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground sm:flex">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium leading-none text-muted-foreground sm:text-xs">
                  Total
                </p>
                <p className="mt-1 text-lg font-bold leading-none sm:text-xl">
                  {totalAlunosGerenciados}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-center gap-2 px-2">
              <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-500/10 text-green-500 sm:flex">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium leading-none text-muted-foreground sm:text-xs">
                  Ativos
                </p>
                <p className="mt-1 text-lg font-bold leading-none text-green-500 sm:text-xl">
                  {alunosAtivos}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2 pl-2">
              <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-500 sm:flex">
                <UserX className="h-4 w-4" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[11px] font-medium leading-none text-muted-foreground sm:text-xs">
                  Bloqueados
                </p>
                <p className="mt-1 text-lg font-bold leading-none text-red-500 sm:text-xl">
                  {alunosInativos}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2 pl-2 sm:pl-4">
              <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-500/10 text-slate-500 sm:flex">
                <Archive className="h-4 w-4" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[11px] font-medium leading-none text-muted-foreground sm:text-xs">
                  Arquivados
                </p>
                <p className="mt-1 text-lg font-bold leading-none text-slate-500 sm:text-xl">
                  {alunosArquivados}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-6 border-2">
          <CardContent className="p-4 sm:pt-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={filtroStatus}
                onValueChange={(value: any) => setFiltroStatus(value)}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Alunos</SelectItem>
                  <SelectItem value="ativos">Apenas Ativos</SelectItem>
                  <SelectItem value="inativos">Apenas Bloqueados</SelectItem>
                  <SelectItem value="arquivados">Arquivados</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filtroCor}
                onValueChange={setFiltroCor}
              >
                <SelectTrigger>
                  <Palette className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as cores</SelectItem>
                  <SelectItem value="com-cor">Com cor</SelectItem>
                  <SelectItem value="sem-cor">Sem cor</SelectItem>
                  {coresDisponiveis.map((cor) => (
                    <SelectItem key={cor} value={cor}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: cor }}
                        />
                        {getCorLabel(cor)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={ordenacao}
                onValueChange={(value: any) => setOrdenacao(value)}
              >
                <SelectTrigger>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Ordem Alfabética</SelectItem>
                  <SelectItem value="recente">Mais Recentes</SelectItem>
                  <SelectItem value="antigo">Mais Antigos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {alunosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {alunosFiltrados.map((aluno) => {
              const flags = flagsByStudent[aluno.id] || [];
              const hasHighPriority = flags.some((f) => f.severity === "alta");
              const hasPlanilha = flags.some(
                (f) => f.reason === "planilha_vencendo" || f.reason === "planilha_vencida"
              );
              const hasPriority = flags.length > 0;
              const status = statusByAluno[aluno.id];
              const accessState = accessByStudent[aluno.id];
              const resolvedAccessAllowed = resolveAccessAllowed(aluno);
              const isAccessUnknown = resolvedAccessAllowed === null;
              const isAccessAllowed = resolvedAccessAllowed !== false;
              const corCustom = aluno.aluno_card_color;
              const cardColorStyle = getAlunoCardColorStyle(corCustom);
              const isArchived = Boolean(aluno.archived_at);

              const prioridade: "arquivado" | "sincronizando" | "bloqueado" | "urgente" | "atencao" | "importante" | "ativo" = isArchived
                ? "arquivado"
                : isAccessUnknown
                ? "sincronizando"
                : !isAccessAllowed
                ? "bloqueado"
                : hasHighPriority
                ? "urgente"
                : hasPlanilha
                ? "atencao"
                : hasPriority
                ? "importante"
                : "ativo";

              const prioridadeStyles = {
                arquivado: { ring: "border-muted bg-muted/30", bar: "bg-muted-foreground/50", chip: "bg-muted text-muted-foreground", icon: Archive, label: "Arquivado" },
                sincronizando: { ring: "border-muted", bar: "bg-muted-foreground/50", chip: "bg-muted text-muted-foreground", icon: Clock, label: "Sincronizando" },
                bloqueado: { ring: "border-muted", bar: "bg-muted-foreground", chip: "bg-muted text-muted-foreground", icon: UserX, label: "Bloqueado" },
                urgente:   { ring: "border-destructive/50 ring-1 ring-destructive/20", bar: "bg-destructive", chip: "bg-destructive text-destructive-foreground", icon: Flame, label: "Urgente" },
                atencao:   { ring: "border-yellow-500/60 ring-1 ring-yellow-500/20", bar: "bg-yellow-500", chip: "bg-yellow-500 text-black", icon: FileWarning, label: "Atenção" },
                importante:{ ring: "border-orange-500/50", bar: "bg-orange-500", chip: "bg-orange-500 text-white", icon: AlertTriangle, label: "Importante" },
                ativo:     { ring: "", bar: "bg-green-500", chip: "bg-green-600 text-white", icon: UserCheck, label: "Ativo" },
              }[prioridade];

              const statusBadge = isArchived
                ? {
                    label: "Arquivado",
                    icon: Archive,
                    className: "bg-muted text-muted-foreground",
                  }
                : isAccessUnknown
                ? {
                    label: "Sincronizando",
                    icon: Clock,
                    className: "bg-muted text-muted-foreground",
                  }
                : isAccessAllowed
                ? {
                    label: "Ativo",
                    icon: UserCheck,
                    className: "bg-green-600 text-white",
                  }
                : {
                    label: "Bloqueado",
                    icon: UserX,
                    className: "bg-muted text-muted-foreground",
                  };
              const StatusIcon = statusBadge.icon;
              const summary = cardSummaries[aluno.id] || {
                chat: { tone: "neutral", label: "Sem mensagens", unread: 0 },
                treino: { tone: "alert", label: "Sem treino cadastrado" },
                planilha: { tone: "neutral", label: "Sem planilha" },
                financeiro: { tone: "neutral", label: "Sem financeiro" },
              };
              const financeiroSummary =
                accessState &&
                accessState.allowed === false &&
                (accessState.source === "payment" ||
                  accessState.reason_code === "payment_required" ||
                  accessState.reason_code === "payment_pending" ||
                  accessState.reason_code === "payment_expired")
                  ? {
                      tone: "alert" as IndicatorTone,
                      label: "Atrasado",
                      detail: "acesso bloqueado",
                    }
                  : summary.financeiro;
              const indicatorToneStyles: Record<IndicatorTone, string> = {
                alert:
                  "border-red-500/80 bg-red-500/15 text-red-700 ring-1 ring-red-500/35 shadow-sm dark:bg-red-950/50 dark:text-red-100",
                warn:
                  "border-orange-500/45 bg-orange-500/10 text-orange-700 dark:text-orange-300",
                ok:
                  "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
                neutral:
                  "border-border bg-muted/20 text-muted-foreground",
              };
              const flagReasons = new Set(flags.map((flag) => flag.reason));
              const priorityIndicatorItems: IndicatorItem[] = flags.map((flag, index) => {
                const config = FLAG_INDICATOR_CONFIG[flag.reason];
                return {
                  id: `flag-${flag.reason}-${index}`,
                  title: config.title,
                  icon: config.icon,
                  label: flag.label,
                  detail: flag.detail,
                  tone: getFlagTone(flag),
                  onClick: () => navigate(config.path(aluno.id)),
                };
              });
              const summaryAttentionCandidates: (IndicatorItem & { duplicatedByFlag: boolean })[] = [
                {
                  id: "chat-alert",
                  title: "Chat",
                  icon: MessageSquare,
                  ...summary.chat,
                  tone: normalizeAttentionTone(summary.chat.tone),
                  onClick: () => navigate(`/chat?aluno=${aluno.id}`),
                  duplicatedByFlag: flagReasons.has("mensagem_nao_lida"),
                },
                {
                  id: "treino-alert",
                  title: "Treino",
                  icon: Dumbbell,
                  ...summary.treino,
                  tone: normalizeAttentionTone(summary.treino.tone),
                  onClick: () => navigate(`/aluno/${aluno.id}?tab=treinos`),
                  duplicatedByFlag: false,
                },
                {
                  id: "planilha-alert",
                  title: "Planilha",
                  icon: FileWarning,
                  ...summary.planilha,
                  tone: normalizeAttentionTone(summary.planilha.tone),
                  onClick: () => navigate(`/aluno/${aluno.id}?tab=treinos`),
                  duplicatedByFlag:
                    flagReasons.has("planilha_vencendo") ||
                    flagReasons.has("planilha_vencida"),
                },
                {
                  id: "financeiro-alert",
                  title: "Financeiro",
                  icon: CreditCard,
                  ...financeiroSummary,
                  tone: normalizeAttentionTone(financeiroSummary.tone),
                  onClick: () => navigate(`/aluno/${aluno.id}?tab=financeiro`),
                  duplicatedByFlag:
                    flagReasons.has("pagamento_pendente") ||
                    flagReasons.has("plano_vencendo") ||
                    flagReasons.has("plano_vencido"),
                },
              ];
              const summaryAttentionItems: IndicatorItem[] = summaryAttentionCandidates
                .filter(
                  (item) => shouldShowSummaryAttention(item) && !item.duplicatedByFlag
                )
                .map(({ duplicatedByFlag, ...item }) => item);
              const complianceIndicatorItems: IndicatorItem[] = [
                {
                  id: "treino-ok",
                  title: "Treino",
                  icon: Dumbbell,
                  tone: "ok",
                  label: "Treino ativo",
                  detail: summary.treino.tone === "ok" ? summary.treino.detail : "Semana atual",
                  onClick: () => navigate(`/aluno/${aluno.id}?tab=treinos`),
                },
                {
                  id: "planilha-ok",
                  title: "Planilha",
                  icon: Calendar,
                  tone: "ok",
                  label: "Planilha valida",
                  detail: summary.planilha.tone === "ok" ? summary.planilha.detail : undefined,
                  onClick: () => navigate(`/aluno/${aluno.id}?tab=treinos`),
                },
                {
                  id: "financeiro-ok",
                  title: "Financeiro",
                  icon: CreditCard,
                  tone: "ok",
                  label: "Pagamento em dia",
                  detail:
                    financeiroSummary.tone === "ok" ? financeiroSummary.detail : undefined,
                  onClick: () => navigate(`/aluno/${aluno.id}?tab=financeiro`),
                },
              ];
              const activeNotificationItems = [
                ...priorityIndicatorItems,
                ...summaryAttentionItems,
              ].sort((a, b) => {
                const weight: Record<IndicatorTone, number> = {
                  alert: 0,
                  warn: 1,
                  ok: 2,
                  neutral: 3,
                };
                return weight[a.tone] - weight[b.tone];
              });
              const indicatorItems =
                activeNotificationItems.length > 0
                  ? activeNotificationItems.slice(0, 4)
                  : complianceIndicatorItems;

              return (
                <Card
                  key={aluno.id}
                  className={`group hover:shadow-xl transition-all duration-300 border-2 cursor-pointer relative overflow-hidden touch-target ${prioridadeStyles.ring} ${
                    isArchived ? "opacity-80" : ""
                  }`}
                  style={cardColorStyle}
                  onClick={() => navigate(`/aluno/${aluno.id}`)}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${corCustom ? "" : prioridadeStyles.bar}`}
                    style={corCustom ? { backgroundColor: corCustom } : undefined}
                  />

                  <CardContent className="pt-4 pl-4 sm:pl-5 pr-3 pb-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2 pr-1">
                            <h3 className="min-w-0 truncate text-base font-bold leading-tight transition-colors group-hover:text-primary">
                              {aluno.nome}
                            </h3>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{aluno.email}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Badge className={`${statusBadge.className} gap-1 text-[10px] py-0.5 px-2`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusBadge.label}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Acoes de ${aluno.nome}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onSelect={() => openEditarAluno(aluno)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar aluno
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => handleToggleAlunoAccess(aluno, !isAccessAllowed)}
                              >
                                {isAccessAllowed ? (
                                  <Lock className="mr-2 h-4 w-4" />
                                ) : (
                                  <Unlock className="mr-2 h-4 w-4" />
                                )}
                                {isAccessAllowed ? "Bloquear" : "Desbloquear"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setAlunoCorDialog(aluno)}>
                                <Palette className="mr-2 h-4 w-4" />
                                Alterar cor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => handleToggleAlunoArchive(aluno, !isArchived)}
                              >
                                {isArchived ? (
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                ) : (
                                  <Archive className="mr-2 h-4 w-4" />
                                )}
                                {isArchived ? "Restaurar" : "Arquivar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={(event) => event.preventDefault()}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusao</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover <strong>{aluno.nome}</strong>?
                                      Esta acao nao pode ser desfeita e todos os dados do aluno
                                      serao permanentemente excluidos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteAluno(aluno.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Remover Aluno
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div
                        className={`grid gap-2 ${indicatorItems.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {indicatorItems.map((item) => {
                          const Icon = item.icon;
                          const isUrgent = item.tone === "alert";
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={item.onClick}
                              className={`min-h-[86px] rounded-lg border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[74px] ${
                                indicatorToneStyles[item.tone]
                              } ${isUrgent ? "animate-pulse" : ""}`}
                            >
                              <div className="flex items-start gap-2.5">
                                <Icon className={`${isUrgent ? "h-5 w-5 text-red-500 dark:text-red-300" : "h-4 w-4"} mt-0.5 shrink-0`} />
                                <div className="min-w-0 flex-1">
                                  <p className="break-words text-[11px] font-bold uppercase leading-tight tracking-wide opacity-90">
                                    {item.title}
                                  </p>
                                  <p className="mt-1 break-words text-[13px] font-bold leading-snug sm:text-xs">
                                    {item.label}
                                  </p>
                                  {item.detail && (
                                    <p className="mt-1 break-words text-[11px] leading-snug opacity-85">
                                      {item.detail}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {false && (() => {
                        // Montar lista de notificações ativas conforme preferências
                        type Item = { id: string; label: string; detail?: string; tone: "ok" | "info" | "warn" | "alert"; icon: any };
                        const items: Item[] = [];
                        if (notifPrefs.treino_hoje) {
                          items.push({
                            id: "treino_hoje",
                            label: status?.treinouHoje ? "Treinou hoje" : "Sem treino hoje",
                            tone: status?.treinouHoje ? "ok" : "info",
                            icon: Dumbbell,
                          });
                        }
                        if (notifPrefs.dias_ultimo_treino && status?.diasDesdeUltimoTreino != null) {
                          items.push({
                            id: "dias_ultimo_treino",
                            label: status.diasDesdeUltimoTreino === 0 ? "Ativo hoje" : `Último treino há ${status.diasDesdeUltimoTreino}d`,
                            tone: "info",
                            icon: Activity,
                          });
                        }
                        if (notifPrefs.semana_treinos && status && status.totalSemana > 0) {
                          items.push({
                            id: "semana_treinos",
                            label: `${status.concluidosSemana}/${status.totalSemana} treinos na semana`,
                            tone: "info",
                            icon: Clock,
                          });
                        }
                        const flagIcon: Record<string, any> = {
                          plano_vencendo: Calendar,
                          plano_vencido: AlertTriangle,
                          pagamento_pendente: CreditCard,
                          planilha_vencendo: FileWarning,
                          planilha_vencida: FileWarning,
                          feedback_nao_respondido: MessageSquare,
                          mensagem_nao_lida: MessageSquare,
                        };
                        flags.forEach((f) => {
                          if (!notifPrefs[f.reason]) return;
                          items.push({
                            id: f.reason,
                            label: f.label,
                            detail: f.detail,
                            tone: f.severity === "alta" ? "alert" : "warn",
                            icon: flagIcon[f.reason] || AlertTriangle,
                          });
                        });

                        const toneClass: Record<Item["tone"], string> = {
                          ok: "text-green-700 dark:text-green-400",
                          info: "text-muted-foreground",
                          warn: "text-orange-600 dark:text-orange-400",
                          alert: "text-destructive",
                        };
                        const count = items.length;
                        const hasAlert = items.some((i) => i.tone === "alert");
                        const hasWarn = items.some((i) => i.tone === "warn");

                        return (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`w-full justify-start gap-2 h-8 ${
                                    hasAlert ? "border-destructive/40" : hasWarn ? "border-orange-500/40" : ""
                                  }`}
                                >
                                  <Bell className={`h-3.5 w-3.5 ${hasAlert ? "text-destructive" : hasWarn ? "text-orange-500" : ""}`} />
                                  <span className="text-xs">Notificações</span>
                                  <Badge
                                    variant={hasAlert ? "destructive" : "secondary"}
                                    className="ml-auto h-4 px-1.5 text-[10px]"
                                  >
                                    {count}
                                  </Badge>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-0" align="start">
                                <div className="p-3 border-b">
                                  <p className="text-sm font-semibold">Notificações de {aluno.nome.split(" ")[0]}</p>
                                  <p className="text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</p>
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                  {count === 0 ? (
                                    <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação ativa</p>
                                  ) : (
                                    items.map((it, i) => {
                                      const Icon = it.icon;
                                      return (
                                        <div key={`${it.id}-${i}`} className="flex items-start gap-2 px-3 py-2 border-b last:border-0">
                                          <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${toneClass[it.tone]}`} />
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-medium ${toneClass[it.tone]}`}>{it.label}</p>
                                            {it.detail && (
                                              <p className="text-[11px] text-muted-foreground">{it.detail}</p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        );
                      })()}


                      {false && (
                        <AlertDialog>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover <strong>{aluno.nome}</strong>?
                                Esta ação não pode ser desfeita e todos os dados do aluno
                                serão permanentemente excluídos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAluno(aluno.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Remover Aluno
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-2">
            <CardContent className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                <UserX className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nenhum aluno encontrado
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {filtroStatus === "arquivados" && !searchTerm && filtroCor === "todas"
                  ? "Nenhum aluno arquivado"
                  : hasAlunoFilters
                  ? "Tente ajustar os filtros de busca"
                  : "Comece cadastrando seu primeiro aluno"}
              </p>
              {!hasAlunoFilters && (
                <Button
                  onClick={() => setOpenDialog(true)}
                  style={{
                    backgroundColor: personalSettings?.theme_color || undefined,
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar Primeiro Aluno
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={!!editandoAluno} onOpenChange={(open) => !open && setEditandoAluno(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar aluno</DialogTitle>
              <DialogDescription>
                Atualize as informacoes basicas exibidas no card.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-nome">Nome</Label>
                <Input
                  id="edit-aluno-nome"
                  value={editAlunoForm.nome}
                  onChange={(event) =>
                    setEditAlunoForm((prev) => ({ ...prev, nome: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-telefone">Telefone</Label>
                <Input
                  id="edit-aluno-telefone"
                  value={editAlunoForm.telefone}
                  onChange={(event) =>
                    setEditAlunoForm((prev) => ({ ...prev, telefone: event.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditandoAluno(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateAluno}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!alunoCorAtual} onOpenChange={(open) => !open && setAlunoCorDialog(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterar cor</DialogTitle>
              <DialogDescription>
                Defina uma cor de identificacao para {alunoCorAtual?.nome}.
              </DialogDescription>
            </DialogHeader>
            {alunoCorAtual && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {COR_PALETTE.map((cor) => (
                    <button
                      key={cor}
                      onClick={() => setCorAluno(alunoCorAtual.id, cor)}
                      className="h-9 w-9 rounded-full border-2 border-background ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{ backgroundColor: cor }}
                      aria-label={`Cor ${cor}`}
                    />
                  ))}
                </div>
                <Label className="flex items-center justify-between gap-3 text-sm">
                  Cor customizada
                  <Input
                    type="color"
                    value={alunoCorAtual.aluno_card_color || "#3b82f6"}
                    onChange={(event) => setCorAluno(alunoCorAtual.id, event.target.value)}
                    className="h-9 w-14 cursor-pointer border-0 bg-transparent p-0"
                    aria-label="Escolher cor customizada"
                  />
                </Label>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setCorAluno(alunoCorAtual.id, null)}
                  disabled={!alunoCorAtual.aluno_card_color}
                >
                  Remover cor personalizada
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
