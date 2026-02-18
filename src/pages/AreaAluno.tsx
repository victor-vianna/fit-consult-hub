import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarAluno } from "@/components/AppSidebarAluno";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import {
  Dumbbell,
  LogOut,
  Download,
  Eye,
  ListChecks,
  FileText,
  CreditCard,
  Home,
  Calendar,
  Library,
  MessageSquare,
} from "lucide-react";
import { StudentSubscriptionView } from "@/components/StudentSubscriptionView";
import { DocumentViewer } from "@/components/DocumentViewer";
import { format } from "date-fns";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CalendarioSemanal } from "@/components/CalendarioSemanal";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { TreinosManager } from "@/components/TreinosManager";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { BottomNavigation } from "@/components/mobile/BottomNavigation";
import { ActionCard } from "@/components/mobile/ActionCard";
import { CalendarioTreinosMensal } from "@/components/CalendarioTreinosMensal";
import Biblioteca from "./Biblioteca";
import { AppLayout } from "@/components/AppLayout";
import ExercisesLibrary from "@/components/ExercisesLibrary";
import { PlanilhaStatusCard } from "@/components/PlanilhaStatusCard";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useChatNaoLidas } from "@/hooks/useChatMessages";

interface Material {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  arquivo_url: string;
  arquivo_nome: string;
  created_at: string;
}

export default function AreaAluno() {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<any>(null);
  const [personalProfile, setPersonalProfile] = useState<any>(null);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [activeSection, setActiveSection] = useState("inicio");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const chatNaoLidas = useChatNaoLidas(user?.id || "");

  // Buscar configurações do personal
  const { settings: personalSettings } = usePersonalSettings(
    profile?.personal_id || undefined
  );

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Erro ao carregar perfil:", profileError);
        return;
      }

      setProfile(profileData);

      // Buscar telefone do personal
      if (profileData?.personal_id) {
        const { data: personalData } = await supabase
          .from("profiles")
          .select("telefone")
          .eq("id", profileData.personal_id)
          .single();

        setPersonalProfile(personalData);
      }

      const { data: materiaisData } = await supabase
        .from("materiais")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      setMateriais(materiaisData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVisualizarMaterial = (material: Material) => {
    setSelectedFile({
      url: material.arquivo_url,
      name: material.arquivo_nome,
      type: material.arquivo_nome.split(".").pop() || "",
    });
    setViewerOpen(true);
  };

  const renderMobileHome = () => {
    return (
      <div className="space-y-4 container-mobile pb-24 animate-fade-in">
        {profile?.personal_id && (
          <CalendarioSemanal
            profileId={user!.id}
            personalId={profile.personal_id}
            themeColor={personalSettings?.theme_color}
            onVerHistoricoCompleto={() => setActiveSection("historico")}
          />
        )}

        {/* Card de status da planilha */}
        {profile?.personal_id && (
          <PlanilhaStatusCard
            profileId={user!.id}
            personalId={profile.personal_id}
            variant="aluno"
            compact
          />
        )}

        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-4">
          <ActionCard
            title="Treinos"
            icon={Dumbbell}
            onClick={() => setActiveSection("treinos")}
          />
          <ActionCard
            title="Histórico"
            icon={Calendar}
            onClick={() => setActiveSection("historico")}
          />
          <ActionCard
            title="Materiais"
            icon={FileText}
            onClick={() => setActiveSection("materiais")}
          />
          {/* <ActionCard
            title="Consultoria"
            icon={BookOpen}
            onClick={() => setActiveSection("consultoria")}
          /> */}
          <ActionCard
            title="Meu Plano"
            icon={CreditCard}
            onClick={() => setActiveSection("plano")}
          />
          <ActionCard
            title="Biblioteca"
            icon={Library}
            onClick={() => setActiveSection("biblioteca")}
          />
          <ActionCard
            title="Chat"
            icon={MessageSquare}
            onClick={() => setActiveSection("chat")}
            badge={chatNaoLidas > 0 ? chatNaoLidas : undefined}
          />
        </div>

        <Card
          className="border-2"
          style={{
            borderColor: personalSettings?.theme_color
              ? `${personalSettings.theme_color}50`
              : undefined,
            background: personalSettings?.theme_color
              ? `linear-gradient(to bottom right, ${personalSettings.theme_color}05, ${personalSettings.theme_color}10)`
              : undefined,
          }}
        >
          <CardHeader>
            <CardTitle
              className="text-lg"
              style={{
                color: personalSettings?.theme_color || undefined,
              }}
            >
              Sua Jornada Começa Agora
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">
              Agora que você já conhece o funcionamento da minha consultoria,
              chegou o momento de dar o primeiro passo!
            </p>
            <p className="font-semibold">
              Vamos juntos transformar sua rotina, superar desafios e conquistar
              os seus melhores resultados. Estou pronto para te acompanhar – vem
              comigo! 💪
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    // Mobile: só renderiza home especial na seção 'inicio'
    if (isMobile && activeSection === "inicio") {
      return renderMobileHome();
    }

    switch (activeSection) {
      case "inicio":
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Card de status da planilha */}
            {profile?.personal_id && (
              <PlanilhaStatusCard
                profileId={user!.id}
                personalId={profile.personal_id}
                variant="aluno"
              />
            )}

            {profile?.personal_id && (
              <CalendarioSemanal
                profileId={user!.id}
                personalId={profile.personal_id}
                themeColor={personalSettings?.theme_color}
                onVerHistoricoCompleto={() => setActiveSection("historico")}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle
                  className="text-2xl"
                  style={{
                    color: personalSettings?.theme_color || undefined,
                  }}
                >
                  Bem-vindo(a), {profile?.nome}! 🎉
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>Seja muito bem-vindo(a) à minha consultoria online!</p>
                <p>
                  Fico muito feliz por ter você aqui, e quero te dizer que este
                  é um espaço exclusivo, criado para oferecer orientação de
                  qualidade, com um acompanhamento próximo e personalizado.
                </p>
                <p>
                  Aqui, tudo é feito por mim, com total dedicação para garantir
                  que você tenha o suporte necessário para alcançar os melhores
                  resultados!
                </p>
              </CardContent>
            </Card>

            <Card
              className="border-2"
              style={{
                borderColor: personalSettings?.theme_color
                  ? `${personalSettings.theme_color}50`
                  : undefined,
                background: personalSettings?.theme_color
                  ? `linear-gradient(to bottom right, ${personalSettings.theme_color}05, ${personalSettings.theme_color}10)`
                  : undefined,
              }}
            >
              <CardHeader>
                <CardTitle
                  style={{
                    color: personalSettings?.theme_color || undefined,
                  }}
                >
                  Sua Jornada Começa Agora
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                <p className="mb-4">
                  Agora que você já conhece o funcionamento da minha
                  consultoria, chegou o momento de dar o primeiro passo! Estou
                  aqui para te guiar nessa jornada, garantindo que você tenha o
                  suporte necessário para evoluir de forma consistente e
                  alcançar seus objetivos.
                </p>
                <p className="font-semibold">
                  Vamos juntos transformar sua rotina, superar desafios e
                  conquistar os seus melhores resultados. Estou pronto para te
                  acompanhar – vem comigo! 💪
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case "treinos":
        return (
          <div className="space-y-6 animate-fade-in">
            {profile?.personal_id && (
              <TreinosManager
                profileId={user!.id}
                personalId={profile.personal_id}
                readOnly={true}
              />
            )}
          </div>
        );

      case "historico":
        return (
          <div className="space-y-6 animate-fade-in">
            {profile?.personal_id && (
              <CalendarioTreinosMensal
                profileId={user!.id}
                personalId={profile.personal_id}
                themeColor={personalSettings?.theme_color}
              />
            )}
          </div>
        );

      case "materiais":
        return (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle
                  className="text-2xl"
                  style={{
                    color: personalSettings?.theme_color || undefined,
                  }}
                >
                  Meus Materiais
                </CardTitle>
                <CardDescription>
                  Aqui estão todos os materiais enviados pelo seu personal
                  trainer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materiais.map((material) => (
                    <Card
                      key={material.id}
                      style={{
                        borderColor: personalSettings?.theme_color
                          ? `${personalSettings.theme_color}30`
                          : undefined,
                      }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">
                                {material.titulo}
                              </h3>
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: personalSettings?.theme_color
                                    ? `${personalSettings.theme_color}20`
                                    : undefined,
                                  color:
                                    personalSettings?.theme_color || undefined,
                                }}
                              >
                                {material.tipo}
                              </Badge>
                            </div>
                            {material.descricao && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {material.descricao}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              📎 {material.arquivo_nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Enviado em:{" "}
                              {format(
                                new Date(material.created_at),
                                "dd/MM/yyyy HH:mm"
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVisualizarMaterial(material)}
                              style={{
                                borderColor: personalSettings?.theme_color
                                  ? `${personalSettings.theme_color}50`
                                  : undefined,
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              style={{
                                borderColor: personalSettings?.theme_color
                                  ? `${personalSettings.theme_color}50`
                                  : undefined,
                              }}
                            >
                              <a
                                href={material.arquivo_url}
                                download={material.arquivo_nome}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {materiais.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum material recebido ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "plano":
        return (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle
                  className="text-2xl"
                  style={{
                    color: personalSettings?.theme_color || undefined,
                  }}
                >
                  Meu Plano
                </CardTitle>
                <CardDescription>
                  Informações sobre sua assinatura e pagamentos
                </CardDescription>
              </CardHeader>
            </Card>

            <StudentSubscriptionView
              studentId={user!.id}
              personalId={profile?.personal_id}
            />
          </div>
        );

      case "biblioteca":
        return (
          <div className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle
                  className="text-2xl"
                  style={{
                    color: personalSettings?.theme_color || undefined,
                  }}
                >
                  Biblioteca de Exercícios
                </CardTitle>
                <CardDescription>
                  Explore todos os exercícios disponíveis com vídeos e
                  instruções
                </CardDescription>
              </CardHeader>
            </Card>

            {/* ✅ Importe e use o componente de exercícios aqui */}
            <ExercisesLibrary />
          </div>
        );

      case "chat":
        return (
          <div className="space-y-6 animate-fade-in">
            {profile?.personal_id && user && (
              <ChatPanel
                personalId={profile.personal_id}
                alunoId={user.id}
                currentUserId={user.id}
                themeColor={personalSettings?.theme_color}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Tela de loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{
              borderColor: personalSettings?.theme_color || "#3b82f6",
            }}
          ></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Layout Mobile
  if (isMobile) {
    return (
      <AppLayout>
        <div className="min-h-screen flex flex-col w-full bg-background">
          <MobileHeader userName={profile?.nome} />

          <main className="flex-1 overflow-auto mobile-content-spacing">
            <div className="container max-w-2xl mx-auto py-4">
              {renderContent()}
            </div>
          </main>

          <BottomNavigation
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            onSignOut={signOut}
            personalWhatsApp={personalProfile?.telefone}
          />

          {selectedFile && (
            <DocumentViewer
              open={viewerOpen}
              onClose={() => setViewerOpen(false)}
              fileUrl={selectedFile.url}
              fileName={selectedFile.name}
              fileType={selectedFile.type}
            />
          )}
        </div>
      </AppLayout>
    );
  }

  // Layout Desktop
  return (
    <AppLayout>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebarAluno
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            personalId={profile?.personal_id}
          />

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

                  {/* Logo do Personal */}
                  {personalSettings?.logo_url ? (
                    <img
                      src={personalSettings.logo_url}
                      alt="Logo"
                      className="h-12 w-12 rounded-full object-cover border-2"
                      style={{
                        borderColor: personalSettings.theme_color || "#3b82f6",
                      }}
                    />
                  ) : (
                    <Dumbbell
                      className="h-8 w-8"
                      style={{
                        color: personalSettings?.theme_color || undefined,
                      }}
                    />
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
                  <ThemeToggle />
                  {profile?.personal_id && personalProfile?.telefone && (
                    <WhatsAppButton
                      telefone={personalProfile.telefone}
                      nome="Personal"
                    />
                  )}
                  <Button variant="outline" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </div>
            </header>

            <main className="flex-1 p-6 overflow-auto">
              <div className="container max-w-4xl mx-auto">
                {renderContent()}
              </div>
            </main>
          </div>
        </div>

        {selectedFile && (
          <DocumentViewer
            open={viewerOpen}
            onClose={() => setViewerOpen(false)}
            fileUrl={selectedFile.url}
            fileName={selectedFile.name}
            fileType={selectedFile.type}
          />
        )}
      </SidebarProvider>
    </AppLayout>
  );
}
