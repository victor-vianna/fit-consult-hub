import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Users, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarPersonal } from "@/components/AppSidebarPersonal";
import { PersonalSettingsDialog } from "@/components/PersonalSettingsDialog";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { MobileHeaderPersonal } from "@/components/mobile/MobileHeaderPersonal";
import { BottomNavigationPersonal } from "@/components/mobile/BottomNavigationPersonal";
import { MobileMenuDrawerPersonal } from "@/components/mobile/MobileMenuDrawerPersonal";
import { AppLayout } from "@/components/AppLayout";
import { PersonalDashboardCards } from "@/components/dashboard/PersonalDashboardCards";
import { LojaPlaceholder } from "@/components/loja/LojaPlaceholder";
interface Aluno {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  is_active: boolean;
}
export default function Personal() {
  const navigate = useNavigate();
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [totalMateriais, setTotalMateriais] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const {
    settings: personalSettings
  } = usePersonalSettings(user?.id);
  const alunosAtivos = alunos.filter(a => a.is_active).length;
  const alunosInativos = alunos.filter(a => !a.is_active).length;
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
      const {
        data: profileData
      } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);
      const {
        data: alunosData
      } = await supabase.from("profiles").select("*").eq("personal_id", user.id).order("nome");
      setAlunos(alunosData || []);
      const {
        count
      } = await supabase.from("materiais").select("*", {
        count: "exact",
        head: true
      }).eq("personal_id", user.id);
      setTotalMateriais(count || 0);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };
  const handleCreateAluno = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    const formData = new FormData(form);
    const dados = {
      nome: formData.get("nome") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      telefone: formData.get("telefone") as string,
      personal_id: user?.id
    };
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }
      const {
        data,
        error
      } = await supabase.functions.invoke("create-aluno-user", {
        body: dados,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) {
        // Trata erros específicos
        if (error.message?.includes("Email já cadastrado") || error.message?.includes("already been registered")) {
          throw new Error("Este email já está cadastrado. Use um email diferente.");
        }
        throw error;
      }

      // Verifica se há erro na resposta
      if (data?.error) {
        if (data.error.includes("Email já cadastrado")) {
          throw new Error("Este email já está cadastrado. Use um email diferente.");
        }
        throw new Error(data.error);
      }
      toast({
        title: "✅ Aluno criado!",
        description: "Aluno cadastrado com sucesso"
      });
      form.reset(); // Limpa o formulário
      setOpenDialog(false);
      fetchData();
    } catch (error: any) {
      console.error("Erro ao criar aluno:", error);
      toast({
        title: "❌ Erro ao criar aluno",
        description: error.message || "Ocorreu um erro ao criar o aluno",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteAluno = async (alunoId: string) => {
    try {
      await supabase.from("user_roles").delete().eq("user_id", alunoId);
      const {
        error
      } = await supabase.from("profiles").delete().eq("id", alunoId);
      if (error) throw error;
      toast({
        title: "Aluno removido",
        description: "Aluno removido com sucesso"
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao remover aluno",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Versão Mobile
  if (isMobile) {
    return <AppLayout>
        <div className="flex flex-col min-h-screen bg-background">
          <MobileHeaderPersonal onMenuClick={() => setMenuOpen(true)} personalId={user?.id} personalSettings={personalSettings} profileName={profile?.nome} />

          <main className="flex-1 overflow-auto pb-20 px-4 pt-4 space-y-4">
            {/* Dashboard Cards para Mobile */}
            {user?.id && <PersonalDashboardCards personalId={user.id} themeColor={personalSettings?.theme_color} />}

            {/* Card de Acesso aos Alunos */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Meus Alunos
                  </CardTitle>
                  <Button size="sm" onClick={() => navigate("/alunos")} className="text-xs" style={{
                  backgroundColor: personalSettings?.theme_color || undefined
                }}>
                    <Users className="mr-1 h-4 w-4" />
                    Ver Todos
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="text-center pt-4 pb-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Gerencie todos os seus alunos em um só lugar
                </p>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/alunos")}>
                  <Users className="mr-2 h-4 w-4" />
                  Acessar Gerenciador
                </Button>
              </CardContent>
            </Card>

            {/* Loja Placeholder */}
            <LojaPlaceholder isPersonal={true} themeColor={personalSettings?.theme_color} />
          </main>

          <BottomNavigationPersonal onMenuClick={() => setMenuOpen(true)} themeColor={personalSettings?.theme_color} />

          <MobileMenuDrawerPersonal open={menuOpen} onOpenChange={setMenuOpen} personalSettings={personalSettings} onSignOut={signOut} />
        </div>
      </AppLayout>;
  }

  // Versão Desktop
  return <AppLayout>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebarPersonal />

          <div className="flex-1 flex flex-col">
            <header className="border-b backdrop-blur-sm sticky top-0 z-10" style={{
            backgroundColor: personalSettings?.theme_color ? `${personalSettings.theme_color}10` : "hsl(var(--card) / 0.5)",
            borderColor: personalSettings?.theme_color ? `${personalSettings.theme_color}30` : "hsl(var(--border))"
          }}>
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />

                  {personalSettings?.logo_url && <div className="relative">
                      <img src={personalSettings.logo_url} alt="Logo" className="h-12 w-12 rounded-full object-cover border-2" style={{
                    borderColor: personalSettings.theme_color || "#3b82f6"
                  }} />
                    </div>}

                  <div>
                    <h1 className="text-xl font-bold" style={{
                    color: personalSettings?.theme_color || "inherit"
                  }}>
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
              <div className="container mx-auto px-4 py-8 space-y-8">
                {/* Dashboard Inteligente */}
                {user?.id && <PersonalDashboardCards personalId={user.id} themeColor={personalSettings?.theme_color} />}

                {/* Grid com Cards de Acesso Rápido */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Card de Alunos */}
                  

                  {/* Loja Placeholder */}
                  <LojaPlaceholder isPersonal={true} themeColor={personalSettings?.theme_color} />
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AppLayout>;
}