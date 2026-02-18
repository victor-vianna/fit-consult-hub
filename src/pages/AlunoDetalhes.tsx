import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { format } from "date-fns";
import { CalendarioSemanal } from "@/components/CalendarioSemanal";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { TreinosManager } from "@/components/TreinosManager";
import { StudentActiveToggle } from "@/components/ui/StudantActiveToggle";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { CalendarioTreinosMensal } from "@/components/CalendarioTreinosMensal";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { AppLayout } from "@/components/AppLayout";
import { AvaliacaoHub } from "@/components/avaliacao/AvaliacaoHub";
import { AnamneseVisualizacao } from "@/components/AnamneseVisualizacao";
import { CheckinsDashboard } from "@/components/CheckinsDashboard";
import { PlanilhaStatusCard } from "@/components/PlanilhaStatusCard";

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

export default function AlunoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [personalProfile, setPersonalProfile] = useState<any>(null);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const { settings: personalSettings } = usePersonalSettings(user?.id);
  const [activeTab, setActiveTab] = useState("geral");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
        .order("created_at", { ascending: false });

      if (materiaisError) {
        console.error("Erro ao buscar materiais:", materiaisError);
      }

      setMateriais(materiaisData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleEnviarMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !id) return;

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const arquivo = formData.get("arquivo") as File;

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

    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!ALLOWED_TYPES.includes(arquivo.type)) {
      toast({
        title: "Erro",
        description: "Tipo de arquivo não permitido. Use PDF ou imagens.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!arquivo) {
      toast({
        title: "Arquivo obrigatório",
        description: "Selecione um arquivo para enviar",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const fileExt = arquivo.name.split(".").pop();
      const fileName = `${user.id}/${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("materiais")
        .upload(fileName, arquivo);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("materiais")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("materiais").insert({
        profile_id: id,
        personal_id: user.id,
        titulo: formData.get("titulo") as string,
        descricao: formData.get("descricao") as string,
        tipo: formData.get("tipo") as string,
        arquivo_url: urlData.publicUrl,
        arquivo_nome: arquivo.name,
      });

      if (dbError) throw dbError;

      toast({
        title: "Material enviado!",
        description: "Material enviado com sucesso",
      });

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
    try {
      const urlParts = arquivoUrl.split("/materiais/");
      const filePath = urlParts[1];

      await supabase.storage.from("materiais").remove([filePath]);

      const { error } = await supabase
        .from("materiais")
        .delete()
        .eq("id", materialId);

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

  const handleVisualizarMaterial = (material: Material) => {
    setSelectedFile({
      url: material.arquivo_url,
      name: material.arquivo_nome,
      type: material.arquivo_nome.split(".").pop() || "",
    });
    setViewerOpen(true);
  };

  const handleActiveStatusChange = (newStatus: boolean) => {
    if (aluno) {
      setAluno({ ...aluno, is_active: newStatus });
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
            className={`${isMobile ? "px-4" : "container mx-auto px-6"} py-4`}
          >
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="hover:bg-accent/50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isMobile ? "Voltar" : "Voltar ao Dashboard"}
              </Button>

              {!isMobile && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={aluno.is_active ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {aluno.is_active ? "✓ Ativo" : "✕ Bloqueado"}
                  </Badge>
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
                    {aluno.nome.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        {aluno.nome}
                      </h1>
                      {isMobile && (
                        <Badge
                          variant={aluno.is_active ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {aluno.is_active ? "Ativo" : "Bloqueado"}
                        </Badge>
                      )}
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
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <StudentActiveToggle
                    studentId={aluno.id}
                    studentName={aluno.nome}
                    isActive={aluno.is_active}
                    onChanged={handleActiveStatusChange}
                  />
                  {aluno?.telefone && (
                    <WhatsAppButton
                      telefone={aluno.telefone}
                      nome={aluno.nome}
                    />
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Banner de Aviso */}
            {!aluno.is_active && (
              <div className="mx-6 mb-6">
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-r-xl shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-yellow-900">
                        ⚠️ Acesso Bloqueado
                      </p>
                      <p className="text-sm text-yellow-800 mt-1">
                        Este aluno não pode acessar o sistema. Ele verá uma tela
                        de "Acesso Suspenso" ao tentar fazer login.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Tabs Premium */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <div
              className={`${isMobile ? "overflow-x-auto scrollbar-hide" : ""}`}
            >
              <TabsList
                className={`${
                  isMobile
                    ? "inline-flex w-auto min-w-full gap-2"
                    : "grid grid-cols-8 w-full"
                } bg-muted/50 p-1 h-auto`}
              >
                <TabsTrigger
                  value="geral"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "py-3"
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
                    isMobile ? "flex-shrink-0 px-6 py-3" : "py-3"
                  }`}
                >
                  <Dumbbell
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Treinos"}
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "py-3"
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
                    isMobile ? "flex-shrink-0 px-6 py-3" : "py-3"
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
                    isMobile ? "flex-shrink-0 px-6 py-3" : "py-3"
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
                    isMobile ? "flex-shrink-0 px-6 py-3" : "py-3"
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
                    isMobile ? "flex-shrink-0 px-6 py-3" : "py-3"
                  }`}
                >
                  <ClipboardCheck
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Feedbacks Semanais"}
                </TabsTrigger>
                <TabsTrigger
                  value="financeiro"
                  className={`data-[state=active]:bg-background data-[state=active]:shadow-sm ${
                    isMobile ? "flex-shrink-0 px-6 py-3" : "py-3"
                  }`}
                >
                  <CreditCard
                    className={`${isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"}`}
                  />
                  {!isMobile && "Financeiro"}
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
                  onVerHistoricoCompleto={() => setActiveTab("historico")}
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
            </TabsContent>

            {/* Aba Histórico */}
            <TabsContent value="historico" className="space-y-6">
              {user && (
                <CalendarioTreinosMensal
                  profileId={id!}
                  personalId={user.id}
                  themeColor={personalSettings?.theme_color}
                  refreshKey={refreshKey}
                />
              )}
            </TabsContent>

            {/* Aba Materiais - Design Premium */}
            <TabsContent value="materiais" className="space-y-6">
              <Card className="border-2 shadow-md">
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
                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
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
                                        {format(
                                          new Date(material.created_at),
                                          "dd/MM/yyyy"
                                        )}
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
                                    window.open(material.arquivo_url, "_blank")
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

            {/* Aba Financeiro */}
            <TabsContent value="financeiro" className="space-y-4">
              <SubscriptionManager
                studentId={id!}
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
