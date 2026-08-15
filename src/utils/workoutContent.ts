import { supabase } from "@/integrations/supabase/client";

type WorkoutRecord = {
  id: string;
};

export async function filterWorkoutsWithContent<T extends WorkoutRecord>(workouts: T[]) {
  const ids = Array.from(new Set(workouts.map((workout) => workout.id).filter(Boolean)));
  if (ids.length === 0) return [];

  const [exerciciosResult, blocosResult, sessoesResult] = await Promise.all([
    supabase
      .from("exercicios")
      .select("treino_semanal_id")
      .in("treino_semanal_id", ids)
      .is("deleted_at", null),
    supabase
      .from("blocos_treino")
      .select("treino_semanal_id")
      .in("treino_semanal_id", ids)
      .is("deleted_at", null),
    supabase
      .from("treino_sessoes")
      .select("treino_semanal_id")
      .in("treino_semanal_id", ids)
      .eq("status", "concluido"),
  ]);

  const idsWithContent = new Set<string>();

  (exerciciosResult.data || []).forEach((item: any) => {
    if (item.treino_semanal_id) idsWithContent.add(item.treino_semanal_id);
  });

  (blocosResult.data || []).forEach((item: any) => {
    if (item.treino_semanal_id) idsWithContent.add(item.treino_semanal_id);
  });

  (sessoesResult.data || []).forEach((item: any) => {
    if (item.treino_semanal_id) idsWithContent.add(item.treino_semanal_id);
  });

  return workouts.filter((workout) => idsWithContent.has(workout.id));
}
