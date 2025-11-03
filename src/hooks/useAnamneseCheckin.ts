import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWeek, getYear } from "date-fns";

interface AnamneseCheckinStatus {
  anamnesePreenchida: boolean;
  checkinSemanalFeito: boolean;
  podeAcessarTreinos: boolean;
  loading: boolean;
  error: string | null;
}

export function useAnamneseCheckin(
  profileId?: string,
  personalId?: string
): AnamneseCheckinStatus {
  const [status, setStatus] = useState<AnamneseCheckinStatus>({
    anamnesePreenchida: false,
    checkinSemanalFeito: false,
    podeAcessarTreinos: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!profileId || !personalId) {
      setStatus((prev) => ({ ...prev, loading: false }));
      return;
    }

    verificarStatus();
  }, [profileId, personalId]);

  const verificarStatus = async () => {
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

      // Verificar check-in semanal
      const ano = getYear(new Date());
      const semana = getWeek(new Date());

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

      if (!anamnesePreenchida) {
        podeAcessarTreinos = false;
      } else if (
        checkinObrigatorio &&
        bloquearTreinos &&
        !checkinSemanalFeito
      ) {
        podeAcessarTreinos = false;
      }

      setStatus({
        anamnesePreenchida,
        checkinSemanalFeito,
        podeAcessarTreinos,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error("Erro ao verificar status:", error);
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  };

  return status;
}
