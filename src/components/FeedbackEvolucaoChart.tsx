import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subWeeks, subMonths, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, BarChart3, Scale } from "lucide-react";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  studentName: string;
}

type FeedbackMetric =
  | "peso_atual"
  | "nota_empenho"
  | "nota_alimentacao"
  | "nota_sono"
  | "saude_geral"
  | "qualidade_vida"
  | "nivel_dificuldade";

const FEEDBACK_METRICS: {
  key: FeedbackMetric;
  label: string;
  color: string;
  unit: string;
}[] = [
  { key: "peso_atual", label: "Peso", color: "#3b82f6", unit: "kg" },
  { key: "nota_empenho", label: "Empenho", color: "#22c55e", unit: "/10" },
  { key: "nota_alimentacao", label: "Alimentação", color: "#f59e0b", unit: "/10" },
  { key: "nota_sono", label: "Sono", color: "#8b5cf6", unit: "/10" },
  { key: "saude_geral", label: "Saúde Geral", color: "#ef4444", unit: "/10" },
  { key: "qualidade_vida", label: "Qualidade de Vida", color: "#06b6d4", unit: "/10" },
  { key: "nivel_dificuldade", label: "Dificuldade Treino", color: "#ec4899", unit: "/10" },
];

export function FeedbackEvolucaoChart({
  profileId,
  personalId,
  themeColor,
  studentName,
}: Props) {
  const [checkins, setCheckins] = useState<any[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<FeedbackMetric[]>([
    "nota_empenho",
    "saude_geral",
    "qualidade_vida",
  ]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"4sem" | "3m" | "6m" | "1a" | "todos">("todos");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("checkins_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .order("ano", { ascending: true })
        .order("numero_semana", { ascending: true });
      setCheckins(data || []);
      setLoading(false);
    };
    fetch();
  }, [profileId, personalId]);

  const chartData = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;
    if (period === "4sem") cutoff = subWeeks(now, 4);
    else if (period === "3m") cutoff = subMonths(now, 3);
    else if (period === "6m") cutoff = subMonths(now, 6);
    else if (period === "1a") cutoff = subYears(now, 1);

    const filtered = cutoff
      ? checkins.filter((c) => new Date(c.data_inicio) >= cutoff!)
      : checkins;

    return filtered.map((c) => ({
      label: `S${c.numero_semana}/${c.ano}`,
      data_inicio: c.data_inicio,
      ...FEEDBACK_METRICS.reduce((acc, m) => {
        acc[m.key] = c[m.key] ?? null;
        return acc;
      }, {} as Record<string, any>),
    }));
  }, [checkins, period]);

  const toggleMetric = (m: FeedbackMetric) => {
    setSelectedMetrics((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  // Compute comparison between last 2 items of filtered data
  const comparison = useMemo(() => {
    if (chartData.length < 2) return null;
    const last = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];
    return FEEDBACK_METRICS.map((m) => {
      const curr = last[m.key] as number | null;
      const prevVal = prev[m.key] as number | null;
      const diff = curr != null && prevVal != null ? curr - prevVal : null;
      return { ...m, current: curr, previous: prevVal, diff };
    }).filter((m) => m.current != null);
  }, [chartData]);

  if (loading) {
    return (
      <Card className="border-2">
        <CardContent className="py-12 text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-2 mx-auto mb-3"
            style={{
              borderColor: themeColor ? `${themeColor}40` : "rgba(0,0,0,0.1)",
              borderTopColor: themeColor || "#000",
            }}
          />
          <p className="text-sm text-muted-foreground">Carregando evolução...</p>
        </CardContent>
      </Card>
    );
  }

  if (checkins.length === 0) {
    return (
      <Card className="border-2">
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Nenhum feedback registrado para gerar evolução
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Card */}
      <Card className="border-2 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color: themeColor }} />
            Evolução dos Feedbacks — {studentName}
          </CardTitle>
          <div className="flex gap-1.5 flex-wrap mt-2">
            {([
              { value: "4sem", label: "4 sem" },
              { value: "3m", label: "3 meses" },
              { value: "6m", label: "6 meses" },
              { value: "1a", label: "1 ano" },
              { value: "todos", label: "Todos" },
            ] as const).map((p) => (
              <Badge
                key={p.value}
                variant={period === p.value ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap mt-2">
            {FEEDBACK_METRICS.map((m) => (
              <Badge
                key={m.key}
                variant={selectedMetrics.includes(m.key) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                style={
                  selectedMetrics.includes(m.key)
                    ? { backgroundColor: m.color, borderColor: m.color }
                    : undefined
                }
                onClick={() => toggleMetric(m.key)}
              >
                {m.label}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length >= 2 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  />
                  <Legend />
                  {selectedMetrics.map((key) => {
                    const m = FEEDBACK_METRICS.find((x) => x.key === key)!;
                    return (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={`${m.label} (${m.unit})`}
                        stroke={m.color}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Necessário ao menos 2 feedbacks para gerar gráficos de evolução
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Card */}
      {comparison && comparison.length > 0 && (
        <Card className="border-2 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Comparativo: Última vs. Penúltima Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {comparison.map((item) => (
                <div
                  key={item.key}
                  className="p-3 rounded-lg border bg-card text-center"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {item.label}
                  </p>
                  <p className="text-xl font-bold">
                    {item.current}
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.unit}
                    </span>
                  </p>
                  {item.diff !== null && item.diff !== 0 && (
                    <p
                      className={`text-xs mt-1 font-medium ${
                        item.key === "nivel_dificuldade"
                          ? item.diff < 0
                            ? "text-green-600"
                            : "text-red-600"
                          : item.diff > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {item.diff > 0 ? "▲" : "▼"}{" "}
                      {Math.abs(item.diff).toFixed(1)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
