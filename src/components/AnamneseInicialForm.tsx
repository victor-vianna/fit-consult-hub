import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle2, AlertCircle } from "lucide-react";
import { getAnamneseReferenceDateValue } from "@/utils/anamneseDate";

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

type ExistingAnamneseData = AnamneseData & {
  id?: string;
  profile_id?: string;
  personal_id?: string;
  preenchida_em?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  termoAceito?: boolean;
};

type CachedAnamneseDraft = {
  cachedAt: string;
  sourceUpdatedAt: string | null;
  values: AnamneseFormValues;
};

type AnamneseValue = string | number | boolean | null | undefined;
type AnamneseFormValues = Partial<AnamneseData> &
  Record<string, AnamneseValue> & {
    termoAceito?: boolean;
  };
type AnamneseInsert =
  Database["public"]["Tables"]["anamnese_inicial"]["Insert"];
type AnamneseUpdate =
  Database["public"]["Tables"]["anamnese_inicial"]["Update"];

const ANAMNESE_CACHE_PREFIX = "fit-consult-hub:anamnese-draft";

const ANAMNESE_FORM_FIELDS = [
  "data_nascimento",
  "profissao",
  "objetivos",
  "rotina",
  "experiencia_online",
  "acompanhamento_nutricional",
  "nutri_nome",
  "refeicoes_dia",
  "rotina_alimentar",
  "consumo_agua",
  "horas_sono",
  "qualidade_sono",
  "suplementos",
  "cirurgias",
  "dores_lesoes",
  "fuma",
  "bebe",
  "restricao_medica",
  "medicamentos",
  "alergia",
  "problema_coracao",
  "diabetes",
  "problema_respiratorio",
  "pressao_arterial",
  "peso_atual",
  "altura",
  "peso_desejado",
  "crianca_obesa",
  "exercicio_atual",
  "frequencia_exercicio",
  "compromisso_treinos",
  "tempo_disponivel",
  "local_treino",
  "materiais_disponiveis",
  "preferencia_exercicio",
  "exercicios_gosta",
  "exercicios_odeia",
  "observacoes_extras",
] as const;

function getAnamneseCacheKey(profileId: string, personalId: string) {
  return `${ANAMNESE_CACHE_PREFIX}:${profileId}:${personalId}`;
}

function pickAnamneseFormValues(
  values: Partial<AnamneseFormValues> | null | undefined
) {
  const picked: AnamneseFormValues = {};
  if (!values) return picked;

  ANAMNESE_FORM_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(values, field)) {
      picked[field] = values[field];
    }
  });

  return picked;
}

function getTimestamp(value?: string | null) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function readCachedAnamnese(cacheKey: string): CachedAnamneseDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as Partial<CachedAnamneseDraft>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.values ||
      typeof parsed.values !== "object"
    ) {
      return null;
    }

    return {
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : "",
      sourceUpdatedAt:
        typeof parsed.sourceUpdatedAt === "string"
          ? parsed.sourceUpdatedAt
          : null,
      values: parsed.values,
    };
  } catch (error) {
    console.warn("Nao foi possivel ler o cache da anamnese:", error);
    return null;
  }
}

function writeCachedAnamnese(
  cacheKey: string,
  values: Partial<AnamneseFormValues>,
  sourceUpdatedAt: string | null
) {
  if (typeof window === "undefined") return;

  const cachedValues = pickAnamneseFormValues(values);
  if (Object.keys(cachedValues).length === 0) return;

  try {
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        sourceUpdatedAt,
        values: cachedValues,
      } satisfies CachedAnamneseDraft)
    );
  } catch (error) {
    console.warn("Nao foi possivel salvar o cache da anamnese:", error);
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function AnamneseInicialForm({
  profileId,
  personalId,
  onComplete,
  themeColor,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingAnamnese, setExistingAnamnese] =
    useState<ExistingAnamneseData | null>(null);
  const [cacheHydrated, setCacheHydrated] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // form values controlados
  const [formValues, setFormValues] = useState<AnamneseFormValues>({});

  // --- Effects (fora de qualquer função) ---
  useEffect(() => {
    setCacheHydrated(false);
    setStep(1);
    checkExistingAnamnese();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, personalId]);

  useEffect(() => {
    if (!cacheHydrated || !profileId || !personalId) return;

    writeCachedAnamnese(
      getAnamneseCacheKey(profileId, personalId),
      formValues,
      getAnamneseReferenceDateValue(existingAnamnese)
    );
  }, [cacheHydrated, existingAnamnese, formValues, profileId, personalId]);

  // --- Helpers / handlers ---
  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // Bloqueia Enter em inputs (não textarea) e avança para a próxima etapa
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLElement | null;
      if (target.tagName !== "TEXTAREA" && target.tagName !== "BUTTON") {
        e.preventDefault();
        nextStep(); // opcional: avançar ao pressionar Enter
      }
    }
  };

  async function checkExistingAnamnese() {
    if (!profileId || !personalId) return;

    const cacheKey = getAnamneseCacheKey(profileId, personalId);

    try {
      const { data, error } = await supabase
        .from("anamnese_inicial")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .maybeSingle();

      if (error) throw error;

      const existingData = (data ?? null) as ExistingAnamneseData | null;
      const savedValues = pickAnamneseFormValues(existingData);
      const sourceUpdatedAt = getAnamneseReferenceDateValue(existingData);
      const cached = readCachedAnamnese(cacheKey);
      const shouldUseCache =
        !!cached &&
        (!existingData ||
          getTimestamp(cached.cachedAt) >= getTimestamp(sourceUpdatedAt));

      setExistingAnamnese(existingData);
      setFormValues({
        ...(shouldUseCache ? { ...savedValues, ...cached.values } : savedValues),
        termoAceito: false,
      });
    } catch (error: unknown) {
      console.error("Erro ao verificar anamnese:", error);
      const cached = readCachedAnamnese(cacheKey);
      if (cached) {
        setFormValues({ ...cached.values, termoAceito: false });
      }
    } finally {
      setCacheHydrated(true);
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? value === "" || value === null
            ? null
            : Number(value)
          : value,
    }));
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value === "sim",
    }));
  };

  const normalizeForSave = (obj: Partial<AnamneseFormValues>) => {
    const normalized: Record<string, string | number | boolean | null> = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined) {
        normalized[k] = v === "" ? null : v;
      }
    });
    return normalized;
  };

  // Validação dos campos obrigatórios de cada etapa
  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        // Etapa 1: apenas 'objetivos' é obrigatório
        if (!formValues.objetivos || formValues.objetivos.trim() === "") {
          toast({
            title: "Campo obrigatório",
            description:
              "Por favor, preencha seus objetivos antes de continuar.",
            variant: "destructive",
          });
          return false;
        }
        return true;

      case 2:
      case 3:
      case 4:
      case 5:
        // Etapas 2-5: não há campos obrigatórios específicos
        return true;

      case 6:
        // Etapa 6: termo de consentimento obrigatório
        if (!formValues.termoAceito) {
          toast({
            title: "Termo obrigatório",
            description: "Você precisa aceitar o termo de responsabilidade para continuar.",
            variant: "destructive",
          });
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // proteção: não salvar se não estivermos na última etapa
    if (step < totalSteps) {
      toast({
        title: "Atenção",
        description: "Complete todas as etapas antes de finalizar.",
        variant: "destructive",
      });
      return;
    }

    // Valida a última etapa também
    if (!validateStep(step)) {
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();
      const formDataForSave = normalizeForSave(
        pickAnamneseFormValues(formValues)
      ) as Partial<AnamneseInsert>;
      const anamneseData: AnamneseInsert = {
        ...formDataForSave,
        objetivos: (formValues.objetivos ?? "") as string,
        profile_id: profileId,
        personal_id: personalId,
        preenchida_em: now,
        updated_at: now,
        termoAceito: formValues.termoAceito === true,
      };

      if (existingAnamnese) {
        const { error } = await supabase
          .from("anamnese_inicial")
          .update(anamneseData as AnamneseUpdate)
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

      writeCachedAnamnese(
        getAnamneseCacheKey(profileId, personalId),
        anamneseData,
        now
      );

      if (onComplete) onComplete();
    } catch (error: unknown) {
      console.error("Erro ao salvar anamnese:", error);
      toast({
        title: "Erro ao salvar anamnese",
        description: getErrorMessage(error),
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
                  value={formValues.data_nascimento ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="profissao">💼 Profissão</Label>
                <Input
                  id="profissao"
                  name="profissao"
                  placeholder="Ex: Advogado, Professor..."
                  value={formValues.profissao ?? ""}
                  onChange={handleChange}
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
                value={formValues.objetivos ?? ""}
                onChange={handleChange}
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
                value={formValues.rotina ?? ""}
                onChange={handleChange}
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
                value={formValues.experiencia_online ?? ""}
                onChange={handleChange}
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
                value={formValues.acompanhamento_nutricional ?? ""}
                onChange={handleChange}
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
                  value={
                    formValues.refeicoes_dia !== undefined &&
                    formValues.refeicoes_dia !== null
                      ? formValues.refeicoes_dia
                      : ""
                  }
                  onChange={handleChange}
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
                  value={formValues.consumo_agua ?? ""}
                  onChange={handleChange}
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
                value={formValues.rotina_alimentar ?? ""}
                onChange={handleChange}
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
                  value={formValues.horas_sono ?? ""}
                  onChange={handleChange}
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
                  value={formValues.qualidade_sono ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="suplementos">💊 Toma algum suplemento?</Label>
              <Input
                id="suplementos"
                name="suplementos"
                placeholder="Ex: Whey Protein, Creatina..."
                value={formValues.suplementos ?? ""}
                onChange={handleChange}
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
                value={formValues.cirurgias ?? ""}
                onChange={handleChange}
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
                value={formValues.dores_lesoes ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fuma">🚬 Fuma? Quanto?</Label>
                <Input
                  id="fuma"
                  name="fuma"
                  placeholder="Ex: Não / Sim, 10 cigarros por dia"
                  value={formValues.fuma ?? ""}
                  onChange={handleChange}
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
                  value={formValues.bebe ?? ""}
                  onChange={handleChange}
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
                value={formValues.restricao_medica ?? ""}
                onChange={handleChange}
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
                value={formValues.medicamentos ?? ""}
                onChange={handleChange}
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
                value={formValues.alergia ?? ""}
                onChange={handleChange}
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
                value={formValues.problema_coracao ?? ""}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="diabetes">💊 Diabetes?</Label>
              <Input
                id="diabetes"
                name="diabetes"
                placeholder="Ex: Não / Sim, tipo 1 ou 2"
                value={formValues.diabetes ?? ""}
                onChange={handleChange}
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
                value={formValues.problema_respiratorio ?? ""}
                onChange={handleChange}
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
                value={formValues.pressao_arterial ?? ""}
                onChange={handleChange}
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
                <Label htmlFor="peso_atual">⚖️ Peso atual (kg)</Label>
                <Input
                  id="peso_atual"
                  name="peso_atual"
                  type="number"
                  step="0.1"
                  value={
                    formValues.peso_atual !== undefined &&
                    formValues.peso_atual !== null
                      ? formValues.peso_atual
                      : ""
                  }
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="altura">📏 Altura (m)</Label>
                <Input
                  id="altura"
                  name="altura"
                  type="number"
                  step="0.01"
                  value={
                    formValues.altura !== undefined &&
                    formValues.altura !== null
                      ? formValues.altura
                      : ""
                  }
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="peso_desejado">
                  🏆 Quanto gostaria de pesar? (kg)
                </Label>
                <Input
                  id="peso_desejado"
                  name="peso_desejado"
                  type="number"
                  step="0.1"
                  value={
                    formValues.peso_desejado !== undefined &&
                    formValues.peso_desejado !== null
                      ? formValues.peso_desejado
                      : ""
                  }
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <Label>🍔 Foi uma criança obesa?</Label>
              <RadioGroup
                value={formValues.crianca_obesa ? "sim" : "nao"}
                onValueChange={(value) =>
                  handleRadioChange("crianca_obesa", value)
                }
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
                value={formValues.exercicio_atual ?? ""}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="compromisso_treinos">
                📅 Se compromete a fazer quantos treinos por semana?
              </Label>
              <Input
                id="compromisso_treinos"
                name="compromisso_treinos"
                type="number"
                min="1"
                max="7"
                placeholder="Ex: 4"
                value={
                  formValues.compromisso_treinos !== undefined &&
                  formValues.compromisso_treinos !== null
                    ? formValues.compromisso_treinos
                    : ""
                }
                onChange={handleChange}
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
                value={formValues.tempo_disponivel ?? ""}
                onChange={handleChange}
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
                value={formValues.local_treino ?? ""}
                onChange={handleChange}
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
                value={formValues.materiais_disponiveis ?? ""}
                onChange={handleChange}
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
                value={formValues.preferencia_exercicio ?? ""}
                onChange={handleChange}
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
                value={formValues.exercicios_gosta ?? ""}
                onChange={handleChange}
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
                value={formValues.exercicios_odeia ?? ""}
                onChange={handleChange}
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
                value={formValues.observacoes_extras ?? ""}
                onChange={handleChange}
              />
            </div>

            {/* Termo de Consentimento */}
            <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 mt-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="termoAceito"
                  checked={formValues.termoAceito === true}
                  onCheckedChange={(checked) =>
                    setFormValues((prev) => ({ ...prev, termoAceito: checked === true }))
                  }
                  className="mt-1"
                />
                <label
                  htmlFor="termoAceito"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  <strong>Declaro que as informações fornecidas são verdadeiras</strong> e assumo total responsabilidade pelos dados informados. Autorizo o uso dessas informações para elaboração do meu programa de treinamento personalizado.
                </label>
              </div>
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
        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="space-y-6"
        >
          {renderStep()}

          <div className="flex justify-between items-center pt-6">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={prevStep}>
                ← Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < totalSteps && (
              <Button
                type="button"
                onClick={nextStep}
                style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
              >
                Próximo →
              </Button>
            )}

            {step === totalSteps && (
              <Button
                type="submit"
                disabled={loading || !formValues.termoAceito}
                style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
                className={!formValues.termoAceito ? "opacity-50" : ""}
              >
                {loading ? "Salvando..." : "✅ Concluir"}
              </Button>
            )}
          </div>

          {/* Indicador de progresso */}
          <div className="flex justify-center items-center gap-2 pt-4">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index + 1 === step ? "w-8" : "w-2"
                } ${index + 1 <= step ? "bg-primary" : "bg-muted"}`}
                style={
                  index + 1 <= step
                    ? { backgroundColor: themeColor || "hsl(var(--primary))" }
                    : {}
                }
              />
            ))}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
