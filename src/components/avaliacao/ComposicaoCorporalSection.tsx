import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { format } from "date-fns";
import { AlertTriangle, Edit, Plus, Ruler, Trash2, Weight } from "lucide-react";
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
import {
  GENERAL_FIELDS,
  PERIMETRY_FIELDS,
  SKINFOLD_FIELDS,
  average,
  calculateAssessmentPending,
  calculateBodyComposition,
  formatMetricValue,
  toNumber,
} from "@/utils/avaliacaoMetrics";
import { formatDisplayDate } from "@/utils/dateFormat";

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

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("*")
      .eq("profile_id", profileId)
      .order("data_avaliacao", { ascending: false });
    setAvaliacoes((data || []).filter(hasCompositionData));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);

    const dobrasMedidas: Record<string, Array<number | null>> = {};
    const dobrasMedias: Record<string, number> = {};
    SKINFOLD_FIELDS.forEach(({ key }) => {
      const values = [1, 2, 3].map((index) => toNumber(form.get(`${key}_${index}`)));
      const media = average(values);
      dobrasMedidas[key] = values;
      if (media !== null) dobrasMedias[key] = media;
    });

    const peso = toNumber(form.get("peso"));
    const altura = toNumber(form.get("altura"));
    const idade = toNumber(form.get("idade"));
    const sexo = form.get("sexo_avaliacao") as string | null;
    const fase = form.get("fase") as string | null;
    const calculated = calculateBodyComposition({ peso, altura, idade, sexo, fase, dobrasMedias });

    const payload: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: form.get("data_avaliacao") as string,
      peso,
      altura,
      idade,
      sexo_avaliacao: sexo || null,
      fase: fase || null,
      etnia: (form.get("etnia") as string) || null,
      objetivo: (form.get("objetivo") as string) || null,
      observacoes: (form.get("observacoes") as string) || null,
      dobras_medidas: dobrasMedidas,
      dobras_medias: dobrasMedias,
      ...calculated,
    };

    PERIMETRY_FIELDS.forEach(({ key }) => {
      payload[key] = toNumber(form.get(key));
    });

    const pending = calculateAssessmentPending(payload);
    payload.campos_pendentes = pending;

    try {
      const table = supabase.from("avaliacoes_fisicas") as any;
      const { error } = editing
        ? await table.update(payload).eq("id", editing.id)
        : await table.insert(payload);
      if (error) throw error;

      toast({
        title: pending.length > 0 ? "Avaliacao salva com pendencias" : "Avaliacao salva",
        description: pending.length > 0 ? `Falta preencher: ${pending.join(", ")}.` : undefined,
      });
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
    toast({ title: "Avaliacao removida" });
    fetchData();
    onRefresh();
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Weight className="h-5 w-5" /> Composicao corporal
          </CardTitle>
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={() => { setEditing(null); setOpenDialog(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nova avaliacao
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {avaliacoes.length > 0 ? (
          <div className="space-y-3">
            {avaliacoes.map((avaliacao, index) => (
              <CompositionCard
                key={avaliacao.id}
                avaliacao={avaliacao}
                previous={avaliacoes[index + 1]}
                onEdit={() => { setEditing(avaliacao); setOpenDialog(true); }}
                onDelete={() => handleDelete(avaliacao.id)}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Ruler className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">Nenhuma avaliacao corporal registrada</p>
            <Button onClick={() => setOpenDialog(true)} style={{ backgroundColor: themeColor }}>
              <Plus className="mr-1 h-4 w-4" /> Criar primeira avaliacao
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={(open) => { setOpenDialog(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} avaliacao corporal completa</DialogTitle>
          </DialogHeader>
          <CompositionForm editing={editing} loading={loading} themeColor={themeColor} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CompositionCard({ avaliacao, previous, onEdit, onDelete }: { avaliacao: any; previous?: any; onEdit: () => void; onDelete: () => void }) {
  const pending = Array.isArray(avaliacao.campos_pendentes) ? avaliacao.campos_pendentes : [];
  const distribution = avaliacao.distribuicao_gordura || {};
  const isIncomplete = pending.length > 0;

  return (
    <Card className="border bg-card/80">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{formatDisplayDate(avaliacao.data_avaliacao)}</h4>
              {isIncomplete ? (
                <Badge variant="outline" className="border-amber-400 text-amber-500">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Incompleta
                </Badge>
              ) : (
                <Badge className="bg-green-600">Completa</Badge>
              )}
              {avaliacao.objetivo && <Badge variant="secondary">{avaliacao.objetivo}</Badge>}
            </div>
            {pending.length > 0 && (
              <p className="mt-1 text-xs text-amber-500">Falta preencher: {pending.join(", ")}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover avaliacao?</AlertDialogTitle>
                  <AlertDialogDescription>Essa acao remove apenas este registro historico.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive">Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {GENERAL_FIELDS.filter(({ key }) => key !== "altura").map(({ key, label, unit }) => (
            <MetricTile key={key} label={label} value={avaliacao[key]} previous={previous?.[key]} unit={unit} />
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <MetricGroup title="Perimetria" fields={PERIMETRY_FIELDS} record={avaliacao} />
          <MetricGroup title="Dobras cutaneas - media" fields={SKINFOLD_FIELDS} record={avaliacao.dobras_medias || {}} />
        </div>

        {distribution && Object.keys(distribution).length > 0 && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-sm font-semibold">Distribuicao de gordura por regiao</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <MetricMini label="Superiores" value={distribution.membros_superiores} unit="%" />
              <MetricMini label="Inferiores" value={distribution.membros_inferiores} unit="%" />
              <MetricMini label="Tronco" value={distribution.tronco} unit="%" />
            </div>
          </div>
        )}

        {avaliacao.observacoes && <p className="text-sm text-muted-foreground">{avaliacao.observacoes}</p>}
      </CardContent>
    </Card>
  );
}

function CompositionForm({ editing, loading, themeColor, onSubmit }: { editing: any | null; loading: boolean; themeColor?: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const medidas = editing?.dobras_medidas || {};

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <h3 className="text-sm font-semibold">Dados gerais</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data *"><Input name="data_avaliacao" type="datetime-local" defaultValue={editing?.data_avaliacao ? format(new Date(editing.data_avaliacao), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")} required /></Field>
          <Field label="Objetivo"><Input name="objetivo" defaultValue={editing?.objetivo || ""} /></Field>
          <Field label="Peso (kg)"><Input name="peso" type="number" step="0.1" defaultValue={editing?.peso ?? ""} /></Field>
          <Field label="Altura (m)"><Input name="altura" type="number" step="0.01" defaultValue={editing?.altura ?? ""} /></Field>
          <Field label="Idade"><Input name="idade" type="number" step="1" defaultValue={editing?.idade ?? ""} /></Field>
          <Field label="Sexo">
            <Select name="sexo_avaliacao" defaultValue={editing?.sexo_avaliacao || ""}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fase">
            <Select name="fase" defaultValue={editing?.fase || "adulto"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="crianca">Crianca</SelectItem>
                <SelectItem value="adulto">Adulto</SelectItem>
                <SelectItem value="atleta">Atleta</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Etnia">
            <Select name="etnia" defaultValue={editing?.etnia || "caucasiano"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="caucasiano">Caucasiano</SelectItem>
                <SelectItem value="afro">Afrodescendente</SelectItem>
                <SelectItem value="asiatico">Asiatico</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <h3 className="text-sm font-semibold">Perimetria</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PERIMETRY_FIELDS.map(({ key, label }) => (
            <Field key={key} label={`${label} (cm)`}>
              <Input name={key} type="number" step="0.1" defaultValue={editing?.[key] ?? ""} />
            </Field>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <h3 className="text-sm font-semibold">Dobras cutaneas</h3>
        <div className="space-y-2">
          {SKINFOLD_FIELDS.map(({ key, label }) => (
            <div key={key} className="grid gap-2 rounded-md border bg-background/60 p-2 sm:grid-cols-[1fr_repeat(3,minmax(0,110px))]">
              <Label className="self-center text-sm">{label}</Label>
              {[1, 2, 3].map((index) => (
                <Input
                  key={index}
                  name={`${key}_${index}`}
                  type="number"
                  step="0.1"
                  placeholder={`${index}a medida`}
                  defaultValue={medidas?.[key]?.[index - 1] ?? ""}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <Field label="Observacoes">
        <Textarea name="observacoes" rows={3} defaultValue={editing?.observacoes || ""} />
      </Field>

      <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: themeColor }}>
        {loading ? "Salvando..." : "Salvar avaliacao"}
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

function MetricTile({ label, value, previous, unit }: { label: string; value: any; previous?: any; unit: string }) {
  const diff = typeof value === "number" && typeof previous === "number" ? value - previous : null;
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{formatMetricValue(value, unit)}</p>
      {diff !== null && diff !== 0 && <p className="text-xs text-muted-foreground">{diff > 0 ? "+" : ""}{diff.toFixed(1)} desde a anterior</p>}
    </div>
  );
}

function MetricGroup({ title, fields, record }: { title: string; fields: readonly { key: string; label: string; unit: string }[]; record: any }) {
  const filled = fields.filter(({ key }) => record?.[key] !== null && record?.[key] !== undefined);
  if (filled.length === 0) return null;
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {filled.map(({ key, label, unit }) => <MetricMini key={key} label={label} value={record[key]} unit={unit} />)}
      </div>
    </div>
  );
}

function MetricMini({ label, value, unit }: { label: string; value: any; unit: string }) {
  return (
    <div className="rounded-md bg-background/70 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{formatMetricValue(value, unit)}</p>
    </div>
  );
}

function hasCompositionData(record: any) {
  return Boolean(
    record.peso ||
    record.percentual_gordura ||
    record.massa_magra ||
    record.dobras_medias ||
    PERIMETRY_FIELDS.some(({ key }) => record[key] !== null && record[key] !== undefined)
  );
}
