import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  GRUPOS_MUSCULARES,
  EQUIPAMENTOS,
  NIVEIS_DIFICULDADE,
} from "@/types/exercise";
import { Upload, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ExerciseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExerciseModal({
  open,
  onClose,
  onSuccess,
}: ExerciseModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    grupo_muscular: "",
    equipamento: "",
    nivel_dificuldade: "",
    link_youtube: "",
    descricao: "",
    is_global: false,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    // revoke previous preview (se existir) para evitar leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    setImageFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let imagePath = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("exercise-thumbnails")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        imagePath = fileName;
      }

      const { error } = await supabase.from("exercises_library").insert({
        nome: formData.nome,
        grupo_muscular: formData.grupo_muscular,
        equipamento: formData.equipamento || null,
        nivel_dificuldade: formData.nivel_dificuldade || null,
        link_youtube: formData.link_youtube || null,
        descricao: formData.descricao || null,
        imagem_thumbnail: imagePath,
        created_by: user.id,
        is_global: formData.is_global,
      });

      if (error) throw error;

      toast.success("Exercício criado com sucesso!");
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Erro ao criar exercício:", error);
      toast.error(error.message || "Erro ao criar exercício");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // revoke preview se existir
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFormData({
      nome: "",
      grupo_muscular: "",
      equipamento: "",
      nivel_dificuldade: "",
      link_youtube: "",
      descricao: "",
      is_global: false,
    });
    setImageFile(null);
    setPreviewUrl(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-muted border border-border shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Novo Exercício
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Nome */}
          <div>
            <Label htmlFor="nome">Nome do Exercício *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              required
              placeholder="Ex: Supino Reto"
              className="mt-1 bg-background"
            />
          </div>

          {/* Grupo / Equipamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Grupo Muscular *</Label>
              <Select
                value={formData.grupo_muscular}
                onValueChange={(value) =>
                  setFormData({ ...formData, grupo_muscular: value })
                }
                required
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione" />
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

            <div>
              <Label>Equipamento</Label>
              <Select
                value={formData.equipamento}
                onValueChange={(value) =>
                  setFormData({ ...formData, equipamento: value })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione" />
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
          </div>

          {/* Nível */}
          <div>
            <Label>Nível de Dificuldade</Label>
            <Select
              value={formData.nivel_dificuldade}
              onValueChange={(value) =>
                setFormData({ ...formData, nivel_dificuldade: value })
              }
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione" />
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
            <Label>Link do YouTube (opcional)</Label>
            <Input
              type="url"
              value={formData.link_youtube}
              onChange={(e) =>
                setFormData({ ...formData, link_youtube: e.target.value })
              }
              placeholder="https://youtube.com/..."
              className="mt-1 bg-background"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              placeholder="Instruções, dicas de execução..."
              rows={3}
              className="bg-background"
            />
          </div>

          {/* Imagem - usando <img> para preview local */}
          <div>
            <Label>Imagem (opcional)</Label>
            <div className="mt-2 flex flex-col items-start gap-3">
              <label
                htmlFor="imagem"
                className="flex items-center gap-2 cursor-pointer border border-dashed border-muted-foreground hover:border-primary rounded-lg px-4 py-2 text-sm transition-all hover:bg-background"
              >
                <Upload className="w-4 h-4 text-primary" />
                <span>Selecionar imagem</span>
              </label>

              {/* input nativo (não usar Input do design system para manter hidden file simples) */}
              <input
                id="imagem"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              {previewUrl ? (
                <div className="relative w-32 h-32 rounded-md overflow-hidden border border-border">
                  {/* usando <img> para preview local blob/url */}
                  <img
                    src={previewUrl}
                    alt="Prévia do exercício"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 border border-border rounded-md flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
            </div>
          </div>

          {/* Switch */}
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Switch
              id="global"
              checked={formData.is_global}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_global: checked })
              }
            />
            <Label htmlFor="global" className="cursor-pointer">
              Tornar exercício global (visível para todos)
            </Label>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="hover:scale-[1.02] transition-all"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="transition-all hover:scale-[1.02]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" />
                  Criando...
                </div>
              ) : (
                "Criar Exercício"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
