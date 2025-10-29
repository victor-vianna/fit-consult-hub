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
} from "lucide-react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { format } from "date-fns";
import { CalendarioSemanal } from "@/components/CalendarioSemanal";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { TreinosManager } from "@/components/TreinosManager";
import { StudentActiveToggle } from "@/components/ui/StudantActiveToggle";
import { SubscriptionManager } from "@/components/SubscriptionManager";

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

    // ✅ VALIDAÇÃO DE TAMANHO (10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB em bytes
    if (arquivo.size > MAX_SIZE) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Máximo: 10MB",
        variant: "destructive",
      });
      return;
    }

    // ✅ VALIDAÇÃO DE TIPO
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
      // Upload do arquivo
      const fileExt = arquivo.name.split(".").pop();
      const fileName = `${user.id}/${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("materiais")
        .upload(fileName, arquivo);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from("materiais")
        .getPublicUrl(fileName);

      // Salvar no banco
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
      // Extrair path do arquivo da URL
      const urlParts = arquivoUrl.split("/materiais/");
      const filePath = urlParts[1];

      // Deletar do storage
      await supabase.storage.from("materiais").remove([filePath]);

      // Deletar do banco
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

  if (!aluno) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Informações do Aluno</CardTitle>
              <StudentActiveToggle
                studentId={aluno.id}
                studentName={aluno.nome}
                isActive={aluno.is_active}
                onChanged={handleActiveStatusChange}
              />
            </div>
          </CardHeader>
          <CardContent>
            {/* Banner de aviso se aluno estiver bloqueado */}
            {!aluno.is_active && (
              <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-900">
                      ⚠️ Aluno com acesso bloqueado
                    </p>
                    <p className="text-sm text-yellow-800 mt-1">
                      Este aluno não consegue acessar o sistema no momento. Ele
                      verá uma tela de "Acesso Suspenso" ao tentar fazer login.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{aluno.nome}</h2>
                <Badge variant={aluno.is_active ? "default" : "destructive"}>
                  {aluno.is_active ? "Ativo" : "Bloqueado"}
                </Badge>
              </div>
              <p className="text-muted-foreground">{aluno.email}</p>
              {aluno.telefone && (
                <p className="text-muted-foreground">📱 {aluno.telefone}</p>
              )}
              {aluno?.telefone && (
                <WhatsAppButton telefone={aluno.telefone} nome={aluno.nome} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs para organizar conteúdo */}
        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">
              <User className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="treinos">
              <Dumbbell className="h-4 w-4 mr-2" />
              Treinos
            </TabsTrigger>
            <TabsTrigger value="materiais">
              <FileText className="h-4 w-4 mr-2" />
              Materiais
            </TabsTrigger>
            <TabsTrigger value="financeiro">
              <CreditCard className="h-4 w-4 mr-2" />
              Financeiro
            </TabsTrigger>
          </TabsList>

          {/* Aba Geral */}
          <TabsContent value="geral" className="space-y-6">
            {user && <CalendarioSemanal profileId={id!} personalId={user.id} />}
          </TabsContent>

          {/* Aba Treinos */}
          <TabsContent value="treinos" className="space-y-6">
            <TreinosManager
              profileId={id!}
              personalId={user!.id}
              readOnly={false}
            />
          </TabsContent>

          {/* Aba Materiais */}
          <TabsContent value="materiais" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Materiais</CardTitle>
                  <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Enviar Material
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Enviar Material</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={handleEnviarMaterial}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="titulo">Título</Label>
                          <Input id="titulo" name="titulo" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tipo">Tipo</Label>
                          <Select name="tipo" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="treino">Treino</SelectItem>
                              <SelectItem value="dieta">Dieta</SelectItem>
                              <SelectItem value="avaliacao">
                                Avaliação
                              </SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="descricao">Descrição</Label>
                          <Textarea id="descricao" name="descricao" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="arquivo">Arquivo</Label>
                          <Input
                            id="arquivo"
                            name="arquivo"
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loading}
                        >
                          {loading ? "Enviando..." : "Enviar Material"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materiais.map((material) => (
                    <Card key={material.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">
                                {material.titulo}
                              </h3>
                              <Badge variant="secondary">{material.tipo}</Badge>
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
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
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
                                    material?
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
                  {materiais.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum material enviado ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
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
  );
}
