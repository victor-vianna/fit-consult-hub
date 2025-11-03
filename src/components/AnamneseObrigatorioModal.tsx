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
  open?: boolean; // tornar opcional — o componente controla exibição real
  onComplete: () => void;
}

export function AnamneseObrigatoriaModal({
  profileId,
  personalId,
  themeColor,
  open = true,
  onComplete,
}: Props) {
  const [personalName, setPersonalName] = useState<string>("");
  const [checkedExisting, setCheckedExisting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (personalId) {
      fetchPersonalName();
    } else {
      setPersonalName("seu personal");
    }
  }, [personalId]);

  useEffect(() => {
    // quando profileId/personalId mudarem, verificamos se já existe anamnese
    if (profileId && personalId) {
      checkIfAnamneseExists();
    } else {
      // se algum id não existe, consideramos checado e não mostramos modal
      setCheckedExisting(true);
      setShowModal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, personalId]);

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

  const checkIfAnamneseExists = async () => {
    setLoading(true);
    setCheckedExisting(false);

    try {
      const { data, error } = await supabase
        .from("anamnese_inicial")
        .select("id")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .single();

      // Se houver erro que não seja "no rows", logue e considere que não existe
      if (error && error.code !== "PGRST116") {
        console.error("Erro ao checar anamnese:", error);
        // Decide não abrir modal em caso de erro severo ou abrir? Aqui consideramos não abrir.
        setShowModal(false);
        setCheckedExisting(true);
        return;
      }

      if (data) {
        // Já existe anamnese: não mostramos modal e chamamos onComplete
        setShowModal(false);
        setCheckedExisting(true);
        // chama onComplete para indicar que não é necessário preencher
        if (onComplete) onComplete();
      } else {
        // Não existe: mostramos o modal (desde que prop open também seja true)
        setShowModal(true);
        setCheckedExisting(true);
      }
    } catch (err) {
      console.error("Erro ao checar anamnese (catch):", err);
      setShowModal(false);
      setCheckedExisting(true);
    } finally {
      setLoading(false);
    }
  };

  // Handler passado ao AnamneseInicialForm para quando o aluno concluir o preenchimento
  const handleComplete = () => {
    // Fecha o modal e avisa que completou
    setShowModal(false);
    onComplete();
  };

  // Enquanto estiver verificando, não renderizamos o Dialog para evitar o flash
  if (!checkedExisting) {
    return null;
  }

  return (
    <Dialog
      open={showModal}
      onOpenChange={() => {
        /* não permite fechar */
      }}
    >
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
                Bem-vindo(a)! 👋
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
                Antes de começar, precisamos conhecer você melhor
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Alert informativo */}
        <Alert className="border-2" style={{ borderColor: themeColor }}>
          <AlertCircle className="h-5 w-5" style={{ color: themeColor }} />
          <AlertDescription className="ml-2">
            <p className="font-semibold mb-2">
              📋 Por que preencher a Anamnese?
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                ✅ <strong>Segurança:</strong> {personalName} precisa conhecer
                seu histórico de saúde
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
            </ul>
          </AlertDescription>
        </Alert>

        {/* Bloqueio visual */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2 border-y bg-muted/30">
          <Lock className="h-4 w-4" />
          <span>
            🔒 Esta etapa é obrigatória. Não é possível pular ou fechar esta
            janela.
          </span>
        </div>

        {/* Formulário */}
        <div className="mt-4">
          <AnamneseInicialForm
            profileId={profileId}
            personalId={personalId}
            themeColor={themeColor}
            onComplete={handleComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
