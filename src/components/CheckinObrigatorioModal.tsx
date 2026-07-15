// CheckinObrigatorioModal.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, AlertCircle, Lock, Calendar } from "lucide-react";
import { CheckinSemanalForm } from "./CheckinSemanalForm";
import { supabase } from "@/integrations/supabase/client";
import { getAnamneseReferenceDate } from "@/utils/anamneseDate";
import { formatDisplayDateTime } from "@/utils/dateFormat";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  open: boolean;
  onComplete: () => void;
  onClose?: () => void;
}

export function CheckinObrigatorioModal({
  profileId,
  personalId,
  themeColor,
  open,
  onComplete,
  onClose,
}: Props) {
  const [personalName, setPersonalName] = useState<string>("");
  const [lastCheckinDate, setLastCheckinDate] = useState<string | null>(null);
  const [firstAccessDate, setFirstAccessDate] = useState<Date | null>(null);
  const [hasPreviousCheckins, setHasPreviousCheckins] = useState(false);
  const [internalOpen, setInternalOpen] = useState(open);

  const today = new Date();

  const alreadyOneWeek =
    hasPreviousCheckins ||
    Boolean(
      firstAccessDate &&
        (today.getTime() - firstAccessDate.getTime()) / 1000 / 60 / 60 / 24 >= 7
    );

  useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  useEffect(() => {
    if (personalId) {
      fetchPersonalName();
      fetchLastCheckin();
      fetchFirstAccessDate();
      fetchCheckinHistory();
    }
  }, [personalId, profileId]);

  const fetchPersonalName = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", personalId)
        .single();

      if (error) throw error;
      setPersonalName(data?.nome || "seu personal");
    } catch (error) {
      console.error("Erro ao buscar nome do personal:", error);
      setPersonalName("seu personal");
    }
  };

  const fetchLastCheckin = async () => {
    try {
      const { data, error } = await supabase
        .from("checkins_semanais")
        .select("preenchido_em")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .order("preenchido_em", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setLastCheckinDate(
          formatDisplayDateTime(data.preenchido_em)
        );
      }
    } catch (error) {
      console.error("Erro ao buscar último check-in:", error);
    }
  };

  const fetchFirstAccessDate = async () => {
    try {
      const { data, error } = await supabase
        .from("anamnese_inicial")
        .select("created_at, updated_at, preenchida_em")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      const anamneseDate = getAnamneseReferenceDate(data);
      if (anamneseDate) {
        setFirstAccessDate(anamneseDate);
      }
    } catch (error) {
      console.error("Erro ao buscar data da anamnese:", error);
    }
  };

  const fetchCheckinHistory = async () => {
    try {
      const { count, error } = await supabase
        .from("checkins_semanais")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .eq("personal_id", personalId);

      if (error) throw error;

      setHasPreviousCheckins((count ?? 0) > 0);
    } catch (error) {
      console.error("Erro ao verificar histórico de check-ins:", error);
      setHasPreviousCheckins(false);
    }
  };

  const handleComplete = () => {
    setInternalOpen(false);
    onComplete();
  };

  const handleClose = () => {
    setInternalOpen(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog
      open={internalOpen}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setInternalOpen(true);
          return;
        }

        // Se já passou da primeira semana, o check-in é obrigatório e não pode
        // ser dispensado fechando o modal.
        if (alreadyOneWeek) {
          setInternalOpen(true);
          return;
        }

        setInternalOpen(false);
        if (onClose) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-5xl max-h-[95vh] overflow-y-auto"
        onEscapeKeyDown={(event) => {
          if (alreadyOneWeek) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (alreadyOneWeek) event.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: themeColor || "hsl(var(--primary))",
              }}
            >
              <TrendingUp className="h-8 w-8 text-white" />
            </div>

            <DialogTitle className="text-2xl md:text-3xl">
              Check-in Semanal 📊
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* ----------- BLOQUEIO SE AINDA NÃO COMPLETOU 1 SEMANA ----------- */}
        {!alreadyOneWeek ? (
          <div className="space-y-4">
            <Alert className="border-2 border-yellow-300 bg-yellow-50 mt-4">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <AlertDescription className="ml-2">
                <p className="font-semibold mb-1 text-yellow-900">
                  ⏳ Check-in disponível após 7 dias
                </p>
                <p className="text-sm text-yellow-800">
                  Como você está na sua primeira semana de treino, o check-in será
                  liberado somente após uma semana completa.
                </p>

                {firstAccessDate && (
                  <p className="text-xs text-yellow-700 mt-2 italic">
                    📅 Sua anamnese foi preenchida em:{" "}
                    {formatDisplayDateTime(firstAccessDate)}
                  </p>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-6 py-2 rounded-lg font-medium transition-colors bg-muted hover:bg-muted/80 text-foreground"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ----------- CHECK-IN LIBERADO ----------- */}
            <Alert className="border-2 border-orange-300 bg-orange-50">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="ml-2">
                <p className="font-semibold mb-2 text-orange-900">
                  ⚠️ Check-in Semanal Obrigatório
                </p>
                <ul className="space-y-1 text-sm text-orange-800">
                  <li>
                    ✅ <strong>Feedback Importante:</strong> {personalName}{" "}
                    precisa saber como foi sua semana
                  </li>
                  <li>
                    ✅ <strong>Ajustes Necessários:</strong> Com base nas suas
                    respostas, o treino pode ser otimizado
                  </li>
                  <li>
                    ✅ <strong>Segurança:</strong> Relatar dores e desconfortos
                    é fundamental
                  </li>
                  <li>
                    ✅ <strong>Acesso Liberado:</strong> Após preencher, você
                    terá acesso aos treinos da próxima semana
                  </li>
                </ul>

                {lastCheckinDate && (
                  <p className="text-xs text-orange-700 mt-2 italic">
                    💡 Último check-in: {lastCheckinDate}
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3 border-y bg-yellow-50">
              <Lock className="h-4 w-4 text-orange-600" />
              <span className="text-orange-900 font-medium">
                🔒 Preencha o check-in para desbloquear o acesso aos treinos
                desta semana
              </span>
            </div>

            <div className="mt-4">
              <CheckinSemanalForm
                profileId={profileId}
                personalId={personalId}
                themeColor={themeColor}
                onComplete={handleComplete}
                isModal={true}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

