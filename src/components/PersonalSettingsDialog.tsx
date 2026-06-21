import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, ExternalLink, Settings, Upload, X, FileImage } from "lucide-react";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { AlunoDashboardCustomizeForm } from "@/components/AlunoDashboardCustomizeForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  personalId: string;
  iconOnly?: boolean;
}

export function PersonalSettingsDialog({ personalId, iconOnly = false }: Props) {
  const {
    settings,
    loading,
    updateSettings,
    uploadLogo,
    removeLogo,
    uploadLetterhead,
    removeLetterhead,
  } = usePersonalSettings(personalId);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const letterheadInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(settings?.display_name || "");
  const [themeColor, setThemeColor] = useState(
    settings?.theme_color || "#3b82f6"
  );
  const [publicSlug, setPublicSlug] = useState("");
  const [publicEnabled, setPublicEnabled] = useState(false);
  const publicUrl =
    typeof window === "undefined" || !publicSlug
      ? ""
      : `${window.location.origin}/p/${publicSlug}`;

  useEffect(() => {
    if (open) fetchPublicProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, personalId]);

  useEffect(() => {
    if (!settings) return;
    setDisplayName(settings.display_name || "");
    setThemeColor(settings.theme_color || "#3b82f6");
  }, [settings]);

  async function fetchPublicProfile() {
    const { data } = await supabase
      .from("profiles")
      .select("public_slug, public_profile_enabled")
      .eq("id", personalId)
      .maybeSingle();

    setPublicSlug((data as any)?.public_slug ?? "");
    setPublicEnabled(!!(data as any)?.public_profile_enabled);
  }

  const handleSave = async () => {
    await updateSettings({
      display_name: displayName,
      theme_color: themeColor,
    });
    const { error } = await supabase
      .from("profiles")
      .update({
        public_slug: publicSlug,
        public_profile_enabled: publicEnabled,
      } as any)
      .eq("id", personalId);
    if (error) throw error;
    setOpen(false);
  };

  const handleCopyPublicUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Link copiado",
      description: "Envie este link para alunos interessados.",
    });
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

  const handleLetterheadChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Máximo: 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast({
        title: "Erro",
        description: "Use uma imagem PNG ou JPG.",
        variant: "destructive",
      });
      return;
    }

    setUploadingLetterhead(true);
    try {
      await uploadLetterhead(file);
    } finally {
      setUploadingLetterhead(false);
      if (letterheadInputRef.current) letterheadInputRef.current.value = "";
    }
  };

  const handleRemoveLetterhead = async () => {
    setUploadingLetterhead(true);
    try {
      await removeLetterhead();
    } finally {
      setUploadingLetterhead(false);
    }
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Personalizar"
            title="Personalizar"
          >
            <Settings className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Personalizar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalização</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Dashboard do Personal</TabsTrigger>
            <TabsTrigger value="aluno">Área do Aluno</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <div className="space-y-6 pt-2">
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

              {/* Papel Timbrado */}
              <div className="space-y-2 pt-4 border-t">
                <Label className="flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Papel Timbrado (Exportações)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Imagem que será usada como fundo da página A4 nas exportações de PDF/Word de treinos e avaliações.
                </p>
                <div className="flex items-start gap-4">
                  <div className="w-24 h-32 rounded border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {settings?.letterhead_url ? (
                      <img
                        src={settings.letterhead_url}
                        alt="Papel timbrado"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileImage className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => letterheadInputRef.current?.click()}
                      disabled={uploadingLetterhead}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingLetterhead ? "Enviando..." : "Enviar Papel Timbrado"}
                    </Button>
                    {settings?.letterhead_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLetterhead}
                        disabled={uploadingLetterhead}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                    )}
                    <input
                      ref={letterheadInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={handleLetterheadChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      PNG ou JPG • A4 retrato (~1240x1754px) • máx 5MB
                    </p>
                  </div>
                </div>
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

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-base">Pagina publica de venda</Label>
                    <p className="text-xs text-muted-foreground">
                      Link para alunos conhecerem seus planos e criarem conta ja vinculada a voce.
                    </p>
                  </div>
                  <Switch checked={publicEnabled} onCheckedChange={setPublicEnabled} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="public_slug">Slug publico</Label>
                  <Input
                    id="public_slug"
                    value={publicSlug}
                    onChange={(e) => setPublicSlug(e.target.value)}
                    placeholder="seu-nome"
                  />
                </div>

                {publicUrl && (
                  <div className="flex flex-col gap-2 rounded-md bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-all text-sm text-muted-foreground">{publicUrl}</span>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={handleCopyPublicUrl}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar
                      </Button>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <a href={publicUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
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
          </TabsContent>

          <TabsContent value="aluno">
            <AlunoDashboardCustomizeForm
              personalId={personalId}
              onSaved={() => setOpen(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
