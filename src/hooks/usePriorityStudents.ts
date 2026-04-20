import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO } from "date-fns";

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
  const [students, setStudents] = useState<PriorityStudent[]>([]);
  const [flagsByStudent, setFlagsByStudent] = useState<Record<string, PriorityFlag[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchPriorities = useCallback(async () => {
    if (!personalId) return;
    setLoading(true);

    try {
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

      // 2. Subscriptions expiring or expired
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("student_id, data_expiracao, status_pagamento, plano")
        .eq("personal_id", personalId);

      const today = new Date();
      (subs || []).forEach((s: any) => {
        if (!map[s.student_id]) return;
        const dias = differenceInDays(parseISO(s.data_expiracao), today);
        if (dias < 0) {
          map[s.student_id].flags.push({
            reason: "plano_vencido",
            label: "Plano vencido",
            detail: `há ${Math.abs(dias)}d`,
            severity: "alta",
          });
        } else if (dias <= 7) {
          map[s.student_id].flags.push({
            reason: "plano_vencendo",
            label: "Vence em breve",
            detail: `${dias}d`,
            severity: dias <= 3 ? "alta" : "media",
          });
        }
        if (s.status_pagamento === "pendente") {
          map[s.student_id].flags.push({
            reason: "pagamento_pendente",
            label: "Pagamento pendente",
            severity: "alta",
          });
        }
      });

      // 3. Feedbacks (check-ins) recentes não respondidos.
      // Heurística: check-in dos últimos 7 dias com texto e sem resposta do personal posterior no chat.
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

      // Buscar respostas do personal no chat após o check-in
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

      setStudents(list);
      setFlagsByStudent(flagMap);
    } catch (err) {
      console.error("Erro ao calcular alunos prioritários:", err);
    } finally {
      setLoading(false);
    }
  }, [personalId]);

  useEffect(() => {
    fetchPriorities();
    const interval = setInterval(fetchPriorities, 60_000);
    return () => clearInterval(interval);
  }, [fetchPriorities]);

  return { students, flagsByStudent, loading, refetch: fetchPriorities };
}
