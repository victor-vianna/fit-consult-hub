import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type AccessStatus =
  | "ativo"
  | "pausado"
  | "suspenso"
  | "pagamento_pendente";

export type AccessMotivo =
  | "ferias"
  | "lesao"
  | "viagem"
  | "inadimplencia"
  | "violacao"
  | "outro"
  | "legacy_profile_inactive"
  | "payment_required"
  | "payment_expired"
  | "payment_pending";

export const MOTIVO_LABELS: Record<string, string> = {
  ferias: "Ferias",
  lesao: "Lesao / Recuperacao",
  viagem: "Viagem",
  inadimplencia: "Inadimplencia",
  violacao: "Violacao de regras",
  outro: "Outro",
  legacy_profile_inactive: "Suspensao existente",
  payment_required: "Pagamento necessario",
  payment_expired: "Pagamento vencido",
  payment_pending: "Pagamento pendente",
  manual_pause: "Pausa manual",
  manual_suspend: "Suspensao manual",
  manual_release: "Liberacao manual",
  manual_temporary_release: "Liberacao temporaria",
  payment_rule_changed: "Regra de pagamento alterada",
};

export const MENSAGENS_PADRAO: Record<AccessMotivo, string> = {
  ferias:
    "Seu acesso esta pausado durante o periodo de ferias. Aproveite e nos avise quando estiver pronto para retornar.",
  lesao:
    "Seu acesso esta pausado para sua recuperacao. Cuide-se e nos avise quando estiver liberado para voltar a treinar.",
  viagem: "Seu acesso esta pausado durante a sua viagem. Boa viagem!",
  inadimplencia:
    "Seu acesso foi temporariamente suspenso. Entre em contato para regularizar e reativar.",
  violacao: "Seu acesso foi suspenso. Entre em contato para mais informacoes.",
  outro: "",
  legacy_profile_inactive:
    "Seu acesso esta temporariamente suspenso. Entre em contato com seu personal trainer.",
  payment_required:
    "Seu acesso depende de um pagamento ativo. Regularize seu plano para voltar a acessar.",
  payment_expired:
    "Seu ultimo pagamento venceu. Regularize seu plano para voltar a acessar.",
  payment_pending:
    "Existe um pagamento pendente ou atrasado. Regularize seu plano para voltar a acessar.",
};

export interface StudentAccessState {
  student_id: string;
  personal_id: string | null;
  allowed: boolean;
  status: AccessStatus;
  status_label: string;
  reason_code: string | null;
  reason: string | null;
  message_aluno: string | null;
  source: "manual" | "payment" | "settings" | "system" | string;
  priority: number;
  effective_event_id: string | null;
  payment_required: boolean;
  has_active_payment: boolean;
  active_subscription_id: string | null;
  manual_release_until: string | null;
  calculated_at: string;
  updated_at: string;
}

export interface AccessLogWithAuthor {
  id: string;
  student_id: string;
  personal_id: string | null;
  actor_id: string | null;
  actor_name?: string | null;
  source: string;
  event_type: string;
  effect: "allow" | "block" | "neutral";
  priority: number;
  reason_code: string | null;
  message_aluno: string | null;
  observation: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  manual_release_until?: string | null;
  from_active?: boolean | null;
  to_active?: boolean | null;
  motivo?: string | null;
  mensagem_aluno?: string | null;
  observacao_personal?: string | null;
}

export type AccessLog = AccessLogWithAuthor;

const DEFAULT_STATE = (studentId: string): StudentAccessState => ({
  student_id: studentId,
  personal_id: null,
  allowed: true,
  status: "ativo",
  status_label: "Ativo",
  reason_code: "active",
  reason: "Aluno liberado para acessar a plataforma.",
  message_aluno: null,
  source: "system",
  priority: 0,
  effective_event_id: null,
  payment_required: false,
  has_active_payment: false,
  active_subscription_id: null,
  manual_release_until: null,
  calculated_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function deriveStatus(
  isActive: boolean | undefined | null,
  lastLog: AccessLog | null
): AccessStatus {
  if (lastLog?.event_type === "manual_pause") return "pausado";
  if (lastLog?.effect === "block") return "suspenso";
  return isActive === false ? "suspenso" : "ativo";
}

export function getAccessStatusLabel(status: AccessStatus) {
  if (status === "pagamento_pendente") return "Pagamento pendente";
  if (status === "pausado") return "Pausado";
  if (status === "suspenso") return "Suspenso";
  return "Ativo";
}

export function getAccessReasonLabel(reasonCode?: string | null) {
  if (!reasonCode) return null;
  return MOTIVO_LABELS[reasonCode] ?? reasonCode;
}

export function useStudentAccess(studentId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!studentId) return;

    const refreshAccess = () => {
      queryClient.invalidateQueries({ queryKey: ["student-access-state", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-access-events", studentId] });
      queryClient.invalidateQueries({ queryKey: ["platform-access", studentId] });
    };

    const stateChannel = supabase
      .channel(`student-access-hook-state:${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_access_state",
          filter: `student_id=eq.${studentId}`,
        },
        refreshAccess
      )
      .subscribe();

    const eventsChannel = supabase
      .channel(`student-access-hook-events:${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "student_access_events",
          filter: `student_id=eq.${studentId}`,
        },
        refreshAccess
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stateChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [queryClient, studentId]);

  const stateQuery = useQuery({
    queryKey: ["student-access-state", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await (supabase as any).rpc("get_student_access_state", {
        _student_id: studentId,
      });
      if (error) throw error;
      return (data ?? DEFAULT_STATE(studentId)) as StudentAccessState;
    },
    enabled: !!studentId,
    staleTime: 15_000,
  });

  const eventsQuery = useQuery({
    queryKey: ["student-access-events", studentId],
    queryFn: async () => {
      if (!studentId) return [] as AccessLogWithAuthor[];
      const { data, error } = await (supabase as any).rpc("get_student_access_events", {
        _student_id: studentId,
      });
      if (error) throw error;

      return ((data ?? []) as AccessLogWithAuthor[]).map((event) => ({
        ...event,
        to_active: event.effect === "allow",
        motivo: event.reason_code,
        mensagem_aluno: event.message_aluno,
        observacao_personal: event.observation,
      }));
    },
    enabled: !!studentId,
    staleTime: 15_000,
  });

  const mutate = useMutation({
    mutationFn: async (params: {
      acao: "pausar" | "suspender" | "reativar";
      motivo?: AccessMotivo;
      mensagemAluno?: string;
      observacao?: string;
      manualReleaseUntil?: string | null;
    }) => {
      if (!studentId) throw new Error("Aluno invalido");

      const eventType =
        params.acao === "pausar"
          ? "manual_pause"
          : params.acao === "suspender"
          ? "manual_suspend"
          : "manual_release";

      const payload: Record<string, string | null> = {
        _student_id: studentId,
        _event_type: eventType,
        _reason_code: params.motivo ?? null,
        _message_aluno: params.mensagemAluno ?? null,
        _observation: params.observacao ?? null,
      };

      if (params.manualReleaseUntil) {
        payload._manual_release_until = params.manualReleaseUntil;
      }

      const { data, error } = await (supabase as any).rpc(
        "register_student_access_event",
        payload
      );

      if (error) throw error;
      return data as StudentAccessState;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["student-access-state", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-access-events", studentId] });
      queryClient.invalidateQueries({ queryKey: ["students-access-states"] });
      queryClient.invalidateQueries({ queryKey: ["platform-access", studentId] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["aluno", studentId] });

      const titles: Record<typeof vars.acao, string> = {
        pausar: "Acesso pausado",
        suspender: "Acesso suspenso",
        reativar: "Acesso reativado",
      };
      toast({ title: titles[vars.acao] });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao alterar acesso",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const state = stateQuery.data ?? (studentId ? DEFAULT_STATE(studentId) : null);
  const logs = eventsQuery.data ?? [];
  const lastLog = logs[0] ?? null;

  return {
    state,
    profile: state
      ? {
          id: state.student_id,
          is_active: state.allowed,
          personal_id: state.personal_id,
        }
      : null,
    isActive: state?.allowed ?? true,
    status: (state?.status ?? "ativo") as AccessStatus,
    allowed: state?.allowed ?? true,
    lastLog,
    logs,
    loading: stateQuery.isLoading || eventsQuery.isLoading,
    refresh: () => {
      stateQuery.refetch();
      eventsQuery.refetch();
    },
    mutate: mutate.mutateAsync,
    isMutating: mutate.isPending,
  };
}
