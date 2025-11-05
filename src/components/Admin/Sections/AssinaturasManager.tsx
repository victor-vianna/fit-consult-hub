// src/components/admin/sections/AssinaturasManager.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  CreditCard,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface Assinatura {
  id: string;
  personal: {
    nome: string;
    email: string;
  };
  plano: {
    nome: string;
    preco: number;
  };
  status: string;
  data_inicio: string;
  data_fim?: string;
  data_cancelamento?: string;
  trial: boolean;
  trial_fim?: string;
  valor_mensal: number;
  forma_pagamento?: string;
  motivo_cancelamento?: string;
}

export default function AssinaturasManager() {
  const { toast } = useToast();
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");

  useEffect(() => {
    fetchAssinaturas();
  }, []);

  const fetchAssinaturas = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("assinaturas")
        .select(
          `
          *,
          personal:profiles!assinaturas_personal_id_fkey(nome, email),
          plano:planos(nome, preco_mensal)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const assinaturasFormatadas: Assinatura[] =
        data?.map((a) => ({
          id: a.id,
          personal: {
            nome: a.personal?.nome || "N/A",
            email: a.personal?.email || "N/A",
          },
          plano: {
            nome: a.plano?.nome || "N/A",
            preco: a.plano?.preco_mensal || a.valor_mensal || 0,
          },
          status: a.status,
          data_inicio: a.data_inicio,
          data_fim: a.data_fim,
          data_cancelamento: a.data_cancelamento,
          trial: a.trial || false,
          trial_fim: a.trial_fim,
          valor_mensal: a.valor_mensal || 0,
          forma_pagamento: a.forma_pagamento,
          motivo_cancelamento: a.motivo_cancelamento,
        })) || [];

      setAssinaturas(assinaturasFormatadas);
    } catch (error: any) {
      console.error("Erro ao carregar assinaturas:", error);
      toast({
        title: "Erro ao carregar assinaturas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssinaturas = assinaturas.filter((assinatura) => {
    const matchesSearch =
      assinatura.personal.nome
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      assinatura.personal.email
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      assinatura.plano.nome.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "todas" || assinatura.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ativa":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: "Ativa",
        };
      case "trial":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: <Clock className="h-4 w-4" />,
          label: "Trial",
        };
      case "cancelada":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <XCircle className="h-4 w-4" />,
          label: "Cancelada",
        };
      case "suspensa":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: <AlertTriangle className="h-4 w-4" />,
          label: "Suspensa",
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

  const handleCancelarAssinatura = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta assinatura?")) return;

    try {
      const { error } = await supabase
        .from("assinaturas")
        .update({
          status: "cancelada",
          data_cancelamento: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Assinatura cancelada",
        description: "A assinatura foi cancelada com sucesso",
      });

      fetchAssinaturas();
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar assinatura",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReativarAssinatura = async (id: string) => {
    try {
      const { error } = await supabase
        .from("assinaturas")
        .update({
          status: "ativa",
          data_cancelamento: null,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Assinatura reativada",
        description: "A assinatura foi reativada com sucesso",
      });

      fetchAssinaturas();
    } catch (error: any) {
      toast({
        title: "Erro ao reativar assinatura",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const stats = {
    total: assinaturas.length,
    ativas: assinaturas.filter((a) => a.status === "ativa").length,
    trial: assinaturas.filter((a) => a.status === "trial").length,
    canceladas: assinaturas.filter((a) => a.status === "cancelada").length,
    mrr: assinaturas
      .filter((a) => a.status === "ativa")
      .reduce((sum, a) => sum + a.valor_mensal, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando assinaturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">
              {stats.ativas}
            </div>
            <p className="text-xs text-green-700">Ativas</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-700">
              {stats.trial}
            </div>
            <p className="text-xs text-blue-700">Trial</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-700">
              {stats.canceladas}
            </div>
            <p className="text-xs text-red-700">Canceladas</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.mrr)}
            </div>
            <p className="text-xs text-primary">MRR</p>
          </CardContent>
        </Card>
      </div>

      {/* Gerenciamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Assinaturas</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchAssinaturas}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou plano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["todas", "ativa", "trial", "cancelada", "suspensa"].map(
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

          {/* Lista de assinaturas */}
          <div className="space-y-3">
            {filteredAssinaturas.map((assinatura) => {
              const statusConfig = getStatusConfig(assinatura.status);

              return (
                <div
                  key={assinatura.id}
                  className="p-4 border-2 rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">
                          {assinatura.personal.nome}
                        </h4>
                        <Badge className={statusConfig.color}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </Badge>
                        {assinatura.trial && (
                          <Badge variant="outline">TRIAL</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {assinatura.personal.email}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Plano
                          </p>
                          <p className="font-medium">{assinatura.plano.nome}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Valor Mensal
                          </p>
                          <p className="font-medium text-primary">
                            {formatCurrency(assinatura.valor_mensal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Data Início
                          </p>
                          <p className="font-medium">
                            {format(
                              new Date(assinatura.data_inicio),
                              "dd/MM/yyyy"
                            )}
                          </p>
                        </div>
                        {assinatura.data_fim && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">
                              Data Fim
                            </p>
                            <p className="font-medium">
                              {format(
                                new Date(assinatura.data_fim),
                                "dd/MM/yyyy"
                              )}
                            </p>
                          </div>
                        )}
                        {assinatura.trial && assinatura.trial_fim && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">
                              Fim do Trial
                            </p>
                            <p className="font-medium">
                              {format(
                                new Date(assinatura.trial_fim),
                                "dd/MM/yyyy"
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {assinatura.status === "ativa" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleCancelarAssinatura(assinatura.id)
                          }
                        >
                          Cancelar
                        </Button>
                      )}
                      {assinatura.status === "cancelada" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            handleReativarAssinatura(assinatura.id)
                          }
                        >
                          Reativar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAssinaturas.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma assinatura encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
