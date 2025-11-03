import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, AlertCircle, Lock, Calendar } from "lucide-react";
import { CheckinSemanalForm } from "./CheckinSemanalForm";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  open: boolean;
  onComplete: () => void;
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  return new Date(d.setDate(diff));
}

export function CheckinObrigatorioModal({
  profileId,
  personalId,
  themeColor,
  open,
  onComplete,
}: Props) {
  const [personalName, setPersonalName] = useState<string>("");
  const [lastCheckinDate, setLastCheckinDate] = useState<string | null>(null);

  const today = new Date();
  const semanaAtual = getWeekNumber(today);
  const anoAtual = today.getFullYear();
  const inicioSemana = getStartOfWeek(today);
  const fimSemana = getEndOfWeek(today);

  useEffect(() => {
    if (personalId) {
      fetchPersonalName();
      fetchLastCheckin();
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
          format(new Date(data.preenchido_em), "dd/MM/yyyy 'às' HH:mm")
        );
      }
    } catch (error) {
      console.error("Erro ao buscar último check-in:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-5xl max-h-[95vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
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
            <div>
              <DialogTitle className="text-2xl md:text-3xl">
                Check-in Semanal 📊
              </DialogTitle>
              <DialogDescription className="text-base mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Semana {semanaAtual} de {anoAtual} (
                {format(inicioSemana, "dd/MM")} - {format(fimSemana, "dd/MM")})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Alert className="border-2 border-orange-300 bg-orange-50">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertDescription className="ml-2">
            <p className="font-semibold mb-2 text-orange-900">
              ⚠️ Check-in Semanal Obrigatório
            </p>
            <ul className="space-y-1 text-sm text-orange-800">
              <li>
                ✅ <strong>Feedback Importante:</strong> {personalName} precisa
                saber como foi sua semana
              </li>
              <li>
                ✅ <strong>Ajustes Necessários:</strong> Com base nas suas
                respostas, o treino pode ser otimizado
              </li>
              <li>
                ✅ <strong>Segurança:</strong> Relatar dores e desconfortos é
                fundamental
              </li>
              <li>
                ✅ <strong>Acesso Liberado:</strong> Após preencher, você terá
                acesso aos treinos da próxima semana
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
            🔒 Preencha o check-in para desbloquear o acesso aos treinos desta
            semana
          </span>
        </div>

        <div className="mt-4">
          <CheckinSemanalForm
            profileId={profileId}
            personalId={personalId}
            themeColor={themeColor}
            onComplete={onComplete}
            isModal={true}
          />
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              💬 Suas respostas são confidenciais e serão utilizadas apenas por{" "}
              {personalName} para melhorar seu acompanhamento.
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
