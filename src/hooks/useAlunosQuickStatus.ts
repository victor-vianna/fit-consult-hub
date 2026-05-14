import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays, startOfDay } from "date-fns";

export interface AlunoQuickStatus {
  treinouHoje: boolean;
  diasDesdeUltimoTreino: number | null;
  totalSemana: number;
  concluidosSemana: number;
}

/**
 * Status rápido de cada aluno do personal — pensado para chips no card.
 * Lê treinos_semanais (concluído + updated_at) e agrega.
 */
export function useAlunosQuickStatus(personalId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["alunos-quick-status", personalId],
    queryFn: async (): Promise<Record<string, AlunoQuickStatus>> => {
      if (!personalId) return {};

      const hoje = startOfDay(new Date());
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - 7);

      const { data: treinos } = await supabase
        .from("treinos_semanais")
        .select("profile_id, concluido, updated_at, dia_semana")
        .eq("personal_id", personalId)
        .gte("updated_at", inicioSemana.toISOString());

      const map: Record<string, AlunoQuickStatus> = {};
      (treinos || []).forEach((t: any) => {
        const id = t.profile_id;
        if (!map[id]) {
          map[id] = {
            treinouHoje: false,
            diasDesdeUltimoTreino: null,
            totalSemana: 0,
            concluidosSemana: 0,
          };
        }
        map[id].totalSemana += 1;
        if (t.concluido) {
          map[id].concluidosSemana += 1;
          const updated = startOfDay(new Date(t.updated_at));
          const dias = differenceInCalendarDays(hoje, updated);
          if (dias === 0) map[id].treinouHoje = true;
          if (
            map[id].diasDesdeUltimoTreino === null ||
            dias < (map[id].diasDesdeUltimoTreino as number)
          ) {
            map[id].diasDesdeUltimoTreino = dias;
          }
        }
      });

      return map;
    },
    enabled: !!personalId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return { statusByAluno: data ?? {}, loading: isLoading };
}
