import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, X } from "lucide-react";
import { format } from "date-fns";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
}

const DESVIOS_COMUNS = [
  "Hiperlordose lombar", "Hipercifose torácica", "Escoliose",
  "Anteriorização da cabeça", "Protração de ombros", "Joelho valgo",
  "Joelho varo", "Pé plano", "Pé cavo", "Inclinação pélvica anterior",
  "Inclinação pélvica posterior", "Ombro elevado",
];

export function PosturalSection({ profileId, personalId, themeColor }: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDesvios, setSelectedDesvios] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => { fetchData(); }, [profileId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("id, data_avaliacao, postural_observacoes, postural_desvios")
      .eq("profile_id", profileId)
      .order("data_avaliacao", { ascending: false });
    setAvaliacoes((data || []).filter((a: any) => a.postural_observacoes || a.postural_desvios));
  };

  const openNew = () => {
    setEditing(null);
    setSelectedDesvios([]);
    setObservacoes("");
    setOpenDialog(true);
  };

  const openEdit = (av: any) => {
    setEditing(av);
    setSelectedDesvios(Array.isArray(av.postural_desvios) ? av.postural_desvios : []);
    setObservacoes(av.postural_observacoes || "");
    setOpenDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: fd.get("data_avaliacao"),
      postural_observacoes: observacoes || null,
      postural_desvios: selectedDesvios.length > 0 ? selectedDesvios : null,
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
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const toggleDesvio = (d: string) => {
    setSelectedDesvios((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">🧍 Avaliação Postural</CardTitle>
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
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
                    <Button variant="ghost" size="sm" onClick={() => openEdit(av)}><Edit className="h-4 w-4" /></Button>
                  </div>
                  {av.postural_desvios && Array.isArray(av.postural_desvios) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(av.postural_desvios as string[]).map((d) => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                    </div>
                  )}
                  {av.postural_observacoes && <p className="text-sm text-muted-foreground">{av.postural_observacoes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma avaliação postural</p>
            <Button onClick={openNew} style={{ backgroundColor: themeColor }}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={(o) => { setOpenDialog(o); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Avaliação Postural</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Data *</Label><Input name="data_avaliacao" type="datetime-local" defaultValue={editing?.data_avaliacao ? format(new Date(editing.data_avaliacao), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")} required /></div>
            <div>
              <Label className="mb-2 block">Desvios Posturais</Label>
              <div className="flex flex-wrap gap-2">
                {DESVIOS_COMUNS.map((d) => (
                  <Badge key={d} variant={selectedDesvios.includes(d) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleDesvio(d)}>
                    {d} {selectedDesvios.includes(d) && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>
            <div><Label>Observações</Label><Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={4} placeholder="Observações posturais detalhadas..." /></div>
            <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: themeColor }}>{loading ? "Salvando..." : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
