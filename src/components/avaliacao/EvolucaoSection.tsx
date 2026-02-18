import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
}

type Metric = "peso" | "percentual_gordura" | "massa_magra" | "imc" | "cintura" | "quadril" | "braco_direito" | "coxa_direita";

const METRICS: { key: Metric; label: string; color: string; unit: string }[] = [
  { key: "peso", label: "Peso", color: "#3b82f6", unit: "kg" },
  { key: "percentual_gordura", label: "% Gordura", color: "#ef4444", unit: "%" },
  { key: "massa_magra", label: "Massa Magra", color: "#22c55e", unit: "kg" },
  { key: "imc", label: "IMC", color: "#f59e0b", unit: "" },
  { key: "cintura", label: "Cintura", color: "#8b5cf6", unit: "cm" },
  { key: "quadril", label: "Quadril", color: "#ec4899", unit: "cm" },
  { key: "braco_direito", label: "Braço D", color: "#06b6d4", unit: "cm" },
  { key: "coxa_direita", label: "Coxa D", color: "#14b8a6", unit: "cm" },
];

export function EvolucaoSection({ profileId, personalId, themeColor }: Props) {
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(["peso", "percentual_gordura"]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("profile_id", profileId)
        .order("data_avaliacao", { ascending: true });
      setAvaliacoes(data || []);
    };
    fetch();
  }, [profileId]);

  const chartData = useMemo(() => {
    return avaliacoes.map((a) => ({
      data: format(new Date(a.data_avaliacao), "dd/MM/yy"),
      ...METRICS.reduce((acc, m) => {
        acc[m.key] = a[m.key] ?? null;
        return acc;
      }, {} as Record<string, any>),
    }));
  }, [avaliacoes]);

  const toggleMetric = (m: Metric) => {
    setSelectedMetrics((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> Evolução
        </CardTitle>
        <div className="flex gap-2 flex-wrap mt-2">
          {METRICS.map((m) => (
            <Badge
              key={m.key}
              variant={selectedMetrics.includes(m.key) ? "default" : "outline"}
              className="cursor-pointer"
              style={selectedMetrics.includes(m.key) ? { backgroundColor: m.color } : undefined}
              onClick={() => toggleMetric(m.key)}
            >
              {m.label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {chartData.length >= 2 ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                {selectedMetrics.map((key) => {
                  const m = METRICS.find((x) => x.key === key)!;
                  return (
                    <Line key={key} type="monotone" dataKey={key} name={`${m.label} (${m.unit})`} stroke={m.color} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Necessário ao menos 2 avaliações para gerar gráficos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
