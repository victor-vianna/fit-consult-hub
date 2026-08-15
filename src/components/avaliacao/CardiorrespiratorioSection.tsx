import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
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
import { formatDateTimeForInput, formatDisplayDate } from "@/utils/dateFormat";
import {
  clearInterfaceMemory,
  hasMeaningfulValues,
  readInterfaceMemory,
  writeInterfaceMemory,
} from "@/utils/interfaceMemory";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  onRefresh: () => void;
}

const CARDIO_DRAFT_VERSION = 1;
const CARDIO_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CARDIO_DRAFT_IGNORED_FIELDS = new Set(["data_avaliacao", "cardio_tipo", "cardio_distancia_m"]);

export function CardiorrespiratorioSection({ profileId, personalId, themeColor, onRefresh }: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const draftScope = useMemo(() => `assessment:cardio:${personalId}:${profileId}`, [personalId, profileId]);
  const [draft, setDraft] = useState<Record<string, string> | null>(() => readCardioDraft(draftScope)?.data ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  useEffect(() => {
    const storedDraft = readCardioDraft(draftScope);
    setDraft(storedDraft?.data ?? null);
    if (storedDraft?.open) {
      setEditing(null);
      setOpenDialog(true);
    }
  }, [draftScope]);

  const openNew = () => {
    setEditing(null);
    const storedDraft = readCardioDraft(draftScope);
    setDraft(storedDraft?.data ?? null);
    setOpenDialog(true);
  };

  const handleOpenChange = (open: boolean) => {
    setOpenDialog(open);
    if (!open) {
      if (!editing) {
        clearCardioDraft(draftScope);
        setDraft(null);
      }
      setEditing(null);
    }
  };

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
      if (!editing) {
        clearCardioDraft(draftScope);
        setDraft(null);
      }
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
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={openNew}>
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
            <Button onClick={openNew} style={{ backgroundColor: themeColor }}>
              <Plus className="mr-1 h-4 w-4" /> Registrar teste
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} teste cardiorrespiratorio</DialogTitle>
          </DialogHeader>
          <CardioForm
            editing={editing}
            draft={editing ? null : draft}
            loading={loading}
            themeColor={themeColor}
            onDraftChange={(nextDraft) => {
              setDraft(nextDraft);
              if (nextDraft) {
                writeInterfaceMemory({
                  scope: draftScope,
                  version: CARDIO_DRAFT_VERSION,
                  data: nextDraft,
                  open: true,
                  hasContent: hasCardioDraftContent,
                });
              } else {
                clearCardioDraft(draftScope);
              }
            }}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CardioForm({
  editing,
  draft,
  loading,
  themeColor,
  onDraftChange,
  onSubmit,
}: {
  editing: any | null;
  draft: Record<string, string> | null;
  loading: boolean;
  themeColor?: string;
  onDraftChange: (draft: Record<string, string> | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const didMountRef = useRef(false);
  const [distancia, setDistancia] = useState<number | null>(
    toNumber(draftValue(draft, editing, "cardio_distancia_m", editing?.cardio_distancia_m ?? 1600)) ?? 1600
  );
  const [minutos, setMinutos] = useState<number | null>(
    draft?.tempo_minutos !== undefined
      ? toNumber(draft.tempo_minutos)
      : editing?.cardio_tempo_segundos
      ? Math.floor(editing.cardio_tempo_segundos / 60)
      : null
  );
  const [segundos, setSegundos] = useState<number | null>(
    draft?.tempo_segundos !== undefined
      ? toNumber(draft.tempo_segundos)
      : editing?.cardio_tempo_segundos
      ? editing.cardio_tempo_segundos % 60
      : null
  );

  const preview = useMemo(() => calculateCardio({
    distanciaM: distancia,
    tempoSegundos: minutos !== null ? minutos * 60 + (segundos || 0) : null,
  }), [distancia, minutos, segundos]);

  const persistDraft = useCallback(() => {
    if (editing || !formRef.current) return;
    const values = getFormValues(formRef.current);
    values.cardio_distancia_m = distancia !== null ? String(distancia) : "";
    values.tempo_minutos = minutos !== null ? String(minutos) : "";
    values.tempo_segundos = segundos !== null ? String(segundos) : "";
    if (!hasCardioDraftContent(values)) {
      onDraftChange(null);
      return;
    }
    onDraftChange(values);
  }, [distancia, editing, minutos, onDraftChange, segundos]);

  const persistDraftAfterFieldUpdate = useCallback(() => {
    window.setTimeout(persistDraft, 0);
  }, [persistDraft]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    persistDraft();
  }, [distancia, minutos, segundos, persistDraft]);

  return (
    <form ref={formRef} onSubmit={onSubmit} onInput={persistDraft} onChange={persistDraft} onBlur={persistDraft} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data *">
          <Input name="data_avaliacao" type="datetime-local" defaultValue={draftValue(draft, editing, "data_avaliacao", formatDateTimeForInput(editing?.data_avaliacao || new Date()))} required />
        </Field>
        <Field label="Tipo">
          <Select name="cardio_tipo" defaultValue={String(draftValue(draft, editing, "cardio_tipo", editing?.cardio_tipo || "teste_1600m"))} onValueChange={persistDraftAfterFieldUpdate}>
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
        <Textarea name="cardio_observacoes" rows={3} defaultValue={draftValue(draft, editing, "cardio_observacoes", editing?.cardio_observacoes || "")} />
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

function getFormValues(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    values[key] = String(value);
  });
  return values;
}

function readCardioDraft(scope: string) {
  return readInterfaceMemory<Record<string, string>>({
    scope,
    version: CARDIO_DRAFT_VERSION,
    ttlMs: CARDIO_DRAFT_TTL_MS,
    hasContent: hasCardioDraftContent,
  });
}

function clearCardioDraft(scope: string) {
  clearInterfaceMemory({ scope, version: CARDIO_DRAFT_VERSION });
}

function hasCardioDraftContent(values: Record<string, string>) {
  if (hasMeaningfulValues(values, CARDIO_DRAFT_IGNORED_FIELDS)) return true;
  return values.cardio_distancia_m !== undefined && values.cardio_distancia_m !== "" && values.cardio_distancia_m !== "1600";
}

function draftValue(draft: Record<string, string> | null, editing: any | null, key: string, fallback: string | number | null | undefined) {
  if (editing) return fallback ?? "";
  return draft?.[key] ?? fallback ?? "";
}
