import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Trash2,
  Edit,
  Camera,
  Image as ImageIcon,
  X,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { extractFotoPath, getFotosSignedMap } from "@/utils/fotosEvolucao";

interface AvaliacaoFisica {
  id: string;
  profile_id: string;
  personal_id: string;
  data_avaliacao: string;
  peso?: number;
  altura?: number;
  imc?: number;
  percentual_gordura?: number;
  massa_magra?: number;
  pescoco?: number;
  ombro?: number;
  torax?: number;
  cintura?: number;
  abdomen?: number;
  quadril?: number;
  braco_direito?: number;
  braco_esquerdo?: number;
  antebraco_direito?: number;
  antebraco_esquerdo?: number;
  coxa_direita?: number;
  coxa_esquerda?: number;
  panturrilha_direita?: number;
  panturrilha_esquerda?: number;
  observacoes?: string;
  objetivo?: string;
  created_at: string;
}

interface FotoEvolucao {
  id: string;
  avaliacao_id: string;
  tipo_foto: string;
  foto_url: string;
  foto_nome: string;
  descricao?: string;
  created_at: string;
}

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
}

export function AvaliacaoFisicaManager({
  profileId,
  personalId,
  themeColor,
}: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFisica[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAvaliacao, setEditingAvaliacao] =
    useState<AvaliacaoFisica | null>(null);
  const [selectedAvaliacaoId, setSelectedAvaliacaoId] = useState<string | null>(
    null
  );
  const [fotos, setFotos] = useState<FotoEvolucao[]>([]);
  const [openFotosDialog, setOpenFotosDialog] = useState(false);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFoto, setSelectedFoto] = useState<string | null>(null);

  useEffect(() => {
    fetchAvaliacoes();
  }, [profileId]);

  const fetchAvaliacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("profile_id", profileId)
        .order("data_avaliacao", { ascending: false });

      if (error) throw error;
      setAvaliacoes(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar avaliações:", error);
      toast({
        title: "Erro ao carregar avaliações",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchFotos = async (avaliacaoId: string) => {
    try {
      const { data, error } = await supabase
        .from("fotos_evolucao")
        .select("*")
        .eq("avaliacao_id", avaliacaoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const list = data || [];
      const map = await getFotosSignedMap(list.map((f: any) => f.foto_url));
      setFotos(
        list.map((f: any) => ({
          ...f,
          foto_path: f.foto_url,
          foto_url: map[f.foto_url] || f.foto_url,
        })) as any
      );
    } catch (error: any) {
      console.error("Erro ao buscar fotos:", error);
    }
  };

  const calcularIMC = (peso?: number, altura?: number) => {
    if (!peso || !altura) return undefined;
    return Number((peso / (altura * altura)).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const peso = formData.get("peso")
      ? Number(formData.get("peso"))
      : undefined;
    const altura = formData.get("altura")
      ? Number(formData.get("altura"))
      : undefined;
    const imc = calcularIMC(peso, altura);

    const avaliacaoData = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: formData.get("data_avaliacao") as string,
      peso,
      altura,
      imc,
      percentual_gordura: formData.get("percentual_gordura")
        ? Number(formData.get("percentual_gordura"))
        : undefined,
      massa_magra: formData.get("massa_magra")
        ? Number(formData.get("massa_magra"))
        : undefined,
      pescoco: formData.get("pescoco")
        ? Number(formData.get("pescoco"))
        : undefined,
      ombro: formData.get("ombro") ? Number(formData.get("ombro")) : undefined,
      torax: formData.get("torax") ? Number(formData.get("torax")) : undefined,
      cintura: formData.get("cintura")
        ? Number(formData.get("cintura"))
        : undefined,
      abdomen: formData.get("abdomen")
        ? Number(formData.get("abdomen"))
        : undefined,
      quadril: formData.get("quadril")
        ? Number(formData.get("quadril"))
        : undefined,
      braco_direito: formData.get("braco_direito")
        ? Number(formData.get("braco_direito"))
        : undefined,
      braco_esquerdo: formData.get("braco_esquerdo")
        ? Number(formData.get("braco_esquerdo"))
        : undefined,
      antebraco_direito: formData.get("antebraco_direito")
        ? Number(formData.get("antebraco_direito"))
        : undefined,
      antebraco_esquerdo: formData.get("antebraco_esquerdo")
        ? Number(formData.get("antebraco_esquerdo"))
        : undefined,
      coxa_direita: formData.get("coxa_direita")
        ? Number(formData.get("coxa_direita"))
        : undefined,
      coxa_esquerda: formData.get("coxa_esquerda")
        ? Number(formData.get("coxa_esquerda"))
        : undefined,
      panturrilha_direita: formData.get("panturrilha_direita")
        ? Number(formData.get("panturrilha_direita"))
        : undefined,
      panturrilha_esquerda: formData.get("panturrilha_esquerda")
        ? Number(formData.get("panturrilha_esquerda"))
        : undefined,
      observacoes: formData.get("observacoes") as string,
      objetivo: formData.get("objetivo") as string,
    };

    try {
      if (editingAvaliacao) {
        const { error } = await supabase
          .from("avaliacoes_fisicas")
          .update(avaliacaoData)
          .eq("id", editingAvaliacao.id);

        if (error) throw error;
        toast({ title: "Avaliação atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from("avaliacoes_fisicas")
          .insert(avaliacaoData);

        if (error) throw error;
        toast({ title: "Avaliação criada com sucesso!" });
      }

      setOpenDialog(false);
      setEditingAvaliacao(null);
      fetchAvaliacoes();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar avaliação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Buscar e deletar fotos associadas
      const { data: fotos } = await supabase
        .from("fotos_evolucao")
        .select("foto_url")
        .eq("avaliacao_id", id);

      if (fotos && fotos.length > 0) {
        for (const foto of fotos) {
          const urlParts = foto.foto_url.split("/fotos-evolucao/");
          if (urlParts[1]) {
            await supabase.storage.from("fotos-evolucao").remove([urlParts[1]]);
          }
        }
      }

      const { error } = await supabase
        .from("avaliacoes_fisicas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Avaliação removida com sucesso!" });
      fetchAvaliacoes();
    } catch (error: any) {
      toast({
        title: "Erro ao remover avaliação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUploadFotos = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAvaliacaoId) return;

    setUploadingFotos(true);
    const formData = new FormData(e.currentTarget);
    const files = (formData.get("fotos") as File)
      ? [formData.get("fotos") as File]
      : [];
    const tipoFoto = formData.get("tipo_foto") as string;
    const descricao = formData.get("descricao") as string;

    try {
      for (const file of files) {
        if (!file || file.size === 0) continue;

        // Validações
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede o limite de 5MB`,
            variant: "destructive",
          });
          continue;
        }

        const ALLOWED_TYPES = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/webp",
        ];
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast({
            title: "Tipo não permitido",
            description: `${file.name} não é uma imagem válida`,
            variant: "destructive",
          });
          continue;
        }

        // Upload
        const fileExt = file.name.split(".").pop();
        const fileName = `${personalId}/${profileId}/${selectedAvaliacaoId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("fotos-evolucao")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("fotos-evolucao")
          .getPublicUrl(fileName);

        // Salvar no banco
        const { error: dbError } = await supabase
          .from("fotos_evolucao")
          .insert({
            avaliacao_id: selectedAvaliacaoId,
            profile_id: profileId,
            personal_id: personalId,
            tipo_foto: tipoFoto,
            foto_url: urlData.publicUrl,
            foto_nome: file.name,
            descricao,
          });

        if (dbError) throw dbError;
      }

      toast({ title: "Fotos enviadas com sucesso!" });
      setOpenFotosDialog(false);
      fetchFotos(selectedAvaliacaoId);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar fotos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFotos(false);
    }
  };

  const handleDeleteFoto = async (foto: FotoEvolucao) => {
    try {
      const urlParts = foto.foto_url.split("/fotos-evolucao/");
      if (urlParts[1]) {
        await supabase.storage.from("fotos-evolucao").remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from("fotos_evolucao")
        .delete()
        .eq("id", foto.id);

      if (error) throw error;

      toast({ title: "Foto removida com sucesso!" });
      fetchFotos(foto.avaliacao_id);
    } catch (error: any) {
      toast({
        title: "Erro ao remover foto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTipoFotoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      frente: "Frente",
      costas: "Costas",
      lado_direito: "Lado Direito",
      lado_esquerdo: "Lado Esquerdo",
      outro: "Outro",
    };
    return tipos[tipo] || tipo;
  };

  const compararComAnterior = (atual?: number, index: number = 0) => {
    if (!atual || index >= avaliacoes.length - 1) return null;

    const anterior = avaliacoes[index + 1];
    const campo = Object.keys(avaliacoes[index]).find(
      (key) => avaliacoes[index][key as keyof AvaliacaoFisica] === atual
    ) as keyof AvaliacaoFisica;

    const valorAnterior = anterior[campo] as number | undefined;
    if (!valorAnterior) return null;

    const diferenca = atual - valorAnterior;
    return diferenca;
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-md">
        <CardHeader className="bg-gradient-to-r from-card to-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Avaliações Físicas</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {avaliacoes.length}{" "}
                {avaliacoes.length === 1 ? "avaliação" : "avaliações"}{" "}
                registrada{avaliacoes.length === 1 ? "" : "s"}
              </p>
            </div>
            <Dialog
              open={openDialog}
              onOpenChange={(open) => {
                setOpenDialog(open);
                if (!open) setEditingAvaliacao(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  style={{ backgroundColor: themeColor }}
                  className="shadow-md"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Avaliação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {editingAvaliacao
                      ? "Editar Avaliação"
                      : "Nova Avaliação Física"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Data e Objetivo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="data_avaliacao">
                        Data da Avaliação *
                      </Label>
                      <Input
                        id="data_avaliacao"
                        name="data_avaliacao"
                        type="datetime-local"
                        defaultValue={
                          editingAvaliacao?.data_avaliacao
                            ? format(
                                new Date(editingAvaliacao.data_avaliacao),
                                "yyyy-MM-dd'T'HH:mm"
                              )
                            : format(new Date(), "yyyy-MM-dd'T'HH:mm")
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="objetivo">Objetivo</Label>
                      <Input
                        id="objetivo"
                        name="objetivo"
                        placeholder="Ex: Hipertrofia, Emagrecimento..."
                        defaultValue={editingAvaliacao?.objetivo}
                      />
                    </div>
                  </div>

                  {/* Dados Básicos */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Dados Básicos</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="peso">Peso (kg)</Label>
                        <Input
                          id="peso"
                          name="peso"
                          type="number"
                          step="0.1"
                          placeholder="70.5"
                          defaultValue={editingAvaliacao?.peso}
                        />
                      </div>
                      <div>
                        <Label htmlFor="altura">Altura (m)</Label>
                        <Input
                          id="altura"
                          name="altura"
                          type="number"
                          step="0.01"
                          placeholder="1.75"
                          defaultValue={editingAvaliacao?.altura}
                        />
                      </div>
                      <div>
                        <Label htmlFor="percentual_gordura">% Gordura</Label>
                        <Input
                          id="percentual_gordura"
                          name="percentual_gordura"
                          type="number"
                          step="0.1"
                          placeholder="15.5"
                          defaultValue={editingAvaliacao?.percentual_gordura}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Circunferências */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">
                      Circunferências (cm)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="pescoco">Pescoço</Label>
                        <Input
                          id="pescoco"
                          name="pescoco"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.pescoco}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ombro">Ombro</Label>
                        <Input
                          id="ombro"
                          name="ombro"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.ombro}
                        />
                      </div>
                      <div>
                        <Label htmlFor="torax">Tórax</Label>
                        <Input
                          id="torax"
                          name="torax"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.torax}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cintura">Cintura</Label>
                        <Input
                          id="cintura"
                          name="cintura"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.cintura}
                        />
                      </div>
                      <div>
                        <Label htmlFor="abdomen">Abdômen</Label>
                        <Input
                          id="abdomen"
                          name="abdomen"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.abdomen}
                        />
                      </div>
                      <div>
                        <Label htmlFor="quadril">Quadril</Label>
                        <Input
                          id="quadril"
                          name="quadril"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.quadril}
                        />
                      </div>
                      <div>
                        <Label htmlFor="braco_direito">Braço D</Label>
                        <Input
                          id="braco_direito"
                          name="braco_direito"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.braco_direito}
                        />
                      </div>
                      <div>
                        <Label htmlFor="braco_esquerdo">Braço E</Label>
                        <Input
                          id="braco_esquerdo"
                          name="braco_esquerdo"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.braco_esquerdo}
                        />
                      </div>
                      <div>
                        <Label htmlFor="coxa_direita">Coxa D</Label>
                        <Input
                          id="coxa_direita"
                          name="coxa_direita"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.coxa_direita}
                        />
                      </div>
                      <div>
                        <Label htmlFor="coxa_esquerda">Coxa E</Label>
                        <Input
                          id="coxa_esquerda"
                          name="coxa_esquerda"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.coxa_esquerda}
                        />
                      </div>
                      <div>
                        <Label htmlFor="panturrilha_direita">
                          Panturrilha D
                        </Label>
                        <Input
                          id="panturrilha_direita"
                          name="panturrilha_direita"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.panturrilha_direita}
                        />
                      </div>
                      <div>
                        <Label htmlFor="panturrilha_esquerda">
                          Panturrilha E
                        </Label>
                        <Input
                          id="panturrilha_esquerda"
                          name="panturrilha_esquerda"
                          type="number"
                          step="0.1"
                          defaultValue={editingAvaliacao?.panturrilha_esquerda}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      name="observacoes"
                      placeholder="Observações sobre a avaliação..."
                      rows={3}
                      defaultValue={editingAvaliacao?.observacoes}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                    style={{ backgroundColor: themeColor }}
                  >
                    {loading
                      ? "Salvando..."
                      : editingAvaliacao
                      ? "Atualizar Avaliação"
                      : "Salvar Avaliação"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {avaliacoes.length > 0 ? (
            <div className="space-y-4">
              {avaliacoes.map((avaliacao, index) => (
                <Card
                  key={avaliacao.id}
                  className="border-2 hover:shadow-lg transition-all"
                >
                  <div
                    className="h-1"
                    style={{
                      backgroundColor: themeColor || "hsl(var(--primary))",
                    }}
                  />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">
                            {format(
                              new Date(avaliacao.data_avaliacao),
                              "dd 'de' MMMM 'de' yyyy",
                              { locale: ptBR }
                            )}
                          </h3>
                          {avaliacao.objetivo && (
                            <Badge variant="secondary">
                              {avaliacao.objetivo}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(avaliacao.data_avaliacao), "HH:mm")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setSelectedAvaliacaoId(avaliacao.id);
                            await fetchFotos(avaliacao.id);
                            setOpenFotosDialog(true);
                          }}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Fotos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingAvaliacao(avaliacao);
                            setOpenDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-200 hover:bg-red-50"
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
                                Tem certeza que deseja remover esta avaliação?
                                Todas as fotos associadas também serão
                                removidas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(avaliacao.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Dados principais */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {avaliacao.peso && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            Peso
                          </p>
                          <p className="font-bold text-lg flex items-center gap-2">
                            {avaliacao.peso} kg
                            {compararComAnterior(avaliacao.peso, index) !==
                              null && (
                              <span
                                className={`text-xs flex items-center ${
                                  compararComAnterior(avaliacao.peso, index)! >
                                  0
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {compararComAnterior(avaliacao.peso, index)! >
                                0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {Math.abs(
                                  compararComAnterior(avaliacao.peso, index)!
                                ).toFixed(1)}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      {avaliacao.imc && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            IMC
                          </p>
                          <p className="font-bold text-lg">{avaliacao.imc}</p>
                        </div>
                      )}
                      {avaliacao.percentual_gordura && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            % Gordura
                          </p>
                          <p className="font-bold text-lg flex items-center gap-2">
                            {avaliacao.percentual_gordura}%
                            {compararComAnterior(
                              avaliacao.percentual_gordura,
                              index
                            ) !== null && (
                              <span
                                className={`text-xs flex items-center ${
                                  compararComAnterior(
                                    avaliacao.percentual_gordura,
                                    index
                                  )! > 0
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {compararComAnterior(
                                  avaliacao.percentual_gordura,
                                  index
                                )! > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {Math.abs(
                                  compararComAnterior(
                                    avaliacao.percentual_gordura,
                                    index
                                  )!
                                ).toFixed(1)}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      {avaliacao.altura && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            Altura
                          </p>
                          <p className="font-bold text-lg">
                            {avaliacao.altura} m
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Circunferências */}
                    {(avaliacao.pescoco ||
                      avaliacao.torax ||
                      avaliacao.cintura ||
                      avaliacao.braco_direito) && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3 text-sm">
                          Circunferências (cm)
                        </h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                          {avaliacao.pescoco && (
                            <div>
                              <span className="text-muted-foreground">
                                Pescoço:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.pescoco}
                              </span>
                            </div>
                          )}
                          {avaliacao.torax && (
                            <div>
                              <span className="text-muted-foreground">
                                Tórax:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.torax}
                              </span>
                            </div>
                          )}
                          {avaliacao.cintura && (
                            <div>
                              <span className="text-muted-foreground">
                                Cintura:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.cintura}
                              </span>
                            </div>
                          )}
                          {avaliacao.abdomen && (
                            <div>
                              <span className="text-muted-foreground">
                                Abdômen:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.abdomen}
                              </span>
                            </div>
                          )}
                          {avaliacao.quadril && (
                            <div>
                              <span className="text-muted-foreground">
                                Quadril:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.quadril}
                              </span>
                            </div>
                          )}
                          {avaliacao.braco_direito && (
                            <div>
                              <span className="text-muted-foreground">
                                Braço D:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.braco_direito}
                              </span>
                            </div>
                          )}
                          {avaliacao.braco_esquerdo && (
                            <div>
                              <span className="text-muted-foreground">
                                Braço E:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.braco_esquerdo}
                              </span>
                            </div>
                          )}
                          {avaliacao.coxa_direita && (
                            <div>
                              <span className="text-muted-foreground">
                                Coxa D:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.coxa_direita}
                              </span>
                            </div>
                          )}
                          {avaliacao.coxa_esquerda && (
                            <div>
                              <span className="text-muted-foreground">
                                Coxa E:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.coxa_esquerda}
                              </span>
                            </div>
                          )}
                          {avaliacao.panturrilha_direita && (
                            <div>
                              <span className="text-muted-foreground">
                                Pant. D:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.panturrilha_direita}
                              </span>
                            </div>
                          )}
                          {avaliacao.panturrilha_esquerda && (
                            <div>
                              <span className="text-muted-foreground">
                                Pant. E:
                              </span>{" "}
                              <span className="font-semibold">
                                {avaliacao.panturrilha_esquerda}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    {avaliacao.observacoes && (
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold mb-2 text-sm">
                          Observações
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {avaliacao.observacoes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                <TrendingUp className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma avaliação registrada
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Comece criando a primeira avaliação física para acompanhar a
                evolução do aluno.
              </p>
              <Button
                onClick={() => setOpenDialog(true)}
                style={{ backgroundColor: themeColor }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Avaliação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Fotos */}
      <Dialog open={openFotosDialog} onOpenChange={setOpenFotosDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Fotos de Evolução</DialogTitle>
          </DialogHeader>

          {/* Upload de Fotos */}
          <form
            onSubmit={handleUploadFotos}
            className="space-y-4 border-b pb-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_foto">Tipo de Foto *</Label>
                <Select name="tipo_foto" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frente">📸 Frente</SelectItem>
                    <SelectItem value="costas">📸 Costas</SelectItem>
                    <SelectItem value="lado_direito">
                      📸 Lado Direito
                    </SelectItem>
                    <SelectItem value="lado_esquerdo">
                      📸 Lado Esquerdo
                    </SelectItem>
                    <SelectItem value="outro">📸 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fotos">Foto *</Label>
                <Input
                  id="fotos"
                  name="fotos"
                  type="file"
                  accept="image/*"
                  required
                  className="cursor-pointer"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="descricao">Descrição (Opcional)</Label>
              <Textarea
                id="descricao"
                name="descricao"
                placeholder="Adicione uma descrição..."
                rows={2}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={uploadingFotos}
              style={{ backgroundColor: themeColor }}
            >
              {uploadingFotos ? "Enviando..." : "Enviar Foto"}
            </Button>
          </form>

          {/* Galeria de Fotos */}
          <div>
            <h3 className="font-semibold mb-4">
              Fotos desta Avaliação ({fotos.length})
            </h3>
            {fotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {fotos.map((foto) => (
                  <div key={foto.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border-2 hover:border-primary transition-all">
                      <img
                        src={foto.foto_url}
                        alt={foto.descricao || "Foto de evolução"}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          setSelectedFoto(foto.foto_url);
                          setViewerOpen(true);
                        }}
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                        onClick={() => {
                          setSelectedFoto(foto.foto_url);
                          setViewerOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Foto</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover esta foto?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFoto(foto)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {getTipoFotoLabel(foto.tipo_foto)}
                      </Badge>
                      {foto.descricao && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {foto.descricao}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(foto.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma foto enviada ainda
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Viewer de Foto */}
      {selectedFoto && (
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setViewerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={selectedFoto}
                alt="Foto de evolução"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
