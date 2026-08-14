import { supabase } from "@/integrations/supabase/client";

type RpcError = { message: string } | null;

type ManagedStudentProfile = {
  id: string;
  nome: string;
  telefone: string | null;
  aluno_card_color: string | null;
};

type StudentProfileManagementClient = {
  rpc(
    fn: "set_student_card_color",
    args: { _student_id: string; _color: string | null }
  ): Promise<{ data: ManagedStudentProfile | null; error: RpcError }>;
  rpc(
    fn: "update_student_basic_info",
    args: { _student_id: string; _nome: string; _telefone: string | null }
  ): Promise<{ data: ManagedStudentProfile | null; error: RpcError }>;
};

const studentProfileManagement = supabase as unknown as StudentProfileManagementClient;

export const setStudentCardColor = (studentId: string, color: string | null) =>
  studentProfileManagement.rpc("set_student_card_color", {
    _student_id: studentId,
    _color: color,
  });

export const updateStudentBasicInfo = (
  studentId: string,
  nome: string,
  telefone: string | null
) =>
  studentProfileManagement.rpc("update_student_basic_info", {
    _student_id: studentId,
    _nome: nome,
    _telefone: telefone,
  });
