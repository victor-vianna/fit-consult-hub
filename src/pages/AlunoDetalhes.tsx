import { useState, useEffect } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { extractMaterialPath, getMaterialSignedUrl, openMaterialInNewTab } from "@/utils/materiais";
import { getNameInitials } from "@/utils/nameInitial";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { updateStudentBasicInfo } from "@/integrations/supabase/studentProfileManagement";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Upload,
  Eye,
  Trash2,
  AlertTriangle,
  User,
  Dumbbell,
  FileText,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  Download,
  Activity,
  ClipboardList,
  ClipboardCheck,
  MessageSquare,
  MessageSquareText,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { format } from "date-fns";
import { CalendarioSemanal } from "@/components/CalendarioSemanal";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { TreinosManager } from "@/components/TreinosManager";
import {
  AccessControlPanel,
  AccessStatusBadge,
} from "@/components/aluno/AccessControlPanel";
import { CalendarioTreinosMensal } from "@/components/CalendarioTreinosMensal";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { AppLayout } from "@/components/AppLayout";
import { AvaliacaoHub } from "@/components/avaliacao/AvaliacaoHub";
import { AnamneseVisualizacao } from "@/components/AnamneseVisualizacao";
import { CheckinsDashboard } from "@/components/CheckinsDashboard";
import { TreinoFeedbacksHistory } from "@/components/TreinoFeedbacksHistory";
import { PlanilhaStatusCard } from "@/components/PlanilhaStatusCard";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { BroadcastMessageDialog } from "@/components/chat/BroadcastMessageDialog";
import { useChatMessages } from "@/hooks/useChatMessages";
import { usePriorityStudents, type PriorityReason } from "@/hooks/usePriorityStudents";
import { WeightProgressionPanel } from "@/components/WeightProgressionPanel";
import { MaterialFileExplorer } from "@/components/materials/MaterialFileExplorer";
import { MobileAccountMenu } from "@/components/mobile/MobileAccountMenu";
import { formatDisplayDate } from "@/utils/dateFormat";

interface Material {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  arquivo_url: string;
  arquivo_nome: string;
  created_at: string;
}

interface Aluno {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  personal_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const FILE_PICKER_GUARD_RELEASE_DELAY_MS = 800;

type DetailTabWithNotification = "treinos" | "checkins" | "chat" | "financeiro";

const TAB_BY_PRIORITY_REASON: Record<PriorityReason, DetailTabWithNotification> = {
  plano_vencendo: "financeiro",
  plano_vencido: "financeiro",
  pagamento_pendente: "financeiro",
  feedback_nao_respondido: "checkins",
  mensagem_nao_lida: "chat",
  planilha_vencendo: "treinos",
  planilha_vencida: "treinos",
};

function TabNotificationBadge({ count }: { count?: number }) {
  if (!count) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-none text-destructive-foreground shadow-sm ring-2 ring-background">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export default function AlunoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [personalProfile, setPersonalProfile] = useState<any>(null);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [materialDraft, setMaterialDraft] = useState({
    titulo: "",
    tipo: "",
    descricao: "",
  });
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [filePickerActive, setFilePickerActive] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const { settings: personalSettings } = usePersonalSettings(user?.id);
  const [activeTab, setActiveTab] = usePersistedState<string>(
    `aluno-detail-tab:${id || "anon"}`,
    searchParams.get("tab") || "geral",
    { storage: "session" }
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // 🔧 Se a URL especificar ?tab=, ela sobrescreve a aba persistida
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleActiveTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.set("tab", tab);
      if (tab !== "avaliacao") {
        params.delete("avaliacaoTab");
      }
      return params;
    }, { replace: true });
  };

  // Chat não lidas badge
  const chatHook = useChatMessages({
    personalId: user?.id || "",
    alunoId: id || "",
    currentUserId: user?.id || "",
  });
  const chatNaoLidas = chatHook.naoLidas;
  const { flagsByStudent: priorityFlagsByStudent } = usePriorityStudents(user?.id);
  const priorityFlags = id ? priorityFlagsByStudent[id] || [] : [];
  const tabNotificationCounts = priorityFlags.reduce<
    Partial<Record<DetailTabWithNotification, number>>
  >((counts, flag) => {
    const tab = TAB_BY_PRIORITY_REASON[flag.reason];
    counts[tab] = (counts[tab] || 0) + 1;
    return counts;
  }, {});
  const chatBadgeCount =
    chatNaoLidas > 0 ? chatNaoLidas : tabNotificationCounts.chat || 0;
  const [treinoFeedbackBadgeCount, setTreinoFeedbackBadgeCount] = useState(0);

  useEffect(() => {
    if (!user?.id || !id) {
      setTreinoFeedbackBadgeCount(0);
      return;
    }

    let cancelled = false;

    const fetchTreinoFeedbackBadge = async () => {
      const { count, error } = await supabase
        .from("notificacoes")
        .select("id", { count: "exact", head: true })
        .eq("destinatario_id", user.id)
        .eq("tipo", "feedback_treino")
        .eq("lida", false)
        .filter("dados->>aluno_id", "eq", id);

      if (!cancelled && !error) {
        setTreinoFeedbackBadgeCount(count || 0);
      }
    };

    fetchTreinoFeedbackBadge();

    const channel = supabase
      .channel(`student-training-feedback-badge:${user.id}:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificacoes",
          filter: `destinatario_id=eq.${user.id}`,
        },
        fetchTreinoFeedbackBadge
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!filePickerActive) return;

    const releaseFilePickerGuard = () => {
      window.setTimeout(
        () => setFilePickerActive(false),
        FILE_PICKER_GUARD_RELEASE_DELAY_MS
      );
    };

    const releaseWhenVisible = () => {
      if (document.visibilityState === "visible") {
        releaseFilePickerGuard();
      }
    };

    window.addEventListener("focus", releaseFilePickerGuard);
    window.addEventListener("pageshow", releaseFilePickerGuard);
    document.addEventListener("visibilitychange", releaseWhenVisible);

    return () => {
      window.removeEventListener("focus", releaseFilePickerGuard);
      window.removeEventListener("pageshow", releaseFilePickerGuard);
      document.removeEventListener("visibilitychange", releaseWhenVisible);
    };
  }, [filePickerActive]);

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;

    try {
      const { data: alunoData, error: alunoError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("personal_id", user.id)
        .single();

      if (alunoError) {
        console.error("Erro ao buscar aluno:", alunoError);
        toast({
          title: "Erro ao carregar aluno",
          description: alunoError.message,
          variant: "destructive",
        });
        return;
      }

      setAluno(alunoData as Aluno);

      if (alunoData?.personal_id) {
        const { data: personalData, error: personalError } = await supabase
          .from("profiles")
          .select("telefone, nome, id")
          .eq("id", alunoData.personal_id)
          .single();

        if (personalError) {
          console.error("Erro ao buscar personal:", personalError);
        }

        setPersonalProfile(personalData);
      }

      const { data: materiaisData, error: materiaisError } = await supabase
        .from("materiais")
        .select("*")
        .eq("profile_id", id)
        .eq("personal_id", user.id)
        .order("created_at", { ascending: false });

      if (materiaisError) {
        console.error("Erro ao buscar materiais:", materiaisError);
      }

      setMateriais(materiaisData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const resetMaterialUploadForm = () => {
    setMaterialDraft({
      titulo: "",
      tipo: "",
      descricao: "",
    });
    setMaterialFile(null);
    setFilePickerActive(false);
  };

  const handleMaterialDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (filePickerActive || loading)) {
      return;
    }

    setOpenDialog(nextOpen);
  };

  const handleMaterialFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setMaterialFile(event.target.files?.[0] || null);
    window.setTimeout(
      () => setFilePickerActive(false),
      FILE_PICKER_GUARD_RELEASE_DELAY_MS
    );
  };

  const handleEnviarMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !id) return;

    setLoading(true);

    const arquivo = materialFile;

    if (!arquivo) {
      toast({
        title: "Arquivo obrigatório",
        description: "Selecione um arquivo para enviar",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const titulo = materialDraft.titulo.trim();
    const tipo = materialDraft.tipo;
    const descricao = materialDraft.descricao.trim();

    if (!titulo || !tipo) {
      toast({
        title: "Dados obrigatórios",
        description: "Informe o título e a categoria do material.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (arquivo.size > MAX_SIZE) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Máximo: 10MB",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const fileExt = arquivo.name.split(".").pop()?.toLowerCase() || "";
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];
    const isAllowedFile =
      ALLOWED_TYPES.includes(arquivo.type) ||
      ALLOWED_EXTENSIONS.includes(fileExt);

    if (!isAllowedFile) {
      toast({
        title: "Erro",
        description: "Tipo de arquivo não permitido. Use PDF ou imagens.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const fileName = `${user.id}/${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("materiais")
        .upload(fileName, arquivo);

      if (uploadError) throw uploadError;

      // Bucket é privado: armazenamos apenas o path; URLs assinadas são geradas no acesso
      const { error: dbError } = await supabase.from("materiais").insert({
        profile_id: id,
        personal_id: user.id,
        titulo,
        descricao,
        tipo,
        arquivo_url: fileName,
        arquivo_nome: arquivo.name,
      });

      if (dbError) throw dbError;

      toast({
        title: "Material enviado!",
        description: "Material enviado com sucesso",
      });

      resetMaterialUploadForm();
      setOpenDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar material",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverMaterial = async (
    materialId: string,
    arquivoUrl: string
  ) => {
    if (!user?.id) return;

    try {
      const filePath = extractMaterialPath(arquivoUrl);

      if (filePath) await supabase.storage.from("materiais").remove([filePath]);

      const { error } = await supabase
        .from("materiais")
        .delete()
        .eq("id", materialId)
        .eq("personal_id", user.id);

      if (error) throw error;

      toast({
        title: "Material removido",
        description: "Material removido com sucesso",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao remover material",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleVisualizarMaterial = async (material: Material) => {
    const signed = await getMaterialSignedUrl(material.arquivo_url);
    if (!signed) {
      toast({
        title: "Não foi possível abrir o arquivo",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile({
      url: signed,
      name: material.arquivo_nome,
      type: material.arquivo_nome.split(".").pop() || "",
    });
    setViewerOpen(true);
  };


  const iniciarEdicaoPerfil = () => {
    if (!aluno) return;
    setEditNome(aluno.nome);
    setEditTelefone(aluno.telefone || "");
    setEditandoPerfil(true);
  };

  const cancelarEdicaoPerfil = () => {
    setEditandoPerfil(false);
  };

  const salvarPerfil = async () => {
    if (!aluno) return;
    const nomeTrim = editNome.trim();
    if (!nomeTrim) {
      toast({
        title: "Nome inválido",
        description: "O nome não pode ficar em branco.",
        variant: "destructive",
      });
      return;
    }
    setSalvandoPerfil(true);
    try {
      const { error } = await updateStudentBasicInfo(
        aluno.id,
        nomeTrim,
        editTelefone.trim() || null
      );

      if (error) throw error;

      setAluno({ ...aluno, nome: nomeTrim, telefone: editTelefone.trim() || undefined });
      setEditandoPerfil(false);
      toast({
        title: "Perfil atualizado",
        description: "Os dados do aluno foram atualizados com sucesso.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleTreinoAtualizado = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "treino":
        return "🏋️";
      case "dieta":
        return "🥗";
      case "avaliacao":
        return "📊";
      default:
        return "📄";
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "treino":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "dieta":
        return "bg-green-100 text-green-800 border-green-200";
      case "avaliacao":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!aluno) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-16 w-16 border-4 mx-auto" // Removi border-t-transparent daqui
            style={{
              borderColor: personalSettings?.theme_color
                ? `${personalSettings.theme_color}40` // Cor base da borda (com 40% de opacidade)
                : "rgba(0, 0, 0, 0.1)", // Cor padrão se não houver theme_color
              borderTopColor: personalSettings?.theme_color
                ? personalSettings.theme_color // Cor da parte "giratória" do spinner
                : "#000000", // Cor padrão se não houver theme_color
            }}
          ></div>
          <p className="mt-4 text-muted-foreground font-medium">
            Carregando informações do aluno...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header Premium */}
        <header
          className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm"
          style={{
            borderColor: personalSettings?.theme_color
              ? `${personalSettings.theme_color}20`
              : undefined,
          }}
        >
          <div
            className={
              isMobile
                ? "px-4 header-safe-top pb-4"
                : "container mx-auto px-6 py-4"
            }
          >
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => navigate("/alunos")}
                className="hover:bg-accent/50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isMobile ? "Voltar" : "Voltar para Meus Alunos"}
              </Button>

              {isMobile ? (
                <MobileAccountMenu userName={profile?.nome} />
              ) : (
                <div className="flex items-center gap-2">
                  <AccessStatusBadge studentId={aluno.id} />
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          className={`${
            isMobile ? "px-4 py-6" : "container mx-auto px-6 py-8"
          }`}
        >
          {/* Card de Perfil do Aluno - Premium */}
          <Card className="mb-8 overflow-hidden border-2 shadow-lg">
            <div
              className="h-2"
              style={{
                background: personalSettings?.theme_color
                  ? `linear-gradient(90deg, ${personalSettings.theme_color}, ${personalSettings.theme_color}80)`
                  : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              }}
            />
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl font-bold text-white shadow-lg"
                    style={{
                      background: personalSettings?.theme_color
                        ? `linear-gradient(135deg, ${personalSettings.theme_color}, ${personalSettings.theme_color}cc)`
                        : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                    }}
                  >
                    {getNameInitials(aluno.nome, "A")}
                  </div>

                  <div className="flex-1">
                    {editandoPerfil ? (
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="edit-nome" className="text-xs">Nome</Label>
                          <Input
                            id="edit-nome"
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            className="text-lg font-semibold"
                            autoFocus
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-tel" className="text-xs">Telefone</Label>
                          <Input
                            id="edit-tel"
                            value={editTelefone}
                            onChange={(e) => setEditTelefone(e.target.value)}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={salvarPerfil}
                            disabled={salvandoPerfil}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelarEdicaoPerfil}
                            disabled={salvandoPerfil}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {aluno.nome}
                          </h1>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={iniciarEdicaoPerfil}
                            title="Editar nome e telefone"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isMobile && <AccessStatusBadge studentId={aluno.id} />}
                        </div>

                        <div className="space-y-1 text-sm md:text-base">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{aluno.email}</span>
                          </div>
                          {aluno.telefone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{aluno.telefone}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {aluno?.telefone && (
                    <WhatsAppButton
                      telefone={aluno.telefone}
                      nome={aluno.nome}
                    />
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Tabs Premium */}
          <Tabs
            value={activeTab}
            onValueChange={handleActiveTabChange}
            className="space-y-6"
          >
            <div className="w-full overflow-x-auto scrollbar-hide pb-1">
              <TabsList
                className="inline-flex h-auto min-w-full w-max justify-start gap-1 bg-muted/50 p-1"
              >
                <TabsTrigger
                  value="geral"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  }`}
                >
                  <User
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Geral"}
                </TabsTrigger>
                <TabsTrigger
                  value="treinos"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  } relative`}
                >
                  <Dumbbell
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Treinos"}
                  <TabNotificationBadge count={tabNotificationCounts.treinos} />
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  }`}
                >
                  <Calendar
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Histórico"}
                </TabsTrigger>
                <TabsTrigger
                  value="materiais"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  }`}
                >
                  <FileText
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Materiais"}
                </TabsTrigger>
                <TabsTrigger
                  value="avaliacao"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  }`}
                >
                  <Activity
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Avaliação"}
                </TabsTrigger>
                <TabsTrigger
                  value="anamnese"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  }`}
                >
                  <ClipboardList
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Anamnese"}
                </TabsTrigger>
                <TabsTrigger
                  value="checkins"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  } relative`}
                >
                  <ClipboardCheck
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Feedbacks Semanais"}
                  <TabNotificationBadge count={tabNotificationCounts.checkins} />
                </TabsTrigger>
                <TabsTrigger
                  value="feedbacks-treino"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  } relative`}
                >
                  <MessageSquareText
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Feedbacks de Treino"}
                  <TabNotificationBadge count={treinoFeedbackBadgeCount} />
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  } relative`}
                >
                  <MessageSquare
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Chat"}
                  <TabNotificationBadge count={chatBadgeCount} />
                </TabsTrigger>
                <TabsTrigger
                  value="financeiro"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "flex-shrink-0 px-3 py-3 text-xs lg:text-sm"
                  } relative`}
                >
                  <CreditCard
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Financeiro"}
                  <TabNotificationBadge count={tabNotificationCounts.financeiro} />
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Aba Geral */}
            <TabsContent value="geral" className="space-y-6">
              {/* Card de status da planilha */}
              {user && (
                <PlanilhaStatusCard
                  profileId={id!}
                  personalId={user.id}
                  variant="personal"
                />
              )}

              {user && (
                <CalendarioSemanal
                  profileId={id!}
                  personalId={user.id}
                  themeColor={personalSettings?.theme_color}
                  readOnly
                  onVerHistoricoCompleto={() => handleActiveTabChange("historico")}
                  onTreinoAtualizado={handleTreinoAtualizado}
                />
              )}
            </TabsContent>

            {/* Aba Treinos */}
            <TabsContent value="treinos" className="space-y-6">
              <TreinosManager
                profileId={id!}
                personalId={user!.id}
                readOnly={false}
              />
              <WeightProgressionPanel
                profileId={id!}
                themeColor={personalSettings?.theme_color}
              />
            </TabsContent>

            {/* Aba Histórico */}
            <TabsContent value="historico" className="space-y-6">
              {user && (
                <CalendarioTreinosMensal
                  profileId={id!}
                  personalId={user.id}
                  themeColor={personalSettings?.theme_color}
                  readOnly
                  refreshKey={refreshKey}
                />
              )}
            </TabsContent>

            {/* Aba Materiais - Design Premium */}
            <TabsContent value="materiais" className="space-y-6">
              <MaterialFileExplorer
                materiais={materiais}
                title="Materiais do aluno"
                description={`${materiais.length} ${
                  materiais.length === 1 ? "material enviado" : "materiais enviados"
                }`}
                themeColor={personalSettings?.theme_color}
                canDelete
                onView={handleVisualizarMaterial}
                onDownload={(material) => openMaterialInNewTab(material.arquivo_url)}
                onDelete={(material) =>
                  handleRemoverMaterial(material.id, material.arquivo_url)
                }
                emptyTitle="Nenhum material enviado"
                emptyDescription="Comece enviando materiais de treino, dieta ou avaliacoes para este aluno."
                action={
                  <Button
                    size={isMobile ? "sm" : "default"}
                    variant="secondary"
                    className="shadow-sm"
                    onClick={() => setOpenDialog(true)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isMobile ? "Enviar" : "Enviar Material"}
                  </Button>
                }
              />
              <Dialog
                open={openDialog}
                onOpenChange={handleMaterialDialogOpenChange}
              >
                <DialogContent
                  className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
                  onInteractOutside={(event) => {
                    if (filePickerActive || loading) {
                      event.preventDefault();
                    }
                  }}
                  onEscapeKeyDown={(event) => {
                    if (loading) {
                      event.preventDefault();
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      Enviar novo material
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEnviarMaterial} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="material-titulo">
                        Título do material
                      </Label>
                      <Input
                        id="material-titulo"
                        value={materialDraft.titulo}
                        onChange={(event) =>
                          setMaterialDraft((current) => ({
                            ...current,
                            titulo: event.target.value,
                          }))
                        }
                        placeholder="Ex: Treino de hipertrofia"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="material-tipo">Categoria</Label>
                      <Select
                        value={materialDraft.tipo}
                        onValueChange={(tipo) =>
                          setMaterialDraft((current) => ({
                            ...current,
                            tipo,
                          }))
                        }
                        required
                      >
                        <SelectTrigger id="material-tipo">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="treino">Treino</SelectItem>
                          <SelectItem value="dieta">Dieta</SelectItem>
                          <SelectItem value="avaliacao">Avaliação</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="material-descricao">
                        Descrição (opcional)
                      </Label>
                      <Textarea
                        id="material-descricao"
                        value={materialDraft.descricao}
                        onChange={(event) =>
                          setMaterialDraft((current) => ({
                            ...current,
                            descricao: event.target.value,
                          }))
                        }
                        placeholder="Adicione detalhes sobre este material..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="material-arquivo">Arquivo</Label>
                      <Input
                        id="material-arquivo"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        required={!materialFile}
                        className="cursor-pointer"
                        onPointerDown={() => setFilePickerActive(true)}
                        onClick={() => setFilePickerActive(true)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            setFilePickerActive(true);
                          }
                        }}
                        onChange={handleMaterialFileChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        {materialFile
                          ? `Selecionado: ${materialFile.name}`
                          : "PDF ou imagens (máx. 10MB)"}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => {
                          resetMaterialUploadForm();
                          setOpenDialog(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                        style={{
                          backgroundColor:
                            personalSettings?.theme_color || undefined,
                        }}
                      >
                        {loading ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Enviar material
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Card className="hidden border-2 shadow-md">
                <CardHeader className="bg-gradient-to-r from-card to-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        Materiais do Aluno
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {materiais.length}{" "}
                        {materiais.length === 1 ? "material" : "materiais"}{" "}
                        enviado{materiais.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Dialog open={false}>
                      <DialogTrigger asChild>
                        <Button
                          size={isMobile ? "sm" : "default"}
                          className="shadow-md"
                          style={{
                            backgroundColor:
                              personalSettings?.theme_color || undefined,
                          }}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {isMobile ? "Enviar" : "Enviar Material"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="text-xl">
                            Enviar Novo Material
                          </DialogTitle>
                        </DialogHeader>
                        <form
                          onSubmit={handleEnviarMaterial}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="titulo">Título do Material</Label>
                            <Input
                              id="titulo"
                              name="titulo"
                              placeholder="Ex: Treino de Hipertrofia"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tipo">Categoria</Label>
                            <Select name="tipo" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="treino">
                                  🏋️ Treino
                                </SelectItem>
                                <SelectItem value="dieta">🥗 Dieta</SelectItem>
                                <SelectItem value="avaliacao">
                                  📊 Avaliação
                                </SelectItem>
                                <SelectItem value="outro">📄 Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="descricao">
                              Descrição (Opcional)
                            </Label>
                            <Textarea
                              id="descricao"
                              name="descricao"
                              placeholder="Adicione detalhes sobre este material..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="arquivo">Arquivo</Label>
                            <Input
                              id="arquivo"
                              name="arquivo"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              required
                              className="cursor-pointer"
                            />
                            <p className="text-xs text-muted-foreground">
                              PDF ou imagens (máx. 10MB)
                            </p>
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
                            {loading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Enviar Material
                              </>
                            )}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {materiais.length > 0 ? (
                    <div className="grid gap-4">
                      {materiais.map((material) => (
                        <Card
                          key={material.id}
                          className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2"
                        >
                          <div
                            className="h-1"
                            style={{
                              backgroundColor:
                                personalSettings?.theme_color ||
                                "hsl(var(--primary))",
                            }}
                          />
                          <CardContent className="p-4 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="text-3xl">
                                    {getTipoIcon(material.tipo)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <h3 className="font-semibold text-lg">
                                        {material.titulo}
                                      </h3>
                                      <Badge
                                        className={`${getTipoColor(
                                          material.tipo
                                        )} border text-xs`}
                                      >
                                        {material.tipo.charAt(0).toUpperCase() +
                                          material.tipo.slice(1)}
                                      </Badge>
                                    </div>
                                    {material.descricao && (
                                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                                        {material.descricao}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        📎 {material.arquivo_nome}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        📅{" "}
                                        {formatDisplayDate(material.created_at)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        🕐{" "}
                                        {format(
                                          new Date(material.created_at),
                                          "HH:mm"
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex md:flex-col gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleVisualizarMaterial(material)
                                  }
                                  className="flex-1 md:flex-none"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {isMobile ? "Ver" : "Visualizar"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openMaterialInNewTab(material.arquivo_url)
                                  }
                                  className="flex-1 md:flex-none"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  {isMobile ? "Baixar" : "Download"}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 md:flex-none border-red-200 hover:bg-red-50"
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
                                        Tem certeza que deseja remover o
                                        material "{material.titulo}"? Esta ação
                                        não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleRemoverMaterial(
                                            material.id,
                                            material.arquivo_url
                                          )
                                        }
                                        className="bg-destructive hover:bg-destructive/90"
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
                  ) : (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        Nenhum material enviado
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        Comece enviando materiais de treino, dieta ou avaliações
                        para este aluno.
                      </p>
                      <Button
                        onClick={() => setOpenDialog(true)}
                        style={{
                          backgroundColor:
                            personalSettings?.theme_color || undefined,
                        }}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Enviar Primeiro Material
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            {/* Aba Avaliação Física */}
            <TabsContent value="avaliacao" className="space-y-6">
              {user && (
                <AvaliacaoHub
                  key={id}
                  profileId={id!}
                  personalId={user.id}
                  themeColor={personalSettings?.theme_color}
                />
              )}
            </TabsContent>
            {/* Aba Anamnese */}
            <TabsContent value="anamnese" className="space-y-6">
              {user && aluno && (
                <AnamneseVisualizacao
                  profileId={id!}
                  personalId={user.id}
                  themeColor={personalSettings?.theme_color}
                  studentName={aluno.nome}
                />
              )}
            </TabsContent>
            {/* Aba Feedbacks Semanais */}
            <TabsContent value="checkins" className="space-y-6">
              {user && aluno && (
                <CheckinsDashboard
                  profileId={id!}
                  personalId={user.id}
                  themeColor={personalSettings?.theme_color}
                  studentName={aluno.nome}
                />
              )}
            </TabsContent>

            {/* Aba Feedbacks de Treino */}
            <TabsContent value="feedbacks-treino" className="space-y-6">
              {user && aluno && (
                <TreinoFeedbacksHistory
                  profileId={id!}
                  personalId={user.id}
                  themeColor={personalSettings?.theme_color}
                  studentName={aluno.nome}
                />
              )}
            </TabsContent>

            {/* Aba Chat */}
            <TabsContent value="chat" className="space-y-4">
              {user && (
                <div className="flex justify-end">
                  <BroadcastMessageDialog
                    personalId={user.id}
                    themeColor={personalSettings?.theme_color}
                  />
                </div>
              )}
              {user && id && (
                <ChatPanel
                  personalId={user.id}
                  alunoId={id}
                  currentUserId={user.id}
                  themeColor={personalSettings?.theme_color}
                />
              )}
            </TabsContent>

            {/* Aba Financeiro */}
            <TabsContent value="financeiro" className="space-y-4">
              <AccessControlPanel
                studentId={aluno.id}
                personalId={user!.id}
                studentName={aluno.nome}
              />
            </TabsContent>
          </Tabs>
        </main>

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
