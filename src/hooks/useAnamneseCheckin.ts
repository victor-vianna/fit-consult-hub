import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Função auxiliar para calcular semana do ano
function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

interface AnamneseCheckinStatus {
  anamnesePreenchida: boolean;
  checkinSemanalFeito: boolean;
  podeAcessarTreinos: boolean;
  mostrarModalAnamnese: boolean;
  mostrarModalCheckin: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAnamneseCheckin(
  profileId?: string,
  personalId?: string
): AnamneseCheckinStatus {
  const [status, setStatus] = useState<AnamneseCheckinStatus>({
    anamnesePreenchida: false,
    checkinSemanalFeito: false,
    podeAcessarTreinos: false,
    mostrarModalAnamnese: false,
    mostrarModalCheckin: false,
    loading: true,
    error: null,
    refresh: () => {},
  });

  const verificarStatus = async () => {
    if (!profileId || !personalId) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        podeAcessarTreinos: true,
        refresh: verificarStatus,
      }));
      return;
    }

    try {
      setStatus((prev) => ({ ...prev, loading: true, error: null }));

      // Verificar anamnese
      const { data: anamnese, error: anamneseError } = await supabase
        .from("anamnese_inicial")
        .select("id")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .single();

      if (anamneseError && anamneseError.code !== "PGRST116") {
        throw anamneseError;
      }

      const anamnesePreenchida = !!anamnese;

      // Se não tem anamnese, já retorna bloqueado
      if (!anamnesePreenchida) {
        setStatus({
          anamnesePreenchida: false,
          checkinSemanalFeito: false,
          podeAcessarTreinos: false,
          mostrarModalAnamnese: true,
          mostrarModalCheckin: false,
          loading: false,
          error: null,
          refresh: verificarStatus,
        });
        return;
      }

      // Verificar check-in semanal
      const ano = new Date().getFullYear();
      const semana = getWeekNumber(new Date());

      const { data: checkin, error: checkinError } = await supabase
        .from("checkins_semanais")
        .select("id")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .eq("ano", ano)
        .eq("numero_semana", semana)
        .single();

      if (checkinError && checkinError.code !== "PGRST116") {
        throw checkinError;
      }

      const checkinSemanalFeito = !!checkin;

      // Verificar configuração do personal
      const { data: config } = await supabase
        .from("configuracao_checkins")
        .select("checkin_obrigatorio, bloquear_treinos")
        .eq("personal_id", personalId)
        .single();

      const checkinObrigatorio = config?.checkin_obrigatorio ?? true;
      const bloquearTreinos = config?.bloquear_treinos ?? true;

      // Determinar se pode acessar treinos
      let podeAcessarTreinos = true;
      let mostrarModalCheckin = false;

      if (checkinObrigatorio && bloquearTreinos && !checkinSemanalFeito) {
        podeAcessarTreinos = false;
        mostrarModalCheckin = true;
      }

      setStatus({
        anamnesePreenchida,
        checkinSemanalFeito,
        podeAcessarTreinos,
        mostrarModalAnamnese: false,
        mostrarModalCheckin,
        loading: false,
        error: null,
        refresh: verificarStatus,
      });
    } catch (error: any) {
      console.error("Erro ao verificar status:", error);
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
        refresh: verificarStatus,
      }));
    }
  };

  useEffect(() => {
    verificarStatus();
  }, [profileId, personalId]);

  return { ...status, refresh: verificarStatus };
}
