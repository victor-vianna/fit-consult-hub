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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  UserPlus,
  Trash2,
  FileText,
  UserCheck,
  UserX,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarPersonal } from "@/components/AppSidebarPersonal";
import { PersonalSettingsDialog } from "@/components/PersonalSettingsDialog";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { MobileHeaderPersonal } from "@/components/mobile/MobileHeaderPersonal";
import { BottomNavigationPersonal } from "@/components/mobile/BottomNavigationPersonal";
import { MobileMenuDrawerPersonal } from "@/components/mobile/MobileMenuDrawerPersonal";
import { AppLayout } from "@/components/AppLayout";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  is_active: boolean;
}

export default function Personal() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [totalMateriais, setTotalMateriais] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { settings: personalSettings } = usePersonalSettings(user?.id);

  const alunosAtivos = alunos.filter((a) => a.is_active).length;
  const alunosInativos = alunos.filter((a) => !a.is_active).length;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      const { data: alunosData } = await supabase
        .from("profiles")
        .select("*")
        .eq("personal_id", user.id)
        .order("nome");

      setAlunos(alunosData || []);

      const { count } = await supabase
        .from("materiais")
        .select("*", { count: "exact", head: true })
        .eq("personal_id", user.id);

      setTotalMateriais(count || 0);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleCreateAluno = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const dados = {
      nome: formData.get("nome") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      telefone: formData.get("telefone") as string,
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
        // Trata erros específicos
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

      // Verifica se há erro na resposta
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

      e.currentTarget.reset(); // Limpa o formulário
      setOpenDialog(false);
      fetchData();
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

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao remover aluno",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Versão Mobile
  if (isMobile) {
    return (
      <AppLayout>
        <div className="flex flex-col min-h-screen bg-background">
          <MobileHeaderPersonal
            onMenuClick={() => setMenuOpen(true)}
            personalId={user?.id}
            personalSettings={personalSettings}
            profileName={profile?.nome}
          />

          <main className="flex-1 overflow-auto pb-20 px-4 pt-4">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">
                      Total Alunos
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{alunos.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">
                      Ativos
                    </CardTitle>
                    <UserCheck className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-600">
                    {alunosAtivos}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">
                      Inativos
                    </CardTitle>
                    <UserX className="h-4 w-4 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-red-600">
                    {alunosInativos}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">
                      Materiais
                    </CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{totalMateriais}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Meus Alunos</CardTitle>
                  <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        style={{
                          backgroundColor:
                            personalSettings?.theme_color || undefined,
                        }}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Novo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cadastrar Aluno</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateAluno} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="nome">Nome</Label>
                          <Input id="nome" name="nome" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                          />
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
                          style={{
                            backgroundColor:
                              personalSettings?.theme_color || undefined,
                          }}
                        >
                          {loading ? "Cadastrando..." : "Cadastrar Aluno"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alunos.map((aluno) => (
                    <Card
                      key={aluno.id}
                      className={`cursor-pointer hover:shadow-md transition-all relative ${
                        !aluno.is_active
                          ? "border-red-500 border-2 opacity-75"
                          : "border-green-500 border-2"
                      }`}
                      onClick={() => navigate(`/aluno/${aluno.id}`)}
                    >
                      <div className="absolute top-2 right-2">
                        {aluno.is_active ? (
                          <Badge className="bg-green-600 text-xs">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <UserX className="h-3 w-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                      </div>

                      <CardContent className="pt-4">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm">
                            {aluno.nome}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {aluno.email}
                          </p>
                          {aluno.telefone && (
                            <p className="text-xs text-muted-foreground">
                              {aluno.telefone}
                            </p>
                          )}
                          <div
                            className="pt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive mr-2" />
                                  Remover
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmar exclusão
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover este aluno?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAluno(aluno.id)}
                                  >
                                    Remover
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
                {alunos.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    Nenhum aluno cadastrado
                  </p>
                )}
              </CardContent>
            </Card>
          </main>

          <BottomNavigationPersonal
            onMenuClick={() => setMenuOpen(true)}
            themeColor={personalSettings?.theme_color}
          />

          <MobileMenuDrawerPersonal
            open={menuOpen}
            onOpenChange={setMenuOpen}
            personalSettings={personalSettings}
            onSignOut={signOut}
          />
        </div>
      </AppLayout>
    );
  }

  // Versão Desktop
  return (
    <AppLayout>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebarPersonal />

          <div className="flex-1 flex flex-col">
            <header
              className="border-b backdrop-blur-sm sticky top-0 z-10"
              style={{
                backgroundColor: personalSettings?.theme_color
                  ? `${personalSettings.theme_color}10`
                  : "hsl(var(--card) / 0.5)",
                borderColor: personalSettings?.theme_color
                  ? `${personalSettings.theme_color}30`
                  : "hsl(var(--border))",
              }}
            >
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />

                  {personalSettings?.logo_url && (
                    <div className="relative">
                      <img
                        src={personalSettings.logo_url}
                        alt="Logo"
                        className="h-12 w-12 rounded-full object-cover border-2"
                        style={{
                          borderColor:
                            personalSettings.theme_color || "#3b82f6",
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <h1
                      className="text-xl font-bold"
                      style={{
                        color: personalSettings?.theme_color || "inherit",
                      }}
                    >
                      {personalSettings?.display_name || "FitConsult"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {profile?.nome}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {user?.id && <PersonalSettingsDialog personalId={user.id} />}
                  <ThemeToggle />
                  <Button variant="outline" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-auto">
              <div className="container mx-auto px-4 py-8">
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

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        Materiais Enviados
                      </CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalMateriais}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Meus Alunos</CardTitle>
                      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                        <DialogTrigger asChild>
                          <Button
                            style={{
                              backgroundColor:
                                personalSettings?.theme_color || undefined,
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Novo Aluno
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cadastrar Aluno</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={handleCreateAluno}
                            className="space-y-4"
                          >
                            <div className="space-y-2">
                              <Label htmlFor="nome">Nome</Label>
                              <Input id="nome" name="nome" required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                              />
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
                              style={{
                                backgroundColor:
                                  personalSettings?.theme_color || undefined,
                              }}
                            >
                              {loading ? "Cadastrando..." : "Cadastrar Aluno"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {alunos.map((aluno) => (
                        <Card
                          key={aluno.id}
                          className={`cursor-pointer hover:shadow-lg transition-all relative ${
                            !aluno.is_active
                              ? "border-red-500 border-2 opacity-75"
                              : "border-green-500 border-2"
                          }`}
                          onClick={() => navigate(`/aluno/${aluno.id}`)}
                        >
                          <div className="absolute top-2 right-2">
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

                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{aluno.nome}</h3>
                                <Badge variant="secondary" className="text-xs">
                                  Aluno
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {aluno.email}
                              </p>
                              {aluno.telefone && (
                                <p className="text-sm text-muted-foreground">
                                  {aluno.telefone}
                                </p>
                              )}
                              <div
                                className="pt-2 flex gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Confirmar exclusão
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja remover este
                                        aluno?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleDeleteAluno(aluno.id)
                                        }
                                      >
                                        Remover
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
                    {alunos.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum aluno cadastrado
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AppLayout>
  );
}
