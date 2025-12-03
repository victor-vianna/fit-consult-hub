import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  Calendar,
  AlertCircle,
  FileText,
  Edit,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AnamneseInicialForm } from "./AnamneseInicialForm";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  studentName: string;
}

interface AnamneseData {
  id: string;
  data_nascimento?: string;
  profissao?: string;
  objetivos: string;
  rotina?: string;
  experiencia_online?: string;
  acompanhamento_nutricional?: string;
  refeicoes_dia?: number;
  rotina_alimentar?: string;
  consumo_agua?: string;
  horas_sono?: string;
  qualidade_sono?: string;
  suplementos?: string;
  cirurgias?: string;
  dores_lesoes?: string;
  fuma?: string;
  bebe?: string;
  restricao_medica?: string;
  medicamentos?: string;
  alergia?: string;
  problema_coracao?: string;
  diabetes?: string;
  problema_respiratorio?: string;
  pressao_arterial?: string;
  peso_atual?: number;
  altura?: number;
  peso_desejado?: number;
  crianca_obesa?: boolean;
  exercicio_atual?: string;
  compromisso_treinos?: number;
  tempo_disponivel?: string;
  local_treino?: string;
  materiais_disponiveis?: string;
  preferencia_exercicio?: string;
  exercicios_gosta?: string;
  exercicios_odeia?: string;
  observacoes_extras?: string;
  preenchida_em: string;
  created_at: string;
  updated_at: string;
}

export function AnamneseVisualizacao({
  profileId,
  personalId,
  themeColor,
  studentName,
}: Props) {
  const { toast } = useToast();
  const [anamnese, setAnamnese] = useState<AnamneseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchAnamnese();
  }, [profileId, personalId]);

  const fetchAnamnese = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("anamnese_inicial")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setAnamnese(data);
    } catch (error: any) {
      console.error("Erro ao buscar anamnese:", error);
      toast({
        title: "Erro ao carregar anamnese",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const InfoItem = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value?: string | number | boolean | null;
    icon?: string;
  }) => {
    if (!value && value !== 0 && value !== false) return null;

    return (
      <div
        className="border-l-4 pl-4 py-2"
        style={{ borderColor: themeColor || "hsl(var(--primary))" }}
      >
        <p className="text-sm font-semibold text-muted-foreground mb-1">
          {icon} {label}
        </p>
        <p className="text-base">
          {typeof value === "boolean" ? (value ? "Sim" : "Não") : value}
        </p>
      </div>
    );
  };

  const Section = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <Card className="border-2 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 mx-auto mb-4"
            style={{
              borderColor: themeColor
                ? `${themeColor}40`
                : "rgba(0, 0, 0, 0.1)",
              borderTopColor: themeColor || "#000000",
            }}
          />
          <p className="text-muted-foreground">Carregando anamnese...</p>
        </div>
      </div>
    );
  }

  if (!anamnese) {
    return (
      <Card className="border-2 shadow-md">
        <CardContent className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Anamnese não preenchida
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {studentName} ainda não preencheu a anamnese inicial. A anamnese é
            obrigatória e será solicitada no primeiro acesso do aluno.
          </p>
          <Dialog open={editMode} onOpenChange={setEditMode}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: themeColor }}>
                <Edit className="mr-2 h-4 w-4" />
                Preencher para o Aluno
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Preencher Anamnese - {studentName}</DialogTitle>
              </DialogHeader>
              <AnamneseInicialForm
                profileId={profileId}
                personalId={personalId}
                themeColor={themeColor}
                onComplete={() => {
                  setEditMode(false);
                  fetchAnamnese();
                }}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-lg">
        <div
          className="h-2"
          style={{
            background: `linear-gradient(90deg, ${
              themeColor || "hsl(var(--primary))"
            }, ${themeColor || "hsl(var(--primary))"}80)`,
          }}
        />
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
              >
                <ClipboardList className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl mb-2">
                  Anamnese de {studentName}
                </CardTitle>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Preenchida em:{" "}
                      {format(
                        new Date(anamnese.preenchida_em),
                        "dd/MM/yyyy 'às' HH:mm"
                      )}
                    </span>
                  </div>
                  {anamnese.updated_at !== anamnese.created_at && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Atualizada:{" "}
                        {format(
                          new Date(anamnese.updated_at),
                          "dd/MM/yyyy 'às' HH:mm"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Dialog open={editMode} onOpenChange={setEditMode}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Anamnese - {studentName}</DialogTitle>
                </DialogHeader>
                <AnamneseInicialForm
                  profileId={profileId}
                  personalId={personalId}
                  themeColor={themeColor}
                  onComplete={() => {
                    setEditMode(false);
                    fetchAnamnese();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-2 bg-gradient-to-br from-card to-muted/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🎯</div>
            <div>
              <h3 className="font-bold text-lg mb-2">Objetivos do Aluno</h3>
              <p className="text-base leading-relaxed">{anamnese.objetivos}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Section
        title="Dados Pessoais e Rotina"
        icon={<FileText className="h-5 w-5" />}
      >
        {anamnese.data_nascimento && (
          <InfoItem
            label="Data de Nascimento"
            value={format(new Date(anamnese.data_nascimento), "dd/MM/yyyy")}
            icon="📅"
          />
        )}
        <InfoItem label="Profissão" value={anamnese.profissao} icon="💼" />
        <div className="md:col-span-2">
          <InfoItem label="Rotina Diária" value={anamnese.rotina} icon="🕑" />
        </div>
        <div className="md:col-span-2">
          <InfoItem
            label="Experiência com Treino Online"
            value={anamnese.experiencia_online}
            icon="💻"
          />
        </div>
      </Section>

      <Section
        title="Nutrição e Hábitos Alimentares"
        icon={<span className="text-xl">🍎</span>}
      >
        <InfoItem
          label="Acompanhamento Nutricional"
          value={anamnese.acompanhamento_nutricional}
          icon="🍎"
        />
        <InfoItem
          label="Refeições por Dia"
          value={anamnese.refeicoes_dia}
          icon="🍴"
        />
        <div className="md:col-span-2">
          <InfoItem
            label="Rotina Alimentar"
            value={anamnese.rotina_alimentar}
            icon="🍽️"
          />
        </div>
        <InfoItem
          label="Consumo de Água"
          value={anamnese.consumo_agua}
          icon="🍶"
        />
        <InfoItem label="Horas de Sono" value={anamnese.horas_sono} icon="💤" />
        <InfoItem
          label="Qualidade do Sono"
          value={anamnese.qualidade_sono}
          icon="💤"
        />
        <InfoItem label="Suplementos" value={anamnese.suplementos} icon="💊" />
      </Section>

      {(anamnese.cirurgias ||
        anamnese.dores_lesoes ||
        anamnese.restricao_medica ||
        anamnese.medicamentos ||
        anamnese.problema_coracao ||
        anamnese.diabetes ||
        anamnese.problema_respiratorio ||
        anamnese.pressao_arterial !== "Normal") && (
        <Card className="border-2 border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-900">
              <AlertCircle className="h-5 w-5 text-red-600" />
              ⚠️ Histórico de Saúde - ATENÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Cirurgias" value={anamnese.cirurgias} icon="🏥" />
            <InfoItem
              label="Dores ou Lesões"
              value={anamnese.dores_lesoes}
              icon="⚠️"
            />
            <InfoItem
              label="Restrição Médica"
              value={anamnese.restricao_medica}
              icon="‼️"
            />
            <InfoItem
              label="Medicamentos"
              value={anamnese.medicamentos}
              icon="💊"
            />
            <InfoItem
              label="Problema Cardíaco"
              value={anamnese.problema_coracao}
              icon="🫀"
            />
            <InfoItem label="Diabetes" value={anamnese.diabetes} icon="💉" />
            <InfoItem
              label="Problema Respiratório"
              value={anamnese.problema_respiratorio}
              icon="🫁"
            />
            <InfoItem
              label="Pressão Arterial"
              value={anamnese.pressao_arterial}
              icon="🩺"
            />
            <InfoItem label="Alergia" value={anamnese.alergia} icon="🤧" />
            <InfoItem label="Fuma" value={anamnese.fuma} icon="🚬" />
            <InfoItem label="Consome Álcool" value={anamnese.bebe} icon="🍺" />
          </CardContent>
        </Card>
      )}

      <Section
        title="Dados Físicos e Histórico"
        icon={<span className="text-xl">⚖️</span>}
      >
        <InfoItem
          label="Peso Atual"
          value={anamnese.peso_atual ? `${anamnese.peso_atual} kg` : undefined}
          icon="⚖️"
        />
        <InfoItem
          label="Altura"
          value={anamnese.altura ? `${anamnese.altura} m` : undefined}
          icon="📏"
        />
        <InfoItem
          label="Quanto Gostaria de Pesar"
          value={
            anamnese.peso_desejado ? `${anamnese.peso_desejado} kg` : undefined
          }
          icon="🎯"
        />
        <InfoItem
          label="Foi Criança Obesa"
          value={anamnese.crianca_obesa}
          icon="🍔"
        />
        <div className="md:col-span-2">
          <InfoItem
            label="Exercício Atual"
            value={anamnese.exercicio_atual}
            icon="🏃"
          />
        </div>
        <InfoItem
          label="Compromisso Semanal"
          value={
            anamnese.compromisso_treinos
              ? `${anamnese.compromisso_treinos}x por semana`
              : undefined
          }
          icon="📅"
        />
      </Section>

      <Section
        title="Preferências de Treino"
        icon={<span className="text-xl">🏋️</span>}
      >
        <InfoItem
          label="Tempo Disponível"
          value={anamnese.tempo_disponivel}
          icon="⏰"
        />
        <InfoItem
          label="Local de Treino"
          value={anamnese.local_treino}
          icon="🏋"
        />
        <div className="md:col-span-2">
          <InfoItem
            label="Materiais Disponíveis"
            value={anamnese.materiais_disponiveis}
            icon="🚴‍♂️"
          />
        </div>
        <div className="md:col-span-2">
          <InfoItem
            label="Preferência de Exercícios"
            value={anamnese.preferencia_exercicio}
            icon="🏋‍♂️"
          />
        </div>
        <div className="md:col-span-2">
          <InfoItem
            label="Exercícios que Gosta"
            value={anamnese.exercicios_gosta}
            icon="😍"
          />
        </div>
        <div className="md:col-span-2">
          <InfoItem
            label="Exercícios que Evita"
            value={anamnese.exercicios_odeia}
            icon="😤"
          />
        </div>
      </Section>

      {anamnese.observacoes_extras && (
        <Card className="border-2 bg-gradient-to-br from-card to-muted/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="text-3xl">💬</div>
              <div>
                <h3 className="font-bold text-lg mb-2">
                  Observações Adicionais
                </h3>
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {anamnese.observacoes_extras}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
