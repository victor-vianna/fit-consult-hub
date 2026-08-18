import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Activity,
  Heart,
  Moon,
  Utensils,
  Dumbbell,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Reply,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FeedbackEvolucaoChart } from "@/components/FeedbackEvolucaoChart";
import {
  formatDisplayDateRange,
  formatDisplayDateTime,
} from "@/utils/dateFormat";
import {
  normalizeFeedbackReplyPreview,
  queueFeedbackReplyContext,
} from "@/utils/feedbackReplyContext";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  studentName: string;
}

interface CheckinData {
  id: string;
  ano: number;
  numero_semana: number;
  data_inicio: string;
  data_fim: string;
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
  preenchido_em: string;
}

const hasValidWeight = (value?: number | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

export function CheckinsDashboard({
  profileId,
  personalId,
  themeColor,
  studentName,
}: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinData | null>(
    null
  );

  useEffect(() => {
    fetchCheckins();
  }, [profileId, personalId]);

  const fetchCheckins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("checkins_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .order("ano", { ascending: false })
        .order("numero_semana", { ascending: false });

      if (error) throw error;
      setCheckins(data || []);

      if (data && data.length > 0) {
        setSelectedCheckin((current) => {
          if (!current) return data[0];
          return data.find((item) => item.id === current.id) ?? data[0];
        });
      }
    } catch (error: any) {
      console.error("Erro ao buscar check-ins:", error);
      toast({
        title: "Erro ao carregar check-ins",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNotaColor = (nota: number) => {
    if (nota <= 4) {
      return "border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200 dark:bg-red-500/15";
    }
    if (nota <= 7) {
      return "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200 dark:bg-amber-500/15";
    }
    return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 dark:bg-emerald-500/15";
  };

  const getNotaEmoji = (nota: number) => {
    if (nota <= 4) return "😞";
    if (nota <= 7) return "😐";
    return "😊";
  };

  const calcularTendencia = (campo: keyof CheckinData, index: number) => {
    if (index >= checkins.length - 1) return null;

    const atual = checkins[index][campo] as number;
    const anterior = checkins[index + 1][campo] as number;

    if (!atual || !anterior) return null;

    const diferenca = atual - anterior;
    return diferenca;
  };

  const selectedIndex = selectedCheckin
    ? checkins.findIndex((checkin) => checkin.id === selectedCheckin.id)
    : -1;

  const getWeekLabel = (checkin: CheckinData) =>
    `Semana ${checkin.numero_semana}/${checkin.ano}`;

  const getWeekRange = (checkin: CheckinData) =>
    formatDisplayDateRange(checkin.data_inicio, checkin.data_fim);

  const buildWeeklyFeedbackPreview = (checkin: CheckinData) => {
    const candidates = [
      checkin.duvidas ? `Duvidas: ${checkin.duvidas}` : null,
      checkin.dores_corpo ? `Dores no corpo: ${checkin.dores_corpo}` : null,
      checkin.estado_emocional ? `Estado emocional: ${checkin.estado_emocional}` : null,
      checkin.comentario_saude ? `Saude: ${checkin.comentario_saude}` : null,
      checkin.mudanca_rotina ? `Mudanca na rotina: ${checkin.mudanca_rotina}` : null,
      checkin.justificativa_empenho
        ? `Justificativa do empenho: ${checkin.justificativa_empenho}`
        : null,
      checkin.justificativa_alimentacao
        ? `Justificativa da alimentacao: ${checkin.justificativa_alimentacao}`
        : null,
      checkin.justificativa_sono
        ? `Justificativa do sono: ${checkin.justificativa_sono}`
        : null,
    ].filter(Boolean);

    return normalizeFeedbackReplyPreview(
      candidates[0] ||
        `Empenho ${checkin.nota_empenho}/10, Alimentacao ${checkin.nota_alimentacao}/10, Sono ${checkin.nota_sono}/10`,
      "Feedback semanal enviado pelo aluno"
    );
  };

  const handleReplyToCheckin = (checkin: CheckinData) => {
    queueFeedbackReplyContext({
      id: `weekly-feedback:${checkin.id}`,
      personalId,
      alunoId: profileId,
      senderId: personalId,
      sourceType: "weekly_feedback",
      sourceId: checkin.id,
      authorName: studentName,
      title: getWeekLabel(checkin),
      preview: buildWeeklyFeedbackPreview(checkin),
      createdAt: checkin.preenchido_em,
    });

    navigate(`/chat?aluno=${profileId}`);
  };

  const goToRelativeWeek = (direction: -1 | 1) => {
    if (selectedIndex < 0) return;
    const nextIndex = selectedIndex + direction;
    if (nextIndex < 0 || nextIndex >= checkins.length) return;
    setSelectedCheckin(checkins[nextIndex]);
  };

  const InfoCard = ({
    icon,
    label,
    value,
    nota,
    index,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string | number;
    nota?: number;
    index: number;
  }) => {
    const campo = label.toLowerCase().includes("empenho")
      ? "nota_empenho"
      : label.toLowerCase().includes("alimentação")
      ? "nota_alimentacao"
      : label.toLowerCase().includes("sono")
      ? "nota_sono"
      : null;

    const tendencia = campo
      ? calcularTendencia(campo as keyof CheckinData, index)
      : null;

    return (
      <Card className="border-2">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <p className="text-sm font-medium text-muted-foreground">
                {label}
              </p>
            </div>
            {tendencia !== null && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  tendencia > 0
                    ? "text-green-600"
                    : tendencia < 0
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {tendencia > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : tendencia < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {tendencia !== 0 && Math.abs(tendencia).toFixed(1)}
              </div>
            )}
          </div>
          {nota !== undefined ? (
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold px-3 py-1 rounded-lg ${getNotaColor(
                  nota
                )}`}
              >
                {nota} {getNotaEmoji(nota)}
              </span>
            </div>
          ) : (
            <p className="text-lg font-semibold">{value || "N/A"}</p>
          )}
        </CardContent>
      </Card>
    );
  };

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
          <p className="text-muted-foreground">Carregando feedbacks...</p>
        </div>
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <Card className="border-2 shadow-md">
        <CardContent className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
            <BarChart3 className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Nenhum feedback registrado
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {studentName} ainda não preencheu nenhum feedback semanal. Os
            feedbacks aparecerão aqui quando forem preenchidos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Evolução dos Feedbacks */}
      <FeedbackEvolucaoChart
        profileId={profileId}
        personalId={personalId}
        themeColor={themeColor}
        studentName={studentName}
      />

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
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl mb-2">
                  Feedbacks Semanais de {studentName}
                </CardTitle>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>{checkins.length} feedbacks enviados</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Último:{" "}
                      {formatDisplayDateTime(checkins[0].preenchido_em)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {selectedCheckin && (
        <Card className="sticky top-2 z-20 border-2 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Feedback selecionado
                </p>
                <p className="font-semibold truncate">
                  {getWeekLabel(selectedCheckin)}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {getWeekRange(selectedCheckin)}
              </Badge>
            </div>

            <Select
              value={selectedCheckin.id}
              onValueChange={(value) => {
                const next = checkins.find((checkin) => checkin.id === value);
                if (next) setSelectedCheckin(next);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecionar semana" />
              </SelectTrigger>
              <SelectContent>
                {checkins.map((checkin, index) => (
                  <SelectItem key={checkin.id} value={checkin.id}>
                    {getWeekLabel(checkin)} - {getWeekRange(checkin)}
                    {index === 0 ? " - Mais recente" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-center"
                onClick={() => goToRelativeWeek(1)}
                disabled={selectedIndex < 0 || selectedIndex >= checkins.length - 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-center"
                onClick={() => goToRelativeWeek(-1)}
                disabled={selectedIndex <= 0}
              >
                Proxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              className="w-full justify-center gap-2"
              style={{ backgroundColor: themeColor || undefined }}
              onClick={() => handleReplyToCheckin(selectedCheckin)}
            >
              <Reply className="h-4 w-4" />
              Responder no chat
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="hidden lg:block lg:col-span-1 space-y-2">
          <h3 className="font-semibold text-lg mb-3">
            📅 Histórico de Semanas
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {checkins.map((checkin, index) => (
              <Card
                key={checkin.id}
                className={`cursor-pointer transition-all border-2 ${
                  selectedCheckin?.id === checkin.id
                    ? "border-primary shadow-md"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedCheckin(checkin)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">
                      Semana {checkin.numero_semana}/{checkin.ano}
                    </span>
                    {index === 0 && (
                      <Badge variant="default" className="text-xs">
                        Recente
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getWeekRange(checkin)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <div
                      className={`text-xs px-2 py-1 rounded ${getNotaColor(
                        checkin.nota_empenho
                      )}`}
                    >
                      💪 {checkin.nota_empenho}
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded ${getNotaColor(
                        checkin.nota_alimentacao
                      )}`}
                    >
                      🍎 {checkin.nota_alimentacao}
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded ${getNotaColor(
                        checkin.nota_sono
                      )}`}
                    >
                      💤 {checkin.nota_sono}
                    </div>
                  </div>

                  {(checkin.dores_corpo ||
                    checkin.estado_emocional ||
                    checkin.nivel_dificuldade >= 8) && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {checkin.dores_corpo && (
                        <Badge variant="destructive" className="text-xs">
                          ⚠️ Dor
                        </Badge>
                      )}
                      {checkin.estado_emocional && (
                        <Badge
                          variant="secondary"
                          className="text-xs border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                        >
                          🧠 Emocional
                        </Badge>
                      )}
                      {checkin.nivel_dificuldade >= 8 && (
                        <Badge
                          variant="secondary"
                          className="text-xs border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-200"
                        >
                          😓 Difícil
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedCheckin && (
            <>
              <Card className="border-2">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <CardTitle>
                      Semana {selectedCheckin.numero_semana} de {selectedCheckin.ano}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {getWeekRange(selectedCheckin)}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Preenchido em{" "}
                    {formatDisplayDateTime(selectedCheckin.preenchido_em)}
                  </p>
                </CardHeader>
              </Card>

              {hasValidWeight(selectedCheckin.peso_atual) && (
                <InfoCard
                  icon={<Activity className="h-4 w-4 text-blue-600" />}
                  label="Peso Atual"
                  value={`${selectedCheckin.peso_atual} kg`}
                  index={checkins.findIndex((c) => c.id === selectedCheckin.id)}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoCard
                  icon={<Dumbbell className="h-4 w-4 text-blue-600" />}
                  label="Empenho nos Treinos"
                  nota={selectedCheckin.nota_empenho}
                  index={checkins.findIndex((c) => c.id === selectedCheckin.id)}
                />
                <InfoCard
                  icon={<Utensils className="h-4 w-4 text-green-600" />}
                  label="Alimentação"
                  nota={selectedCheckin.nota_alimentacao}
                  index={checkins.findIndex((c) => c.id === selectedCheckin.id)}
                />
                <InfoCard
                  icon={<Moon className="h-4 w-4 text-purple-600" />}
                  label="Sono"
                  nota={selectedCheckin.nota_sono}
                  index={checkins.findIndex((c) => c.id === selectedCheckin.id)}
                />
              </div>

              {(selectedCheckin.justificativa_empenho ||
                selectedCheckin.justificativa_alimentacao ||
                selectedCheckin.justificativa_sono) && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Justificativas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedCheckin.justificativa_empenho && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          💪 Empenho:
                        </p>
                        <p className="text-sm">
                          {selectedCheckin.justificativa_empenho}
                        </p>
                      </div>
                    )}
                    {selectedCheckin.justificativa_alimentacao && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          🍎 Alimentação:
                        </p>
                        <p className="text-sm">
                          {selectedCheckin.justificativa_alimentacao}
                        </p>
                      </div>
                    )}
                    {selectedCheckin.justificativa_sono && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          💤 Sono:
                        </p>
                        <p className="text-sm">
                          {selectedCheckin.justificativa_sono}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(selectedCheckin.dores_corpo ||
                selectedCheckin.estado_emocional) && (
                <Card className="border-2 border-red-500/40 bg-red-500/10 dark:border-red-400/35 dark:bg-red-950/35">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-red-800 dark:text-red-100">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
                      ⚠️ Alertas Importantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedCheckin.dores_corpo && (
                      <div>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-100 mb-1">
                          ⚠️ Dores no Corpo:
                        </p>
                        <p className="text-sm text-foreground">
                          {selectedCheckin.dores_corpo}
                        </p>
                      </div>
                    )}
                    {selectedCheckin.estado_emocional && (
                      <div>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-100 mb-1">
                          🧠 Estado Emocional:
                        </p>
                        <p className="text-sm text-foreground">
                          {selectedCheckin.estado_emocional}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Saúde Geral
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-2xl font-bold px-3 py-1 rounded-lg ${getNotaColor(
                          selectedCheckin.saude_geral
                        )}`}
                      >
                        {selectedCheckin.saude_geral}/10{" "}
                        {getNotaEmoji(selectedCheckin.saude_geral)}
                      </span>
                    </div>
                    {selectedCheckin.comentario_saude && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedCheckin.comentario_saude}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Qualidade de Vida
                      </p>
                    </div>
                    <span
                      className={`text-2xl font-bold px-3 py-1 rounded-lg ${getNotaColor(
                        selectedCheckin.qualidade_vida
                      )}`}
                    >
                      {selectedCheckin.qualidade_vida}/10{" "}
                      {getNotaEmoji(selectedCheckin.qualidade_vida)}
                    </span>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Nível de Dificuldade do Treino
                      </p>
                    </div>
                    <span
                      className={`text-2xl font-bold px-3 py-1 rounded-lg ${
                        selectedCheckin.nivel_dificuldade <= 3
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                          : selectedCheckin.nivel_dificuldade <= 7
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                          : "border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200"
                      }`}
                    >
                      {selectedCheckin.nivel_dificuldade}/10
                    </span>
                  </div>
                  {selectedCheckin.nivel_dificuldade >= 8 && (
                    <div className="mt-2 rounded border border-orange-500/30 bg-orange-500/10 p-3">
                      <p className="text-xs text-orange-800 dark:text-orange-100">
                        ⚠️ <strong>Atenção:</strong> O aluno está achando o
                        treino muito difícil. Considere ajustar a intensidade.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(selectedCheckin.mudanca_rotina ||
                selectedCheckin.duvidas) && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Informações Adicionais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedCheckin.mudanca_rotina && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          📅 Mudança na Rotina:
                        </p>
                        <p className="text-sm">
                          {selectedCheckin.mudanca_rotina}
                        </p>
                      </div>
                    )}
                    {selectedCheckin.duvidas && (
                      <div className="rounded border border-blue-500/30 bg-blue-500/10 p-3">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-100 mb-1">
                          ❓ Dúvidas do Aluno:
                        </p>
                        <p className="text-sm text-foreground">
                          {selectedCheckin.duvidas}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

