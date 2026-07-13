import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Edit, Eye, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeForInput, formatDisplayDate } from "@/utils/dateFormat";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  onRefresh?: () => void;
}

const POSTURAL_GROUPS = [
  {
    key: "frontal_anterior",
    label: "Plano frontal - anterior",
    fields: ["cabeca", "ombros", "mamilos", "cicatriz_umbilical", "triangulo_tali", "pelve", "joelhos"],
  },
  {
    key: "frontal_posterior",
    label: "Plano frontal - posterior",
    fields: ["cabeca", "ombros", "escapulas", "coluna_vertebral", "pelve", "joelhos", "membros_inferiores"],
  },
  {
    key: "lateral",
    label: "Plano lateral",
    fields: ["cabeca", "ombros", "coluna_vertebral", "pelve", "joelhos", "tornozelos"],
  },
] as const;

export function PosturalSection({ profileId, personalId, themeColor, onRefresh }: Props) {
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
      .select("id, data_avaliacao, postural_observacoes, postural_desvios")
      .eq("profile_id", profileId)
      .order("data_avaliacao", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar postura", description: error.message, variant: "destructive" });
      return;
    }
    setAvaliacoes((data || []).filter((item: any) => item.postural_observacoes || item.postural_desvios));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const postural: Record<string, Record<string, string>> = {};

    POSTURAL_GROUPS.forEach((group) => {
      postural[group.key] = {};
      group.fields.forEach((field) => {
        const value = (form.get(`${group.key}.${field}`) as string) || "";
        if (value.trim()) postural[group.key][field] = value.trim();
      });
    });

    const payload: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: form.get("data_avaliacao") as string,
      postural_desvios: postural,
      postural_observacoes: (form.get("postural_observacoes") as string) || null,
    };

    try {
      const table = supabase.from("avaliacoes_fisicas") as any;
      const { error } = editing
        ? await table.update(payload).eq("id", editing.id)
        : await table.insert(payload);
      if (error) throw error;

      toast({ title: "Avaliacao postural salva" });
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
            <Eye className="h-5 w-5" /> Avaliacao postural
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
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between gap-3">
                    <h4 className="font-semibold">{formatDisplayDate(avaliacao.data_avaliacao)}</h4>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(avaliacao); setOpenDialog(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <PosturalSummary data={avaliacao.postural_desvios} />
                  {avaliacao.postural_observacoes && <p className="text-sm text-muted-foreground">{avaliacao.postural_observacoes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">Nenhuma avaliacao postural registrada</p>
            <Button onClick={() => setOpenDialog(true)} style={{ backgroundColor: themeColor }}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={openDialog} onOpenChange={(open) => { setOpenDialog(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} avaliacao postural</DialogTitle>
          </DialogHeader>
          <PosturalForm editing={editing} loading={loading} themeColor={themeColor} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PosturalForm({ editing, loading, themeColor, onSubmit }: { editing: any | null; loading: boolean; themeColor?: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const data = editing?.postural_desvios || {};

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Data *">
        <Input name="data_avaliacao" type="datetime-local" defaultValue={formatDateTimeForInput(editing?.data_avaliacao || new Date())} required />
      </Field>

      {POSTURAL_GROUPS.map((group) => (
        <section key={group.key} className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <h3 className="text-sm font-semibold">{group.label}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => (
              <Field key={field} label={formatLabel(field)}>
                <Input name={`${group.key}.${field}`} defaultValue={data?.[group.key]?.[field] || ""} placeholder="Ex: simetrico, elevado a direita, rotacao..." />
              </Field>
            ))}
          </div>
        </section>
      ))}

      <Field label="Observacoes gerais">
        <Textarea name="postural_observacoes" rows={4} defaultValue={editing?.postural_observacoes || ""} />
      </Field>
      <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: themeColor }}>
        {loading ? "Salvando..." : "Salvar avaliacao postural"}
      </Button>
    </form>
  );
}

function PosturalSummary({ data }: { data: any }) {
  if (!data || typeof data !== "object") return null;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {POSTURAL_GROUPS.map((group) => {
        const entries = Object.entries(data[group.key] || {}).filter(([, value]) => value);
        if (entries.length === 0) return null;
        return (
          <div key={group.key} className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-sm font-semibold">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {entries.map(([key, value]) => (
                <Badge key={key} variant="secondary" className="whitespace-normal text-left">
                  {formatLabel(key)}: {String(value)}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
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

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
