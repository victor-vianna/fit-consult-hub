import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dumbbell,
  LogOut,
  Users,
  UserPlus,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppLayout } from "@/components/AppLayout";

interface Profile {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
}

interface PersonalWithAlunos extends Profile {
  alunos: Profile[];
}

export default function Admin() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [personals, setPersonals] = useState<PersonalWithAlunos[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [totalPersonals, setTotalPersonals] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Buscar contagens de roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role, user_id");

      if (rolesData) {
        const personalCount = rolesData.filter(
          (r) => r.role === "personal"
        ).length;
        const alunoCount = rolesData.filter((r) => r.role === "aluno").length;
        const adminCount = rolesData.filter((r) => r.role === "admin").length;
        const uniqueUsers = new Set(rolesData.map((r) => r.user_id));

        setTotalPersonals(personalCount);
        setTotalAlunos(alunoCount);
        setTotalAdmins(adminCount);
        setTotalUsuarios(uniqueUsers.size);
      }

      // Buscar personals
      const { data: personalRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "personal");

      if (!personalRoles) return;

      const personalIds = personalRoles.map((r) => r.user_id);
      const { data: personalProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", personalIds);

      if (!personalProfiles) return;

      // ✅ CORREÇÃO: Buscar TODOS os alunos de uma vez (1 query ao invés de N)
      const { data: todosAlunos } = await supabase
        .from("profiles")
        .select("*")
        .in("personal_id", personalIds);

      // ✅ Agrupar alunos por personal (em memória, sem queries)
      const personalsComAlunos = personalProfiles.map((personal) => ({
        ...personal,
        alunos:
          todosAlunos?.filter((aluno) => aluno.personal_id === personal.id) ||
          [],
      }));

      setPersonals(personalsComAlunos);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleCreatePersonal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const dados = {
      nome: formData.get("nome") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      telefone: formData.get("telefone") as string,
    };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const { data, error } = await supabase.functions.invoke(
        "create-personal-user",
        {
          body: dados,
          headers: {
            Authorization: `Bearer ${session.access_token}`, // ✅ Agora funciona
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Personal criado!",
        description: "Personal trainer cadastrado com sucesso",
      });

      setOpenDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar personal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePersonal = async (personalId: string) => {
    try {
      // Deletar role
      await supabase.from("user_roles").delete().eq("user_id", personalId);

      // Deletar profile (cascade deleta user)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", personalId);

      if (error) throw error;

      toast({
        title: "Personal removido",
        description: "Personal trainer removido com sucesso",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao remover personal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">FitConsult</h1>
                <p className="text-sm text-muted-foreground">
                  Painel do Administrador
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Personal Trainers
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPersonals}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Alunos</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAlunos}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Administradores
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAdmins}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Usuários
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsuarios}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Personal Trainers</CardTitle>
                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Novo Personal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Personal Trainer</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreatePersonal} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome</Label>
                        <Input id="nome" name="nome" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          minLength={6}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input id="telefone" name="telefone" type="tel" />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? "Criando..." : "Criar Personal"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {personals.map((personal) => (
                <Collapsible
                  key={personal.id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{personal.nome}</h3>
                        <Badge variant="secondary">Personal</Badge>
                        <Badge variant="outline">
                          {personal.alunos.length} alunos
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {personal.email}
                      </p>
                      {personal.telefone && (
                        <p className="text-sm text-muted-foreground">
                          {personal.telefone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Confirmar exclusão
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover este personal
                              trainer?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePersonal(personal.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <CollapsibleContent className="mt-4 space-y-2">
                    {personal.alunos.length > 0 ? (
                      personal.alunos.map((aluno) => (
                        <div
                          key={aluno.id}
                          className="pl-4 border-l-2 border-primary/20 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Aluno
                            </Badge>
                            <span className="font-medium text-sm">
                              {aluno.nome}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {aluno.email}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground pl-4">
                        Nenhum aluno cadastrado
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {personals.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum personal trainer cadastrado
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AppLayout>
  );
}
