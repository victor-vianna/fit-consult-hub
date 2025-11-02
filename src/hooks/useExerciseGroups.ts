// src/hooks/useExerciseGroups.ts
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

type TipoAgrupamento =
  | "normal"
  | "bi-set"
  | "tri-set"
  | "drop-set"
  | "superset";

export interface ExercicioInput {
  id?: string; // opcional quando é exercício novo
  nome: string;
  link_video?: string | null;
  series: number;
  repeticoes: string;
  descanso?: number;
  carga?: string | number | null;
  observacoes?: string | null;
  // ordem global opcional (você pode preencher se tiver regra)
  ordem?: number | null;
}

export interface GrupoExerciciosInput {
  tipo: TipoAgrupamento;
  titulo?: string | null; // opcional; se não usar, guarda tipo em todas linhas
  descanso_entre_grupos?: number | null;
  exercicios: ExercicioInput[];
}

export interface GrupoExercicio {
  grupo_id: string;
  tipo_agrupamento: TipoAgrupamento;
  descanso_entre_grupos?: number | null;
  ordem: number; // menor ordem de todos os itens do grupo (para ordenar grupos)
  exercicios: any[]; // itens raw retornados do DB (você pode tipar melhor)
}

export function useExerciseGroups() {
  // Gera UUID no client (browser/node 18+). Fallback simples se não existir.
  const genUUID = () => {
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    // fallback (não ideal, mas raramente usado)
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  const criarGrupo = useCallback(
    async (treinoSemanalId: string, payload: GrupoExerciciosInput) => {
      try {
        const grupoId = genUUID();

        // 1) calcular ordem base (próxima ordem global para os itens do treino)
        const { data: ordemData, error: ordemErr } = await supabase
          .from("exercicios")
          .select("ordem", { count: "exact" })
          .eq("treino_semanal_id", treinoSemanalId)
          .is("deleted_at", null)
          .order("ordem", { ascending: false })
          .limit(1);

        if (ordemErr) {
          console.warn("Erro ao calcular ordem atual:", ordemErr);
        }

        // se não houver itens, começar em 1, senão +1 do máximo encontrado.
        let proximaOrdemBase = 1;
        if (
          Array.isArray(ordemData) &&
          ordemData.length > 0 &&
          ordemData[0].ordem != null
        ) {
          proximaOrdemBase = Number(ordemData[0].ordem) + 1;
        }

        // 2) montar array de inserts para exercicios (uma linha por exercício do grupo)
        const inserts = payload.exercicios.map((ex, idx) => ({
          treino_semanal_id: treinoSemanalId,
          nome: ex.nome,
          link_video: ex.link_video ?? null,
          series: ex.series,
          repeticoes: ex.repeticoes,
          descanso: ex.descanso ?? 0,
          // converte carga para string (schema mostra varchar)
          carga: ex.carga != null ? String(ex.carga) : null,
          observacoes: ex.observacoes ?? null,
          // ordem global (opcional): usar a mesma ordem base para o grupo (ou ajuste se preferir)
          ordem: proximaOrdemBase,
          grupo_id: grupoId,
          tipo_agrupamento: String(payload.tipo),
          ordem_no_grupo: idx + 1,
          descanso_entre_grupos: payload.descanso_entre_grupos ?? null,
        }));

        // 3) inserir em lote
        const { data: inserted, error: insertErr } = await supabase
          .from("exercicios")
          .insert(inserts)
          .select("*");

        if (insertErr) throw insertErr;

        // 4) montar e retornar representação do grupo (padrão JS)
        const grupo: GrupoExercicio = {
          grupo_id: grupoId,
          tipo_agrupamento: payload.tipo,
          descanso_entre_grupos: payload.descanso_entre_grupos ?? null,
          ordem: proximaOrdemBase,
          exercicios: inserted ?? [],
        };

        return grupo;
      } catch (err) {
        console.error("criarGrupo error:", err);
        throw err;
      }
    },
    []
  );

  const adicionarExercicioAoGrupo = useCallback(
    async (grupoId: string, treinoSemanalId: string, ex: ExercicioInput) => {
      try {
        // calcular proxima ordem_no_grupo
        const { data: itensDoGrupo, error: itensErr } = await supabase
          .from("exercicios")
          .select("ordem_no_grupo")
          .eq("grupo_id", grupoId)
          .is("deleted_at", null)
          .order("ordem_no_grupo", { ascending: false })
          .limit(1);

        if (itensErr) throw itensErr;

        let proximaOrdemNoGrupo = 1;
        if (
          Array.isArray(itensDoGrupo) &&
          itensDoGrupo.length > 0 &&
          itensDoGrupo[0].ordem_no_grupo != null
        ) {
          proximaOrdemNoGrupo = Number(itensDoGrupo[0].ordem_no_grupo) + 1;
        }

        const insertObj = {
          treino_semanal_id: treinoSemanalId,
          nome: ex.nome,
          link_video: ex.link_video ?? null,
          series: ex.series,
          repeticoes: ex.repeticoes,
          descanso: ex.descanso ?? 0,
          carga: ex.carga != null ? String(ex.carga) : null,
          observacoes: ex.observacoes ?? null,
          // ordem global: mantemos null para não mexer na ordenação geral,
          ordem: ex.ordem ?? null,
          grupo_id: grupoId,
          tipo_agrupamento: String("bi-set"), // opcional: você pode passar tipo real se tiver
          ordem_no_grupo: proximaOrdemNoGrupo,
          descanso_entre_grupos: null,
        };

        const { data, error } = await supabase
          .from("exercicios")
          .insert([insertObj])
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("adicionarExercicioAoGrupo error:", err);
        throw err;
      }
    },
    []
  );

  const obterGruposDoTreino = useCallback(async (treinoSemanalId: string) => {
    try {
      // Buscar todos os exercícios ativos do treino
      const { data, error } = await supabase
        .from("exercicios")
        .select("*")
        .eq("treino_semanal_id", treinoSemanalId)
        .is("deleted_at", null)
        .order("ordem", { ascending: true })
        .order("ordem_no_grupo", { ascending: true });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];

      // Agrupar por grupo_id (ignorar exercicios com grupo_id null)
      const groupsMap = new Map<string, GrupoExercicio>();

      for (const row of rows) {
        const gid = row.grupo_id;
        if (!gid) continue; // pular exercícios solitários
        const tipo =
          (row.tipo_agrupamento as TipoAgrupamento) ??
          ("normal" as TipoAgrupamento);
        const existente = groupsMap.get(gid);
        const ordemGlobal =
          row.ordem != null ? Number(row.ordem) : Number.MAX_SAFE_INTEGER;

        if (!existente) {
          groupsMap.set(gid, {
            grupo_id: gid,
            tipo_agrupamento: tipo,
            descanso_entre_grupos: row.descanso_entre_grupos ?? null,
            ordem: ordemGlobal,
            exercicios: [row],
          });
        } else {
          existente.exercicios.push(row);
          if (ordemGlobal < existente.ordem) existente.ordem = ordemGlobal;
        }
      }

      // transformar em lista e ordenar por ordem
      const grupos = Array.from(groupsMap.values()).sort(
        (a, b) => a.ordem - b.ordem
      );
      return grupos;
    } catch (err) {
      console.error("obterGruposDoTreino error:", err);
      throw err;
    }
  }, []);

  const atualizarMetaGrupo = useCallback(
    async (
      grupoId: string,
      dataPatch: {
        tipo_agrupamento?: TipoAgrupamento;
        descanso_entre_grupos?: number | null;
      }
    ) => {
      try {
        const payload: any = {};
        if (dataPatch.tipo_agrupamento != null)
          payload.tipo_agrupamento = String(dataPatch.tipo_agrupamento);
        if ("descanso_entre_grupos" in dataPatch)
          payload.descanso_entre_grupos =
            dataPatch.descanso_entre_grupos ?? null;

        const { error } = await supabase
          .from("exercicios")
          .update(payload)
          .eq("grupo_id", grupoId);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("atualizarMetaGrupo error:", err);
        throw err;
      }
    },
    []
  );

  const deletarGrupo = useCallback(async (grupoId: string) => {
    try {
      // Soft delete: marca deleted_at nas linhas do grupo
      const { error } = await supabase
        .from("exercicios")
        .update({ deleted_at: new Date().toISOString() })
        .eq("grupo_id", grupoId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("deletarGrupo error:", err);
      throw err;
    }
  }, []);

  return {
    criarGrupo,
    adicionarExercicioAoGrupo,
    obterGruposDoTreino,
    atualizarMetaGrupo,
    deletarGrupo,
  };
}
