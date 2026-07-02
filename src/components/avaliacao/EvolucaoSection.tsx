import { useEffect, useMemo, useState } from "react";
import { subMonths, subWeeks, subYears } from "date-fns";
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { EVOLUTION_METRICS, flattenAssessmentMetric, formatMetricValue } from "@/utils/avaliacaoMetrics";
import { formatDisplayDate } from "@/utils/dateFormat";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
}

type Period = "4sem" | "3m" | "6m" | "1a" | "todos";

const DEFAULT_METRICS = ["peso", "percentual_gordura"];

export function EvolucaoSection({ profileId }: Props) {
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(DEFAULT_METRICS);
  const [period, setPeriod] = useState<Period>("todos");

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("profile_id", profileId)
        .order("data_avaliacao", { ascending: true });
      setAvaliacoes(data || []);
    };
    fetchData();
  }, [profileId]);

  const filteredAvaliacoes = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;
    if (period === "4sem") cutoff = subWeeks(now, 4);
    if (period === "3m") cutoff = subMonths(now, 3);
    if (period === "6m") cutoff = subMonths(now, 6);
    if (period === "1a") cutoff = subYears(now, 1);
    return cutoff ? avaliacoes.filter((item) => new Date(item.data_avaliacao) >= cutoff) : avaliacoes;
  }, [avaliacoes, period]);

  const availableMetrics = useMemo(() => {
    return EVOLUTION_METRICS.filter((metric) =>
      filteredAvaliacoes.some((avaliacao) => flattenAssessmentMetric(avaliacao, metric.key) !== null && flattenAssessmentMetric(avaliacao, metric.key) !== undefined)
    );
  }, [filteredAvaliacoes]);

  const chartData = useMemo(() => {
    return filteredAvaliacoes.map((avaliacao) => {
      const row: Record<string, any> = {
        data: formatDisplayDate(avaliacao.data_avaliacao, { shortYear: true }),
      };
      availableMetrics.forEach((metric) => {
        row[metric.key] = flattenAssessmentMetric(avaliacao, metric.key);
      });
      return row;
    });
  }, [availableMetrics, filteredAvaliacoes]);

  const selectedAvailable = selectedMetrics.filter((metric) => availableMetrics.some((item) => item.key === metric));

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricKey) ? prev.filter((item) => item !== metricKey) : [...prev, metricKey]
    );
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" /> Evolucao
        </CardTitle>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { value: "4sem", label: "4 sem" },
            { value: "3m", label: "3 meses" },
            { value: "6m", label: "6 meses" },
            { value: "1a", label: "1 ano" },
            { value: "todos", label: "Todos" },
          ].map((option) => (
            <Badge
              key={option.value}
              variant={period === option.value ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setPeriod(option.value as Period)}
            >
              {option.label}
            </Badge>
          ))}
        </div>
        <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
          {availableMetrics.map((metric) => (
            <Badge
              key={metric.key}
              variant={selectedMetrics.includes(metric.key) ? "default" : "outline"}
              className="cursor-pointer"
              style={selectedMetrics.includes(metric.key) ? { backgroundColor: metric.color } : undefined}
              onClick={() => toggleMetric(metric.key)}
            >
              {metric.label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue="grafico">
          <TabsList className="mb-4">
            <TabsTrigger value="grafico">Grafico</TabsTrigger>
            <TabsTrigger value="tabela" className="gap-1.5">
              <Table2 className="h-4 w-4" /> Tabela
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grafico">
            {chartData.length >= 2 && selectedAvailable.length > 0 ? (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="data" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    {selectedAvailable.map((key) => {
                      const metric = availableMetrics.find((item) => item.key === key)!;
                      return (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          name={`${metric.label}${metric.unit ? ` (${metric.unit})` : ""}`}
                          stroke={metric.color}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyEvolution />
            )}
          </TabsContent>

          <TabsContent value="tabela">
            {filteredAvaliacoes.length > 0 && availableMetrics.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="sticky left-0 z-10 bg-muted/60 px-3 py-2 text-left font-semibold">Metrica</th>
                      {filteredAvaliacoes.map((avaliacao) => (
                        <th key={avaliacao.id} className="px-3 py-2 text-left font-semibold">
                          {formatDisplayDate(avaliacao.data_avaliacao, { shortYear: true })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableMetrics.map((metric) => (
                      <tr key={metric.key} className="border-t">
                        <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium">{metric.label}</td>
                        {filteredAvaliacoes.map((avaliacao) => (
                          <td key={avaliacao.id} className="px-3 py-2">
                            {formatMetricValue(flattenAssessmentMetric(avaliacao, metric.key), metric.unit)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyEvolution />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function EmptyEvolution() {
  return (
    <div className="py-12 text-center">
      <TrendingUp className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">Necessario ao menos 2 avaliacoes com a mesma metrica para gerar graficos</p>
    </div>
  );
}
