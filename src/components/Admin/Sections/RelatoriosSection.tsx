// src/components/admin/sections/RelatoriosSection.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Filter,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from "date-fns";

interface RelatorioData {
  periodo: string;
  receita: number;
  novosUsuarios: number;
  novasAssinaturas: number;
  cancelamentos: number;
  pagamentosRecebidos: number;
  taxaChurn: number;
}

export default function RelatoriosSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] =
    useState<string>("mes-atual");
  const [relatorioMensal, setRelatorioMensal] = useState<RelatorioData[]>([]);
  const [relatorioAnual, setRelatorioAnual] = useState<RelatorioData | null>(
    null
  );

  useEffect(() => {
    gerarRelatorios();
  }, []);

  const gerarRelatorios = async () => {
    try {
      setLoading(true);
      await Promise.all([gerarRelatorioMensal(), gerarRelatorioAnual()]);
    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatórios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const gerarRelatorioMensal = async () => {
    const relatorios: RelatorioData[] = [];

    for (let i = 5; i >= 0; i--) {
      const data = subMonths(new Date(), i);
      const inicio = startOfMonth(data);
      const fim = endOfMonth(data);

      // Receita
      const { data: pagamentos } = await supabase
        .from("pagamentos")
        .select("valor")
        .eq("status", "pago")
        .gte("data_pagamento", inicio.toISOString())
        .lte("data_pagamento", fim.toISOString());

      const receita = pagamentos?.reduce((sum, p) => sum + p.valor, 0) || 0;

      // Novos Usuários
      const { data: usuarios } = await supabase
        .from("profiles")
        .select("id")
        .gte("created_at", inicio.toISOString())
        .lte("created_at", fim.toISOString());

      // Novas Assinaturas
      const { data: assinaturas } = await supabase
        .from("assinaturas")
        .select("id")
        .gte("data_inicio", inicio.toISOString())
        .lte("data_inicio", fim.toISOString());

      // Cancelamentos
      const { data: cancelamentos } = await supabase
        .from("assinaturas")
        .select("id")
        .eq("status", "cancelada")
        .gte("data_cancelamento", inicio.toISOString())
        .lte("data_cancelamento", fim.toISOString());

      // Assinaturas no início do mês
      const { data: assinaturasInicio } = await supabase
        .from("assinaturas")
        .select("id")
        .lt("data_inicio", inicio.toISOString());

      const taxaChurn =
        assinaturasInicio && assinaturasInicio.length > 0
          ? ((cancelamentos?.length || 0) / assinaturasInicio.length) * 100
          : 0;

      relatorios.push({
        periodo: format(data, "MMM/yyyy"),
        receita,
        novosUsuarios: usuarios?.length || 0,
        novasAssinaturas: assinaturas?.length || 0,
        cancelamentos: cancelamentos?.length || 0,
        pagamentosRecebidos: pagamentos?.length || 0,
        taxaChurn: Number(taxaChurn.toFixed(2)),
      });
    }

    setRelatorioMensal(relatorios);
  };

  const gerarRelatorioAnual = async () => {
    const inicio = startOfYear(new Date());
    const fim = endOfYear(new Date());

    // Receita
    const { data: pagamentos } = await supabase
      .from("pagamentos")
      .select("valor")
      .eq("status", "pago")
      .gte("data_pagamento", inicio.toISOString())
      .lte("data_pagamento", fim.toISOString());

    const receita = pagamentos?.reduce((sum, p) => sum + p.valor, 0) || 0;

    // Novos Usuários
    const { data: usuarios } = await supabase
      .from("profiles")
      .select("id")
      .gte("created_at", inicio.toISOString())
      .lte("created_at", fim.toISOString());

    // Novas Assinaturas
    const { data: assinaturas } = await supabase
      .from("assinaturas")
      .select("id")
      .gte("data_inicio", inicio.toISOString())
      .lte("data_inicio", fim.toISOString());

    // Cancelamentos
    const { data: cancelamentos } = await supabase
      .from("assinaturas")
      .select("id")
      .eq("status", "cancelada")
      .gte("data_cancelamento", inicio.toISOString())
      .lte("data_cancelamento", fim.toISOString());

    // Assinaturas no início do ano
    const { data: assinaturasInicio } = await supabase
      .from("assinaturas")
      .select("id")
      .lt("data_inicio", inicio.toISOString());

    const taxaChurn =
      assinaturasInicio && assinaturasInicio.length > 0
        ? ((cancelamentos?.length || 0) / assinaturasInicio.length) * 100
        : 0;

    setRelatorioAnual({
      periodo: format(new Date(), "yyyy"),
      receita,
      novosUsuarios: usuarios?.length || 0,
      novasAssinaturas: assinaturas?.length || 0,
      cancelamentos: cancelamentos?.length || 0,
      pagamentosRecebidos: pagamentos?.length || 0,
      taxaChurn: Number(taxaChurn.toFixed(2)),
    });
  };

  const exportarRelatorio = (tipo: string) => {
    const dados = tipo === "mensal" ? relatorioMensal : [relatorioAnual];
    const csv = gerarCSV(dados);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `relatorio-${tipo}-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Relatório exportado",
      description: "O arquivo CSV foi baixado com sucesso",
    });
  };

  const gerarCSV = (dados: any[]) => {
    const headers = [
      "Período",
      "Receita",
      "Novos Usuários",
      "Novas Assinaturas",
      "Cancelamentos",
      "Pagamentos Recebidos",
      "Taxa Churn (%)",
    ];

    const rows = dados.map((d) => [
      d.periodo,
      d.receita.toFixed(2),
      d.novosUsuarios,
      d.novasAssinaturas,
      d.cancelamentos,
      d.pagamentosRecebidos,
      d.taxaChurn.toFixed(2),
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Gerando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios e Análises
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={gerarRelatorios}>
                <Activity className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Relatório Anual */}
      {relatorioAnual && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Relatório Anual - {relatorioAnual.periodo}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportarRelatorio("anual")}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">
                    Receita Total
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(relatorioAnual.receita)}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">
                    Novos Usuários
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {relatorioAnual.novosUsuarios}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-muted-foreground">
                    Novas Assinaturas
                  </span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {relatorioAnual.novasAssinaturas}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-muted-foreground">
                    Cancelamentos
                  </span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {relatorioAnual.cancelamentos}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-muted-foreground">
                    Pagamentos
                  </span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {relatorioAnual.pagamentosRecebidos}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-muted-foreground">
                    Taxa Churn
                  </span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {relatorioAnual.taxaChurn}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório Mensal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Relatório Mensal (Últimos 6 meses)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportarRelatorio("mensal")}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {relatorioMensal.map((relatorio, index) => (
              <div
                key={index}
                className="p-4 border-2 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">{relatorio.periodo}</h3>
                  <Badge
                    variant={
                      relatorio.taxaChurn > 5 ? "destructive" : "default"
                    }
                  >
                    Churn: {relatorio.taxaChurn}%
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Receita
                    </p>
                    <p className="font-bold text-green-600">
                      {formatCurrency(relatorio.receita)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Novos Usuários
                    </p>
                    <p className="font-bold text-blue-600">
                      {relatorio.novosUsuarios}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Novas Assinaturas
                    </p>
                    <p className="font-bold text-purple-600">
                      {relatorio.novasAssinaturas}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Cancelamentos
                    </p>
                    <p className="font-bold text-red-600">
                      {relatorio.cancelamentos}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Pagamentos
                    </p>
                    <p className="font-bold text-orange-600">
                      {relatorio.pagamentosRecebidos}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Relatórios Personalizados */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Personalizados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex-col">
              <Users className="h-6 w-6 mb-2" />
              <span>Relatório de Usuários</span>
            </Button>

            <Button variant="outline" className="h-24 flex-col">
              <DollarSign className="h-6 w-6 mb-2" />
              <span>Relatório Financeiro</span>
            </Button>

            <Button variant="outline" className="h-24 flex-col">
              <Activity className="h-6 w-6 mb-2" />
              <span>Relatório de Churn</span>
            </Button>

            <Button variant="outline" className="h-24 flex-col">
              <TrendingUp className="h-6 w-6 mb-2" />
              <span>Relatório de Crescimento</span>
            </Button>

            <Button variant="outline" className="h-24 flex-col">
              <Calendar className="h-6 w-6 mb-2" />
              <span>Relatório de Pagamentos</span>
            </Button>

            <Button variant="outline" className="h-24 flex-col">
              <BarChart3 className="h-6 w-6 mb-2" />
              <span>Análise Comparativa</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
