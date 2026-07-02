import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { format } from "date-fns";
import { Edit, Plus, StretchHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatMetricValue, toNumber } from "@/utils/avaliacaoMetrics";
import { formatDisplayDate } from "@/utils/dateFormat";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  onRefresh?: () => void;
}

export function FlexibilidadeSection({ profileId, personalId, themeColor, onRefresh }: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("avaliacoes_fisicas")
      .select("id, data_avaliacao, flexibilidade_sentar_alcancar, flexibilidade_ombro, flexibilidade_quadril, flexibilidade_tornozelo, observacoes")
      .eq("profile_id", profileId)
      .order("data_avaliacao", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar flexibilidade", description: error.message, variant: "destructive" });
      return;
    }

    setAvaliacoes((data || []).filter((item: any) =>
      item.flexibilidade_sentar_alcancar !== null ||
      item.flexibilidade_ombro ||
      item.flexibilidade_quadril ||
      item.flexibilidade_tornozelo
    ));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: form.get("data_avaliacao") as string,
      flexibilidade_sentar_alcancar: toNumber(form.get("sentar_alcancar")),
      flexibilidade_ombro: (form.get("ombro") as string) || null,
      flexibilidade_quadril: (form.get("quadril") as string) || null,
      flexibilidade_tornozelo: (form.get("tornozelo") as string) || null,
      observacoes: (form.get("observacoes") as string) || null,
    };

    try {
      const table = supabase.from("avaliacoes_fisicas") as any;
      const { error } = editing
        ? await table.update(payload).eq("id", editing.id)
        : await table.insert(payload);
      if (error) throw error;

      toast({ title: "Flexibilidade salva" });
      setOpenDialog(false);
      setEditing(null);
      fetchData();
      onRefresh?.();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <StretchHorizontal className="h-5 w-5" /> Flexibilidade
          </CardTitle>
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={() => { setEditing(null); setOpenDialog(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {avaliacoes.length > 0 ? (
          <div className="space-y-3">
            {avaliacoes.map((avaliacao) => (
              <Card key={avaliacao.id} className="border bg-card/80">
                <CardContent className="p-4">
                  <div className="mb-3 flex justify-between gap-3">
                    <h4 className="font-semibold">{formatDisplayDate(avaliacao.data_avaliacao)}</h4>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(avaliacao); setOpenDialog(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                    <Metric label="Sentar e alcancar" value={avaliacao.flexibilidade_sentar_alcancar} unit="cm" />
                    <Metric label="Ombro" value={avaliacao.flexibilidade_ombro} unit="" />
                    <Metric label="Quadril" value={avaliacao.flexibilidade_quadril} unit="" />
                    <Metric label="Tornozelo" value={avaliacao.flexibilidade_tornozelo} unit="" />
                  </div>
                  {avaliacao.observacoes && <p className="mt-3 text-sm text-muted-foreground">{avaliacao.observacoes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">Nenhum teste de flexibilidade registrado</p>
            <Button onClick={() => setOpenDialog(true)} style={{ backgroundColor: themeColor }}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={(open) => { setOpenDialog(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} avaliacao de flexibilidade</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Data *">
              <Input name="data_avaliacao" type="datetime-local" defaultValue={editing?.data_avaliacao ? format(new Date(editing.data_avaliacao), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")} required />
            </Field>
            <Field label="Sentar e alcancar (cm)">
              <Input name="sentar_alcancar" type="number" step="0.1" defaultValue={editing?.flexibilidade_sentar_alcancar ?? ""} />
            </Field>
            <Field label="Ombro">
              <Input name="ombro" placeholder="Ex: normal, limitado, hipermovel" defaultValue={editing?.flexibilidade_ombro || ""} />
            </Field>
            <Field label="Quadril">
              <Input name="quadril" placeholder="Ex: normal, limitado" defaultValue={editing?.flexibilidade_quadril || ""} />
            </Field>
            <Field label="Tornozelo">
              <Input name="tornozelo" placeholder="Ex: normal, limitado" defaultValue={editing?.flexibilidade_tornozelo || ""} />
            </Field>
            <Field label="Observacoes">
              <Textarea name="observacoes" rows={3} defaultValue={editing?.observacoes || ""} />
            </Field>
            <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: themeColor }}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: any; unit: string }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="rounded bg-muted/50 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{formatMetricValue(value, unit)}</p>
    </div>
  );
}
