// src/components/admin/sections/PersonalsManager.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Calendar,
  CheckCircle,
  CreditCard,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  XCircle,
} from "lucide-react";
import { formatDisplayDate } from "@/utils/dateFormat";

interface Personal {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  created_at: string;
  is_active: boolean;
  assinatura?: {
    id: string;
    status: string;
    planoId: string;
    plano: string;
    valor: number;
    dataInicio: string;
  };
  estatisticas: {
    totalAlunos: number;
    receitaGerada: number;
    alunosAtivos: number;
  };
  controleAlunosPorPagamento: boolean;
}

interface PlanoOption {
  id: string;
  nome: string;
  preco_mensal: number;
  ativo: boolean;
}

const ACTIVE_STATUSES = ["ativa", "ativo", "trial"];
type StudentAccessMode = "pagamento" | "login";

export default function PersonalsManager() {
  const { toast } = useToast();
  const [personals, setPersonals] = useState<Personal[]>([]);
  const [planos, setPlanos] = useState<PlanoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPersonalId, setSavingPersonalId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  useEffect(() => {
    fetchPersonals();
  }, []);

  const fetchPersonals = async () => {
    try {
      setLoading(true);

      const { data: planosData, error: planosError } = await supabase
        .from("planos")
        .select("id, nome, preco_mensal, ativo")
        .order("preco_mensal", { ascending: true });

      if (planosError) throw planosError;

      setPlanos(
        (planosData || []).map((plano) => ({
          id: plano.id,
          nome: plano.nome,
          preco_mensal: plano.preco_mensal,
          ativo: plano.ativo ?? true,
        }))
      );

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "personal");

      if (rolesError) throw rolesError;

      const personalIds = (rolesData || []).map((r) => r.user_id);
      if (personalIds.length === 0) {
        setPersonals([]);
        return;
      }

      const [
        { data: profilesData, error: profilesError },
        { data: assinaturasData, error: assinaturasError },
        { data: alunosData, error: alunosError },
        { data: personalSettingsData, error: personalSettingsError },
      ] = await Promise.all([
        supabase.from("profiles").select("*").in("id", personalIds),
        supabase
          .from("assinaturas")
          .select("*, plano:planos(id, nome, preco_mensal)")
          .in("personal_id", personalIds),
        supabase
          .from("profiles")
          .select("personal_id, is_active")
          .in("personal_id", personalIds),
        supabase
          .from("personal_settings")
          .select("personal_id, controle_acesso_por_pagamento")
          .in("personal_id", personalIds),
      ]);

      if (profilesError) throw profilesError;
      if (assinaturasError) throw assinaturasError;
      if (alunosError) throw alunosError;
      if (personalSettingsError) throw personalSettingsError;

      const personalsCompletos: Personal[] =
        profilesData?.map((profile) => {
          const assinatura = assinaturasData?.find(
            (a) => a.personal_id === profile.id
          );
          const alunosDoPersonal = alunosData?.filter(
            (a) => a.personal_id === profile.id
          );
          const settings = personalSettingsData?.find(
            (item) => item.personal_id === profile.id
          );

          return {
            id: profile.id,
            nome: profile.nome || "Sem nome",
            email: profile.email || "Sem email",
            telefone: profile.telefone,
            created_at: profile.created_at,
            is_active: profile.is_active ?? true,
            assinatura: assinatura
              ? {
                  id: assinatura.id,
                  status: assinatura.status,
                  planoId: assinatura.plano_id,
                  plano: assinatura.plano?.nome || "N/A",
                  valor: assinatura.valor_mensal || 0,
                  dataInicio: assinatura.data_inicio,
                }
              : undefined,
            estatisticas: {
              totalAlunos: alunosDoPersonal?.length || 0,
              alunosAtivos:
                alunosDoPersonal?.filter((a) => a.is_active).length || 0,
              receitaGerada: 0,
            },
            controleAlunosPorPagamento:
              settings?.controle_acesso_por_pagamento ?? false,
          };
        }) || [];

      setPersonals(personalsCompletos);
    } catch (error: any) {
      console.error("Erro ao carregar personal trainers:", error);
      toast({
        title: "Erro ao carregar personal trainers",
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

    const status = personal.assinatura?.status || "";
    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "ativo" &&
        personal.is_active &&
        ACTIVE_STATUSES.includes(status)) ||
      (statusFilter === "bloqueado" &&
        (!personal.is_active || status === "bloqueada")) ||
      (statusFilter === "suspenso" && status === "suspensa") ||
      (statusFilter === "com-assinatura" && personal.assinatura) ||
      (statusFilter === "sem-assinatura" && !personal.assinatura) ||
      (statusFilter === "trial" && status === "trial");

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: personals.length,
    comAssinatura: personals.filter((p) => p.assinatura).length,
    semAssinatura: personals.filter((p) => !p.assinatura).length,
    ativos: personals.filter(
      (p) =>
        p.is_active &&
        ACTIVE_STATUSES.includes(p.assinatura?.status || "")
    ).length,
    bloqueados: personals.filter((p) => !p.is_active).length,
    totalAlunos: personals.reduce(
      (sum, p) => sum + p.estatisticas.totalAlunos,
      0
    ),
    controlePorPagamento: personals.filter((p) => p.controleAlunosPorPagamento)
      .length,
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const getStatusBadge = (personal: Personal) => {
    const status = personal.assinatura?.status;

    if (!personal.is_active) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          <XCircle className="h-3 w-3 mr-1" />
          {status === "suspensa" ? "Suspenso" : "Bloqueado"}
        </Badge>
      );
    }

    if (!personal.assinatura) {
      return (
        <Badge variant="outline" className="border-gray-300">
          <XCircle className="h-3 w-3 mr-1" />
          Sem assinatura
        </Badge>
      );
    }

    if (status === "ativa" || status === "ativo") {
      return (
        <Badge className="bg-success-muted text-success border-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ativo
        </Badge>
      );
    }

    if (status === "trial") {
      return <Badge className="bg-info-muted text-info border-info/20">Trial</Badge>;
    }

    if (status === "suspensa") {
      return (
        <Badge className="bg-warning-muted text-warning border-warning/20">
          Suspenso
        </Badge>
      );
    }

    return <Badge variant="outline">{status}</Badge>;
  };

  const handleChangeAccessStatus = async (
    personal: Personal,
    status: "ativa" | "bloqueada" | "suspensa"
  ) => {
    try {
      setSavingPersonalId(personal.id);
      const shouldActivate = status === "ativa";
      const now = new Date().toISOString();

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_active: shouldActivate, updated_at: now })
        .eq("id", personal.id);

      if (profileError) throw profileError;

      if (personal.assinatura?.id) {
        const { error: assinaturaError } = await supabase
          .from("assinaturas")
          .update({
            status,
            data_cancelamento: shouldActivate ? null : now,
            data_fim: shouldActivate ? null : now,
            updated_at: now,
          })
          .eq("id", personal.assinatura.id);

        if (assinaturaError) throw assinaturaError;
      }

      toast({
        title: "Acesso atualizado",
        description:
          status === "ativa"
            ? "Personal ativado com sucesso."
            : `Personal ${status} com sucesso.`,
      });
      await fetchPersonals();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar acesso",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingPersonalId(null);
    }
  };

  const handleChangePlano = async (personal: Personal, planoId: string) => {
    const plano = planos.find((item) => item.id === planoId);
    if (!plano) return;

    try {
      setSavingPersonalId(personal.id);
      const now = new Date().toISOString();

      if (personal.assinatura?.id) {
        const { error } = await supabase
          .from("assinaturas")
          .update({
            plano_id: plano.id,
            valor_mensal: plano.preco_mensal,
            status: "ativa",
            data_fim: null,
            data_cancelamento: null,
            updated_at: now,
          })
          .eq("id", personal.assinatura.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("assinaturas").insert({
          personal_id: personal.id,
          plano_id: plano.id,
          status: "ativa",
          valor_mensal: plano.preco_mensal,
          data_inicio: now.split("T")[0],
          trial: false,
        });

        if (error) throw error;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_active: true, updated_at: now })
        .eq("id", personal.id);

      if (profileError) throw profileError;

      toast({
        title: "Plano atualizado",
        description: `${personal.nome} agora esta no plano ${plano.nome}.`,
      });
      await fetchPersonals();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar plano",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingPersonalId(null);
    }
  };

  const handleChangeStudentAccessMode = async (
    personal: Personal,
    mode: StudentAccessMode
  ) => {
    const controlePorPagamento = mode === "pagamento";

    try {
      setSavingPersonalId(personal.id);

      const { error } = await supabase.from("personal_settings").upsert(
        {
          personal_id: personal.id,
          controle_acesso_por_pagamento: controlePorPagamento,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "personal_id" }
      );

      if (error) throw error;

      const { error: alunosError } = await supabase
        .from("profiles")
        .update({ controle_acesso_por_pagamento: null })
        .eq("personal_id", personal.id);

      if (alunosError) throw alunosError;

      setPersonals((prev) =>
        prev.map((item) =>
          item.id === personal.id
            ? { ...item, controleAlunosPorPagamento: controlePorPagamento }
            : item
        )
      );

      toast({
        title: "Acesso dos alunos atualizado",
        description: controlePorPagamento
          ? `Todos os alunos de ${personal.nome} dependerao de pagamento ativo.`
          : `Todos os alunos de ${personal.nome} acessarao com login e senha liberados pelo personal.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar acesso dos alunos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingPersonalId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando personal trainers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-success-muted/40">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{stats.ativos}</div>
            <p className="text-xs text-success">Ativos</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">
              {stats.bloqueados}
            </div>
            <p className="text-xs text-destructive">Bloqueados</p>
          </CardContent>
        </Card>
        <Card className="border-info/20 bg-info-muted/40">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-info">
              {stats.comAssinatura}
            </div>
            <p className="text-xs text-info">Com assinatura</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-accent/40">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">
              {stats.totalAlunos}
            </div>
            <p className="text-xs text-foreground">Total alunos</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {stats.controlePorPagamento}
            </div>
            <p className="text-xs text-primary">Acesso por pagamento</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Personal Trainers</span>
            <Badge variant="outline">{stats.semAssinatura} sem assinatura</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                "todos",
                "ativo",
                "bloqueado",
                "suspenso",
                "trial",
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

          <div className="space-y-3">
            {filteredPersonals.map((personal) => {
              const saving = savingPersonalId === personal.id;
              return (
                <div
                  key={personal.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                >
                  <div className="flex flex-col xl:flex-row gap-4 xl:items-start xl:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-semibold text-lg">{personal.nome}</h4>
                        {getStatusBadge(personal)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="truncate">{personal.email}</span>
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
                            Cadastro {formatDisplayDate(personal.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-3 bg-muted/50 rounded-md">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Plano</p>
                          <p className="font-semibold text-sm">
                            {personal.assinatura?.plano || "Sem plano"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Valor mensal
                          </p>
                          <p className="font-semibold text-sm text-primary">
                            {formatCurrency(personal.assinatura?.valor || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Total alunos
                          </p>
                          <p className="font-semibold text-sm">
                            {personal.estatisticas.totalAlunos}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Alunos ativos
                          </p>
                          <p className="font-semibold text-sm text-success">
                            {personal.estatisticas.alunosAtivos}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Acesso alunos
                          </p>
                          <p className="font-semibold text-sm">
                            {personal.controleAlunosPorPagamento
                              ? "Por pagamento"
                              : "Login e senha"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full xl:w-80 space-y-3">
                      <div className="rounded-md border p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">Acesso dos alunos</p>
                            <p className="text-xs text-muted-foreground">
                              Define como todos os alunos deste personal entram na plataforma.
                            </p>
                          </div>
                          {personal.controleAlunosPorPagamento ? (
                            <CreditCard className="h-4 w-4 text-primary" />
                          ) : (
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <Select
                          value={
                            personal.controleAlunosPorPagamento
                              ? "pagamento"
                              : "login"
                          }
                          onValueChange={(value) =>
                            handleChangeStudentAccessMode(
                              personal,
                              value as StudentAccessMode
                            )
                          }
                          disabled={saving}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Modo de acesso dos alunos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pagamento">
                              Controlar por pagamento dos planos
                            </SelectItem>
                            <SelectItem value="login">
                              Liberar por login e senha do personal
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Select
                        value={personal.assinatura?.planoId || "sem-plano"}
                        onValueChange={(planoId) =>
                          planoId !== "sem-plano" &&
                          handleChangePlano(personal, planoId)
                        }
                        disabled={saving || planos.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Associar plano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sem-plano" disabled>
                            Selecione um plano
                          </SelectItem>
                          {planos.map((plano) => (
                            <SelectItem
                              key={plano.id}
                              value={plano.id}
                              disabled={!plano.ativo}
                            >
                              {plano.nome} - {formatCurrency(plano.preco_mensal)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving || personal.is_active}
                          onClick={() => handleChangeAccessStatus(personal, "ativa")}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                          <span className="sr-only">Ativar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving || !personal.is_active}
                          onClick={() =>
                            handleChangeAccessStatus(personal, "bloqueada")
                          }
                        >
                          <ShieldAlert className="h-4 w-4" />
                          <span className="sr-only">Bloquear</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={saving || personal.assinatura?.status === "suspensa"}
                          onClick={() =>
                            handleChangeAccessStatus(personal, "suspensa")
                          }
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="sr-only">Suspender</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A troca de plano reativa o personal e libera os recursos
                        definidos no plano selecionado.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

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
