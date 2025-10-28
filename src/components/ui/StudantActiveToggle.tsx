import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  studentId: string;
  studentName: string;
  isActive: boolean;
  onChanged?: (newValue: boolean) => void;
};

export function StudentActiveToggle({
  studentId,
  studentName,
  isActive,
  onChanged,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(isActive);

  async function handleToggle() {
    const newStatus = !active;
    const action = newStatus ? "desbloquear" : "bloquear";

    if (
      !confirm(`Tem certeza que deseja ${action} o acesso de ${studentName}?`)
    ) {
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId)
        .select()
        .single();

      if (error) throw error;

      setActive(data.is_active);
      onChanged?.(data.is_active);

      toast({
        title: data.is_active ? "✅ Acesso liberado" : "🔒 Acesso bloqueado",
        description: `${studentName} agora está ${
          data.is_active ? "ativo" : "bloqueado"
        }.`,
      });
    } catch (e: any) {
      toast({
        title: "Erro ao atualizar status",
        description: e.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant={active ? "default" : "destructive"}
      size="sm"
      className="flex items-center gap-2"
    >
      {loading ? (
        <span className="animate-spin">⏳</span>
      ) : active ? (
        <Unlock size={16} />
      ) : (
        <Lock size={16} />
      )}
      <span>{active ? "Ativo" : "Bloqueado"}</span>
    </Button>
  );
}
