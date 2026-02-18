import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, X, Camera, Image as ImageIcon, Calendar, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FotoTimeline } from "./FotoTimeline";

interface FotoEvolucao {
  id: string;
  avaliacao_id: string | null;
  tipo_foto: string;
  foto_url: string;
  foto_nome: string;
  descricao?: string;
  data_foto?: string;
  created_at: string;
}

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  refreshKey: number;
  onRefresh: () => void;
}

const TIPOS_FOTO: Record<string, string> = {
  frente: "Frente",
  costas: "Costas",
  lado_direito: "Lado Direito",
  lado_esquerdo: "Lado Esquerdo",
  outro: "Outro",
};

export function FotosSection({ profileId, personalId, themeColor, refreshKey, onRefresh }: Props) {
  const { toast } = useToast();
  const [fotos, setFotos] = useState<FotoEvolucao[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFoto, setSelectedFoto] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [editingFoto, setEditingFoto] = useState<FotoEvolucao | null>(null);
  const [editDate, setEditDate] = useState("");
  const [viewMode, setViewMode] = useState<"galeria" | "timeline">("galeria");

  useEffect(() => {
    fetchFotos();
  }, [profileId, refreshKey]);

  const fetchFotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fotos_evolucao")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFotos((data as any[]) || []);
    } catch (error: any) {
      console.error("Erro ao buscar fotos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    const file = formData.get("foto") as File;
    const tipoFoto = formData.get("tipo_foto") as string;
    const descricao = formData.get("descricao") as string;
    const dataFoto = formData.get("data_foto") as string;

    try {
      if (!file || file.size === 0) throw new Error("Selecione uma foto");
      if (file.size > 5 * 1024 * 1024) throw new Error("Máximo 5MB");
      if (!["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.type)) throw new Error("Formato inválido");

      const fileExt = file.name.split(".").pop();
      const fileName = `${personalId}/${profileId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("fotos-evolucao").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("fotos-evolucao").getPublicUrl(fileName);

      const insertData: any = {
        profile_id: profileId,
        personal_id: personalId,
        tipo_foto: tipoFoto,
        foto_url: urlData.publicUrl,
        foto_nome: file.name,
        descricao: descricao || null,
        data_foto: dataFoto || null,
      };

      const { error: dbError } = await supabase.from("fotos_evolucao").insert(insertData);
      if (dbError) throw dbError;

      toast({ title: "Foto enviada com sucesso!" });
      setOpenUpload(false);
      fetchFotos();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFoto = async (foto: FotoEvolucao) => {
    try {
      const urlParts = foto.foto_url.split("/fotos-evolucao/");
      if (urlParts[1]) await supabase.storage.from("fotos-evolucao").remove([urlParts[1]]);
      const { error } = await supabase.from("fotos_evolucao").delete().eq("id", foto.id);
      if (error) throw error;
      toast({ title: "Foto removida!" });
      fetchFotos();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Erro ao remover foto", description: error.message, variant: "destructive" });
    }
  };

  const handleEditDate = async () => {
    if (!editingFoto) return;
    try {
      const { error } = await supabase
        .from("fotos_evolucao")
        .update({ data_foto: editDate || null } as any)
        .eq("id", editingFoto.id);
      if (error) throw error;
      toast({ title: "Data atualizada!" });
      setEditingFoto(null);
      fetchFotos();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar data", description: error.message, variant: "destructive" });
    }
  };

  const fotosFiltradas = filtroTipo === "todos" ? fotos : fotos.filter((f) => f.tipo_foto === filtroTipo);

  const contagemPorTipo = Object.keys(TIPOS_FOTO).reduce((acc, tipo) => {
    acc[tipo] = fotos.filter((f) => f.tipo_foto === tipo).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg">Fotos de Evolução</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{fotos.length} foto{fotos.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "galeria" ? "timeline" : "galeria")}>
              {viewMode === "galeria" ? <Calendar className="h-4 w-4 mr-1" /> : <ImageIcon className="h-4 w-4 mr-1" />}
              {viewMode === "galeria" ? "Timeline" : "Galeria"}
            </Button>
            <Button size="sm" style={{ backgroundColor: themeColor }} onClick={() => setOpenUpload(true)}>
              <Plus className="h-4 w-4 mr-1" /> Foto
            </Button>
          </div>
        </div>

        {/* Filtros por tipo */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <Badge
            variant={filtroTipo === "todos" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFiltroTipo("todos")}
          >
            Todos ({fotos.length})
          </Badge>
          {Object.entries(TIPOS_FOTO).map(([key, label]) => (
            <Badge
              key={key}
              variant={filtroTipo === key ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFiltroTipo(key)}
            >
              {label} ({contagemPorTipo[key] || 0})
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {viewMode === "timeline" ? (
          <FotoTimeline fotos={fotosFiltradas} onDelete={handleDeleteFoto} onEditDate={(f) => { setEditingFoto(f); setEditDate(f.data_foto || ""); }} onView={(url) => { setSelectedFoto(url); setViewerOpen(true); }} />
        ) : fotosFiltradas.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fotosFiltradas.map((foto) => (
              <div key={foto.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 hover:border-primary transition-all">
                  <img
                    src={foto.foto_url}
                    alt={foto.descricao || "Foto de evolução"}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => { setSelectedFoto(foto.foto_url); setViewerOpen(true); }}
                  />
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary" className="h-7 w-7 p-0 bg-background/90" onClick={() => { setSelectedFoto(foto.foto_url); setViewerOpen(true); }}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="secondary" className="h-7 w-7 p-0 bg-background/90" onClick={() => { setEditingFoto(foto); setEditDate(foto.data_foto || ""); }}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="secondary" className="h-7 w-7 p-0 bg-background/90">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Foto</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteFoto(foto)} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">{TIPOS_FOTO[foto.tipo_foto] || foto.tipo_foto}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(foto.data_foto || foto.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Nenhuma foto</h3>
            <p className="text-sm text-muted-foreground mb-4">Comece adicionando fotos de evolução</p>
            <Button onClick={() => setOpenUpload(true)} style={{ backgroundColor: themeColor }}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Foto
            </Button>
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={openUpload} onOpenChange={setOpenUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Foto</DialogTitle></DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label>Tipo *</Label>
              <Select name="tipo_foto" required>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS_FOTO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data da Foto</Label>
              <Input name="data_foto" type="date" />
            </div>
            <div>
              <Label>Foto *</Label>
              <Input name="foto" type="file" accept="image/*" required />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea name="descricao" rows={2} placeholder="Opcional..." />
            </div>
            <Button type="submit" className="w-full" disabled={uploading} style={{ backgroundColor: themeColor }}>
              {uploading ? "Enviando..." : "Enviar Foto"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Date Dialog */}
      <Dialog open={!!editingFoto} onOpenChange={(o) => !o && setEditingFoto(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Data da Foto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleEditDate} style={{ backgroundColor: themeColor }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Viewer */}
      {selectedFoto && (
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl p-0">
            <div className="relative">
              <Button variant="ghost" size="sm" className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white" onClick={() => setViewerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
              <img src={selectedFoto} alt="Foto" className="w-full h-auto max-h-[85vh] object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
