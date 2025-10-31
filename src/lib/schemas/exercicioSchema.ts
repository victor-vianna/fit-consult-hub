// exercicioSchema.ts
import { z } from "zod";

export const exercicioSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome do exercício é obrigatório")
    .max(100, "Nome muito longo"),
  // aceita URL válida ou string vazia (campo opcional)
  link_video: z.string().url("URL inválida").optional().or(z.literal("")),
  series: z
    .number()
    .int()
    .min(1, "Mínimo 1 série")
    .max(10, "Máximo 10 séries")
    .optional(),
  repeticoes: z.string().min(1, "Repetições obrigatórias").optional(),
  descanso: z
    .number()
    .int()
    .min(0, "Descanso não pode ser negativo")
    .max(600, "Máximo 10 minutos")
    .optional(),
  observacoes: z.string().max(500, "Observação muito longa").optional(),

  // NOVO: carga (peso). Pode ser número (ex: 20, 20.5), opcional e nullable.
  // Ajuste min/max conforme sua regra de negócio (aqui limitei a 0..1000).
  carga: z
    .number()
    .nonnegative()
    .max(1000, "Carga inválida")
    .optional()
    .nullable(),
});

export const treinoDescricaoSchema = z.object({
  descricao: z.string().max(100, "Descrição muito longa").optional(),
});

export type ExercicioFormData = z.infer<typeof exercicioSchema>;
export type TreinoDescricaoFormData = z.infer<typeof treinoDescricaoSchema>;
