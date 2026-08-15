import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChartPie,
  Edit,
  Plus,
  Ruler,
  Scale,
  Trash2,
  UserRound,
  Weight,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  clearInterfaceMemory,
  hasMeaningfulValues,
  readInterfaceMemory,
  writeInterfaceMemory,
} from "@/utils/interfaceMemory";
import {
  GENERAL_FIELDS,
  PERIMETRY_FIELDS,
  SKINFOLD_FIELDS,
  average,
  calculateAssessmentPending,
  calculateBodyComposition,
  classifyAbdominalCircumference,
  classifyBmi,
  classifyBodyFat,
  classifyLeanFatBalance,
  formatMetricValue,
  getBodyFatRanges,
  normalizeAssessmentSex,
  round,
  toNumber,
  type ClassificationTone,
  type MetricClassification,
} from "@/utils/avaliacaoMetrics";
import { formatDateTimeForInput, formatDisplayDate } from "@/utils/dateFormat";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
  onRefresh: () => void;
}

type DirectionPreference = "up" | "down" | "neutral";

type CompositionDraft = {
  values: Record<string, string>;
  dobrasMeasureCount: number;
};

const COMPOSITION_DRAFT_VERSION = 4;
const COMPOSITION_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COMPOSITION_DRAFT_IGNORED_FIELDS = new Set(["data_avaliacao", "dobras_measure_count"]);

const CONTEXT_LABELS: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  crianca: "Crianca",
  adulto: "Adulto",
  atleta: "Atleta",
  caucasiano: "Caucasiano",
  afro: "Afrodescendente",
  asiatico: "Asiatico",
  outro: "Outro",
};

export function ComposicaoCorporalSection({
  profileId,
  personalId,
  themeColor,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [studentName, setStudentName] = useState("Aluno");
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const draftScope = useMemo(
    () => `assessment:composition:${personalId}:${profileId}`,
    [personalId, profileId]
  );
  const [draft, setDraft] = useState<CompositionDraft | null>(() => readCompositionDraft(draftScope)?.data ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  useEffect(() => {
    const storedDraft = readCompositionDraft(draftScope);
    setDraft(storedDraft?.data ?? null);
    if (storedDraft?.open) {
      setEditing(null);
      setOpenDialog(true);
    }
  }, [draftScope]);

  const fetchData = async () => {
    const [{ data: registros }, { data: profile }] = await Promise.all([
      supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("profile_id", profileId)
        .order("data_avaliacao", { ascending: false }),
      supabase.from("profiles").select("nome").eq("id", profileId).maybeSingle(),
    ]);

    const compositionRecords = (registros || []).filter(hasCompositionData);
    setStudentName(profile?.nome || "Aluno");
    setAvaliacoes(compositionRecords);
    return compositionRecords;
  };

  useEffect(() => {
    if (avaliacoes.length === 0) {
      setSelectedAssessmentId(null);
      return;
    }

    if (!selectedAssessmentId || !avaliacoes.some((avaliacao) => avaliacao.id === selectedAssessmentId)) {
      setSelectedAssessmentId(avaliacoes[0].id);
    }
  }, [avaliacoes, selectedAssessmentId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);

    const dobrasMedidas: Record<string, Array<number | null>> = {};
    const dobrasMedias: Record<string, number> = {};
    const dobrasMeasureCount = Math.max(1, Number(form.get("dobras_measure_count")) || 3);
    SKINFOLD_FIELDS.forEach(({ key }) => {
      const values = Array.from({ length: dobrasMeasureCount }, (_, index) =>
        toNumber(form.get(`${key}_${index + 1}`))
      );
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
      if (!editing) {
        clearCompositionDraft(draftScope);
        setDraft(null);
      }
      setOpenDialog(false);
      setEditing(null);
      const updatedAssessments = await fetchData();
      setSelectedAssessmentId(editing ? editing.id : updatedAssessments[0]?.id ?? null);
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
    const nextSelection = avaliacoes.find((avaliacao) => avaliacao.id !== id)?.id ?? null;
    await fetchData();
    setSelectedAssessmentId(nextSelection);
    onRefresh();
  };

  const selectedIndex = useMemo(
    () => avaliacoes.findIndex((avaliacao) => avaliacao.id === selectedAssessmentId),
    [avaliacoes, selectedAssessmentId]
  );
  const selectedAssessment = selectedIndex >= 0 ? avaliacoes[selectedIndex] : avaliacoes[0];
  const previous = selectedIndex >= 0 ? avaliacoes[selectedIndex + 1] : avaliacoes[1];

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Weight className="h-5 w-5" /> Composicao corporal
          </CardTitle>
          <Button
            size="sm"
            style={{ backgroundColor: themeColor }}
            onClick={() => {
              setEditing(null);
              const storedDraft = readCompositionDraft(draftScope);
              setDraft(storedDraft?.data ?? null);
              setOpenDialog(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Nova avaliacao
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {selectedAssessment ? (
          <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
            <AssessmentHistoryPanel
              avaliacoes={avaliacoes}
              selectedAssessmentId={selectedAssessment.id}
              onSelect={setSelectedAssessmentId}
            />
            <CompositionDashboard
              avaliacao={selectedAssessment}
              previous={previous}
              studentName={studentName}
              totalAssessments={avaliacoes.length}
              selectedPosition={selectedIndex >= 0 ? selectedIndex + 1 : 1}
              onEdit={() => {
                setEditing(selectedAssessment);
                setOpenDialog(true);
              }}
              onDelete={() => handleDelete(selectedAssessment.id)}
            />
          </div>
        ) : (
          <div className="py-12 text-center">
            <Ruler className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">Nenhuma avaliacao corporal registrada</p>
            <Button
              onClick={() => {
                const storedDraft = readCompositionDraft(draftScope);
                setDraft(storedDraft?.data ?? null);
                setOpenDialog(true);
              }}
              style={{ backgroundColor: themeColor }}
            >
              <Plus className="mr-1 h-4 w-4" /> Criar primeira avaliacao
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog
        open={openDialog}
        onOpenChange={(open) => {
          setOpenDialog(open);
          if (!open) {
            if (!editing) {
              clearCompositionDraft(draftScope);
              setDraft(null);
            }
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} avaliacao corporal completa</DialogTitle>
          </DialogHeader>
          <CompositionForm
            editing={editing}
            draft={editing ? null : draft}
            loading={loading}
            themeColor={themeColor}
            onDraftChange={(nextDraft) => {
              setDraft(nextDraft);
              if (nextDraft) {
                persistCompositionDraft(draftScope, nextDraft);
              } else {
                clearCompositionDraft(draftScope);
              }
            }}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AssessmentHistoryPanel({
  avaliacoes,
  selectedAssessmentId,
  onSelect,
}: {
  avaliacoes: any[];
  selectedAssessmentId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="rounded-xl border bg-muted/20 p-3">
      <div className="mb-3">
        <p className="text-sm font-semibold">Historico de avaliacoes</p>
        <p className="text-xs text-muted-foreground">Selecione um registro para navegar pelos dados salvos.</p>
      </div>
      <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
        {avaliacoes.map((avaliacao, index) => {
          const active = avaliacao.id === selectedAssessmentId;
          const pending = Array.isArray(avaliacao.campos_pendentes) ? avaliacao.campos_pendentes : [];
          const bodyFat = formatMetricValue(avaliacao.percentual_gordura, "%");
          const weight = formatMetricValue(avaliacao.peso, "kg");

          return (
            <button
              key={avaliacao.id}
              type="button"
              onClick={() => onSelect(avaliacao.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition hover:border-primary/60 hover:bg-background",
                active ? "border-primary bg-background shadow-sm" : "bg-card"
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{formatDisplayDate(avaliacao.data_avaliacao)}</p>
                  <p className="text-xs text-muted-foreground">Avaliacao #{avaliacoes.length - index}</p>
                </div>
                {index === 0 && <Badge variant="outline">Atual</Badge>}
              </div>
              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                <span>{weight}</span>
                <span>-</span>
                <span>{bodyFat}</span>
              </div>
              {pending.length > 0 && (
                <Badge variant="outline" className="mt-2 border-amber-400 text-[10px] text-amber-600 dark:text-amber-300">
                  Incompleta
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function CompositionDashboard({
  avaliacao,
  previous,
  studentName,
  totalAssessments,
  selectedPosition,
  onEdit,
  onDelete,
}: {
  avaliacao: any;
  previous?: any;
  studentName: string;
  totalAssessments: number;
  selectedPosition: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pending = Array.isArray(avaliacao.campos_pendentes) ? avaliacao.campos_pendentes : [];
  const abdomenValue = avaliacao.abdomen ?? avaliacao.cintura ?? null;
  const abdomenPrevious = avaliacao.abdomen !== null && avaliacao.abdomen !== undefined
    ? previous?.abdomen
    : previous?.cintura;
  const bodyFat = classifyBodyFat(avaliacao.percentual_gordura, avaliacao.idade, avaliacao.sexo_avaliacao);
  const bmi = classifyBmi(avaliacao.imc);
  const abdomen = classifyAbdominalCircumference(abdomenValue, avaliacao.sexo_avaliacao);
  const leanFat = classifyLeanFatBalance(
    avaliacao.massa_magra,
    avaliacao.massa_gorda,
    avaliacao.peso,
    avaliacao.idade,
    avaliacao.sexo_avaliacao
  );
  const alerts = [
    { label: "% gordura", classification: bodyFat },
    { label: "IMC", classification: bmi },
    { label: "Abdomen", classification: abdomen },
    { label: "Massa magra/gorda", classification: leanFat },
  ].filter(({ classification }) => classification.tone === "danger" || classification.tone === "warning");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold leading-tight">{studentName}</h3>
            <Badge variant="outline">{formatDisplayDate(avaliacao.data_avaliacao)}</Badge>
            <Badge variant="outline">
              {selectedPosition} de {totalAssessments}
            </Badge>
            {pending.length > 0 ? (
              <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-300">
                <AlertTriangle className="mr-1 h-3 w-3" /> Incompleta
              </Badge>
            ) : (
              <Badge className="bg-green-600 text-white hover:bg-green-600">Completa</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <ContextChip label={avaliacao.idade ? `${avaliacao.idade} anos` : "Idade nao informada"} important={!avaliacao.idade} />
            <ContextChip label={formatContext(avaliacao.sexo_avaliacao) || "Sexo nao informado"} important={!avaliacao.sexo_avaliacao} />
            {avaliacao.fase && <ContextChip label={formatContext(avaliacao.fase)} />}
            {avaliacao.etnia && <ContextChip label={formatContext(avaliacao.etnia)} />}
            {avaliacao.objetivo && <ContextChip label={avaliacao.objetivo} />}
          </div>
          {pending.length > 0 && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
              Falta preencher: {pending.join(", ")}.
            </p>
          )}
          {!previous && (
            <p className="mt-2 text-xs text-muted-foreground">
              Primeira avaliacao corporal registrada. O comparativo aparece a partir do segundo registro.
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="mr-1 h-4 w-4" /> Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover avaliacao?</AlertDialogTitle>
                <AlertDialogDescription>Essa acao remove apenas este registro historico.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="grid gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {alerts.map(({ label, classification }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <AlertTriangle className={cn("h-4 w-4", classification.tone === "danger" ? "text-red-500" : "text-amber-500")} />
              <span className="font-medium">{label}:</span>
              <span>{classification.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-4">
        <KpiCard
          label="IMC"
          value={avaliacao.imc}
          unit=""
          classification={bmi}
          previous={previous?.imc}
          preference="neutral"
        />
        <KpiCard
          label="% gordura"
          value={avaliacao.percentual_gordura}
          unit="%"
          classification={bodyFat}
          previous={previous?.percentual_gordura}
          preference="down"
        />
        <KpiCard
          label="Circ. abdominal"
          value={abdomenValue}
          unit="cm"
          classification={abdomen}
          previous={abdomenPrevious}
          preference="down"
        />
        <KpiCard
          label="Magra / gorda"
          value={getLeanFatRatio(avaliacao)}
          unit=""
          classification={leanFat}
          previous={getLeanFatRatio(previous)}
          preference="up"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <BodyFatGauge value={avaliacao.percentual_gordura} idade={avaliacao.idade} sexo={avaliacao.sexo_avaliacao} />
        <LeanFatPanel avaliacao={avaliacao} classification={leanFat} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <FatDistributionPanel distribution={avaliacao.distribuicao_gordura} />
        <ComparisonPanel avaliacao={avaliacao} previous={previous} />
      </div>

      <SkinfoldMeasurementsPanel avaliacao={avaliacao} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{totalAssessments} avaliacao{totalAssessments === 1 ? "" : "es"} no historico de composicao.</span>
        {avaliacao.observacoes && <span className="italic">Obs.: {avaliacao.observacoes}</span>}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  classification,
  previous,
  preference,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
  classification: MetricClassification;
  previous?: number | null;
  preference: DirectionPreference;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", toneBorderClass(classification.tone))}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <StatusBadge classification={classification} />
      </div>
      <p className="text-2xl font-bold tracking-tight">{formatMetricValue(value, unit)}</p>
      <MetricDelta value={value} previous={previous} preference={preference} />
    </div>
  );
}

function BodyFatGauge({ value, idade, sexo }: { value?: number | null; idade?: number | null; sexo?: string | null }) {
  const ranges = getBodyFatRanges(idade, sexo);
  const displayValue = typeof value === "number" ? value : null;
  const max = Math.max(ranges?.[ranges.length - 1]?.max ?? 45, displayValue ? displayValue + 5 : 45);
  const marker = displayValue === null ? null : clamp((displayValue / max) * 100, 0, 100);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">% gordura na tabela</p>
          <p className="text-xs text-muted-foreground">
            {idade && normalizeAssessmentSex(sexo)
              ? `${idade} anos - ${formatContext(sexo)}`
              : "Informe idade e sexo para posicionar na referencia"}
          </p>
        </div>
        <StatusBadge classification={classifyBodyFat(value, idade, sexo)} />
      </div>

      {ranges && displayValue !== null ? (
        <div className="space-y-3">
          <div className="relative h-4 overflow-hidden rounded-full bg-muted">
            <div className="flex h-full">
              {ranges.map((range) => (
                <div
                  key={range.label}
                  className={toneFillClass(range.tone)}
                  style={{ width: `${((range.max - range.min) / max) * 100}%` }}
                />
              ))}
            </div>
            <div
              className="absolute top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-foreground shadow"
              style={{ left: `calc(${marker}% - 2px)` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground sm:grid-cols-6">
            {ranges.map((range) => (
              <span key={range.label} className="truncate">{range.label}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Valor atual: {formatMetricValue(displayValue, "%")}</p>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Sem dados suficientes para mostrar a regua.
        </p>
      )}
    </div>
  );
}

function LeanFatPanel({ avaliacao, classification }: { avaliacao: any; classification: MetricClassification }) {
  const peso = toFiniteNumber(avaliacao.peso);
  const massaMagra = toFiniteNumber(avaliacao.massa_magra);
  const massaGorda = toFiniteNumber(avaliacao.massa_gorda);
  const magraPercent = peso && massaMagra ? round((massaMagra / peso) * 100, 1) : null;
  const gordaPercent = peso && massaGorda ? round((massaGorda / peso) * 100, 1) : null;

  return (
    <div className={cn("rounded-xl border bg-card p-4", toneBorderClass(classification.tone))}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Scale className="h-4 w-4" /> Massa magra vs gorda
        </p>
        <StatusBadge classification={classification} />
      </div>
      {peso && massaMagra !== null && massaGorda !== null && magraPercent !== null && gordaPercent !== null ? (
        <div className="space-y-3">
          <div className="flex h-4 overflow-hidden rounded-full bg-muted">
            <div className="bg-green-500" style={{ width: `${clamp(magraPercent, 0, 100)}%` }} />
            <div className="bg-amber-500" style={{ width: `${clamp(gordaPercent, 0, 100)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <MetricMini label="Magra" value={`${formatMetricValue(massaMagra, "kg")} - ${magraPercent}%`} />
            <MetricMini label="Gorda" value={`${formatMetricValue(massaGorda, "kg")} - ${gordaPercent}%`} />
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Preencha peso e dobras para calcular a proporcao.
        </p>
      )}
    </div>
  );
}

function FatDistributionPanel({ distribution }: { distribution: any }) {
  const superiores = toFiniteNumber(distribution?.membros_superiores);
  const inferiores = toFiniteNumber(distribution?.membros_inferiores);
  const tronco = toFiniteNumber(distribution?.tronco);
  const hasData = superiores !== null || inferiores !== null || tronco !== null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <ChartPie className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Distribuicao de gordura</p>
      </div>
      {hasData ? (
        <div className="space-y-3">
          <div className="flex h-4 overflow-hidden rounded-full bg-muted">
            <div className="bg-sky-500" style={{ width: `${superiores ?? 0}%` }} />
            <div className="bg-violet-500" style={{ width: `${tronco ?? 0}%` }} />
            <div className="bg-emerald-500" style={{ width: `${inferiores ?? 0}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <MetricMini label="Superiores" value={formatMetricValue(superiores, "%")} />
            <MetricMini label="Tronco" value={formatMetricValue(tronco, "%")} />
            <MetricMini label="Inferiores" value={formatMetricValue(inferiores, "%")} />
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Sem dobras suficientes para calcular a distribuicao.
        </p>
      )}
    </div>
  );
}

function ComparisonPanel({ avaliacao, previous }: { avaliacao: any; previous?: any }) {
  const metrics = [
    { key: "peso", label: "Peso", unit: "kg", preference: "neutral" as const },
    { key: "percentual_gordura", label: "% gordura", unit: "%", preference: "down" as const },
    { key: "massa_magra", label: "Massa magra", unit: "kg", preference: "up" as const },
    { key: "massa_gorda", label: "Massa gorda", unit: "kg", preference: "down" as const },
    ...PERIMETRY_FIELDS.map((field) => ({ ...field, preference: "neutral" as const })),
  ].filter(({ key }) => avaliacao?.[key] !== null && avaliacao?.[key] !== undefined);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Medidas e variacao</p>
        {!previous && <Badge variant="outline">Primeira avaliacao</Badge>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(({ key, label, unit, preference }) => (
          <div key={key} className="rounded-lg border bg-muted/20 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <MetricDelta value={avaliacao[key]} previous={previous?.[key]} preference={preference} compact />
            </div>
            <p className="text-sm font-semibold">{formatMetricValue(avaliacao[key], unit)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkinfoldMeasurementsPanel({ avaliacao }: { avaliacao: any }) {
  const rows = SKINFOLD_FIELDS.map(({ key, label }) => {
    const values = getSkinfoldValues(avaliacao, key);
    const media = toFiniteNumber(avaliacao?.dobras_medias?.[key]) ?? average(values);
    return { key, label, values, media };
  }).filter((row) => row.values.some((value) => value !== null) || row.media !== null);

  if (rows.length === 0) {
    return null;
  }

  const maxMeasures = Math.max(1, ...rows.map((row) => row.values.length));

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Dobras cutaneas registradas</p>
          <p className="text-xs text-muted-foreground">
            Medicoes informadas no registro e media usada nos calculos.
          </p>
        </div>
        <Badge variant="outline">{rows.length} dobras</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Dobra</th>
              {Array.from({ length: maxMeasures }, (_, index) => (
                <th key={index} className="px-3 py-2 font-medium">
                  {index + 1}a medicao
                </th>
              ))}
              <th className="py-2 pl-3 text-right font-medium">Media</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{row.label}</td>
                {Array.from({ length: maxMeasures }, (_, index) => (
                  <td key={index} className="px-3 py-2 text-muted-foreground">
                    {formatMetricValue(row.values[index], "mm")}
                  </td>
                ))}
                <td className="py-2 pl-3 text-right font-semibold">
                  {formatMetricValue(row.media, "mm")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompositionForm({
  editing,
  draft,
  loading,
  themeColor,
  onDraftChange,
  onSubmit,
}: {
  editing: any | null;
  draft: CompositionDraft | null;
  loading: boolean;
  themeColor?: string;
  onDraftChange: (draft: CompositionDraft | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const didMountRef = useRef(false);
  const draftValues = editing ? {} : draft?.values ?? {};
  const medidas = editing?.dobras_medidas || {};
  const [dobrasMeasureCount, setDobrasMeasureCount] = useState(() =>
    editing ? getSkinfoldMeasureCount(editing) : draft?.dobrasMeasureCount ?? 3
  );

  const persistDraft = useCallback(() => {
    if (editing || !formRef.current) return;
    const values = getFormValues(formRef.current);
    if (!hasCompositionDraftContent(values)) {
      onDraftChange(null);
      return;
    }
    onDraftChange({
      values,
      dobrasMeasureCount,
    });
  }, [dobrasMeasureCount, editing, onDraftChange]);
  const persistDraftAfterFieldUpdate = useCallback(() => {
    window.setTimeout(persistDraft, 0);
  }, [persistDraft]);

  useEffect(() => {
    setDobrasMeasureCount(editing ? getSkinfoldMeasureCount(editing) : draft?.dobrasMeasureCount ?? 3);
  }, [draft?.dobrasMeasureCount, editing, editing?.id]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    persistDraft();
  }, [dobrasMeasureCount, persistDraft]);

  const draftValue = (name: string, fallback: string | number | null | undefined = "") => {
    if (editing) return fallback ?? "";
    return draftValues[name] ?? fallback ?? "";
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={persistDraft}
      onChange={persistDraft}
      onBlur={persistDraft}
      className="space-y-5"
    >
      <input type="hidden" name="dobras_measure_count" value={dobrasMeasureCount} />
      <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <h3 className="text-sm font-semibold">Dados gerais</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data *">
            <Input
              name="data_avaliacao"
              type="datetime-local"
              defaultValue={draftValue("data_avaliacao", formatDateTimeForInput(editing?.data_avaliacao || new Date()))}
              required
            />
          </Field>
          <Field label="Objetivo"><Input name="objetivo" defaultValue={draftValue("objetivo", editing?.objetivo || "")} /></Field>
          <Field label="Peso (kg)"><Input name="peso" type="number" step="0.1" defaultValue={draftValue("peso", editing?.peso ?? "")} /></Field>
          <Field label="Altura (m)"><Input name="altura" type="number" step="0.01" defaultValue={draftValue("altura", editing?.altura ?? "")} /></Field>
          <Field label="Idade"><Input name="idade" type="number" step="1" defaultValue={draftValue("idade", editing?.idade ?? "")} /></Field>
          <Field label="Sexo">
            <Select name="sexo_avaliacao" defaultValue={String(draftValue("sexo_avaliacao", editing?.sexo_avaliacao || ""))} onValueChange={persistDraftAfterFieldUpdate}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fase">
            <Select name="fase" defaultValue={String(draftValue("fase", editing?.fase || ""))} onValueChange={persistDraftAfterFieldUpdate}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="crianca">Crianca</SelectItem>
                <SelectItem value="adulto">Adulto</SelectItem>
                <SelectItem value="atleta">Atleta</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Etnia">
            <Select name="etnia" defaultValue={String(draftValue("etnia", editing?.etnia || ""))} onValueChange={persistDraftAfterFieldUpdate}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
              <Input name={key} type="number" step="0.1" defaultValue={draftValue(key, editing?.[key] ?? "")} />
            </Field>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Dobras cutaneas</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use mais colunas quando fizer mais de uma medicao da mesma dobra; a media sera calculada automaticamente.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDobrasMeasureCount((count) => Math.max(1, count - 1))}
              disabled={dobrasMeasureCount <= 1}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Remover coluna
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDobrasMeasureCount((count) => count + 1)}
            >
              <Plus className="mr-1 h-4 w-4" /> Adicionar coluna
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {SKINFOLD_FIELDS.map(({ key, label }) => (
            <div key={key} className="overflow-x-auto rounded-md border bg-background/60 p-2">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `minmax(140px, 1fr) repeat(${dobrasMeasureCount}, minmax(0, 110px))`,
                  minWidth: `${160 + dobrasMeasureCount * 118}px`,
                }}
              >
                <Label className="self-center text-sm">{label}</Label>
                {Array.from({ length: dobrasMeasureCount }, (_, index) => (
                  <Input
                    key={index}
                    name={`${key}_${index + 1}`}
                    type="number"
                    step="0.1"
                    placeholder={`${index + 1}a medicao`}
                    defaultValue={draftValue(`${key}_${index + 1}`, medidas?.[key]?.[index] ?? "")}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Field label="Observacoes">
        <Textarea name="observacoes" rows={3} defaultValue={draftValue("observacoes", editing?.observacoes || "")} />
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

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function MetricDelta({
  value,
  previous,
  preference,
  compact = false,
}: {
  value?: number | null;
  previous?: number | null;
  preference: DirectionPreference;
  compact?: boolean;
}) {
  const current = toFiniteNumber(value);
  const old = toFiniteNumber(previous);
  if (current === null || old === null) {
    return <span className="text-xs text-muted-foreground">{compact ? "-" : "Sem comparativo"}</span>;
  }

  const diff = round(current - old, 1) ?? 0;
  const percent = old !== 0 ? round((diff / old) * 100, 1) : null;
  const isStable = Math.abs(diff) < 0.05;
  const favorable =
    preference === "neutral" || isStable
      ? null
      : preference === "up"
      ? diff > 0
      : diff < 0;
  const Icon = isStable ? ArrowRight : diff > 0 ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "mt-1 inline-flex items-center gap-1 text-xs font-medium",
        favorable === true && "text-green-600 dark:text-green-400",
        favorable === false && "text-red-600 dark:text-red-400",
        favorable === null && "text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" />
      {isStable ? "manteve" : `${diff > 0 ? "+" : ""}${diff}`}
      {!compact && percent !== null && !isStable ? ` (${percent > 0 ? "+" : ""}${percent}%)` : ""}
    </span>
  );
}

function StatusBadge({ classification }: { classification: MetricClassification }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap text-[11px]", toneBadgeClass(classification.tone))}>
      {classification.label}
    </Badge>
  );
}

function ContextChip({ label, important = false }: { label?: string | null; important?: boolean }) {
  if (!label) return null;
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-xs",
        important
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-border bg-background/70 text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

function formatContext(value?: string | null) {
  if (!value) return "";
  return CONTEXT_LABELS[value.toLowerCase()] ?? value;
}

function toneBadgeClass(tone: ClassificationTone) {
  if (tone === "success") return "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300";
  if (tone === "info") return "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (tone === "warning") return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (tone === "danger") return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-border bg-muted/40 text-muted-foreground";
}

function toneBorderClass(tone: ClassificationTone) {
  if (tone === "warning") return "border-amber-500/45 bg-amber-500/5";
  if (tone === "danger") return "border-red-500/50 bg-red-500/5";
  if (tone === "success") return "border-green-500/35";
  if (tone === "info") return "border-sky-500/35";
  return "border-border";
}

function toneFillClass(tone: ClassificationTone) {
  if (tone === "success") return "bg-green-500";
  if (tone === "info") return "bg-sky-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "danger") return "bg-red-500";
  return "bg-muted-foreground";
}

function getLeanFatRatio(record?: any) {
  if (!record?.massa_magra || !record?.massa_gorda) return null;
  return round(record.massa_magra / record.massa_gorda, 2);
}

function toFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getFormValues(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    values[key] = String(value);
  });
  return values;
}

function readCompositionDraft(scope: string) {
  return readInterfaceMemory<CompositionDraft>({
    scope,
    version: COMPOSITION_DRAFT_VERSION,
    ttlMs: COMPOSITION_DRAFT_TTL_MS,
    hasContent: hasCompositionDraftContent,
  });
}

function persistCompositionDraft(scope: string, draft: CompositionDraft) {
  writeInterfaceMemory({
    scope,
    version: COMPOSITION_DRAFT_VERSION,
    data: draft,
    open: true,
    hasContent: hasCompositionDraftContent,
  });
}

function hasCompositionDraftContent(draft: CompositionDraft | Record<string, string>) {
  const values = "values" in draft ? draft.values : draft;
  return hasMeaningfulValues(values, COMPOSITION_DRAFT_IGNORED_FIELDS);
}

function clearCompositionDraft(scope: string) {
  clearInterfaceMemory({ scope, version: COMPOSITION_DRAFT_VERSION });
}

function getSkinfoldValues(record: any, key: string) {
  const values = Array.isArray(record?.dobras_medidas?.[key])
    ? record.dobras_medidas[key]
    : [];

  return values.map((value: unknown) => toFiniteNumber(value));
}

function getSkinfoldMeasureCount(record: any) {
  if (!record) return 3;
  const counts = SKINFOLD_FIELDS
    .map(({ key }) => getSkinfoldValues(record, key).length)
    .filter((count) => count > 0);
  return counts.length > 0 ? Math.max(1, ...counts) : 3;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hasCompositionData(record: any) {
  return Boolean(
    record.peso ||
    record.percentual_gordura ||
    record.massa_magra ||
    record.massa_gorda ||
    record.dobras_medias ||
    PERIMETRY_FIELDS.some(({ key }) => record[key] !== null && record[key] !== undefined)
  );
}
