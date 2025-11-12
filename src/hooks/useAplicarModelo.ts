// hooks/useAplicarModelo.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ModeloTreino } from "./useModelosTreino";

interface AplicarModeloInput {
  modeloId: string;
  profileId: string; // Aluno
  personalId: string;
  diasSemana: number[]; // [1, 3, 5] = Segunda, Quarta, Sexta
  semana?: string; // Data de início da semana (formato YYYY-MM-DD)
}

export function useAplicarModelo() {
  const queryClient = useQueryClient();

  const aplicarModeloMutation = useMutation({
    mutationFn: async (input: AplicarModeloInput) => {
      console.log("[useAplicarModelo] Aplicando modelo:", input);

      // 1. Buscar dados completos do modelo
      const { data: modeloData, error: modeloError } = await supabase
        .from("treino_modelos")
        .select("*")
        .eq("id", input.modeloId)
        .single();

      if (modeloError) throw modeloError;

      // 2. Buscar exercícios do modelo
      const { data: exerciciosModelo, error: exerciciosError } = await supabase
        .from("treino_modelo_exercicios")
        .select("*")
        .eq("modelo_id", input.modeloId)
        .order("ordem");

      if (exerciciosError) throw exerciciosError;

      // 3. Buscar blocos do modelo
      const { data: blocosModelo, error: blocosError } = await supabase
        .from("treino_modelo_blocos")
        .select("*")
        .eq("modelo_id", input.modeloId)
        .order("ordem");

      if (blocosError) throw blocosError;

      // 4. Definir semana (usar semana ativa ou semana atual)
      let semanaParaAplicar = input.semana;

      if (!semanaParaAplicar) {
        const hoje = new Date();
        const inicioDaSemana = new Date(hoje);
        inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);
        semanaParaAplicar = inicioDaSemana.toISOString().split("T")[0];
      }

      console.log(
        "[useAplicarModelo] Aplicando para semana:",
        semanaParaAplicar
      );

      // 5. Para cada dia selecionado, criar/atualizar treino_semanal
      const treinosCriados = [];

      for (const dia of input.diasSemana) {
        console.log(`[useAplicarModelo] Processando dia ${dia}...`);

        // Verificar se já existe treino para este dia
        const { data: treinoExistente } = await supabase
          .from("treinos_semanais")
          .select("id")
          .eq("profile_id", input.profileId)
          .eq("personal_id", input.personalId)
          .eq("semana", semanaParaAplicar)
          .eq("dia_semana", dia)
          .maybeSingle();

        let treinoId: string;

        if (treinoExistente) {
          // Atualizar treino existente
          console.log(
            `[useAplicarModelo] Atualizando treino existente:`,
            treinoExistente.id
          );

          const { error: updateError } = await supabase
            .from("treinos_semanais")
            .update({
              modelo_id: input.modeloId,
              nome_modelo: modeloData.nome,
              descricao: modeloData.descricao,
            })
            .eq("id", treinoExistente.id);

          if (updateError) throw updateError;

          // Deletar exercícios e blocos antigos
          await Promise.all([
            supabase
              .from("exercicios")
              .delete()
              .eq("treino_semanal_id", treinoExistente.id),
            supabase
              .from("blocos_treino")
              .delete()
              .eq("treino_semanal_id", treinoExistente.id),
          ]);

          treinoId = treinoExistente.id;
        } else {
          // Criar novo treino
          console.log(`[useAplicarModelo] Criando novo treino para dia ${dia}`);

          const { data: novoTreino, error: createError } = await supabase
            .from("treinos_semanais")
            .insert({
              profile_id: input.profileId,
              personal_id: input.personalId,
              semana: semanaParaAplicar,
              dia_semana: dia,
              modelo_id: input.modeloId,
              nome_modelo: modeloData.nome,
              descricao: modeloData.descricao,
              concluido: false,
            })
            .select()
            .single();

          if (createError) throw createError;

          treinoId = novoTreino.id;
        }

        // 6. Copiar exercícios do modelo para o treino do aluno
        if (exerciciosModelo && exerciciosModelo.length > 0) {
          // 🔧 Mapear grupos antigos para novos UUIDs únicos
          const grupoIdMap = new Map<string, string>();

          // Função para gerar UUID v4 válido
          const generateUUID = (): string => {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
              /[xy]/g,
              function (c) {
                const r = (Math.random() * 16) | 0;
                const v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              }
            );
          };

          const exerciciosInsert = exerciciosModelo.map((ex: any) => {
            let novoGrupoId = ex.grupo_id;

            // Se o exercício tem grupo_id, criar um novo UUID único para este treino
            if (ex.grupo_id && !grupoIdMap.has(ex.grupo_id)) {
              // Gerar UUID v4 válido no formato PostgreSQL
              novoGrupoId = generateUUID();
              grupoIdMap.set(ex.grupo_id, novoGrupoId);
            } else if (ex.grupo_id) {
              novoGrupoId = grupoIdMap.get(ex.grupo_id) || ex.grupo_id;
            }

            return {
              treino_semanal_id: treinoId,
              nome: ex.nome,
              link_video: ex.link_video,
              series: ex.series,
              repeticoes: ex.repeticoes,
              descanso: ex.descanso,
              carga: ex.carga,
              observacoes: ex.observacoes,
              ordem: ex.ordem,
              grupo_id: novoGrupoId,
              tipo_agrupamento: ex.tipo_agrupamento,
              ordem_no_grupo: ex.ordem_no_grupo,
              descanso_entre_grupos: ex.descanso_entre_grupos,
              concluido: false,
            };
          });

          console.log(
            `[useAplicarModelo] Grupos mapeados:`,
            Object.fromEntries(grupoIdMap)
          );

          const { error: exerciciosInsertError } = await supabase
            .from("exercicios")
            .insert(exerciciosInsert);

          if (exerciciosInsertError) {
            console.error(
              "[useAplicarModelo] Erro ao inserir exercícios:",
              exerciciosInsertError
            );
            throw exerciciosInsertError;
          }

          console.log(
            `[useAplicarModelo] ${exerciciosInsert.length} exercícios copiados para dia ${dia}`
          );
        }

        // 7. Copiar blocos do modelo para o treino do aluno
        if (blocosModelo && blocosModelo.length > 0) {
          console.log(
            `[useAplicarModelo] Copiando ${blocosModelo.length} blocos para dia ${dia}`
          );

          const blocosInsert = blocosModelo.map(
            (bloco: any, index: number) => ({
              treino_semanal_id: treinoId,
              tipo: bloco.tipo,
              nome: bloco.nome,
              duracao_estimada_minutos: bloco.duracao_estimada_minutos,
              descricao: bloco.descricao,
              posicao: bloco.posicao,
              ordem: bloco.ordem && bloco.ordem > 0 ? bloco.ordem : index + 1,
              concluido: false,
            })
          );

          console.log("[useAplicarModelo] Blocos para inserir:", blocosInsert);

          const { error: blocosInsertError } = await supabase
            .from("blocos_treino")
            .insert(blocosInsert);

          if (blocosInsertError) {
            console.error(
              "[useAplicarModelo] Erro ao inserir blocos:",
              blocosInsertError
            );
            throw blocosInsertError;
          }

          console.log(
            `[useAplicarModelo] ${blocosInsert.length} blocos copiados para dia ${dia}`
          );
        } else {
          console.log(
            `[useAplicarModelo] Nenhum bloco para copiar no dia ${dia}`
          );
        }

        treinosCriados.push({ dia, treinoId });
      }

      console.log(
        "[useAplicarModelo] Modelo aplicado com sucesso:",
        treinosCriados
      );

      return {
        modeloNome: modeloData.nome,
        treinosCriados,
        diasAplicados: input.diasSemana,
      };
    },
    onSuccess: async (data, variables) => {
      // Invalidar TODAS as queries relacionadas aos treinos
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["treinos", variables.profileId, variables.personalId],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "grupos-exercicios",
            variables.profileId,
            variables.personalId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "blocos-treino",
            variables.profileId,
            variables.personalId,
          ],
        }),
      ]);

      const diasNomes = data.diasAplicados
        .map((d) => {
          const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
          return dias[d % 7];
        })
        .join(", ");

      toast.success(
        `Modelo "${data.modeloNome}" aplicado com sucesso aos dias: ${diasNomes}`
      );
    },
    onError: (error: any) => {
      console.error("[useAplicarModelo] Erro ao aplicar modelo:", error);
      toast.error("Erro ao aplicar modelo de treino");
    },
  });

  return {
    aplicarModelo: (input: AplicarModeloInput) =>
      aplicarModeloMutation.mutateAsync(input),
    isAplicando: aplicarModeloMutation.isPending,
  };
}
