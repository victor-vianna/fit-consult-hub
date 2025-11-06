// src/integrations/supabase/profiles.ts
import { supabase } from "./client";

export type Profile = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone?: string;
  personal_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Busca alunos de um personal específico
 */
export async function getStudentsByPersonal(personalId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("personal_id", personalId)
    .order("nome", { ascending: true });

  if (error) throw error;
  return data as Profile[];
}

/**
 * Busca um perfil por ID
 */
export async function getProfileById(profileId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Atualiza o status is_active de um aluno
 */
export async function updateStudentActiveStatus(
  studentId: string,
  isActive: boolean
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", studentId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Verifica se um aluno está ativo
 */
export async function checkStudentIsActive(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .single();

  if (error) return false;
  return data?.is_active ?? false;
}
