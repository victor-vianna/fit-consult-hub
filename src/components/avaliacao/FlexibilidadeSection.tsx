import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit } from "lucide-react";
import { format } from "date-fns";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
}

export function FlexibilidadeSection({ profileId, personalId, themeColor }: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, [profileId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("id, data_avaliacao, flexibilidade_sentar_alcancar, flexibilidade_ombro, flexibilidade_quadril, flexibilidade_tornozelo")
      .eq("profile_id", profileId)
      .order("data_avaliacao", { ascending: false });
    setAvaliacoes((data || []).filter((a: any) => a.flexibilidade_sentar_alcancar != null || a.flexibilidade_ombro || a.flexibilidade_quadril || a.flexibilidade_tornozelo));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: fd.get("data_avaliacao"),
      flexibilidade_sentar_alcancar: fd.get("sentar_alcancar") ? Number(fd.get("sentar_alcancar")) : null,
      flexibilidade_ombro: fd.get("ombro") || null,
      flexibilidade_quadril: fd.get("quadril") || null,
      flexibilidade_tornozelo: fd.get("tornozelo") || null,
    };

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
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">🤸 Flexibilidade</CardTitle>
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={() => { setEditing(null); setOpenDialog(true); }}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {avaliacoes.length > 0 ? (
          <div className="space-y-3">
            {avaliacoes.map((av) => (
              <Card key={av.id} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-semibold">{format(new Date(av.data_avaliacao), "dd/MM/yyyy")}</h4>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(av); setOpenDialog(true); }}><Edit className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {av.flexibilidade_sentar_alcancar != null && <div className="bg-muted/50 p-2 rounded"><p className="text-xs text-muted-foreground">Sentar e Alcançar</p><p className="font-semibold">{av.flexibilidade_sentar_alcancar} cm</p></div>}
                    {av.flexibilidade_ombro && <div className="bg-muted/50 p-2 rounded"><p className="text-xs text-muted-foreground">Ombro</p><p className="font-semibold">{av.flexibilidade_ombro}</p></div>}
                    {av.flexibilidade_quadril && <div className="bg-muted/50 p-2 rounded"><p className="text-xs text-muted-foreground">Quadril</p><p className="font-semibold">{av.flexibilidade_quadril}</p></div>}
                    {av.flexibilidade_tornozelo && <div className="bg-muted/50 p-2 rounded"><p className="text-xs text-muted-foreground">Tornozelo</p><p className="font-semibold">{av.flexibilidade_tornozelo}</p></div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum teste de flexibilidade registrado</p>
            <Button onClick={() => setOpenDialog(true)} style={{ backgroundColor: themeColor }}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={(o) => { setOpenDialog(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Avaliação de Flexibilidade</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Data *</Label><Input name="data_avaliacao" type="datetime-local" defaultValue={editing?.data_avaliacao ? format(new Date(editing.data_avaliacao), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")} required /></div>
            <div><Label>Sentar e Alcançar (cm)</Label><Input name="sentar_alcancar" type="number" step="0.1" defaultValue={editing?.flexibilidade_sentar_alcancar} /></div>
            <div><Label>Ombro</Label><Input name="ombro" placeholder="Ex: Normal, Limitado, Hipermóvel" defaultValue={editing?.flexibilidade_ombro} /></div>
            <div><Label>Quadril</Label><Input name="quadril" placeholder="Ex: Normal, Limitado" defaultValue={editing?.flexibilidade_quadril} /></div>
            <div><Label>Tornozelo</Label><Input name="tornozelo" placeholder="Ex: Normal, Limitado" defaultValue={editing?.flexibilidade_tornozelo} /></div>
            <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: themeColor }}>{loading ? "Salvando..." : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
