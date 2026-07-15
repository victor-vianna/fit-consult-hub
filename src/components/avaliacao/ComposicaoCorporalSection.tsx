import { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    const [{ data: registros }, { data: profile }] = await Promise.all([
      supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("profile_id", profileId)
        .order("data_avaliacao", { ascending: false }),
      supabase.from("profiles").select("nome").eq("id", profileId).maybeSingle(),
    ]);

    setStudentName(profile?.nome || "Aluno");
    setAvaliacoes((registros || []).filter(hasCompositionData));
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

  const latest = avaliacoes[0];
  const previous = avaliacoes[1];

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
              setOpenDialog(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Nova avaliacao
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {latest ? (
          <CompositionDashboard
            avaliacao={latest}
            previous={previous}
            studentName={studentName}
            totalAssessments={avaliacoes.length}
            onEdit={() => {
              setEditing(latest);
              setOpenDialog(true);
            }}
            onDelete={() => handleDelete(latest.id)}
          />
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

      <Dialog
        open={openDialog}
        onOpenChange={(open) => {
          setOpenDialog(open);
          if (!open) setEditing(null);
        }}
      >
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

function CompositionDashboard({
  avaliacao,
  previous,
  studentName,
  totalAssessments,
  onEdit,
  onDelete,
}: {
  avaliacao: any;
  previous?: any;
  studentName: string;
  totalAssessments: number;
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

function CompositionForm({
  editing,
  loading,
  themeColor,
  onSubmit,
}: {
  editing: any | null;
  loading: boolean;
  themeColor?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const medidas = editing?.dobras_medidas || {};

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <h3 className="text-sm font-semibold">Dados gerais</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data *">
            <Input
              name="data_avaliacao"
              type="datetime-local"
              defaultValue={formatDateTimeForInput(editing?.data_avaliacao || new Date())}
              required
            />
          </Field>
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
            <Select name="fase" defaultValue={editing?.fase || ""}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="crianca">Crianca</SelectItem>
                <SelectItem value="adulto">Adulto</SelectItem>
                <SelectItem value="atleta">Atleta</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Etnia">
            <Select name="etnia" defaultValue={editing?.etnia || ""}>
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
              <Input name={key} type="number" step="0.1" defaultValue={editing?.[key] ?? ""} />
            </Field>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <h3 className="text-sm font-semibold">Dobras cutaneas</h3>
        <div className="space-y-2">
          {SKINFOLD_FIELDS.map(({ key, label }) => (
            <div
              key={key}
              className="grid gap-2 rounded-md border bg-background/60 p-2 sm:grid-cols-[1fr_repeat(3,minmax(0,110px))]"
            >
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
