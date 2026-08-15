import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
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
import { formatDateTimeForInput, formatDisplayDate } from "@/utils/dateFormat";
import { createStudentNotification } from "@/utils/studentNotifications";
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
  onRefresh?: () => void;
}

const FLEX_DRAFT_VERSION = 1;
const FLEX_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FLEX_DRAFT_IGNORED_FIELDS = new Set(["data_avaliacao"]);

export function FlexibilidadeSection({ profileId, personalId, themeColor, onRefresh }: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const draftScope = useMemo(() => `assessment:flexibility:${personalId}:${profileId}`, [personalId, profileId]);
  const [draft, setDraft] = useState<Record<string, string> | null>(() => readFlexDraft(draftScope)?.data ?? null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  useEffect(() => {
    const storedDraft = readFlexDraft(draftScope);
    setDraft(storedDraft?.data ?? null);
    if (storedDraft?.open) {
      setEditing(null);
      setOpenDialog(true);
    }
  }, [draftScope]);

  const persistDraft = useCallback(() => {
    if (editing || !formRef.current) return;
    const values = getFormValues(formRef.current);
    if (!hasFlexDraftContent(values)) {
      clearFlexDraft(draftScope);
      setDraft(null);
      return;
    }
    setDraft(values);
    writeInterfaceMemory({
      scope: draftScope,
      version: FLEX_DRAFT_VERSION,
      data: values,
      open: true,
      hasContent: hasFlexDraftContent,
    });
  }, [draftScope, editing]);

  const openNew = () => {
    setEditing(null);
    const storedDraft = readFlexDraft(draftScope);
    setDraft(storedDraft?.data ?? null);
    setOpenDialog(true);
  };

  const handleOpenChange = (open: boolean) => {
    setOpenDialog(open);
    if (!open) {
      if (!editing) {
        clearFlexDraft(draftScope);
        setDraft(null);
      }
      setEditing(null);
    }
  };

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

      void createStudentNotification({
        studentId: profileId,
        personalId,
        tipo: "avaliacao_atualizada",
        titulo: "Avaliacao atualizada",
        mensagem: editing
          ? "Sua avaliacao de flexibilidade foi atualizada."
          : "Uma nova avaliacao de flexibilidade esta disponivel.",
        dados: { avaliacao_id: editing?.id || null, area: "flexibilidade" },
      });

      toast({ title: "Flexibilidade salva" });
      if (!editing) {
        clearFlexDraft(draftScope);
        setDraft(null);
      }
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
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={openNew}>
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
            <Button onClick={openNew} style={{ backgroundColor: themeColor }}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} avaliacao de flexibilidade</DialogTitle>
          </DialogHeader>
          <form ref={formRef} onSubmit={handleSubmit} onInput={persistDraft} onChange={persistDraft} onBlur={persistDraft} className="space-y-4">
            <Field label="Data *">
              <Input name="data_avaliacao" type="datetime-local" defaultValue={draftValue(draft, editing, "data_avaliacao", formatDateTimeForInput(editing?.data_avaliacao || new Date()))} required />
            </Field>
            <Field label="Sentar e alcancar (cm)">
              <Input name="sentar_alcancar" type="number" step="0.1" defaultValue={draftValue(draft, editing, "sentar_alcancar", editing?.flexibilidade_sentar_alcancar ?? "")} />
            </Field>
            <Field label="Ombro">
              <Input name="ombro" placeholder="Ex: normal, limitado, hipermovel" defaultValue={draftValue(draft, editing, "ombro", editing?.flexibilidade_ombro || "")} />
            </Field>
            <Field label="Quadril">
              <Input name="quadril" placeholder="Ex: normal, limitado" defaultValue={draftValue(draft, editing, "quadril", editing?.flexibilidade_quadril || "")} />
            </Field>
            <Field label="Tornozelo">
              <Input name="tornozelo" placeholder="Ex: normal, limitado" defaultValue={draftValue(draft, editing, "tornozelo", editing?.flexibilidade_tornozelo || "")} />
            </Field>
            <Field label="Observacoes">
              <Textarea name="observacoes" rows={3} defaultValue={draftValue(draft, editing, "observacoes", editing?.observacoes || "")} />
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

function getFormValues(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    values[key] = String(value);
  });
  return values;
}

function readFlexDraft(scope: string) {
  return readInterfaceMemory<Record<string, string>>({
    scope,
    version: FLEX_DRAFT_VERSION,
    ttlMs: FLEX_DRAFT_TTL_MS,
    hasContent: hasFlexDraftContent,
  });
}

function clearFlexDraft(scope: string) {
  clearInterfaceMemory({ scope, version: FLEX_DRAFT_VERSION });
}

function hasFlexDraftContent(values: Record<string, string>) {
  return hasMeaningfulValues(values, FLEX_DRAFT_IGNORED_FIELDS);
}

function draftValue(draft: Record<string, string> | null, editing: any | null, key: string, fallback: string | number | null | undefined) {
  if (editing) return fallback ?? "";
  return draft?.[key] ?? fallback ?? "";
}
