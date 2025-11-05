// src/components/admin/sections/PagamentosManager.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Filter,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface Pagamento {
  id: string;
  assinatura_id: string;
  personal: {
    nome: string;
    email: string;
  };
  valor: number;
  status: string;
  data_pagamento: string;
  data_vencimento: string;
  metodo_pagamento?: string;
  observacoes?: string;
}

interface ReceitaMensal {
  mes: string;
  valor: number;
  quantidade: number;
}

export default function PagamentosManager() {
  const { toast } = useToast();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [receitaMensal, setReceitaMensal] = useState<ReceitaMensal[]>([]);

  useEffect(() => {
    fetchPagamentos();
    fetchReceitaMensal();
  }, []);

  const fetchPagamentos = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("pagamentos")
        .select(
          `
          *,
          assinatura:assinaturas(
            personal:profiles(nome, email)
          )
        `
        )
        .order("data_vencimento", { ascending: false })
        .limit(100);

      if (error) throw error;

      const pagamentosFormatados: Pagamento[] =
        data?.map((p) => ({
          id: p.id,
          assinatura_id: p.assinatura_id,
          personal: {
            nome: p.assinatura?.personal?.nome || "N/A",
            email: p.assinatura?.personal?.email || "N/A",
          },
          valor: p.valor,
          status: p.status,
          data_pagamento: p.data_pagamento,
          data_vencimento: p.data_vencimento,
          metodo_pagamento: p.metodo_pagamento,
          observacoes: p.observacoes,
        })) || [];

      setPagamentos(pagamentosFormatados);
    } catch (error: any) {
      console.error("Erro ao carregar pagamentos:", error);
      toast({
        title: "Erro ao carregar pagamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReceitaMensal = async () => {
    try {
      const meses: ReceitaMensal[] = [];

      for (let i = 5; i >= 0; i--) {
        const data = subMonths(new Date(), i);
        const inicio = startOfMonth(data);
        const fim = endOfMonth(data);

        const { data: pagamentosData } = await supabase
          .from("pagamentos")
          .select("valor")
          .eq("status", "pago")
          .gte("data_pagamento", inicio.toISOString())
          .lte("data_pagamento", fim.toISOString());

        const valor = pagamentosData?.reduce((sum, p) => sum + p.valor, 0) || 0;
        const quantidade = pagamentosData?.length || 0;

        meses.push({
          mes: format(data, "MMM/yy"),
          valor,
          quantidade,
        });
      }

      setReceitaMensal(meses);
    } catch (error: any) {
      console.error("Erro ao carregar receita mensal:", error);
    }
  };

  const filteredPagamentos = pagamentos.filter((pagamento) => {
    const matchesSearch =
      pagamento.personal.nome
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      pagamento.personal.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "todos" || pagamento.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pago":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <CheckCircle className="h-4 w-4" />,
          label: "Pago",
        };
      case "pendente":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: <Clock className="h-4 w-4" />,
          label: "Pendente",
        };
      case "atrasado":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <AlertCircle className="h-4 w-4" />,
          label: "Atrasado",
        };
      case "cancelado":
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <XCircle className="h-4 w-4" />,
          label: "Cancelado",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: null,
          label: status,
        };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleMarcarComoPago = async (id: string) => {
    try {
      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Pagamento confirmado",
        description: "O pagamento foi marcado como pago",
      });

      fetchPagamentos();
      fetchReceitaMensal();
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar pagamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const stats = {
    total: pagamentos.reduce((sum, p) => sum + p.valor, 0),
    pagos: pagamentos
      .filter((p) => p.status === "pago")
      .reduce((sum, p) => sum + p.valor, 0),
    pendentes: pagamentos
      .filter((p) => p.status === "pendente")
      .reduce((sum, p) => sum + p.valor, 0),
    atrasados: pagamentos
      .filter((p) => p.status === "atrasado")
      .reduce((sum, p) => sum + p.valor, 0),
    quantidade: {
      total: pagamentos.length,
      pagos: pagamentos.filter((p) => p.status === "pago").length,
      pendentes: pagamentos.filter((p) => p.status === "pendente").length,
      atrasados: pagamentos.filter((p) => p.status === "atrasado").length,
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pagamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas Financeiras */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Total Recebido</p>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.pagos)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.quantidade.pagos} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-yellow-900">Pendentes</p>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-700">
              {formatCurrency(stats.pendentes)}
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              {stats.quantidade.pendentes} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-red-900">Atrasados</p>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(stats.atrasados)}
            </div>
            <p className="text-xs text-red-700 mt-1">
              {stats.quantidade.atrasados} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Total Geral</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.quantidade.total} pagamentos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Receita Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Receita Mensal (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {receitaMensal.map((mes, index) => {
              const anterior = index > 0 ? receitaMensal[index - 1].valor : 0;
              const crescimento =
                anterior > 0 ? ((mes.valor - anterior) / anterior) * 100 : 0;

              return (
                <div key={mes.mes} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium">{mes.mes}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">
                        {formatCurrency(mes.valor)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {mes.quantidade} pagamentos
                        </span>
                        {index > 0 && (
                          <Badge
                            variant={
                              crescimento >= 0 ? "default" : "destructive"
                            }
                            className="text-xs"
                          >
                            {crescimento >= 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(crescimento).toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (mes.valor /
                              Math.max(...receitaMensal.map((m) => m.valor))) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico de Pagamentos</span>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["todos", "pago", "pendente", "atrasado", "cancelado"].map(
                (status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => setStatusFilter(status)}
                    size="sm"
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredPagamentos.map((pagamento) => {
              const statusConfig = getStatusConfig(pagamento.status);

              return (
                <div
                  key={pagamento.id}
                  className="p-4 border-2 rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">
                          {pagamento.personal.nome}
                        </h4>
                        <Badge className={statusConfig.color}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {pagamento.personal.email}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Valor
                          </p>
                          <p className="font-bold text-primary">
                            {formatCurrency(pagamento.valor)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Vencimento
                          </p>
                          <p className="font-medium">
                            {format(
                              new Date(pagamento.data_vencimento),
                              "dd/MM/yyyy"
                            )}
                          </p>
                        </div>
                        {pagamento.data_pagamento && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">
                              Data Pagamento
                            </p>
                            <p className="font-medium">
                              {format(
                                new Date(pagamento.data_pagamento),
                                "dd/MM/yyyy"
                              )}
                            </p>
                          </div>
                        )}
                        {pagamento.metodo_pagamento && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">
                              Método
                            </p>
                            <p className="font-medium">
                              {pagamento.metodo_pagamento}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pagamento.status === "pendente" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleMarcarComoPago(pagamento.id)}
                        >
                          Confirmar Pagamento
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredPagamentos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum pagamento encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
