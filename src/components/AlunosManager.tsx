import { useState, useEffect } from "react";
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
  Calendar,
  Eye,
  Users,
  FileText,
} from "lucide-react";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { format } from "date-fns";
import { AppLayout } from "@/components/AppLayout";

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
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunosFiltrados, setAlunosFiltrados] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "ativos" | "inativos"
  >("todos");
  const [ordenacao, setOrdenacao] = useState<"nome" | "recente" | "antigo">(
    "nome"
  );

  const [novoAluno, setNovoAluno] = useState({
    nome: "",
    email: "",
    password: "",
    telefone: "",
  });

  const { settings: personalSettings } = usePersonalSettings(user?.id);

  useEffect(() => {
    if (user) {
      fetchAlunos();
    }
  }, [user]);

  useEffect(() => {
    filtrarEOrdenarAlunos();
  }, [alunos, searchTerm, filtroStatus, ordenacao]);

  const fetchAlunos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("personal_id", user.id)
        .order("nome");

      if (error) throw error;
      setAlunos(data || []);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
      toast({
        title: "Erro ao carregar alunos",
        description: "Ocorreu um erro ao buscar a lista de alunos",
        variant: "destructive",
      });
    }
  };

  const filtrarEOrdenarAlunos = () => {
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

    setAlunosFiltrados(resultado);
  };

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
      await supabase.from("user_roles").delete().eq("user_id", alunoId);

      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", alunoId);

      if (error) throw error;

      toast({
        title: "Aluno removido",
        description: "Aluno removido com sucesso",
      });

      fetchAlunos();
    } catch (error: any) {
      toast({
        title: "Erro ao remover aluno",
        description: error.message,
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
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Gerenciar Alunos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {alunosFiltrados.length} de {alunos.length} alunos
              </p>
            </div>

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
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Alunos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alunos.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Alunos Ativos
              </CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {alunosAtivos}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Alunos Inativos
              </CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {alunosInativos}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-2">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alunosFiltrados.map((aluno) => (
              <Card
                key={aluno.id}
                className="group hover:shadow-xl transition-all duration-300 border-2 cursor-pointer relative overflow-hidden touch-target"
                onClick={() => navigate(`/aluno/${aluno.id}`)}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    aluno.is_active ? "bg-green-500" : "bg-red-500"
                  }`}
                />

                <div className="absolute top-3 right-3">
                  {aluno.is_active ? (
                    <Badge className="bg-green-600 hover:bg-green-700">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <UserX className="h-3 w-3 mr-1" />
                      Bloqueado
                    </Badge>
                  )}
                </div>

                <CardContent className="pt-6 pl-5">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                        {aluno.nome}
                      </h3>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{aluno.email}</span>
                      </div>

                      {aluno.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{aluno.telefone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Cadastrado em{" "}
                          {format(new Date(aluno.created_at), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>

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
                            <AlertDialogTitle>
                              Confirmar Exclusão
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover{" "}
                              <strong>{aluno.nome}</strong>? Esta ação não pode
                              ser desfeita e todos os dados do aluno serão
                              permanentemente excluídos.
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
            ))}
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
