// src/components/admin/sections/PersonalsManager.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  UserCog,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Award,
  CheckCircle,
  XCircle,
  MoreVertical,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface Personal {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  created_at: string;
  assinatura?: {
    id: string;
    status: string;
    plano: string;
    valor: number;
    dataInicio: string;
  };
  estatisticas: {
    totalAlunos: number;
    receitaGerada: number;
    alunosAtivos: number;
  };
}

export default function PersonalsManager() {
  const { toast } = useToast();
  const [personals, setPersonals] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  useEffect(() => {
    fetchPersonals();
  }, []);

  const fetchPersonals = async () => {
    try {
      setLoading(true);

      // Buscar IDs dos personals
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "personal");

      if (!rolesData) return;

      const personalIds = rolesData.map((r) => r.user_id);

      // Buscar dados dos personals
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", personalIds);

      // Buscar assinaturas
      const { data: assinaturasData } = await supabase
        .from("assinaturas")
        .select(
          `
          *,
          plano:planos(nome, preco_mensal)
        `
        )
        .in("personal_id", personalIds);

      // Buscar alunos de cada personal
      const { data: alunosData } = await supabase
        .from("profiles")
        .select("personal_id, is_active")
        .in("personal_id", personalIds);

      // Montar estrutura completa
      const personalsCompletos: Personal[] =
        profilesData?.map((profile) => {
          const assinatura = assinaturasData?.find(
            (a) => a.personal_id === profile.id
          );
          const alunosDoPersonal = alunosData?.filter(
            (a) => a.personal_id === profile.id
          );

          return {
            id: profile.id,
            nome: profile.nome || "Sem nome",
            email: profile.email || "Sem email",
            telefone: profile.telefone,
            created_at: profile.created_at,
            assinatura: assinatura
              ? {
                  id: assinatura.id,
                  status: assinatura.status,
                  plano: assinatura.plano?.nome || "N/A",
                  valor: assinatura.valor_mensal || 0,
                  dataInicio: assinatura.data_inicio,
                }
              : undefined,
            estatisticas: {
              totalAlunos: alunosDoPersonal?.length || 0,
              alunosAtivos:
                alunosDoPersonal?.filter((a) => a.is_active).length || 0,
              receitaGerada: 0, // Calcular se necessário
            },
          };
        }) || [];

      setPersonals(personalsCompletos);
    } catch (error: any) {
      console.error("Erro ao carregar personals:", error);
      toast({
        title: "Erro ao carregar personals",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPersonals = personals.filter((personal) => {
    const matchesSearch =
      personal.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      personal.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "com-assinatura" && personal.assinatura) ||
      (statusFilter === "sem-assinatura" && !personal.assinatura) ||
      (statusFilter === "ativo" && personal.assinatura?.status === "ativa") ||
      (statusFilter === "trial" && personal.assinatura?.status === "trial");

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: personals.length,
    comAssinatura: personals.filter((p) => p.assinatura).length,
    semAssinatura: personals.filter((p) => !p.assinatura).length,
    ativos: personals.filter((p) => p.assinatura?.status === "ativa").length,
    totalAlunos: personals.reduce(
      (sum, p) => sum + p.estatisticas.totalAlunos,
      0
    ),
    mediaAlunos:
      personals.length > 0
        ? (
            personals.reduce((sum, p) => sum + p.estatisticas.totalAlunos, 0) /
            personals.length
          ).toFixed(1)
        : 0,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (assinatura: Personal["assinatura"]) => {
    if (!assinatura) {
      return (
        <Badge variant="outline" className="border-gray-300">
          <XCircle className="h-3 w-3 mr-1" />
          Sem Assinatura
        </Badge>
      );
    }

    switch (assinatura.status) {
      case "ativa":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case "trial":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Trial
          </Badge>
        );
      case "cancelada":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Cancelada
          </Badge>
        );
      default:
        return <Badge variant="outline">{assinatura.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando personals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">
              {stats.ativos}
            </div>
            <p className="text-xs text-green-700">Ativos</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-700">
              {stats.comAssinatura}
            </div>
            <p className="text-xs text-blue-700">Com Assinatura</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-700">
              {stats.semAssinatura}
            </div>
            <p className="text-xs text-orange-700">Sem Assinatura</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-700">
              {stats.totalAlunos}
            </div>
            <p className="text-xs text-purple-700">Total Alunos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.mediaAlunos}</div>
            <p className="text-xs text-muted-foreground">
              Média Alunos/Personal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gerenciamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Personals Trainers</span>
            <Button>
              <UserCog className="mr-2 h-4 w-4" />
              Novo Personal
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
              {[
                "todos",
                "ativo",
                "trial",
                "com-assinatura",
                "sem-assinatura",
              ].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                  size="sm"
                >
                  {status
                    .split("-")
                    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join(" ")}
                </Button>
              ))}
            </div>
          </div>

          {/* Lista de personals */}
          <div className="space-y-3">
            {filteredPersonals.map((personal) => (
              <div
                key={personal.id}
                className="p-4 border-2 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{personal.nome}</h4>
                      {getStatusBadge(personal.assinatura)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{personal.email}</span>
                      </div>
                      {personal.telefone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{personal.telefone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Cadastrado em{" "}
                          {format(new Date(personal.created_at), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50 rounded-md">
                      {personal.assinatura && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Plano
                            </p>
                            <p className="font-semibold text-sm">
                              {personal.assinatura.plano}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Valor Mensal
                            </p>
                            <p className="font-semibold text-sm text-primary">
                              {formatCurrency(personal.assinatura.valor)}
                            </p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Total Alunos
                        </p>
                        <p className="font-semibold text-sm">
                          {personal.estatisticas.totalAlunos}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Alunos Ativos
                        </p>
                        <p className="font-semibold text-sm text-green-600">
                          {personal.estatisticas.alunosAtivos}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredPersonals.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <UserCog className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum personal encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
