import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  UserPlus,
  Trash2,
  UserCheck,
  UserX,
  Search,
  ArrowUpDown,
  Filter,
  Mail,
  Phone,
  Eye,
  Users,
  Dumbbell,
  Activity,
  AlertTriangle,
  Flame,
  Clock,
  Calendar,
  FileWarning,
  Palette,
  Bell,
  Settings as SettingsIcon,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";

import { AppLayout } from "@/components/AppLayout";
import { usePriorityStudents } from "@/hooks/usePriorityStudents";
import { useAlunosQuickStatus } from "@/hooks/useAlunosQuickStatus";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AlunosManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 🔧 Filtros persistidos em sessionStorage para preservar estado entre navegações
  const FILTERS_KEY = "alunos-filters";
  const initialFilters = (() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { searchTerm: "", filtroStatus: "todos", ordenacao: "nome" };
  })();

  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>(initialFilters.searchTerm);
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "ativos" | "inativos"
  >(initialFilters.filtroStatus);
  const [ordenacao, setOrdenacao] = useState<"nome" | "recente" | "antigo">(
    initialFilters.ordenacao
  );

  const [novoAluno, setNovoAluno] = useState({
    nome: "",
    email: "",
    password: "",
    telefone: "",
  });

  const { settings: personalSettings } = usePersonalSettings(user?.id);
  const { flagsByStudent } = usePriorityStudents(user?.id);
  const { statusByAluno } = useAlunosQuickStatus(user?.id);

  // 🎨 Cores customizadas por aluno (persistidas em localStorage)
  const COLOR_KEY = "alunos-card-colors";
  const [coresCustom, setCoresCustom] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(COLOR_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const setCorAluno = (id: string, cor: string | null) => {
    setCoresCustom((prev) => {
      const next = { ...prev };
      if (!cor) delete next[id];
      else next[id] = cor;
      try {
        localStorage.setItem(COLOR_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // 🔔 Preferências de notificações exibidas nos cards (persistidas)
  const NOTIF_PREFS_KEY = "alunos-card-notif-prefs";
  const NOTIF_TYPES: { id: string; label: string }[] = [
    { id: "treino_hoje", label: "Treinou hoje / Sem treino" },
    { id: "dias_ultimo_treino", label: "Dias desde último treino" },
    { id: "semana_treinos", label: "Treinos concluídos na semana" },
    { id: "plano_vencendo", label: "Plano vencendo" },
    { id: "plano_vencido", label: "Plano vencido" },
    { id: "pagamento_pendente", label: "Pagamento pendente/atrasado" },
    { id: "planilha_vencendo", label: "Planilha expirando" },
    { id: "planilha_vencida", label: "Planilha vencida" },
    { id: "feedback_nao_respondido", label: "Feedback sem resposta" },
    { id: "mensagem_nao_lida", label: "Mensagem não lida" },
  ];
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return Object.fromEntries(NOTIF_TYPES.map((n) => [n.id, true]));
  });
  const [openNotifSettings, setOpenNotifSettings] = useState(false);
  const toggleNotifPref = (id: string) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // 🔧 Persistir filtros sempre que mudarem
  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({ searchTerm, filtroStatus, ordenacao })
      );
    } catch {}
  }, [searchTerm, filtroStatus, ordenacao]);

  // 🔧 React Query: cache compartilhado, sem refetch desnecessário entre navegações
  const { data: alunos = [] } = useQuery<Aluno[]>({
    queryKey: ["alunos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("personal_id", user.id)
        .order("nome");
      if (error) throw error;
      return (data as Aluno[]) || [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const fetchAlunos = () => {
    queryClient.invalidateQueries({ queryKey: ["alunos", user?.id] });
  };

  const alunosFiltrados = useMemo(() => {
    let resultado = [...alunos];

    if (searchTerm) {
      resultado = resultado.filter(
        (aluno) =>
          aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          aluno.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filtroStatus === "ativos") {
      resultado = resultado.filter((aluno) => aluno.is_active);
    } else if (filtroStatus === "inativos") {
      resultado = resultado.filter((aluno) => !aluno.is_active);
    }

    resultado.sort((a, b) => {
      if (ordenacao === "nome") {
        return a.nome.localeCompare(b.nome);
      } else if (ordenacao === "recente") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
    });

    return resultado;
  }, [alunos, searchTerm, filtroStatus, ordenacao]);

  const handleCreateAluno = async () => {
    if (!novoAluno.nome || !novoAluno.email || !novoAluno.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const dados = {
      ...novoAluno,
      personal_id: user?.id,
    };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const { data, error } = await supabase.functions.invoke(
        "create-aluno-user",
        {
          body: dados,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        if (
          error.message?.includes("Email já cadastrado") ||
          error.message?.includes("already been registered")
        ) {
          throw new Error(
            "Este email já está cadastrado. Use um email diferente."
          );
        }
        throw error;
      }

      if (data?.error) {
        if (data.error.includes("Email já cadastrado")) {
          throw new Error(
            "Este email já está cadastrado. Use um email diferente."
          );
        }
        throw new Error(data.error);
      }

      toast({
        title: "✅ Aluno criado!",
        description: "Aluno cadastrado com sucesso",
      });

      setNovoAluno({ nome: "", email: "", password: "", telefone: "" });
      setOpenDialog(false);
      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao criar aluno:", error);
      toast({
        title: "❌ Erro ao criar aluno",
        description: error.message || "Ocorreu um erro ao criar o aluno",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAluno = async (alunoId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const { data, error } = await supabase.functions.invoke(
        "delete-aluno-user",
        {
          body: { aluno_id: alunoId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "✅ Aluno removido",
        description: "Aluno e todos os dados foram removidos com sucesso",
      });

      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao remover aluno:", error);
      toast({
        title: "❌ Erro ao remover aluno",
        description: error.message || "Ocorreu um erro ao remover o aluno",
        variant: "destructive",
      });
    }
  };

  const alunosAtivos = alunos.filter((a) => a.is_active).length;
  const alunosInativos = alunos.filter((a) => !a.is_active).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header
        className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm"
        style={{
          borderColor: personalSettings?.theme_color
            ? `${personalSettings.theme_color}20`
            : undefined,
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Gerenciar Alunos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {alunosFiltrados.length} de {alunos.length} alunos
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={openNotifSettings} onOpenChange={setOpenNotifSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="default" title="Gerenciar notificações dos cards">
                    <SettingsIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Notificações</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notificações exibidas nos cards</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Selecione quais informações devem aparecer ao clicar em "Notificações" no card de cada aluno.
                  </p>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {NOTIF_TYPES.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/40"
                      >
                        <Label htmlFor={`notif-${t.id}`} className="text-sm font-normal cursor-pointer">
                          {t.label}
                        </Label>
                        <Switch
                          id={`notif-${t.id}`}
                          checked={!!notifPrefs[t.id]}
                          onCheckedChange={() => toggleNotifPref(t.id)}
                        />
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button
                  size="default"
                  style={{
                    backgroundColor: personalSettings?.theme_color || undefined,
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo Aluno
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={novoAluno.nome}
                      onChange={(e) =>
                        setNovoAluno({ ...novoAluno, nome: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={novoAluno.email}
                      onChange={(e) =>
                        setNovoAluno({ ...novoAluno, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha Inicial *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={novoAluno.password}
                      onChange={(e) =>
                        setNovoAluno({
                          ...novoAluno,
                          password: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo 6 caracteres
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={novoAluno.telefone}
                      onChange={(e) =>
                        setNovoAluno({
                          ...novoAluno,
                          telefone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Button
                    onClick={handleCreateAluno}
                    className="w-full"
                    disabled={loading}
                    style={{
                      backgroundColor:
                        personalSettings?.theme_color || undefined,
                    }}
                  >
                    {loading ? "Cadastrando..." : "Cadastrar Aluno"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
              <CardTitle className="text-[11px] sm:text-sm font-medium leading-tight">
                Total
              </CardTitle>
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{alunos.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
              <CardTitle className="text-[11px] sm:text-sm font-medium leading-tight">
                Ativos
              </CardTitle>
              <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {alunosAtivos}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
              <CardTitle className="text-[11px] sm:text-sm font-medium leading-tight">
                Bloqueados
              </CardTitle>
              <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {alunosInativos}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-2">
          <CardContent className="p-4 sm:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={filtroStatus}
                onValueChange={(value: any) => setFiltroStatus(value)}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Alunos</SelectItem>
                  <SelectItem value="ativos">Apenas Ativos</SelectItem>
                  <SelectItem value="inativos">Apenas Bloqueados</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={ordenacao}
                onValueChange={(value: any) => setOrdenacao(value)}
              >
                <SelectTrigger>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Ordem Alfabética</SelectItem>
                  <SelectItem value="recente">Mais Recentes</SelectItem>
                  <SelectItem value="antigo">Mais Antigos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {alunosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {alunosFiltrados.map((aluno) => {
              const flags = flagsByStudent[aluno.id] || [];
              const hasHighPriority = flags.some((f) => f.severity === "alta");
              const hasPlanilha = flags.some(
                (f) => f.reason === "planilha_vencendo" || f.reason === "planilha_vencida"
              );
              const hasPriority = flags.length > 0;
              const status = statusByAluno[aluno.id];
              const corCustom = coresCustom[aluno.id];

              const prioridade: "bloqueado" | "urgente" | "atencao" | "importante" | "ativo" = !aluno.is_active
                ? "bloqueado"
                : hasHighPriority
                ? "urgente"
                : hasPlanilha
                ? "atencao"
                : hasPriority
                ? "importante"
                : "ativo";

              const prioridadeStyles = {
                bloqueado: { ring: "border-muted", bar: "bg-muted-foreground", chip: "bg-muted text-muted-foreground", icon: UserX, label: "Bloqueado" },
                urgente:   { ring: "border-destructive/50 ring-1 ring-destructive/20", bar: "bg-destructive", chip: "bg-destructive text-destructive-foreground", icon: Flame, label: "Urgente" },
                atencao:   { ring: "border-yellow-500/60 ring-1 ring-yellow-500/20", bar: "bg-yellow-500", chip: "bg-yellow-500 text-black", icon: FileWarning, label: "Atenção" },
                importante:{ ring: "border-orange-500/50", bar: "bg-orange-500", chip: "bg-orange-500 text-white", icon: AlertTriangle, label: "Importante" },
                ativo:     { ring: "", bar: "bg-green-500", chip: "bg-green-600 text-white", icon: UserCheck, label: "Ativo" },
              }[prioridade];

              const PrioIcon = prioridadeStyles.icon;
              const corPalette = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

              return (
                <Card
                  key={aluno.id}
                  className={`group hover:shadow-xl transition-all duration-300 border-2 cursor-pointer relative overflow-hidden touch-target ${corCustom ? "" : prioridadeStyles.ring}`}
                  style={corCustom ? { borderColor: corCustom, boxShadow: `0 0 0 1px ${corCustom}33` } : undefined}
                  onClick={() => navigate(`/aluno/${aluno.id}`)}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${corCustom ? "" : prioridadeStyles.bar}`}
                    style={corCustom ? { backgroundColor: corCustom } : undefined}
                  />

                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Badge className={`${prioridadeStyles.chip} gap-1 text-[10px] py-0.5 px-2`}>
                      <PrioIcon className="h-3 w-3" />
                      {prioridadeStyles.label}
                    </Badge>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Personalizar cor">
                          <Palette className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="end">
                        <div className="grid grid-cols-4 gap-1.5">
                          {corPalette.map((c) => (
                            <button
                              key={c}
                              onClick={() => setCorAluno(aluno.id, c)}
                              className="h-6 w-6 rounded-full border-2 border-background hover:scale-110 transition-transform"
                              style={{ backgroundColor: c }}
                              aria-label={`Cor ${c}`}
                            />
                          ))}
                        </div>
                        {corCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 h-7 text-xs"
                            onClick={() => setCorAluno(aluno.id, null)}
                          >
                            Remover cor
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <CardContent className="pt-10 pl-4 sm:pl-5 pr-3 pb-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-base leading-tight pr-2 group-hover:text-primary transition-colors truncate">
                          {aluno.nome}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{aluno.email}</span>
                        </div>
                      </div>

                      {(() => {
                        // Montar lista de notificações ativas conforme preferências
                        type Item = { id: string; label: string; detail?: string; tone: "ok" | "info" | "warn" | "alert"; icon: any };
                        const items: Item[] = [];
                        if (notifPrefs.treino_hoje) {
                          items.push({
                            id: "treino_hoje",
                            label: status?.treinouHoje ? "Treinou hoje" : "Sem treino hoje",
                            tone: status?.treinouHoje ? "ok" : "info",
                            icon: Dumbbell,
                          });
                        }
                        if (notifPrefs.dias_ultimo_treino && status?.diasDesdeUltimoTreino != null) {
                          items.push({
                            id: "dias_ultimo_treino",
                            label: status.diasDesdeUltimoTreino === 0 ? "Ativo hoje" : `Último treino há ${status.diasDesdeUltimoTreino}d`,
                            tone: "info",
                            icon: Activity,
                          });
                        }
                        if (notifPrefs.semana_treinos && status && status.totalSemana > 0) {
                          items.push({
                            id: "semana_treinos",
                            label: `${status.concluidosSemana}/${status.totalSemana} treinos na semana`,
                            tone: "info",
                            icon: Clock,
                          });
                        }
                        const flagIcon: Record<string, any> = {
                          plano_vencendo: Calendar => Calendar,
                          plano_vencido: AlertTriangle,
                          pagamento_pendente: CreditCard,
                          planilha_vencendo: FileWarning,
                          planilha_vencida: FileWarning,
                          feedback_nao_respondido: MessageSquare,
                          mensagem_nao_lida: MessageSquare,
                        };
                        flags.forEach((f) => {
                          if (!notifPrefs[f.reason]) return;
                          items.push({
                            id: f.reason,
                            label: f.label,
                            detail: f.detail,
                            tone: f.severity === "alta" ? "alert" : "warn",
                            icon: flagIcon[f.reason] || AlertTriangle,
                          });
                        });

                        const toneClass: Record<Item["tone"], string> = {
                          ok: "text-green-700 dark:text-green-400",
                          info: "text-muted-foreground",
                          warn: "text-orange-600 dark:text-orange-400",
                          alert: "text-destructive",
                        };
                        const count = items.length;
                        const hasAlert = items.some((i) => i.tone === "alert");
                        const hasWarn = items.some((i) => i.tone === "warn");

                        return (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`w-full justify-start gap-2 h-8 ${
                                    hasAlert ? "border-destructive/40" : hasWarn ? "border-orange-500/40" : ""
                                  }`}
                                >
                                  <Bell className={`h-3.5 w-3.5 ${hasAlert ? "text-destructive" : hasWarn ? "text-orange-500" : ""}`} />
                                  <span className="text-xs">Notificações</span>
                                  <Badge
                                    variant={hasAlert ? "destructive" : "secondary"}
                                    className="ml-auto h-4 px-1.5 text-[10px]"
                                  >
                                    {count}
                                  </Badge>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-0" align="start">
                                <div className="p-3 border-b">
                                  <p className="text-sm font-semibold">Notificações de {aluno.nome.split(" ")[0]}</p>
                                  <p className="text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</p>
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                  {count === 0 ? (
                                    <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação ativa</p>
                                  ) : (
                                    items.map((it, i) => {
                                      const Icon = it.icon;
                                      return (
                                        <div key={`${it.id}-${i}`} className="flex items-start gap-2 px-3 py-2 border-b last:border-0">
                                          <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${toneClass[it.tone]}`} />
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-medium ${toneClass[it.tone]}`}>{it.label}</p>
                                            {it.detail && (
                                              <p className="text-[11px] text-muted-foreground">{it.detail}</p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        );
                      })()}

                      <div
                        className="pt-3 flex gap-2 border-t"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/aluno/${aluno.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Perfil
                        </Button>

                        {aluno.telefone && (
                          <Button variant="outline" size="sm" asChild title={aluno.telefone}>
                            <a href={`tel:${aluno.telefone}`} onClick={(e) => e.stopPropagation()}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover <strong>{aluno.nome}</strong>?
                                Esta ação não pode ser desfeita e todos os dados do aluno
                                serão permanentemente excluídos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAluno(aluno.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Remover Aluno
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-2">
            <CardContent className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                <UserX className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nenhum aluno encontrado
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchTerm || filtroStatus !== "todos"
                  ? "Tente ajustar os filtros de busca"
                  : "Comece cadastrando seu primeiro aluno"}
              </p>
              {!searchTerm && filtroStatus === "todos" && (
                <Button
                  onClick={() => setOpenDialog(true)}
                  style={{
                    backgroundColor: personalSettings?.theme_color || undefined,
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar Primeiro Aluno
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
