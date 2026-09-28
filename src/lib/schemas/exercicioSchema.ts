// exercicioSchema.ts
import { z } from "zod";

const demonstrationVideoSchema = z.object({
  label: z.string().max(80, "Nome do video muito longo"),
  url: z.string().url("URL de video invalida"),
});

export const exercicioSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome do exercício é obrigatório")
    .max(100, "Nome muito longo"),
  // aceita URL válida ou string vazia (campo opcional)
  link_video: z.string().url("URL inválida").optional().or(z.literal("")),
  links_demonstracao: z.array(demonstrationVideoSchema).max(10).optional(),
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
  carga: z.string().min(1).max(100).optional().nullable(),
});

export const treinoDescricaoSchema = z.object({
  descricao: z.string().max(100, "Descrição muito longa").optional(),
});

export type ExercicioFormData = z.infer<typeof exercicioSchema>;
export type TreinoDescricaoFormData = z.infer<typeof treinoDescricaoSchema>;
