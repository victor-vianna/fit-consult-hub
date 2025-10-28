import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Exercise,
  GRUPOS_MUSCULARES,
  EQUIPAMENTOS,
  NIVEIS_DIFICULDADE,
} from "@/types/exercise";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ExerciseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  exercise?: Exercise | null;
}

export default function ExerciseModal({
  open,
  onClose,
  onSuccess,
  exercise,
}: ExerciseModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    grupo_muscular: "",
    equipamento: "",
    nivel_dificuldade: "",
    link_youtube: "",
    imagem_thumbnail: "",
  });

  // ✅ Preview da imagem
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (exercise) {
      setFormData({
        nome: exercise.nome || "",
        descricao: exercise.descricao || "",
        grupo_muscular: exercise.grupo_muscular || "",
        equipamento: exercise.equipamento || "",
        nivel_dificuldade: exercise.nivel_dificuldade || "",
        link_youtube: exercise.link_youtube || "",
        imagem_thumbnail: exercise.imagem_thumbnail || "",
      });
      setImagePreview(exercise.imagem_thumbnail || "");
      setSelectedFile(null);
    } else {
      setFormData({
        nome: "",
        descricao: "",
        grupo_muscular: "",
        equipamento: "",
        nivel_dificuldade: "",
        link_youtube: "",
        imagem_thumbnail: "",
      });
      setImagePreview("");
      setSelectedFile(null);
    }
  }, [exercise, open]);

  // ✅ Handler para selecionar arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setSelectedFile(file);

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ✅ Remover imagem
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setFormData({ ...formData, imagem_thumbnail: "" });
  };

  // ✅ Upload da imagem para o Supabase
  const uploadThumbnail = async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;

    try {
      setUploadingImage(true);

      // Gerar nome único para o arquivo
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload para o bucket
      const { error: uploadError } = await supabase.storage
        .from("exercise-thumbnails")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from("exercise-thumbnails")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.grupo_muscular) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      setLoading(true);

      // ✅ Upload da thumbnail se houver arquivo selecionado
      let thumbnailUrl = formData.imagem_thumbnail;
      if (selectedFile) {
        const uploadedUrl = await uploadThumbnail();
        if (uploadedUrl) {
          thumbnailUrl = uploadedUrl;
        }
      }

      const dataToSave = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        grupo_muscular: formData.grupo_muscular,
        equipamento: formData.equipamento || null,
        nivel_dificuldade: formData.nivel_dificuldade || null,
        link_youtube: formData.link_youtube || null,
        imagem_thumbnail: thumbnailUrl || null,
      };

      if (exercise?.id) {
        // Modo EDIÇÃO
        const { error } = await supabase
          .from("exercises_library")
          .update(dataToSave)
          .eq("id", exercise.id);

        if (error) throw error;
        toast.success("Exercício atualizado com sucesso!");
      } else {
        // Modo CRIAÇÃO
        const { error } = await supabase.from("exercises_library").insert({
          ...dataToSave,
          created_by: user?.id,
        });

        if (error) throw error;
        toast.success("Exercício criado com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar exercício:", error);
      toast.error("Erro ao salvar exercício");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {exercise ? "Editar Exercício" : "Novo Exercício"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ Upload de Thumbnail */}
          <div>
            <Label>Thumbnail do Exercício</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="thumbnail-upload"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">
                        Clique para fazer upload
                      </span>{" "}
                      ou arraste e solte
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG ou WEBP (máx. 5MB)
                    </p>
                  </div>
                  <Input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Nome */}
          <div>
            <Label htmlFor="nome">Nome do Exercício *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              placeholder="Ex: Supino Reto"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              placeholder="Descreva como executar o exercício..."
              rows={3}
            />
          </div>

          {/* Grupo Muscular */}
          <div>
            <Label htmlFor="grupo">Grupo Muscular *</Label>
            <Select
              value={formData.grupo_muscular}
              onValueChange={(value) =>
                setFormData({ ...formData, grupo_muscular: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo muscular" />
              </SelectTrigger>
              <SelectContent>
                {GRUPOS_MUSCULARES.map((grupo) => (
                  <SelectItem key={grupo} value={grupo}>
                    {grupo.charAt(0).toUpperCase() + grupo.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipamento */}
          <div>
            <Label htmlFor="equipamento">Equipamento</Label>
            <Select
              value={formData.equipamento}
              onValueChange={(value) =>
                setFormData({ ...formData, equipamento: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o equipamento" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPAMENTOS.map((equip) => (
                  <SelectItem key={equip} value={equip}>
                    {equip.replace("_", " ").charAt(0).toUpperCase() +
                      equip.slice(1).replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nível */}
          <div>
            <Label htmlFor="nivel">Nível de Dificuldade</Label>
            <Select
              value={formData.nivel_dificuldade}
              onValueChange={(value) =>
                setFormData({ ...formData, nivel_dificuldade: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS_DIFICULDADE.map((nivel) => (
                  <SelectItem key={nivel} value={nivel}>
                    {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link YouTube */}
          <div>
            <Label htmlFor="link">Link do YouTube</Label>
            <Input
              id="link"
              type="url"
              value={formData.link_youtube}
              onChange={(e) =>
                setFormData({ ...formData, link_youtube: e.target.value })
              }
              placeholder="https://youtube.com/..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || uploadingImage}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploadingImage}>
              {loading || uploadingImage
                ? "Salvando..."
                : exercise
                ? "Atualizar"
                : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
