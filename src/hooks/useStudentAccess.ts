import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type AccessStatus = "ativo" | "pausado" | "suspenso";

export type AccessMotivo =
  | "ferias"
  | "lesao"
  | "viagem"
  | "inadimplencia"
  | "violacao"
  | "outro";

export const MOTIVO_LABELS: Record<AccessMotivo, string> = {
  ferias: "Férias",
  lesao: "Lesão / Recuperação",
  viagem: "Viagem",
  inadimplencia: "Inadimplência",
  violacao: "Violação de regras",
  outro: "Outro",
};

// Motivos considerados de "pausa amigável" — os demais são "suspensão"
const PAUSA_MOTIVOS: AccessMotivo[] = ["ferias", "lesao", "viagem"];

export const MENSAGENS_PADRAO: Record<AccessMotivo, string> = {
  ferias:
    "Seu acesso está pausado durante o período de férias. Aproveite e nos avise quando estiver pronto para retornar.",
  lesao:
    "Seu acesso está pausado para sua recuperação. Cuide-se e nos avise quando estiver liberado para voltar a treinar.",
  viagem:
    "Seu acesso está pausado durante a sua viagem. Boa viagem!",
  inadimplencia:
    "Seu acesso foi temporariamente suspenso. Entre em contato para regularizar e reativar.",
  violacao:
    "Seu acesso foi suspenso. Entre em contato para mais informações.",
  outro: "",
};

export interface AccessLog {
  id: string;
  student_id: string;
  changed_by: string;
  from_active: boolean | null;
  to_active: boolean | null;
  motivo: string | null;
  mensagem_aluno: string | null;
  observacao_personal: string | null;
  created_at: string;
}

export interface AccessLogWithAuthor extends AccessLog {
  author_name?: string | null;
}

export function deriveStatus(
  isActive: boolean | undefined | null,
  lastLog: AccessLog | null
): AccessStatus {
  if (isActive) return "ativo";
  const motivo = (lastLog?.motivo ?? "") as AccessMotivo;
  if (PAUSA_MOTIVOS.includes(motivo)) return "pausado";
  return "suspenso";
}

export function useStudentAccess(studentId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const profileQuery = useQuery({
    queryKey: ["student-access-profile", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, is_active")
        .eq("id", studentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });

  const logsQuery = useQuery({
    queryKey: ["student-access-logs", studentId],
    queryFn: async () => {
      if (!studentId) return [] as AccessLogWithAuthor[];
      const { data: logs, error } = await supabase
        .from("student_access_logs")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const ids = Array.from(
        new Set((logs ?? []).map((l) => l.changed_by).filter(Boolean))
      );
      let authors: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", ids as string[]);
        authors = Object.fromEntries(
          (profs ?? []).map((p) => [p.id, p.nome ?? ""])
        );
      }
      return (logs ?? []).map((l) => ({
        ...l,
        author_name: authors[l.changed_by] ?? null,
      })) as AccessLogWithAuthor[];
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });

  const lastLog = logsQuery.data?.[0] ?? null;
  const status: AccessStatus = deriveStatus(
    profileQuery.data?.is_active,
    lastLog
  );

  const mutate = useMutation({
    mutationFn: async (params: {
      acao: "pausar" | "suspender" | "reativar";
      motivo?: AccessMotivo;
      mensagemAluno?: string;
      observacao?: string;
    }) => {
      if (!studentId) throw new Error("Aluno inválido");
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Não autenticado");

      const fromActive = profileQuery.data?.is_active ?? true;
      const toActive = params.acao === "reativar";

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          is_active: toActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId);
      if (upErr) throw upErr;

      const { error: logErr } = await supabase
        .from("student_access_logs")
        .insert({
          student_id: studentId,
          changed_by: userId,
          from_active: fromActive,
          to_active: toActive,
          motivo: params.motivo ?? null,
          mensagem_aluno: params.mensagemAluno?.trim() || null,
          observacao_personal: params.observacao?.trim() || null,
        });
      if (logErr) {
        // Reverte o flag para manter consistência
        await supabase
          .from("profiles")
          .update({ is_active: fromActive })
          .eq("id", studentId);
        throw logErr;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["student-access-profile", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-access-logs", studentId] });
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

  return {
    profile: profileQuery.data,
    isActive: profileQuery.data?.is_active ?? true,
    status,
    lastLog,
    logs: logsQuery.data ?? [],
    loading: profileQuery.isLoading || logsQuery.isLoading,
    refresh: () => {
      profileQuery.refetch();
      logsQuery.refetch();
    },
    mutate: mutate.mutateAsync,
    isMutating: mutate.isPending,
  };
}
