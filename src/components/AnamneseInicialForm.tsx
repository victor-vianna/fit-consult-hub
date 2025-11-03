import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  profileId: string;
  personalId: string;
  onComplete?: () => void;
  themeColor?: string;
}

interface AnamneseData {
  data_nascimento?: string;
  profissao?: string;
  objetivos: string;
  rotina?: string;
  experiencia_online?: string;
  acompanhamento_nutricional?: string;
  nutri_nome?: string;
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
  frequencia_exercicio?: string;
  compromisso_treinos?: number;
  tempo_disponivel?: string;
  local_treino?: string;
  materiais_disponiveis?: string;
  preferencia_exercicio?: string;
  exercicios_gosta?: string;
  exercicios_odeia?: string;
  observacoes_extras?: string;
}

export function AnamneseInicialForm({
  profileId,
  personalId,
  onComplete,
  themeColor,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingAnamnese, setExistingAnamnese] = useState<AnamneseData | null>(
    null
  );
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  useEffect(() => {
    checkExistingAnamnese();
  }, [profileId, personalId]);

  const checkExistingAnamnese = async () => {
    try {
      const { data, error } = await supabase
        .from("anamnese_inicial")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setExistingAnamnese(data);
      }
    } catch (error: any) {
      console.error("Erro ao verificar anamnese:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const anamneseData: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_nascimento: formData.get("data_nascimento") || null,
      profissao: formData.get("profissao") || null,
      objetivos: formData.get("objetivos") as string,
      rotina: formData.get("rotina") || null,
      experiencia_online: formData.get("experiencia_online") || null,
      acompanhamento_nutricional:
        formData.get("acompanhamento_nutricional") || null,
      nutri_nome: formData.get("nutri_nome") || null,
      refeicoes_dia: formData.get("refeicoes_dia")
        ? Number(formData.get("refeicoes_dia"))
        : null,
      rotina_alimentar: formData.get("rotina_alimentar") || null,
      consumo_agua: formData.get("consumo_agua") || null,
      horas_sono: formData.get("horas_sono") || null,
      qualidade_sono: formData.get("qualidade_sono") || null,
      suplementos: formData.get("suplementos") || null,
      cirurgias: formData.get("cirurgias") || null,
      dores_lesoes: formData.get("dores_lesoes") || null,
      fuma: formData.get("fuma") || null,
      bebe: formData.get("bebe") || null,
      restricao_medica: formData.get("restricao_medica") || null,
      medicamentos: formData.get("medicamentos") || null,
      alergia: formData.get("alergia") || null,
      problema_coracao: formData.get("problema_coracao") || null,
      diabetes: formData.get("diabetes") || null,
      problema_respiratorio: formData.get("problema_respiratorio") || null,
      pressao_arterial: formData.get("pressao_arterial") || null,
      peso_atual: formData.get("peso_atual")
        ? Number(formData.get("peso_atual"))
        : null,
      altura: formData.get("altura") ? Number(formData.get("altura")) : null,
      peso_desejado: formData.get("peso_desejado")
        ? Number(formData.get("peso_desejado"))
        : null,
      crianca_obesa: formData.get("crianca_obesa") === "sim",
      exercicio_atual: formData.get("exercicio_atual") || null,
      frequencia_exercicio: formData.get("frequencia_exercicio") || null,
      compromisso_treinos: formData.get("compromisso_treinos")
        ? Number(formData.get("compromisso_treinos"))
        : null,
      tempo_disponivel: formData.get("tempo_disponivel") || null,
      local_treino: formData.get("local_treino") || null,
      materiais_disponiveis: formData.get("materiais_disponiveis") || null,
      preferencia_exercicio: formData.get("preferencia_exercicio") || null,
      exercicios_gosta: formData.get("exercicios_gosta") || null,
      exercicios_odeia: formData.get("exercicios_odeia") || null,
      observacoes_extras: formData.get("observacoes_extras") || null,
    };

    try {
      if (existingAnamnese) {
        const { error } = await supabase
          .from("anamnese_inicial")
          .update(anamneseData)
          .eq("profile_id", profileId)
          .eq("personal_id", personalId);

        if (error) throw error;
        toast({ title: "✅ Anamnese atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from("anamnese_inicial")
          .insert(anamneseData);

        if (error) throw error;
        toast({
          title: "✅ Anamnese concluída com sucesso!",
          description: "Agora você já pode acessar seus treinos.",
        });
      }

      if (onComplete) onComplete();
    } catch (error: any) {
      console.error("Erro ao salvar anamnese:", error);
      toast({
        title: "Erro ao salvar anamnese",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">
                    📋 Etapa 1 de {totalSteps}: Dados Pessoais e Objetivos
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    Vamos começar conhecendo você melhor. Suas respostas são
                    confidenciais e essenciais para um treino personalizado.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_nascimento">📅 Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  name="data_nascimento"
                  type="date"
                  defaultValue={existingAnamnese?.data_nascimento}
                />
              </div>
              <div>
                <Label htmlFor="profissao">💼 Profissão</Label>
                <Input
                  id="profissao"
                  name="profissao"
                  placeholder="Ex: Advogado, Professor..."
                  defaultValue={existingAnamnese?.profissao}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="objetivos">
                🎯 Quais são seus objetivos? Diga pelo menos dois *
              </Label>
              <Textarea
                id="objetivos"
                name="objetivos"
                placeholder="Ex: Ganhar massa muscular, perder gordura, melhorar condicionamento físico..."
                rows={3}
                required
                defaultValue={existingAnamnese?.objetivos}
              />
            </div>

            <div>
              <Label htmlFor="rotina">
                🕑 Como funciona sua rotina (trabalho, filhos, etc)?
              </Label>
              <Textarea
                id="rotina"
                name="rotina"
                placeholder="Descreva sua rotina diária..."
                rows={3}
                defaultValue={existingAnamnese?.rotina}
              />
            </div>

            <div>
              <Label htmlFor="experiencia_online">
                💻 Já fez algum acompanhamento online com algum treinador antes?
                Conte sua experiência
              </Label>
              <Textarea
                id="experiencia_online"
                name="experiencia_online"
                placeholder="Sim/Não e como foi..."
                rows={3}
                defaultValue={existingAnamnese?.experiencia_online}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">
                    🍎 Etapa 2 de {totalSteps}: Nutrição e Hábitos
                  </p>
                  <p className="text-sm text-green-800 mt-1">
                    Entender sua alimentação e sono é fundamental para os
                    resultados.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="acompanhamento_nutricional">
                🍎 Faz acompanhamento nutricional? Com quem?
              </Label>
              <Input
                id="acompanhamento_nutricional"
                name="acompanhamento_nutricional"
                placeholder="Ex: Sim, com a nutricionista Maria Silva"
                defaultValue={existingAnamnese?.acompanhamento_nutricional}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="refeicoes_dia">
                  🍴 Quantas refeições faz por dia?
                </Label>
                <Input
                  id="refeicoes_dia"
                  name="refeicoes_dia"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Ex: 4"
                  defaultValue={existingAnamnese?.refeicoes_dia}
                />
              </div>
              <div>
                <Label htmlFor="consumo_agua">
                  🍶 Toma bastante água/líquidos? Quantos litros?
                </Label>
                <Input
                  id="consumo_agua"
                  name="consumo_agua"
                  placeholder="Ex: 2 litros de água"
                  defaultValue={existingAnamnese?.consumo_agua}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rotina_alimentar">
                🍴 Descreva sua rotina alimentar (o que come, quanto e que
                horas)
              </Label>
              <Textarea
                id="rotina_alimentar"
                name="rotina_alimentar"
                placeholder="Ex: Café da manhã às 7h - pão integral com ovo..."
                rows={4}
                defaultValue={existingAnamnese?.rotina_alimentar}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="horas_sono">
                  💤 Dorme quantas horas por dia?
                </Label>
                <Input
                  id="horas_sono"
                  name="horas_sono"
                  placeholder="Ex: 7 horas"
                  defaultValue={existingAnamnese?.horas_sono}
                />
              </div>
              <div>
                <Label htmlFor="qualidade_sono">
                  💤 Qual a qualidade desse sono?
                </Label>
                <Input
                  id="qualidade_sono"
                  name="qualidade_sono"
                  placeholder="Ex: Boa, Ruim, Acordo durante a noite..."
                  defaultValue={existingAnamnese?.qualidade_sono}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="suplementos">💊 Toma algum suplemento?</Label>
              <Input
                id="suplementos"
                name="suplementos"
                placeholder="Ex: Whey Protein, Creatina..."
                defaultValue={existingAnamnese?.suplementos}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900">
                    🏥 Etapa 3 de {totalSteps}: Histórico de Saúde
                  </p>
                  <p className="text-sm text-red-800 mt-1">
                    Essas informações são cruciais para sua segurança durante os
                    treinos.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="cirurgias">🏥 Já fez alguma cirurgia?</Label>
              <Textarea
                id="cirurgias"
                name="cirurgias"
                placeholder="Descreva quais cirurgias e quando..."
                rows={2}
                defaultValue={existingAnamnese?.cirurgias}
              />
            </div>

            <div>
              <Label htmlFor="dores_lesoes">
                ⚠️ Possui alguma dor ou lesão?
              </Label>
              <Textarea
                id="dores_lesoes"
                name="dores_lesoes"
                placeholder="Descreva dores crônicas, lesões antigas ou atuais..."
                rows={2}
                defaultValue={existingAnamnese?.dores_lesoes}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fuma">🚬 Fuma? Quanto?</Label>
                <Input
                  id="fuma"
                  name="fuma"
                  placeholder="Ex: Não / Sim, 10 cigarros por dia"
                  defaultValue={existingAnamnese?.fuma}
                />
              </div>
              <div>
                <Label htmlFor="bebe">
                  🍺 Bebe? Quanto e com que frequência?
                </Label>
                <Input
                  id="bebe"
                  name="bebe"
                  placeholder="Ex: Socialmente / Finais de semana"
                  defaultValue={existingAnamnese?.bebe}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="restricao_medica">‼️ Restrição Médica</Label>
              <Textarea
                id="restricao_medica"
                name="restricao_medica"
                placeholder="Alguma restrição médica para atividade física?"
                rows={2}
                defaultValue={existingAnamnese?.restricao_medica}
              />
            </div>

            <div>
              <Label htmlFor="medicamentos">
                ‼️ Faz uso de algum medicamento?
              </Label>
              <Textarea
                id="medicamentos"
                name="medicamentos"
                placeholder="Liste os medicamentos de uso contínuo..."
                rows={2}
                defaultValue={existingAnamnese?.medicamentos}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-purple-900">
                    🩺 Etapa 4 de {totalSteps}: Condições de Saúde
                  </p>
                  <p className="text-sm text-purple-800 mt-1">
                    Informe sobre condições específicas de saúde.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="alergia">🤧 Algum problema de alergia?</Label>
              <Input
                id="alergia"
                name="alergia"
                placeholder="Ex: Não / Sim, alergia a..."
                defaultValue={existingAnamnese?.alergia}
              />
            </div>

            <div>
              <Label htmlFor="problema_coracao">
                🫀 Algum problema de coração?
              </Label>
              <Input
                id="problema_coracao"
                name="problema_coracao"
                placeholder="Ex: Não / Sim, especifique..."
                defaultValue={existingAnamnese?.problema_coracao}
              />
            </div>

            <div>
              <Label htmlFor="diabetes">💊 Diabetes?</Label>
              <Input
                id="diabetes"
                name="diabetes"
                placeholder="Ex: Não / Sim, tipo 1 ou 2"
                defaultValue={existingAnamnese?.diabetes}
              />
            </div>

            <div>
              <Label htmlFor="problema_respiratorio">
                🫁 Problema pulmonar ou respiratório?
              </Label>
              <Input
                id="problema_respiratorio"
                name="problema_respiratorio"
                placeholder="Ex: Asma, bronquite..."
                defaultValue={existingAnamnese?.problema_respiratorio}
              />
            </div>

            <div>
              <Label htmlFor="pressao_arterial">
                🩺 Pressão alta ou baixa?
              </Label>
              <Input
                id="pressao_arterial"
                name="pressao_arterial"
                placeholder="Ex: Normal / Alta / Baixa"
                defaultValue={existingAnamnese?.pressao_arterial}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-900">
                    ⚖️ Etapa 5 de {totalSteps}: Dados Físicos e Histórico de
                    Exercícios
                  </p>
                  <p className="text-sm text-orange-800 mt-1">
                    Informações sobre seu corpo e experiência com exercícios.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="peso_atual">⚖️ Qual seu peso atual? (kg)</Label>
                <Input
                  id="peso_atual"
                  name="peso_atual"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 75.5"
                  defaultValue={existingAnamnese?.peso_atual}
                />
              </div>
              <div>
                <Label htmlFor="altura">📏 Qual sua altura? (m)</Label>
                <Input
                  id="altura"
                  name="altura"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 1.75"
                  defaultValue={existingAnamnese?.altura}
                />
              </div>
              <div>
                <Label htmlFor="peso_desejado">
                  🤔 Quanto gostaria de pesar? (kg)
                </Label>
                <Input
                  id="peso_desejado"
                  name="peso_desejado"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 70"
                  defaultValue={existingAnamnese?.peso_desejado}
                />
              </div>
            </div>

            <div>
              <Label>🍔 Foi uma criança obesa?</Label>
              <RadioGroup
                name="crianca_obesa"
                defaultValue={existingAnamnese?.crianca_obesa ? "sim" : "nao"}
              >
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="crianca_obesa_sim" />
                    <Label
                      htmlFor="crianca_obesa_sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="crianca_obesa_nao" />
                    <Label
                      htmlFor="crianca_obesa_nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="exercicio_atual">
                🏃 Você está praticando algum exercício? Qual? Em qual
                frequência?
              </Label>
              <Textarea
                id="exercicio_atual"
                name="exercicio_atual"
                placeholder="Ex: Sim, caminhada 3x por semana / Não, sedentário..."
                rows={2}
                defaultValue={existingAnamnese?.exercicio_atual}
              />
            </div>

            <div>
              <Label htmlFor="frequencia_exercicio">
                📅 Se compromete a fazer quantos treinos por semana?
              </Label>
              <Input
                id="compromisso_treinos"
                name="compromisso_treinos"
                type="number"
                min="1"
                max="7"
                placeholder="Ex: 4"
                defaultValue={existingAnamnese?.compromisso_treinos}
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-cyan-900">
                    🏋️ Etapa 6 de {totalSteps}: Preferências de Treino
                  </p>
                  <p className="text-sm text-cyan-800 mt-1">
                    Última etapa! Vamos entender suas preferências para montar o
                    treino ideal.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="tempo_disponivel">
                ⏰ Quanto tempo disponível para treinar? Mais de uma vez ao dia?
              </Label>
              <Input
                id="tempo_disponivel"
                name="tempo_disponivel"
                placeholder="Ex: 1 hora por dia / 45 minutos, 2x ao dia"
                defaultValue={existingAnamnese?.tempo_disponivel}
              />
            </div>

            <div>
              <Label htmlFor="local_treino">
                🏋 Onde pretende realizar sua rotina de exercícios?
              </Label>
              <Input
                id="local_treino"
                name="local_treino"
                placeholder="Ex: Academia, Casa, Parque..."
                defaultValue={existingAnamnese?.local_treino}
              />
            </div>

            <div>
              <Label htmlFor="materiais_disponiveis">
                🚴‍♂️ Possui algum material que possa auxiliar nos treinos?
              </Label>
              <Textarea
                id="materiais_disponiveis"
                name="materiais_disponiveis"
                placeholder="Ex: Halteres, faixas elásticas, esteira..."
                rows={2}
                defaultValue={existingAnamnese?.materiais_disponiveis}
              />
            </div>

            <div>
              <Label htmlFor="preferencia_exercicio">
                🏋‍♂️ Prefere exercícios tradicionais de musculação, funcionais
                ou aeróbicos?
              </Label>
              <Input
                id="preferencia_exercicio"
                name="preferencia_exercicio"
                placeholder="Ex: Musculação e aeróbicos"
                defaultValue={existingAnamnese?.preferencia_exercicio}
              />
            </div>

            <div>
              <Label htmlFor="exercicios_gosta">
                😍 Quais exercícios GOSTA de fazer?
              </Label>
              <Textarea
                id="exercicios_gosta"
                name="exercicios_gosta"
                placeholder="Ex: Agachamento, corrida, bicicleta..."
                rows={2}
                defaultValue={existingAnamnese?.exercicios_gosta}
              />
            </div>

            <div>
              <Label htmlFor="exercicios_odeia">
                😤 Quais exercícios ODEIA fazer?
              </Label>
              <Textarea
                id="exercicios_odeia"
                name="exercicios_odeia"
                placeholder="Ex: Burpee, corrida, flexão..."
                rows={2}
                defaultValue={existingAnamnese?.exercicios_odeia}
              />
            </div>

            <div>
              <Label htmlFor="observacoes_extras">
                💬 Existe algo que eu não perguntei e que você gostaria de
                mencionar?
              </Label>
              <Textarea
                id="observacoes_extras"
                name="observacoes_extras"
                placeholder="Qualquer informação adicional que considere importante..."
                rows={3}
                defaultValue={existingAnamnese?.observacoes_extras}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
          >
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              {existingAnamnese ? "📝 Editar Anamnese" : "📋 Anamnese Inicial"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {existingAnamnese
                ? "Atualize suas informações quando necessário"
                : "Preencha este questionário para começarmos seu acompanhamento"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderStep()}

          <div className="flex justify-between items-center pt-6">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((prev) => prev - 1)}
              >
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <Button
                type="button"
                onClick={() => setStep((prev) => prev + 1)}
                style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
              >
                Próximo
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
              >
                {loading ? "Salvando..." : "Concluir"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
