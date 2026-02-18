import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClipboardList, AlertCircle, Lock } from "lucide-react";
import { AnamneseInicialForm } from "./AnamneseInicialForm";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  open: boolean;
  onComplete: () => void;
  isRenovacao?: boolean;
}

export function AnamneseObrigatoriaModal({
  profileId,
  personalId,
  themeColor,
  open,
  onComplete,
  isRenovacao = false,
}: Props) {
  const [personalName, setPersonalName] = useState<string>("");

  useEffect(() => {
    if (personalId) {
      fetchPersonalName();
    }
  }, [personalId]);

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
              <ClipboardList className="h-8 w-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl md:text-3xl">
                {isRenovacao ? "Hora de atualizar! 🔄" : "Bem-vindo(a)! 👋"}
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
                {isRenovacao
                  ? "Sua anamnese está desatualizada (mais de 6 meses). Atualize para continuar treinando."
                  : "Antes de começar, precisamos conhecer você melhor"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Alert className="border-2" style={{ borderColor: themeColor }}>
          <AlertCircle className="h-5 w-5" style={{ color: themeColor }} />
          <AlertDescription className="ml-2">
            <p className="font-semibold mb-2">
              {isRenovacao ? "🔄 Por que atualizar a Anamnese?" : "📋 Por que preencher a Anamnese?"}
            </p>
            <ul className="space-y-1 text-sm">
              {isRenovacao ? (
                <>
                  <li>
                    ✅ <strong>Atualização:</strong> Seus dados de saúde podem ter mudado nos últimos 6 meses
                  </li>
                  <li>
                    ✅ <strong>Segurança:</strong> {personalName || "Seu personal"} precisa de informações atualizadas
                  </li>
                  <li>
                    ✅ <strong>Evolução:</strong> Atualize seus objetivos e condições atuais
                  </li>
                  <li>
                    ✅ <strong>Obrigatório:</strong> Necessário para continuar acessando seus treinos
                  </li>
                </>
              ) : (
                <>
                  <li>
                    ✅ <strong>Segurança:</strong> {personalName || "Seu personal"}{" "}
                    precisa conhecer seu histórico de saúde
                  </li>
                  <li>
                    ✅ <strong>Personalização:</strong> Seus treinos serão adaptados
                    aos seus objetivos
                  </li>
                  <li>
                    ✅ <strong>Resultados:</strong> Quanto mais detalhes, melhor
                    será seu acompanhamento
                  </li>
                  <li>
                    ✅ <strong>Obrigatório:</strong> Necessário para acessar seus
                    treinos
                  </li>
                </>
              )}
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2 border-y bg-muted/30">
          <Lock className="h-4 w-4" />
          <span>
            🔒 Esta etapa é obrigatória. Não é possível pular ou fechar esta
            janela.
          </span>
        </div>

        <div className="mt-4">
          <AnamneseInicialForm
            profileId={profileId}
            personalId={personalId}
            themeColor={themeColor}
            onComplete={onComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
