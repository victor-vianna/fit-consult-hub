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
import { Plus, Edit, Trash2, Weight, TrendingUp, TrendingDown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  onRefresh: () => void;
}

export function ComposicaoCorporalSection({ profileId, personalId, themeColor, onRefresh }: Props) {
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

  const calcIMC = (peso?: number, altura?: number) => peso && altura ? Number((peso / (altura * altura)).toFixed(2)) : undefined;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const peso = fd.get("peso") ? Number(fd.get("peso")) : undefined;
    const altura = fd.get("altura") ? Number(fd.get("altura")) : undefined;

    const data: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: fd.get("data_avaliacao") as string,
      peso, altura,
      imc: calcIMC(peso, altura),
      percentual_gordura: fd.get("percentual_gordura") ? Number(fd.get("percentual_gordura")) : undefined,
      massa_magra: fd.get("massa_magra") ? Number(fd.get("massa_magra")) : undefined,
      objetivo: fd.get("objetivo") as string,
      observacoes: fd.get("observacoes") as string,
    };

    try {
      if (editing) {
        const { error } = await supabase.from("avaliacoes_fisicas").update(data).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Atualizado!" });
      } else {
        const { error } = await supabase.from("avaliacoes_fisicas").insert(data);
        if (error) throw error;
        toast({ title: "Avaliação criada!" });
      }
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
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Removida!" });
    fetchData();
    onRefresh();
  };

  const getDiff = (curr: number | undefined, prev: number | undefined) => {
    if (!curr || !prev) return null;
    return curr - prev;
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><Weight className="h-5 w-5" /> Composição Corporal</CardTitle>
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={() => { setEditing(null); setOpenDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {avaliacoes.length > 0 ? (
          <div className="space-y-3">
            {avaliacoes.map((av, i) => {
              const prev = avaliacoes[i + 1];
              return (
                <Card key={av.id} className="border hover:shadow transition-all">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{format(new Date(av.data_avaliacao), "dd/MM/yyyy", { locale: ptBR })}</h4>
                        {av.objetivo && <Badge variant="secondary" className="text-xs mt-1">{av.objetivo}</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(av); setOpenDialog(true); }}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Remover?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(av.id)} className="bg-destructive">Remover</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: "Peso", value: av.peso, unit: "kg", prev: prev?.peso },
                        { label: "Altura", value: av.altura, unit: "m", prev: null },
                        { label: "IMC", value: av.imc, unit: "", prev: prev?.imc },
                        { label: "% Gordura", value: av.percentual_gordura, unit: "%", prev: prev?.percentual_gordura },
                        { label: "Massa Magra", value: av.massa_magra, unit: "kg", prev: prev?.massa_magra },
                      ].map(({ label, value, unit, prev: prevVal }) => value != null ? (
                        <div key={label} className="bg-muted/50 p-2 rounded-lg">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-bold flex items-center gap-1">
                            {value}{unit}
                            {(() => { const d = getDiff(value, prevVal as any); if (!d) return null; return <span className={`text-xs flex items-center ${d > 0 ? "text-red-500" : "text-green-500"}`}>{d > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{Math.abs(d).toFixed(1)}</span>; })()}
                          </p>
                        </div>
                      ) : null)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Weight className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Nenhuma avaliação registrada</p>
            <Button onClick={() => setOpenDialog(true)} style={{ backgroundColor: themeColor }}><Plus className="h-4 w-4 mr-1" /> Criar Primeira</Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={(o) => { setOpenDialog(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Composição Corporal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data *</Label><Input name="data_avaliacao" type="datetime-local" defaultValue={editing?.data_avaliacao ? format(new Date(editing.data_avaliacao), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")} required /></div>
              <div><Label>Objetivo</Label><Input name="objetivo" defaultValue={editing?.objetivo} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Peso (kg)</Label><Input name="peso" type="number" step="0.1" defaultValue={editing?.peso} /></div>
              <div><Label>Altura (m)</Label><Input name="altura" type="number" step="0.01" defaultValue={editing?.altura} /></div>
              <div><Label>% Gordura</Label><Input name="percentual_gordura" type="number" step="0.1" defaultValue={editing?.percentual_gordura} /></div>
            </div>
            <div><Label>Massa Magra (kg)</Label><Input name="massa_magra" type="number" step="0.1" defaultValue={editing?.massa_magra} /></div>
            <div><Label>Observações</Label><Textarea name="observacoes" rows={2} defaultValue={editing?.observacoes} /></div>
            <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: themeColor }}>{loading ? "Salvando..." : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
