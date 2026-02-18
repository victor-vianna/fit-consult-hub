import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  isRenovacao: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  dismissCheckinModal: () => void;
}

export function useAnamneseCheckin(
  profileId?: string,
  personalId?: string
): AnamneseCheckinStatus {
  const [anamnesePreenchida, setAnamnesePreenchida] = useState(false);
  const [checkinSemanalFeito, setCheckinSemanalFeito] = useState(false);
  const [podeAcessarTreinos, setPodeAcessarTreinos] = useState(true);
  const [mostrarModalAnamnese, setMostrarModalAnamnese] = useState(false);
  const [mostrarModalCheckin, setMostrarModalCheckin] = useState(false);
  const [isRenovacao, setIsRenovacao] = useState(false);
  const [checkinModalDismissed, setCheckinModalDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dismissCheckinModal = useCallback(() => {
    setCheckinModalDismissed(true);
    setMostrarModalCheckin(false);
  }, []);

  const verificarStatus = useCallback(async () => {
    // Se não tem profileId ou personalId, não faz nada
    if (!profileId || !personalId) {
      setLoading(false);
      setPodeAcessarTreinos(true);
      setMostrarModalAnamnese(false);
      setMostrarModalCheckin(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar anamnese
      const { data: anamnese, error: anamneseError } = await supabase
        .from("anamnese_inicial")
        .select("id, created_at")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .maybeSingle();

      if (anamneseError) {
        console.error("Erro ao verificar anamnese:", anamneseError);
        throw anamneseError;
      }

      const anamneseExists = !!anamnese;

      // Verificar se anamnese expirou (mais de 180 dias / 6 meses)
      let anamneseExpirada = false;
      if (anamneseExists && anamnese.created_at) {
        const dataAnamnese = new Date(anamnese.created_at);
        const hoje = new Date();
        const diasDesdeAnamnese = Math.floor(
          (hoje.getTime() - dataAnamnese.getTime()) / (1000 * 60 * 60 * 24)
        );
        anamneseExpirada = diasDesdeAnamnese >= 180;
      }

      setIsRenovacao(anamneseExpirada);
      setAnamnesePreenchida(anamneseExists && !anamneseExpirada);

      // Se não tem anamnese OU expirou, bloqueia
      if (!anamneseExists || anamneseExpirada) {
        setCheckinSemanalFeito(false);
        setPodeAcessarTreinos(false);
        setMostrarModalAnamnese(true);
        setMostrarModalCheckin(false);
        setLoading(false);
        return;
      }

      // Verificar se já passou 7 dias desde a anamnese
      const dataAnamnese = new Date(anamnese.created_at);
      const hoje = new Date();
      const diasDesdeAnamnese = Math.floor(
        (hoje.getTime() - dataAnamnese.getTime()) / (1000 * 60 * 60 * 24)
      );
      const primeiraSemana = diasDesdeAnamnese < 7;

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
        .maybeSingle();

      if (checkinError) {
        console.error("Erro ao verificar check-in:", checkinError);
        throw checkinError;
      }

      const checkinFeito = !!checkin;
      setCheckinSemanalFeito(checkinFeito);

      // Verificar configuração do personal
      const { data: config } = await supabase
        .from("configuracao_checkins")
        .select("checkin_obrigatorio, bloquear_treinos")
        .eq("personal_id", personalId)
        .maybeSingle();

      // Se não tiver configuração, assume padrões
      const checkinObrigatorio = config?.checkin_obrigatorio ?? true;
      const bloquearTreinos = config?.bloquear_treinos ?? true;

      // Determinar se pode acessar treinos e mostrar modal
      // Na primeira semana: pode acessar treinos, modal pode ser dismissado
      // Após primeira semana: se check-in obrigatório e não feito, bloqueia
      if (primeiraSemana) {
        // Primeira semana: libera treinos, mas mostra modal se não foi dismissado
        setPodeAcessarTreinos(true);
        setMostrarModalAnamnese(false);
        // Só mostra modal se não foi dismissado pelo usuário
        if (!checkinModalDismissed && checkinObrigatorio && !checkinFeito) {
          setMostrarModalCheckin(true);
        } else {
          setMostrarModalCheckin(false);
        }
      } else {
        // Após primeira semana: segue regra normal
        if (checkinObrigatorio && bloquearTreinos && !checkinFeito) {
          setPodeAcessarTreinos(false);
          setMostrarModalCheckin(true);
        } else {
          setPodeAcessarTreinos(true);
          setMostrarModalCheckin(false);
        }
      }

      setMostrarModalAnamnese(false);
      setLoading(false);
    } catch (err: any) {
      console.error("Erro ao verificar status:", err);
      setError(err.message);
      setLoading(false);
      setPodeAcessarTreinos(true); // Em caso de erro, não bloqueia
      setMostrarModalAnamnese(false);
      setMostrarModalCheckin(false);
    }
  }, [profileId, personalId, checkinModalDismissed]);

  useEffect(() => {
    verificarStatus();
  }, [verificarStatus]);

  return {
    anamnesePreenchida,
    checkinSemanalFeito,
    podeAcessarTreinos,
    mostrarModalAnamnese,
    mostrarModalCheckin,
    isRenovacao,
    loading,
    error,
    refresh: verificarStatus,
    dismissCheckinModal,
  };
}
