import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { format } from "date-fns";
import { Activity, Edit, HeartPulse, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateCardio, formatMetricValue, toNumber } from "@/utils/avaliacaoMetrics";
import { formatDisplayDate } from "@/utils/dateFormat";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  onRefresh: () => void;
}

export function CardiorrespiratorioSection({ profileId, personalId, themeColor, onRefresh }: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("*")
      .eq("profile_id", profileId)
      .not("cardio_tipo", "is", null)
      .order("data_avaliacao", { ascending: false });
    setAvaliacoes(data || []);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const minutos = toNumber(form.get("tempo_minutos")) || 0;
    const segundos = toNumber(form.get("tempo_segundos")) || 0;
    const tempoTotal = Math.round(minutos * 60 + segundos);
    const distanciaM = toNumber(form.get("cardio_distancia_m"));
    const calculated = calculateCardio({ distanciaM, tempoSegundos: tempoTotal });

    const payload: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: form.get("data_avaliacao") as string,
      cardio_tipo: form.get("cardio_tipo") as string,
      cardio_distancia_m: distanciaM,
      cardio_tempo_segundos: tempoTotal || null,
      cardio_observacoes: (form.get("cardio_observacoes") as string) || null,
      ...calculated,
    };

    try {
      const table = supabase.from("avaliacoes_fisicas") as any;
      const { error } = editing
        ? await table.update(payload).eq("id", editing.id)
        : await table.insert(payload);
      if (error) throw error;

      toast({ title: "Teste cardiorrespiratorio salvo" });
      setOpenDialog(false);
      setEditing(null);
      fetchData();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("avaliacoes_fisicas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Teste removido" });
    fetchData();
    onRefresh();
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HeartPulse className="h-5 w-5" /> Teste cardiorrespiratorio
          </CardTitle>
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={() => { setEditing(null); setOpenDialog(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Novo teste
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {avaliacoes.length > 0 ? (
          <div className="space-y-3">
            {avaliacoes.map((avaliacao) => (
              <Card key={avaliacao.id} className="border bg-card/80">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{formatDisplayDate(avaliacao.data_avaliacao)}</h4>
                        <Badge variant="secondary">
                          {avaliacao.cardio_tipo === "teste_1600m" ? "Teste 1600m" : "Velocidade media"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatMetricValue(avaliacao.cardio_distancia_m, "m")} em {formatTime(avaliacao.cardio_tempo_segundos)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(avaliacao); setOpenDialog(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover teste?</AlertDialogTitle>
                            <AlertDialogDescription>Essa acao remove apenas este registro historico.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(avaliacao.id)} className="bg-destructive">Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Metric label="Velocidade" value={avaliacao.cardio_velocidade_kmh} unit="km/h" />
                    <Metric label="VO2 pico" value={avaliacao.cardio_vo2_pico} unit="ml/kg/min" />
                    <Metric label="MSSL" value={avaliacao.cardio_mssl_kmh} unit="km/h" />
                    <Metric label="MSSL" value={avaliacao.cardio_mssl_m_min} unit="m/min" />
                  </div>
                  {avaliacao.cardio_observacoes && <p className="text-sm text-muted-foreground">{avaliacao.cardio_observacoes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Activity className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">Nenhum teste cardiorrespiratorio registrado</p>
            <Button onClick={() => setOpenDialog(true)} style={{ backgroundColor: themeColor }}>
              <Plus className="mr-1 h-4 w-4" /> Registrar teste
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={(open) => { setOpenDialog(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} teste cardiorrespiratorio</DialogTitle>
          </DialogHeader>
          <CardioForm editing={editing} loading={loading} themeColor={themeColor} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CardioForm({ editing, loading, themeColor, onSubmit }: { editing: any | null; loading: boolean; themeColor?: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [distancia, setDistancia] = useState<number | null>(editing?.cardio_distancia_m ?? 1600);
  const [minutos, setMinutos] = useState<number | null>(editing?.cardio_tempo_segundos ? Math.floor(editing.cardio_tempo_segundos / 60) : null);
  const [segundos, setSegundos] = useState<number | null>(editing?.cardio_tempo_segundos ? editing.cardio_tempo_segundos % 60 : null);

  const preview = useMemo(() => calculateCardio({
    distanciaM: distancia,
    tempoSegundos: minutos !== null ? minutos * 60 + (segundos || 0) : null,
  }), [distancia, minutos, segundos]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data *">
          <Input name="data_avaliacao" type="datetime-local" defaultValue={editing?.data_avaliacao ? format(new Date(editing.data_avaliacao), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")} required />
        </Field>
        <Field label="Tipo">
          <Select name="cardio_tipo" defaultValue={editing?.cardio_tipo || "teste_1600m"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="teste_1600m">Teste 1600m</SelectItem>
              <SelectItem value="velocidade_media">Velocidade media</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Distancia (m)">
          <Input name="cardio_distancia_m" type="number" step="1" value={distancia ?? ""} onChange={(event) => setDistancia(toNumber(event.target.value))} />
        </Field>
        <Field label="Tempo - minutos">
          <Input name="tempo_minutos" type="number" step="1" value={minutos ?? ""} onChange={(event) => setMinutos(toNumber(event.target.value))} />
        </Field>
        <Field label="Tempo - segundos">
          <Input name="tempo_segundos" type="number" step="1" value={segundos ?? ""} onChange={(event) => setSegundos(toNumber(event.target.value))} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3">
        <Metric label="Velocidade" value={preview.cardio_velocidade_kmh} unit="km/h" />
        <Metric label="VO2 pico" value={preview.cardio_vo2_pico} unit="ml/kg/min" />
        <Metric label="MSSL" value={preview.cardio_mssl_kmh} unit="km/h" />
      </div>

      <Field label="Observacoes">
        <Textarea name="cardio_observacoes" rows={3} defaultValue={editing?.cardio_observacoes || ""} />
      </Field>
      <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: themeColor }}>
        {loading ? "Salvando..." : "Salvar teste"}
      </Button>
    </form>
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
  return (
    <div className="rounded-md border bg-background/70 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{formatMetricValue(value, unit)}</p>
    </div>
  );
}

function formatTime(seconds?: number | null) {
  if (!seconds) return "-";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}min ${String(sec).padStart(2, "0")}s`;
}
