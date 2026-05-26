import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getMaterialSignedUrl, openMaterialInNewTab } from "@/utils/materiais";
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
import { usePlanilhaAtiva } from "@/hooks/usePlanilhaAtiva";
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
  Activity,
  Lock,
} from "lucide-react";
import { AvaliacaoAlunoSection } from "@/components/avaliacao/AvaliacaoAlunoSection";
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
import { useChatNaoLidas, useUltimaMensagem } from "@/hooks/useChatMessages";
import {
  ALUNO_CARD_LABELS,
  DEFAULT_ALUNO_DASHBOARD_COMPONENTES,
  DEFAULT_CARDS_VISIVEIS,
} from "@/hooks/usePersonalSettings";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MaterialFileExplorer } from "@/components/materials/MaterialFileExplorer";
import { cn } from "@/lib/utils";

interface Material {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  arquivo_url: string;
  arquivo_nome: string;
  created_at: string;
}

const WORKOUT_STATE_KEY = "pwa_workout_state";

function getAlunoActiveSectionKey(userId: string) {
  return `pf:aluno-active-section:${userId}:v1`;
}

function getAlunoSectionScrollKey(userId: string, section: string) {
  return `pf:aluno-section-scroll:${userId}:${section}:v1`;
}

function readAlunoActiveSection(userId: string): string | null {
  try {
    const raw = window.localStorage.getItem(getAlunoActiveSectionKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hasWorkoutInProgress() {
  try {
    const raw = window.localStorage.getItem(WORKOUT_STATE_KEY);
    if (!raw) return false;

    const states = JSON.parse(raw) as Record<string, { iniciado?: boolean }>;
    return Object.values(states).some((state) => state?.iniciado);
  } catch {
    return false;
  }
}

function readAlunoSectionScroll(userId: string, section: string) {
  try {
    const raw = window.localStorage.getItem(getAlunoSectionScrollKey(userId, section));
    if (!raw) return 0;

    const parsed = JSON.parse(raw) as { top?: number };
    return Number(parsed.top) || 0;
  } catch {
    return 0;
  }
}

export default function AreaAluno() {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [personalProfile, setPersonalProfile] = useState<any>(null);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [activeSection, setActiveSection] = useState<string>("inicio");
  const activeSectionHydratedUserRef = useRef<string | null>(null);
  const activeSectionRef = useRef(activeSection);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const scrollSaveTimerRef = useRef<number | null>(null);
  const skipNextSectionPersistRef = useRef(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const chatNaoLidas = useChatNaoLidas(user?.id || "");

  // Verificar status da planilha para bloqueio
  const { status: planilhaStatus, diasAposExpiracao } = usePlanilhaAtiva({
    profileId: user?.id,
    personalId: profile?.personal_id,
  });

  const isBloqueado = planilhaStatus === "bloqueada" as string;
  const secoesBloqueadas = ["treinos", "historico"];

  // Buscar configurações do personal
  const { settings: personalSettings } = usePersonalSettings(
    profile?.personal_id || undefined
  );

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  const getMainScrollTop = useCallback(() => {
    const el = mainScrollRef.current;
    if (el) return el.scrollTop;
    return window.scrollY || document.documentElement.scrollTop || 0;
  }, []);

  const saveSectionScroll = useCallback(
    (section = activeSectionRef.current) => {
      if (!user?.id || !section || section === "chat") return;

      try {
        window.localStorage.setItem(
          getAlunoSectionScrollKey(user.id, section),
          JSON.stringify({
            top: getMainScrollTop(),
            savedAt: Date.now(),
          })
        );
      } catch {
        // Cache best-effort.
      }
    },
    [getMainScrollTop, user?.id]
  );

  const restoreSectionScroll = useCallback(
    (section = activeSectionRef.current) => {
      if (!user?.id || !section || section === "chat") return;

      const top = readAlunoSectionScroll(user.id, section);
      const el = mainScrollRef.current;

      requestAnimationFrame(() => {
        if (el) {
          el.scrollTo({ top, behavior: "auto" });
        } else {
          window.scrollTo({ top, behavior: "auto" });
        }
      });
    },
    [user?.id]
  );

  const handleSectionChange = useCallback(
    (section: string) => {
      if (section !== activeSectionRef.current) {
        saveSectionScroll(activeSectionRef.current);
      }

      setActiveSection(section);
    },
    [saveSectionScroll]
  );

  const handleMainScroll = useCallback(() => {
    if (!user?.id || activeSectionRef.current === "chat") return;

    if (scrollSaveTimerRef.current) {
      window.clearTimeout(scrollSaveTimerRef.current);
    }

    scrollSaveTimerRef.current = window.setTimeout(() => {
      saveSectionScroll(activeSectionRef.current);
      scrollSaveTimerRef.current = null;
    }, 120);
  }, [saveSectionScroll, user?.id]);

  useEffect(() => {
    if (!user?.id || activeSectionHydratedUserRef.current === user.id) return;

    activeSectionHydratedUserRef.current = user.id;
    skipNextSectionPersistRef.current = true;

    const persistedSection = readAlunoActiveSection(user.id);
    const nextSection = persistedSection ?? (hasWorkoutInProgress() ? "treinos" : "inicio");

    setActiveSection(nextSection);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || activeSectionHydratedUserRef.current !== user.id) return;

    if (skipNextSectionPersistRef.current) {
      skipNextSectionPersistRef.current = false;
      return;
    }

    try {
      window.localStorage.setItem(
        getAlunoActiveSectionKey(user.id),
        JSON.stringify(activeSection)
      );
    } catch {
      // localStorage indisponivel: segue com estado em memoria
    }
  }, [activeSection, user?.id]);

  useEffect(() => {
    if (!user?.id || activeSectionHydratedUserRef.current !== user.id || loading) return;

    const timer = window.setTimeout(() => {
      restoreSectionScroll(activeSection);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [activeSection, loading, restoreSectionScroll, user?.id]);

  useEffect(() => {
    const handlePageHide = () => saveSectionScroll(activeSectionRef.current);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveSectionScroll(activeSectionRef.current);
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (scrollSaveTimerRef.current) {
        window.clearTimeout(scrollSaveTimerRef.current);
      }
    };
  }, [saveSectionScroll]);

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

        // Dispara mensagem automática de boas-vindas no chat (apenas no 1º acesso)
        supabase.rpc("enviar_mensagem_boas_vindas_chat" as any).then(() => {});
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

  const handleVisualizarMaterial = async (material: Material) => {
    const signed = await getMaterialSignedUrl(material.arquivo_url);
    if (!signed) return;
    setSelectedFile({
      url: signed,
      name: material.arquivo_nome,
      type: material.arquivo_nome.split(".").pop() || "",
    });
    setViewerOpen(true);
  };

  const cardsVisiveis = (personalSettings?.cards_visiveis?.length
    ? personalSettings.cards_visiveis
    : [...DEFAULT_CARDS_VISIVEIS]) as string[];

  const dashboardComponentes = (personalSettings?.aluno_dashboard_componentes?.length
    ? personalSettings.aluno_dashboard_componentes
    : [...DEFAULT_ALUNO_DASHBOARD_COMPONENTES]) as string[];

  useEffect(() => {
    const secoesPermitidas = ["inicio", ...cardsVisiveis];
    if (!secoesPermitidas.includes(activeSection)) {
      handleSectionChange("inicio");
    }
  }, [activeSection, cardsVisiveis.join("|"), handleSectionChange]);

  useEffect(() => {
    const sectionFromUrl = searchParams.get("section");
    const secoesPermitidas = ["inicio", ...cardsVisiveis];
    if (sectionFromUrl && secoesPermitidas.includes(sectionFromUrl)) {
      handleSectionChange(sectionFromUrl);
    }
  }, [cardsVisiveis.join("|"), handleSectionChange, searchParams]);

  const { ultima: ultimaMsg } = useUltimaMensagem(
    profile?.personal_id || "",
    user?.id || ""
  );

  const renderChatPreview = () => {
    if (!ultimaMsg || !profile?.personal_id) return null;
    const isFromPersonal = ultimaMsg.remetente_id === profile.personal_id;
    const naoLida = isFromPersonal && !ultimaMsg.lida;
    return (
      <button
        onClick={() => handleSectionChange("chat")}
        className={`w-full text-left rounded-lg border p-3 flex items-start gap-3 transition-colors hover:bg-muted/50 ${
          naoLida ? "border-destructive/50 bg-destructive/5" : "bg-card"
        }`}
      >
        <div className="relative shrink-0">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: personalSettings?.theme_color || "hsl(var(--primary))" }}
          >
            <MessageSquare className="h-5 w-5" />
          </div>
          {naoLida && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive animate-pulse border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold truncate">Mensagens</p>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(ultimaMsg.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <p className={`text-xs truncate ${naoLida ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {isFromPersonal ? "" : "Você: "}
            {ultimaMsg.conteudo}
          </p>
        </div>
      </button>
    );
  };

  const cardConfig: Record<string, { title: string; icon: any; section: string; badge?: number }> = {
    treinos: { title: ALUNO_CARD_LABELS.treinos, icon: Dumbbell, section: "treinos" },
    chat: { title: ALUNO_CARD_LABELS.chat, icon: MessageSquare, section: "chat", badge: chatNaoLidas },
    avaliacao: { title: ALUNO_CARD_LABELS.avaliacao, icon: Activity, section: "avaliacao" },
    historico: { title: ALUNO_CARD_LABELS.historico, icon: Calendar, section: "historico" },
    materiais: { title: ALUNO_CARD_LABELS.materiais, icon: FileText, section: "materiais" },
    plano: { title: ALUNO_CARD_LABELS.plano, icon: CreditCard, section: "plano" },
    biblioteca: { title: ALUNO_CARD_LABELS.biblioteca, icon: Library, section: "biblioteca" },
  };

  const renderCardsGrid = () => (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-4">
      {cardsVisiveis.map((id) => {
        const cfg = cardConfig[id];
        if (!cfg) return null;
        return (
          <ActionCard
            key={id}
            title={cfg.title}
            icon={cfg.icon}
            onClick={() => handleSectionChange(cfg.section)}
            badge={cfg.badge && cfg.badge > 0 ? cfg.badge : undefined}
          />
        );
      })}
    </div>
  );

  const renderWelcomeCard = () => (
    <Card>
      <CardHeader>
        <CardTitle
          className="text-2xl"
          style={{
            color: personalSettings?.theme_color || undefined,
          }}
        >
          {personalSettings?.welcome_title
            ? personalSettings.welcome_title.replace("{nome}", profile?.nome ?? "")
            : `Bem-vindo(a), ${profile?.nome ?? ""}!`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-muted-foreground whitespace-pre-line">
        {personalSettings?.welcome_message ? (
          <p>{personalSettings.welcome_message}</p>
        ) : (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderJornadaCard = () => (
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
          {personalSettings?.jornada_title || "Sua Jornada Começa Agora"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground whitespace-pre-line">
        {personalSettings?.jornada_message ? (
          <p>{personalSettings.jornada_message}</p>
        ) : (
          <>
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
              acompanhar - vem comigo!
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderAlunoDashboardComponent = (id: string) => {
    if (id === "frequencia" && profile?.personal_id) {
      return (
        <CalendarioSemanal
          key={id}
          profileId={user!.id}
          personalId={profile.personal_id}
          themeColor={personalSettings?.theme_color}
          onVerHistoricoCompleto={() => handleSectionChange("historico")}
        />
      );
    }

    if (id === "mensagens") {
      const preview = renderChatPreview();
      return preview ? <div key={id}>{preview}</div> : null;
    }

    if (id === "boas_vindas") return <div key={id}>{renderWelcomeCard()}</div>;
    if (id === "cards") return <div key={id}>{renderCardsGrid()}</div>;
    if (id === "jornada") return <div key={id}>{renderJornadaCard()}</div>;
    return null;
  };

  const renderMobileHome = () => {
    return (
      <div className="space-y-4 container-mobile pb-24 animate-fade-in">
        {dashboardComponentes.map(renderAlunoDashboardComponent)}
      </div>
    );
  };

  const renderBloqueio = () => (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <div className="p-4 rounded-full bg-destructive/10">
              <Lock className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-destructive mb-2">
                Acesso aos treinos bloqueado
              </h2>
              <p className="text-muted-foreground max-w-md">
                Seu acesso aos treinos está temporariamente suspenso.
                Entre em contato com seu personal trainer para regularizar
                e voltar a treinar!
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => handleSectionChange("chat")}
              className="mt-2"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Falar com meu Personal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    // Bloqueio de seções de treino se planilha expirada > 7 dias
    if (isBloqueado && secoesBloqueadas.includes(activeSection)) {
      return renderBloqueio();
    }

    // Mobile: só renderiza home especial na seção 'inicio'
    if (isMobile && activeSection === "inicio") {
      return renderMobileHome();
    }

    switch (activeSection) {
      case "inicio":
        return (
          <div className="space-y-6 animate-fade-in">
            {dashboardComponentes.map(renderAlunoDashboardComponent)}
          </div>
        );

        return (
          <div className="space-y-6 animate-fade-in">
            {profile?.personal_id && (
              <CalendarioSemanal
                profileId={user!.id}
                personalId={profile.personal_id}
                themeColor={personalSettings?.theme_color}
                onVerHistoricoCompleto={() => handleSectionChange("historico")}
              />
            )}

            {/* Preview de mensagens */}
            {renderChatPreview()}

            <Card>
              <CardHeader>
                <CardTitle
                  className="text-2xl"
                  style={{
                    color: personalSettings?.theme_color || undefined,
                  }}
                >
                  {personalSettings?.welcome_title
                    ? personalSettings.welcome_title.replace("{nome}", profile?.nome ?? "")
                    : `Bem-vindo(a), ${profile?.nome ?? ""}! 🎉`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground whitespace-pre-line">
                {personalSettings?.welcome_message ? (
                  <p>{personalSettings.welcome_message}</p>
                ) : (
                  <>
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
                  </>
                )}
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
                  {personalSettings?.jornada_title || "Sua Jornada Começa Agora"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground whitespace-pre-line">
                {personalSettings?.jornada_message ? (
                  <p>{personalSettings.jornada_message}</p>
                ) : (
                  <>
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
                  </>
                )}
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
                onWorkoutFinished={() => handleSectionChange("treinos")}
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
            <MaterialFileExplorer
              materiais={materiais}
              title="Meus Materiais"
              description="Arquivos enviados pelo seu personal trainer"
              themeColor={personalSettings?.theme_color}
              onView={handleVisualizarMaterial}
              onDownload={(material) => openMaterialInNewTab(material.arquivo_url)}
              emptyTitle="Nenhum material recebido ainda"
              emptyDescription="Quando seu personal enviar arquivos, eles aparecem aqui em pastas por categoria."
            />
            <Card className="hidden">
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
                              onClick={() => openMaterialInNewTab(material.arquivo_url)}
                              style={{
                                borderColor: personalSettings?.theme_color
                                  ? `${personalSettings.theme_color}50`
                                  : undefined,
                              }}
                            >
                              <Download className="h-4 w-4" />
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

      case "avaliacao":
        return (
          <div className="space-y-6 animate-fade-in">
            {profile?.personal_id && (
              <AvaliacaoAlunoSection
                profileId={user!.id}
                personalId={profile.personal_id}
                themeColor={personalSettings?.theme_color}
              />
            )}
          </div>
        );

      case "chat":
        return (
          <div className={isMobile ? "h-full min-h-0 animate-fade-in" : "space-y-6 animate-fade-in"}>
            {profile?.personal_id && user && (
              <ChatPanel
                personalId={profile.personal_id}
                alunoId={user.id}
                currentUserId={user.id}
                themeColor={personalSettings?.theme_color}
                fullHeight={isMobile}
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
    const isChatSection = activeSection === "chat";
    return (
      <AppLayout>
        <div className="min-h-screen flex flex-col w-full bg-background">
          <MobileHeader userName={profile?.nome} />

          <main
            ref={mainScrollRef}
            onScroll={handleMainScroll}
            className={cn(
              "flex-1",
              isChatSection
                ? "overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom,0px))]"
                : "overflow-auto mobile-content-spacing"
            )}
          >
            {isChatSection ? (
              <div className="h-full min-h-0">{renderContent()}</div>
            ) : (
              <div className="container max-w-2xl mx-auto py-4">
                {renderContent()}
              </div>
            )}
          </main>

          <BottomNavigation
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            onSignOut={signOut}
            personalWhatsApp={personalProfile?.telefone}
            chatNaoLidas={chatNaoLidas}
            cardsVisiveis={cardsVisiveis}
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
            onSectionChange={handleSectionChange}
            personalId={profile?.personal_id}
            cardsVisiveis={cardsVisiveis}
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
              <div className="flex items-center justify-between px-4 header-safe-top pb-4">
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
                    <>
                      {/* Compacto no mobile */}
                      <span className="sm:hidden">
                        <WhatsAppButton
                          telefone={personalProfile.telefone}
                          nome={personalProfile.nome || "Personal"}
                          iconOnly
                        />
                      </span>
                      <span className="hidden sm:inline-flex">
                        <WhatsAppButton
                          telefone={personalProfile.telefone}
                          nome={personalProfile.nome || "Personal"}
                        />
                      </span>
                    </>
                  )}
                  <Button variant="outline" size="icon" className="sm:hidden min-h-[44px] min-w-[44px]" onClick={signOut} aria-label="Sair">
                    <LogOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="hidden sm:inline-flex" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </div>
            </header>

            <main
              ref={mainScrollRef}
              onScroll={handleMainScroll}
              className="flex-1 p-6 overflow-auto"
            >
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
