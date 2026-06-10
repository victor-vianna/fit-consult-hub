import { useEffect, useMemo, useState } from "react";
import { ClipboardList, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getFilledAnamneseFields } from "@/utils/anamneseHighlights";
import { toast } from "sonner";

type HighlightRow = {
  selected_fields: string[] | null;
  note: string | null;
};

interface AnamneseWorkoutNotesProps {
  profileId: string;
  personalId: string;
  studentName?: string;
  themeColor?: string;
}

const SECTION_ORDER = ["Saude", "Objetivo", "Rotina", "Treino"];

export function AnamneseWorkoutNotes({
  profileId,
  personalId,
  studentName,
  themeColor,
}: AnamneseWorkoutNotesProps) {
  const [anamnese, setAnamnese] = useState<Record<string, unknown> | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [draftSelectedFields, setDraftSelectedFields] = useState<string[]>([]);
  const [draftNote, setDraftNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const filledFields = useMemo(() => getFilledAnamneseFields(anamnese), [anamnese]);
  const suggestedFields = useMemo(
    () => filledFields.filter((field) => field.important).slice(0, 8),
    [filledFields]
  );
  const selectedItems = useMemo(
    () => filledFields.filter((field) => selectedFields.includes(field.key)),
    [filledFields, selectedFields]
  );
  const criticalCount = selectedItems.filter((field) => field.important).length;
  const draftCount = draftSelectedFields.length;

  useEffect(() => {
    fetchData();
  }, [profileId, personalId]);

  const fetchData = async () => {
    if (!profileId || !personalId) return;

    try {
      setLoading(true);
      const [{ data: anamneseData, error: anamneseError }, { data: noteData, error: noteError }] =
        await Promise.all([
          supabase
            .from("anamnese_inicial")
            .select("*")
            .eq("profile_id", profileId)
            .eq("personal_id", personalId)
            .maybeSingle(),
          (supabase as any)
            .from("anamnese_treino_destaques")
            .select("selected_fields, note")
            .eq("profile_id", profileId)
            .eq("personal_id", personalId)
            .maybeSingle(),
        ]);

      if (anamneseError) throw anamneseError;
      if (noteError && noteError.code !== "PGRST116") throw noteError;

      const row = (noteData || null) as HighlightRow | null;
      setAnamnese(anamneseData as Record<string, unknown> | null);
      setSelectedFields(Array.isArray(row?.selected_fields) ? row!.selected_fields! : []);
      setNote(row?.note || "");
    } catch (error: any) {
      console.error("Erro ao carregar destaques da anamnese:", error);
      toast.error("Nao foi possivel carregar os destaques da anamnese");
    } finally {
      setLoading(false);
    }
  };

  const openEditor = () => {
    const initialFields =
      selectedFields.length > 0
        ? selectedFields
        : suggestedFields.map((field) => field.key);
    setDraftSelectedFields(initialFields);
    setDraftNote(note);
    setOpen(true);
  };

  const toggleDraftField = (key: string) => {
    setDraftSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const saveHighlights = async () => {
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("anamnese_treino_destaques")
        .upsert(
          {
            profile_id: profileId,
            personal_id: personalId,
            selected_fields: draftSelectedFields,
            note: draftNote.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "profile_id,personal_id" }
        );

      if (error) throw error;

      setSelectedFields(draftSelectedFields);
      setNote(draftNote.trim());
      setOpen(false);
      toast.success("Destaques da anamnese salvos");
    } catch (error: any) {
      console.error("Erro ao salvar destaques da anamnese:", error);
      toast.error(error?.message || "Erro ao salvar destaques");
    } finally {
      setSaving(false);
    }
  };

  const fieldsBySection = useMemo(() => {
    return SECTION_ORDER.map((section) => ({
      section,
      fields: filledFields.filter((field) => field.section === section),
    })).filter((group) => group.fields.length > 0);
  }, [filledFields]);

  if (loading) {
    return (
      <Card className="border bg-card shadow-sm">
        <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando destaques da anamnese...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="flex">
            <div
              className="w-1.5 shrink-0"
              style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
            />
            <div className="min-w-0 flex-1 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-md text-white"
                      style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
                    >
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold leading-tight">
                        Contexto da anamnese para prescricao
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {studentName
                          ? `Informacoes importantes de ${studentName} para consultar durante a montagem.`
                          : "Informacoes importantes para consultar durante a montagem."}
                      </p>
                    </div>
                    {criticalCount > 0 && (
                      <Badge variant="destructive" className="ml-0 lg:ml-2">
                        {criticalCount} atencao
                      </Badge>
                    )}
                    {selectedItems.length > 0 && (
                      <Badge variant="secondary">{selectedItems.length} destaque(s)</Badge>
                    )}
                  </div>

                  {!anamnese ? (
                    <p className="text-sm text-muted-foreground">
                      A anamnese ainda nao foi preenchida para este aluno.
                    </p>
                  ) : selectedItems.length > 0 || note ? (
                    <div className="space-y-3">
                      {note && (
                        <div className="rounded-md border bg-muted/30 p-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            Observacao do personal
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                            {note}
                          </p>
                        </div>
                      )}
                      {selectedItems.length > 0 && (
                        <div className="grid gap-2 md:grid-cols-2">
                          {selectedItems.map((item) => (
                            <div
                              key={item.key}
                              className={cn(
                                "rounded-md border bg-background p-3",
                                item.important && "border-destructive/30 bg-destructive/5"
                              )}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">
                                  {item.label}
                                </p>
                                {item.important && (
                                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                    atencao
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum destaque salvo. Selecione dores, restricoes,
                      disponibilidade e preferencias relevantes.
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={openEditor}
                  disabled={!anamnese || filledFields.length === 0}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Ver detalhes
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[90vh] max-h-[760px] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
            <DialogTitle>Detalhes da anamnese para o treino</DialogTitle>
            <DialogDescription>
              Consulte as respostas completas e marque o que deve ficar em destaque na montagem.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <div className="rounded-lg border bg-muted/30 p-4">
                <label className="text-sm font-medium">Observacao do personal</label>
                <Textarea
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  placeholder="Ex: evitar impacto no joelho direito; priorizar fortalecimento de core..."
                  className="mt-2 min-h-24 bg-background"
                />
              </div>

              {fieldsBySection.map((group) => (
                <section key={group.section} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold">{group.section}</h4>
                    <span className="text-xs text-muted-foreground">
                      {group.fields.length} resposta(s)
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {group.fields.map((field) => {
                      const checked = draftSelectedFields.includes(field.key);
                      return (
                        <label
                          key={field.key}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                            checked
                              ? "border-primary bg-primary/5"
                              : "bg-background hover:bg-muted/40"
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleDraftField(field.key)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                              {field.label}
                              {field.important && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                  atencao
                                </Badge>
                              )}
                            </span>
                            <span className="mt-1 block whitespace-pre-wrap text-sm text-muted-foreground">
                              {field.value}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveHighlights} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar {draftCount > 0 ? `(${draftCount})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
