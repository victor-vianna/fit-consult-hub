import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Ruler } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  onRefresh: () => void;
}

const MEDIDAS = [
  { key: "pescoco", label: "Pescoço" },
  { key: "ombro", label: "Ombro" },
  { key: "torax", label: "Tórax" },
  { key: "cintura", label: "Cintura" },
  { key: "abdomen", label: "Abdômen" },
  { key: "quadril", label: "Quadril" },
  { key: "braco_direito", label: "Braço D" },
  { key: "braco_esquerdo", label: "Braço E" },
  { key: "antebraco_direito", label: "Antebraço D" },
  { key: "antebraco_esquerdo", label: "Antebraço E" },
  { key: "coxa_direita", label: "Coxa D" },
  { key: "coxa_esquerda", label: "Coxa E" },
  { key: "panturrilha_direita", label: "Panturrilha D" },
  { key: "panturrilha_esquerda", label: "Panturrilha E" },
];

export function AvaliacaoFisicaSection({ profileId, personalId, themeColor, onRefresh }: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, [profileId]);

  const fetchData = async () => {
    const { data } = await supabase.from("avaliacoes_fisicas").select("*").eq("profile_id", profileId).order("data_avaliacao", { ascending: false });
    setAvaliacoes(data || []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const data: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: fd.get("data_avaliacao") as string,
    };
    MEDIDAS.forEach(({ key }) => {
      const val = fd.get(key);
      if (val) data[key] = Number(val);
    });

    try {
      if (editing) {
        const { error } = await supabase.from("avaliacoes_fisicas").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("avaliacoes_fisicas").insert(data);
        if (error) throw error;
      }
      toast({ title: "Salvo!" });
      setOpenDialog(false);
      setEditing(null);
      fetchData();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("avaliacoes_fisicas").delete().eq("id", id);
    if (!error) { toast({ title: "Removida!" }); fetchData(); onRefresh(); }
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><Ruler className="h-5 w-5" /> Circunferências</CardTitle>
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={() => { setEditing(null); setOpenDialog(true); }}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {avaliacoes.length > 0 ? (
          <div className="space-y-3">
            {avaliacoes.map((av) => {
              const medidas = MEDIDAS.filter(({ key }) => av[key] != null);
              if (medidas.length === 0) return null;
              return (
                <Card key={av.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between mb-3">
                      <h4 className="font-semibold">{format(new Date(av.data_avaliacao), "dd/MM/yyyy")}</h4>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(av); setOpenDialog(true); }}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Remover?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(av.id)} className="bg-destructive">Remover</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-7 gap-2 text-sm">
                      {medidas.map(({ key, label }) => (
                        <div key={key} className="bg-muted/50 p-2 rounded">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-semibold">{av[key]} cm</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Ruler className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Nenhuma medida registrada</p>
            <Button onClick={() => setOpenDialog(true)} style={{ backgroundColor: themeColor }}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={(o) => { setOpenDialog(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Avaliação - Circunferências</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Data *</Label><Input name="data_avaliacao" type="datetime-local" defaultValue={editing?.data_avaliacao ? format(new Date(editing.data_avaliacao), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")} required /></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {MEDIDAS.map(({ key, label }) => (
                <div key={key}><Label>{label} (cm)</Label><Input name={key} type="number" step="0.1" defaultValue={editing?.[key]} /></div>
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: themeColor }}>{loading ? "Salvando..." : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
