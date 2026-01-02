// CheckinSemanalForm.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Props {
  profileId: string;
  personalId: string;
  onComplete?: () => void;
  themeColor?: string;
  isModal?: boolean;
}

interface CheckinExistente {
  id: string;
  peso_atual?: number;
  nota_empenho: number;
  justificativa_empenho?: string;
  nota_alimentacao: number;
  justificativa_alimentacao?: string;
  nota_sono: number;
  justificativa_sono?: string;
  dores_corpo?: string;
  estado_emocional?: string;
  saude_geral: number;
  comentario_saude?: string;
  qualidade_vida: number;
  nivel_dificuldade: number;
  mudanca_rotina?: string;
  semana_planejamento?: string;
  duvidas?: string;
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

export function CheckinSemanalForm({
  profileId,
  personalId,
  onComplete,
  themeColor,
  isModal = false,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkinExistente, setCheckinExistente] =
    useState<CheckinExistente | null>(null);
  const [personalName, setPersonalName] = useState<string>("");

  const [notaEmpenho, setNotaEmpenho] = useState([5]);
  const [notaAlimentacao, setNotaAlimentacao] = useState([5]);
  const [notaSono, setNotaSono] = useState([5]);
  const [saudeGeral, setSaudeGeral] = useState([5]);
  const [qualidadeVida, setQualidadeVida] = useState([5]);
  const [nivelDificuldade, setNivelDificuldade] = useState([5]);
  const [podeMostrarCheckin, setPodeMostrarCheckin] = useState(false);
  const [verificandoPrimeiraVez, setVerificandoPrimeiraVez] = useState(true);

  const [formData, setFormData] = useState({
    peso_atual: "",
    justificativa_empenho: "",
    justificativa_alimentacao: "",
    justificativa_sono: "",
    dores_corpo: "",
    estado_emocional: "",
    comentario_saude: "",
    mudanca_rotina: "",
    semana_planejamento: "",
    duvidas: "",
  });

  const today = new Date();
  const semanaAtual = getWeekNumber(today);
  const anoAtual = today.getFullYear();
  const inicioSemana = getStartOfWeek(today);
  const fimSemana = getEndOfWeek(today);

  useEffect(() => {
    verificarSePrimeiraVez();
  }, [profileId, personalId]);

  const verificarSePrimeiraVez = async () => {
    try {
      const { data: anamnese, error } = await supabase
        .from("anamnese_inicial")
        .select("created_at")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .single();

      if (error || !anamnese) {
        setPodeMostrarCheckin(false);
        setVerificandoPrimeiraVez(false);
        return;
      }

      const dataAnamnese = new Date(anamnese.created_at);
      const hoje = new Date();
      const diasDesdeAnamnese = Math.floor(
        (hoje.getTime() - dataAnamnese.getTime()) / (1000 * 60 * 60 * 24)
      );

      setPodeMostrarCheckin(diasDesdeAnamnese >= 7);
      setVerificandoPrimeiraVez(false);
    } catch (error) {
      console.error("Erro ao verificar primeira vez:", error);
      setPodeMostrarCheckin(false);
      setVerificandoPrimeiraVez(false);
    }
  };

  useEffect(() => {
    fetchPersonalName();
    checkExistingCheckin();
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

  const checkExistingCheckin = async () => {
    try {
      const { data, error } = await supabase
        .from("checkins_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .eq("ano", anoAtual)
        .eq("numero_semana", semanaAtual)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setCheckinExistente(data);
        setNotaEmpenho([data.nota_empenho]);
        setNotaAlimentacao([data.nota_alimentacao]);
        setNotaSono([data.nota_sono]);
        setSaudeGeral([data.saude_geral]);
        setQualidadeVida([data.qualidade_vida]);
        setNivelDificuldade([data.nivel_dificuldade]);
        setFormData({
          peso_atual: data.peso_atual?.toString() || "",
          justificativa_empenho: data.justificativa_empenho || "",
          justificativa_alimentacao: data.justificativa_alimentacao || "",
          justificativa_sono: data.justificativa_sono || "",
          dores_corpo: data.dores_corpo || "",
          estado_emocional: data.estado_emocional || "",
          comentario_saude: data.comentario_saude || "",
          mudanca_rotina: data.mudanca_rotina || "",
          semana_planejamento: data.semana_planejamento || "",
          duvidas: data.duvidas || "",
        });
      }
    } catch (error: any) {
      console.error("Erro ao verificar check-in:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    const checkinData = {
      profile_id: profileId,
      personal_id: personalId,
      ano: anoAtual,
      numero_semana: semanaAtual,
      data_inicio: format(inicioSemana, "yyyy-MM-dd"),
      data_fim: format(fimSemana, "yyyy-MM-dd"),
      peso_atual: formData.peso_atual ? Number(formData.peso_atual) : null,
      nota_empenho: notaEmpenho[0],
      justificativa_empenho: formData.justificativa_empenho,
      nota_alimentacao: notaAlimentacao[0],
      justificativa_alimentacao: formData.justificativa_alimentacao,
      nota_sono: notaSono[0],
      justificativa_sono: formData.justificativa_sono,
      dores_corpo: formData.dores_corpo,
      estado_emocional: formData.estado_emocional,
      saude_geral: saudeGeral[0],
      comentario_saude: formData.comentario_saude,
      qualidade_vida: qualidadeVida[0],
      nivel_dificuldade: nivelDificuldade[0],
      mudanca_rotina: formData.mudanca_rotina,
      semana_planejamento: formData.semana_planejamento,
      duvidas: formData.duvidas,
    };

    try {
      if (checkinExistente) {
        const { error } = await supabase
          .from("checkins_semanais")
          .update(checkinData)
          .eq("id", checkinExistente.id);

        if (error) throw error;
        toast({
          title: "✅ Check-in atualizado!",
          description: "Suas respostas foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("checkins_semanais")
          .insert(checkinData);

        if (error) throw error;
        toast({
          title: "✅ Check-in concluído!",
          description:
            "Obrigado pelo seu feedback. Seus treinos estão liberados!",
        });
      }

      if (onComplete) onComplete();
    } catch (error: any) {
      console.error("Erro ao salvar check-in:", error);
      toast({
        title: "Erro ao salvar check-in",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCorNota = (nota: number) => {
    if (nota <= 4) return "text-red-600";
    if (nota <= 7) return "text-yellow-600";
    return "text-green-600";
  };

  const getEmojiNota = (nota: number) => {
    if (nota <= 4) return "😞";
    if (nota <= 7) return "😐";
    return "😊";
  };

  if (verificandoPrimeiraVez) {
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
          <p className="text-muted-foreground">Verificando...</p>
        </div>
      </div>
    );
  }

  if (!podeMostrarCheckin) {
    return (
      <Card className="border-2 shadow-md">
        <CardContent className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Check-in ainda não disponível
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            O check-in semanal estará disponível após você completar sua
            primeira semana de treino. Continue firme nos treinos! 💪
          </p>
          {isModal && onComplete && (
            <Button onClick={onComplete} variant="outline" className="mt-4">
              Fechar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 shadow-lg ${isModal ? "" : ""}`}>
      <div
        className="h-2"
        style={{
          background: `linear-gradient(90deg, ${
            themeColor || "hsl(var(--primary))"
          }, ${themeColor || "hsl(var(--primary))"}80)`,
        }}
      />
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
          >
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl md:text-2xl">
              {checkinExistente
                ? "📝 Editar Check-in Semanal"
                : "📋 Check-in Semanal"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Semana {semanaAtual} de {anoAtual} (
              {format(inicioSemana, "dd/MM")} - {format(fimSemana, "dd/MM")})
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {!isModal && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">
                  💪 Por que fazer o check-in semanal?
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  Seu feedback ajuda {personalName} a ajustar seus treinos e
                  garantir que você está progredindo de forma saudável e segura.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <Label htmlFor="peso_atual">⚖️ Peso Atual (kg)</Label>
            <Input
              id="peso_atual"
              type="number"
              step="0.1"
              placeholder="Ex: 75.5"
              value={formData.peso_atual}
              onChange={(e) => handleInputChange("peso_atual", e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                💪 Que nota você daria para seu empenho nos treinos?
              </Label>
              <span
                className={`text-2xl font-bold ${getCorNota(notaEmpenho[0])}`}
              >
                {notaEmpenho[0]} {getEmojiNota(notaEmpenho[0])}
              </span>
            </div>
            <Slider
              value={notaEmpenho}
              onValueChange={setNotaEmpenho}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 - Péssimo</span>
              <span>10 - Excelente</span>
            </div>
            <Textarea
              placeholder="Justifique sua nota..."
              rows={2}
              value={formData.justificativa_empenho}
              onChange={(e) =>
                handleInputChange("justificativa_empenho", e.target.value)
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                🍎 Que nota você daria para sua alimentação essa semana?
              </Label>
              <span
                className={`text-2xl font-bold ${getCorNota(
                  notaAlimentacao[0]
                )}`}
              >
                {notaAlimentacao[0]} {getEmojiNota(notaAlimentacao[0])}
              </span>
            </div>
            <Slider
              value={notaAlimentacao}
              onValueChange={setNotaAlimentacao}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 - Péssimo</span>
              <span>10 - Excelente</span>
            </div>
            <Textarea
              placeholder="Justifique sua nota..."
              rows={2}
              value={formData.justificativa_alimentacao}
              onChange={(e) =>
                handleInputChange("justificativa_alimentacao", e.target.value)
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>💤 Que nota você daria para seu sono essa semana?</Label>
              <span className={`text-2xl font-bold ${getCorNota(notaSono[0])}`}>
                {notaSono[0]} {getEmojiNota(notaSono[0])}
              </span>
            </div>
            <Slider
              value={notaSono}
              onValueChange={setNotaSono}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 - Péssimo</span>
              <span>10 - Excelente</span>
            </div>
            <Textarea
              placeholder="Justifique sua nota..."
              rows={2}
              value={formData.justificativa_sono}
              onChange={(e) =>
                handleInputChange("justificativa_sono", e.target.value)
              }
            />
          </div>

          <div>
            <Label htmlFor="dores_corpo">
              ⚠️ Sentiu alguma dor no corpo ou nas articulações na última
              semana?
            </Label>
            <Textarea
              id="dores_corpo"
              placeholder="Descreva qualquer dor ou desconforto..."
              rows={2}
              value={formData.dores_corpo}
              onChange={(e) => handleInputChange("dores_corpo", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="estado_emocional">
              🧠 Tem se sentido preocupado, tenso, irritado, deprimido ou
              ansioso?
            </Label>
            <Textarea
              id="estado_emocional"
              placeholder="Compartilhe como você tem se sentido emocionalmente..."
              rows={2}
              value={formData.estado_emocional}
              onChange={(e) =>
                handleInputChange("estado_emocional", e.target.value)
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                🏥 Como você classificaria sua saúde (física e mental) na última
                semana?
              </Label>
              <span
                className={`text-2xl font-bold ${getCorNota(saudeGeral[0])}`}
              >
                {saudeGeral[0]} {getEmojiNota(saudeGeral[0])}
              </span>
            </div>
            <Slider
              value={saudeGeral}
              onValueChange={setSaudeGeral}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 - Péssimo</span>
              <span>10 - Ótimo</span>
            </div>
            <Textarea
              placeholder="Comente sobre sua saúde..."
              rows={2}
              value={formData.comentario_saude}
              onChange={(e) =>
                handleInputChange("comentario_saude", e.target.value)
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                ✨ Como você classificaria sua qualidade de vida na última
                semana?
              </Label>
              <span
                className={`text-2xl font-bold ${getCorNota(qualidadeVida[0])}`}
              >
                {qualidadeVida[0]} {getEmojiNota(qualidadeVida[0])}
              </span>
            </div>
            <Slider
              value={qualidadeVida}
              onValueChange={setQualidadeVida}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 - Péssimo</span>
              <span>10 - Ótimo</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                💪 Nível de dificuldade no treino (quão difícil, pesado ou
                cansativo está para você?)
              </Label>
              <span
                className={`text-2xl font-bold ${
                  nivelDificuldade[0] <= 3
                    ? "text-green-600"
                    : nivelDificuldade[0] <= 7
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {nivelDificuldade[0]}{" "}
                {nivelDificuldade[0] <= 3
                  ? "😊"
                  : nivelDificuldade[0] <= 7
                  ? "😐"
                  : "😓"}
              </span>
            </div>
            <Slider
              value={nivelDificuldade}
              onValueChange={setNivelDificuldade}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 - Muito Fácil</span>
              <span>10 - Muito Difícil</span>
            </div>
          </div>

          <div>
            <Label htmlFor="mudanca_rotina">
              📅 Alguma mudança na rotina que necessite ajuste no treino?
            </Label>
            <Textarea
              id="mudanca_rotina"
              placeholder="Ex: Vou viajar, mudei de horário no trabalho..."
              rows={2}
              value={formData.mudanca_rotina}
              onChange={(e) =>
                handleInputChange("mudanca_rotina", e.target.value)
              }
            />
          </div>

          <div>
            <Label htmlFor="semana_planejamento">
              📊 Qual semana do planejamento você está hoje?
            </Label>
            <Input
              id="semana_planejamento"
              placeholder="Ex: Semana 4 de 8"
              value={formData.semana_planejamento}
              onChange={(e) =>
                handleInputChange("semana_planejamento", e.target.value)
              }
            />
          </div>

          <div>
            <Label htmlFor="duvidas">
              ❓ Alguma dúvida sobre exercícios, movimentos, posturas ou o
              planejamento?
            </Label>
            <Textarea
              id="duvidas"
              placeholder="Escreva suas dúvidas aqui..."
              rows={3}
              value={formData.duvidas}
              onChange={(e) => handleInputChange("duvidas", e.target.value)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={loading}
            style={{ backgroundColor: themeColor }}
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                {checkinExistente ? "Atualizar Check-in" : "Concluir Check-in"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
