import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, ShieldCheck, CheckCircle, XCircle } from "lucide-react";
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
}

const PARQ_PERGUNTAS = [
  "Algum médico já disse que você possui algum problema de coração?",
  "Você sente dores no peito quando pratica atividade física?",
  "No último mês, você sentiu dores no peito quando não estava praticando atividade física?",
  "Você perde o equilíbrio por causa de tontura ou já perdeu a consciência?",
  "Você tem algum problema ósseo ou de articulação que poderia ser piorado com atividade física?",
  "Você toma algum medicamento para pressão arterial ou problema de coração?",
  "Você conhece alguma outra razão pela qual não deveria praticar atividade física?",
];

type TriagemDraft = {
  values: Record<string, string>;
  parqRespostas: boolean[];
  liberacaoMedica: boolean;
};

const TRIAGEM_DRAFT_VERSION = 1;
const TRIAGEM_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TRIAGEM_DRAFT_IGNORED_FIELDS = new Set(["data_avaliacao"]);

export function TriagemSection({ profileId, personalId, themeColor }: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const draftScope = useMemo(() => `assessment:triagem:${personalId}:${profileId}`, [personalId, profileId]);
  const [draft, setDraft] = useState<TriagemDraft | null>(() => readTriagemDraft(draftScope)?.data ?? null);
  const [loading, setLoading] = useState(false);
  const [parqRespostas, setParqRespostas] = useState<boolean[]>(new Array(7).fill(false));
  const [liberacaoMedica, setLiberacaoMedica] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => { fetchData(); }, [profileId]);

  useEffect(() => {
    const storedDraft = readTriagemDraft(draftScope);
    setDraft(storedDraft?.data ?? null);
    if (storedDraft?.open) {
      setEditing(null);
      applyTriagemDraft(storedDraft.data, setParqRespostas, setLiberacaoMedica);
      setOpenDialog(true);
    }
  }, [draftScope]);

  const persistDraft = useCallback(() => {
    if (editing || !formRef.current) return;
    const nextDraft: TriagemDraft = {
      values: getFormValues(formRef.current),
      parqRespostas,
      liberacaoMedica,
    };
    if (!hasTriagemDraftContent(nextDraft)) {
      clearTriagemDraft(draftScope);
      setDraft(null);
      return;
    }
    setDraft(nextDraft);
    writeInterfaceMemory({
      scope: draftScope,
      version: TRIAGEM_DRAFT_VERSION,
      data: nextDraft,
      open: true,
      hasContent: hasTriagemDraftContent,
    });
  }, [draftScope, editing, liberacaoMedica, parqRespostas]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    persistDraft();
  }, [liberacaoMedica, parqRespostas, persistDraft]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("id, data_avaliacao, triagem_parq, triagem_historico_lesoes, triagem_restricoes, triagem_liberacao_medica, triagem_observacoes")
      .eq("profile_id", profileId)
      .order("data_avaliacao", { ascending: false });
    setAvaliacoes((data || []).filter((a: any) => a.triagem_parq || a.triagem_historico_lesoes || a.triagem_restricoes || a.triagem_liberacao_medica != null));
  };

  const openNew = () => {
    setEditing(null);
    const storedDraft = readTriagemDraft(draftScope);
    setDraft(storedDraft?.data ?? null);
    if (storedDraft) {
      applyTriagemDraft(storedDraft.data, setParqRespostas, setLiberacaoMedica);
    } else {
      setParqRespostas(new Array(7).fill(false));
      setLiberacaoMedica(false);
    }
    setOpenDialog(true);
  };

  const openEdit = (av: any) => {
    setEditing(av);
    setParqRespostas(Array.isArray(av.triagem_parq) ? av.triagem_parq : new Array(7).fill(false));
    setLiberacaoMedica(av.triagem_liberacao_medica || false);
    setOpenDialog(true);
  };

  const handleOpenChange = (open: boolean) => {
    setOpenDialog(open);
    if (!open) {
      if (!editing) {
        clearTriagemDraft(draftScope);
        setDraft(null);
      }
      setEditing(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: fd.get("data_avaliacao"),
      triagem_parq: parqRespostas,
      triagem_historico_lesoes: fd.get("historico_lesoes") || null,
      triagem_restricoes: fd.get("restricoes") || null,
      triagem_liberacao_medica: liberacaoMedica,
      triagem_observacoes: fd.get("observacoes") || null,
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
      if (!editing) {
        clearTriagemDraft(draftScope);
        setDraft(null);
      }
      setOpenDialog(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Triagem</CardTitle>
          <Button size="sm" style={{ backgroundColor: themeColor }} onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {avaliacoes.length > 0 ? (
          <div className="space-y-3">
            {avaliacoes.map((av) => {
              const parq = Array.isArray(av.triagem_parq) ? av.triagem_parq : [];
              const hasSim = parq.some((r: boolean) => r);
              return (
                <Card key={av.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{formatDisplayDate(av.data_avaliacao)}</h4>
                        {av.triagem_liberacao_medica ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Liberado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-700 border-yellow-300"><XCircle className="h-3 w-3 mr-1" /> Sem liberação</Badge>
                        )}
                        {hasSim && <Badge variant="destructive" className="text-xs">PAR-Q: Atenção</Badge>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(av)}><Edit className="h-4 w-4" /></Button>
                    </div>
                    {parq.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">PAR-Q: {parq.filter((r: boolean) => r).length}/{parq.length} SIM</p>
                      </div>
                    )}
                    <div className="grid gap-2 text-sm">
                      {av.triagem_historico_lesoes && <div><span className="text-muted-foreground">Lesões:</span> {av.triagem_historico_lesoes}</div>}
                      {av.triagem_restricoes && <div><span className="text-muted-foreground">Restrições:</span> {av.triagem_restricoes}</div>}
                      {av.triagem_observacoes && <div><span className="text-muted-foreground">Obs:</span> {av.triagem_observacoes}</div>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Nenhuma triagem registrada</p>
            <Button onClick={openNew} style={{ backgroundColor: themeColor }}><Plus className="h-4 w-4 mr-1" /> Iniciar Triagem</Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Triagem</DialogTitle></DialogHeader>
          <form ref={formRef} onSubmit={handleSubmit} onInput={persistDraft} onChange={persistDraft} onBlur={persistDraft} className="space-y-4">
            <div><Label>Data *</Label><Input name="data_avaliacao" type="datetime-local" defaultValue={draftValue(draft, editing, "data_avaliacao", formatDateTimeForInput(editing?.data_avaliacao || new Date()))} required /></div>
            
            <div className="space-y-3">
              <Label className="text-base font-semibold">PAR-Q (Questionário de Prontidão)</Label>
              {PARQ_PERGUNTAS.map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Switch checked={parqRespostas[i]} onCheckedChange={(c) => { const n = [...parqRespostas]; n[i] = c; setParqRespostas(n); }} />
                  <p className="text-sm flex-1">{p}</p>
                  <Badge variant={parqRespostas[i] ? "destructive" : "secondary"} className="text-xs shrink-0">{parqRespostas[i] ? "SIM" : "NÃO"}</Badge>
                </div>
              ))}
            </div>

            <div><Label>Histórico de Lesões</Label><Textarea name="historico_lesoes" rows={2} placeholder="Descreva lesões anteriores..." defaultValue={draftValue(draft, editing, "historico_lesoes", editing?.triagem_historico_lesoes)} /></div>
            <div><Label>Restrições Médicas</Label><Textarea name="restricoes" rows={2} placeholder="Restrições para exercícios..." defaultValue={draftValue(draft, editing, "restricoes", editing?.triagem_restricoes)} /></div>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Switch checked={liberacaoMedica} onCheckedChange={setLiberacaoMedica} />
              <Label>Liberação Médica para Exercícios</Label>
              <Badge variant={liberacaoMedica ? "default" : "outline"} className="ml-auto">{liberacaoMedica ? "Liberado" : "Não"}</Badge>
            </div>
            <div><Label>Observações</Label><Textarea name="observacoes" rows={2} defaultValue={draftValue(draft, editing, "observacoes", editing?.triagem_observacoes)} /></div>
            <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: themeColor }}>{loading ? "Salvando..." : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function getFormValues(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    values[key] = String(value);
  });
  return values;
}

function readTriagemDraft(scope: string) {
  return readInterfaceMemory<TriagemDraft>({
    scope,
    version: TRIAGEM_DRAFT_VERSION,
    ttlMs: TRIAGEM_DRAFT_TTL_MS,
    hasContent: hasTriagemDraftContent,
  });
}

function clearTriagemDraft(scope: string) {
  clearInterfaceMemory({ scope, version: TRIAGEM_DRAFT_VERSION });
}

function applyTriagemDraft(
  draft: TriagemDraft,
  setParqRespostas: (respostas: boolean[]) => void,
  setLiberacaoMedica: (liberado: boolean) => void
) {
  setParqRespostas(Array.isArray(draft.parqRespostas) ? draft.parqRespostas : new Array(7).fill(false));
  setLiberacaoMedica(Boolean(draft.liberacaoMedica));
}

function hasTriagemDraftContent(draft: TriagemDraft) {
  return (
    hasMeaningfulValues(draft.values, TRIAGEM_DRAFT_IGNORED_FIELDS) ||
    (Array.isArray(draft.parqRespostas) && draft.parqRespostas.some(Boolean)) ||
    draft.liberacaoMedica === true
  );
}

function draftValue(draft: TriagemDraft | null, editing: any | null, key: string, fallback: string | number | null | undefined) {
  if (editing) return fallback ?? "";
  return draft?.values?.[key] ?? fallback ?? "";
}
