import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Upload, X } from "lucide-react";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

interface Props {
  personalId: string;
}

export function PersonalSettingsDialog({ personalId }: Props) {
  const { settings, loading, updateSettings, uploadLogo, removeLogo } =
    usePersonalSettings(personalId);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(settings?.display_name || "");
  const [themeColor, setThemeColor] = useState(
    settings?.theme_color || "#3b82f6"
  );

  const handleSave = async () => {
    await updateSettings({
      display_name: displayName,
      theme_color: themeColor,
    });
    setOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ VALIDAÇÃO DE TAMANHO (10MB)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB em bytes
    if (file.size > MAX_SIZE) {
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
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Tipo de arquivo não permitido. Use PDF ou imagens.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadLogo(file);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setUploading(true);
    try {
      await removeLogo();
    } finally {
      setUploading(false);
    }
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Personalizar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personalização do Dashboard</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo da Marca</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {settings?.logo_url ? (
                  <AvatarImage src={settings.logo_url} alt="Logo" />
                ) : (
                  <AvatarFallback>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Enviando..." : "Enviar Logo"}
                </Button>
                {settings?.logo_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Recomendado: 200x200px, máx 2MB
            </p>
          </div>

          {/* Nome Comercial */}
          <div className="space-y-2">
            <Label htmlFor="display_name">Nome Comercial</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: João Personal"
            />
          </div>

          {/* Cor do Tema */}
          <div className="space-y-2">
            <Label htmlFor="theme_color">Cor Principal</Label>
            <div className="flex gap-2">
              <Input
                id="theme_color"
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[
                "#3b82f6",
                "#10b981",
                "#f59e0b",
                "#ef4444",
                "#8b5cf6",
                "#ec4899",
              ].map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => setThemeColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="p-4 rounded-lg border"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <div className="flex items-center gap-3">
                {settings?.logo_url && (
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold" style={{ color: themeColor }}>
                    {displayName || "Nome Comercial"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dashboard Personalizado
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
