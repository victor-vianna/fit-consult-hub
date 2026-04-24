import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

export type PriorityReason =
  | "plano_vencendo"
  | "plano_vencido"
  | "pagamento_pendente"
  | "feedback_nao_respondido"
  | "mensagem_nao_lida";

export interface PriorityFlag {
  reason: PriorityReason;
  label: string;
  detail?: string;
  severity: "alta" | "media";
}

export interface PriorityStudent {
  id: string;
  nome: string;
  flags: PriorityFlag[];
  score: number; // higher = more urgent
}

const SEVERITY_WEIGHT: Record<PriorityFlag["severity"], number> = {
  alta: 10,
  media: 4,
};

export function usePriorityStudents(personalId?: string) {
  const queryClient = useQueryClient();

  const queryFn = useCallback(async (): Promise<{
    students: PriorityStudent[];
    flagsByStudent: Record<string, PriorityFlag[]>;
  }> => {
    if (!personalId) return { students: [], flagsByStudent: {} };

    // 1. Active students of this personal
    const { data: alunos } = await supabase
      .from("profiles")
      .select("id, nome")
      .eq("personal_id", personalId)
      .eq("is_active", true);

    const map: Record<string, { nome: string; flags: PriorityFlag[] }> = {};
    (alunos || []).forEach((a) => {
      map[a.id] = { nome: a.nome, flags: [] };
    });

    // 2. Subscriptions — pegar APENAS a mais recente por aluno (ordem desc por data_expiracao)
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("student_id, data_expiracao, status_pagamento")
      .eq("personal_id", personalId)
      .order("data_expiracao", { ascending: false });

    const subPorAluno = new Map<string, any>();
    (subs || []).forEach((s: any) => {
      if (!subPorAluno.has(s.student_id)) {
        subPorAluno.set(s.student_id, s);
      }
    });

    const today = startOfDay(new Date());
    subPorAluno.forEach((s: any, studentId) => {
      if (!map[studentId]) return;
      const expDay = startOfDay(parseISO(s.data_expiracao));
      const dias = differenceInCalendarDays(expDay, today);

      if (dias < 0 && s.status_pagamento !== "pago") {
        // só marca vencido se realmente está vencido E não foi pago
        map[studentId].flags.push({
          reason: "plano_vencido",
          label: "Plano vencido",
          detail: `há ${Math.abs(dias)}d`,
          severity: "alta",
        });
      } else if (dias >= 0 && dias <= 7 && s.status_pagamento !== "pago") {
        // só vence em breve se status não for pago (ex: pendente/atrasado)
        map[studentId].flags.push({
          reason: "plano_vencendo",
          label: "Vence em breve",
          detail: dias === 0 ? "hoje" : `${dias}d`,
          severity: dias <= 3 ? "alta" : "media",
        });
      }

      if (s.status_pagamento === "pendente" || s.status_pagamento === "atrasado") {
        map[studentId].flags.push({
          reason: "pagamento_pendente",
          label: s.status_pagamento === "atrasado" ? "Pagamento atrasado" : "Pagamento pendente",
          severity: "alta",
        });
      }
    });

    // 3. Feedbacks (check-ins) recentes não respondidos.
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const { data: checkins } = await supabase
      .from("checkins_semanais")
      .select("profile_id, preenchido_em, duvidas, dores_corpo, mudanca_rotina")
      .eq("personal_id", personalId)
      .gte("preenchido_em", seteDiasAtras.toISOString());

    const checkinsComTexto = (checkins || []).filter(
      (c: any) => c.duvidas || c.dores_corpo || c.mudanca_rotina,
    );

    await Promise.all(
      checkinsComTexto.map(async (c: any) => {
        if (!map[c.profile_id]) return;
        const { count } = await supabase
          .from("mensagens_chat")
          .select("*", { count: "exact", head: true })
          .eq("remetente_id", personalId)
          .eq("destinatario_id", c.profile_id)
          .gte("created_at", c.preenchido_em);

        if (!count || count === 0) {
          map[c.profile_id].flags.push({
            reason: "feedback_nao_respondido",
            label: "Feedback s/ resposta",
            severity: "media",
          });
        }
      }),
    );

    // 4. Mensagens não lidas no chat (aluno → personal)
    const { data: mensagens } = await supabase
      .from("mensagens_chat")
      .select("remetente_id")
      .eq("destinatario_id", personalId)
      .eq("lida", false);

    const naoLidasPorAluno: Record<string, number> = {};
    (mensagens || []).forEach((m: any) => {
      naoLidasPorAluno[m.remetente_id] = (naoLidasPorAluno[m.remetente_id] || 0) + 1;
    });

    Object.entries(naoLidasPorAluno).forEach(([alunoId, count]) => {
      if (!map[alunoId]) return;
      map[alunoId].flags.push({
        reason: "mensagem_nao_lida",
        label: `${count} msg`,
        severity: "media",
      });
    });

    // 5. Build final list
    const list: PriorityStudent[] = Object.entries(map)
      .filter(([, v]) => v.flags.length > 0)
      .map(([id, v]) => ({
        id,
        nome: v.nome,
        flags: v.flags,
        score: v.flags.reduce((acc, f) => acc + SEVERITY_WEIGHT[f.severity], 0),
      }))
      .sort((a, b) => b.score - a.score);

    const flagMap: Record<string, PriorityFlag[]> = {};
    list.forEach((s) => {
      flagMap[s.id] = s.flags;
    });

    return { students: list, flagsByStudent: flagMap };
  }, [personalId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["priority-students", personalId],
    queryFn,
    enabled: !!personalId,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["priority-students", personalId] });
  }, [queryClient, personalId]);

  return {
    students: data?.students ?? [],
    flagsByStudent: data?.flagsByStudent ?? {},
    loading: isLoading,
    refetch,
    invalidate,
  };
}
