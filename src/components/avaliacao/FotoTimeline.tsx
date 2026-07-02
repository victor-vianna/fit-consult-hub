import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeftRight, ImageIcon, MoveHorizontal, RefreshCw, Share2, Trash2 } from "lucide-react";
import { formatDisplayDate } from "@/utils/dateFormat";

interface FotoEvolucao {
  id: string;
  avaliacao_id: string | null;
  tipo_foto: string;
  foto_url: string;
  foto_nome: string;
  descricao?: string;
  data_foto?: string;
  created_at: string;
}

interface Props {
  fotos: FotoEvolucao[];
  onDelete: (foto: FotoEvolucao) => void;
  onEditDate: (foto: FotoEvolucao) => void;
  onView: (url: string) => void;
  releasedComparisons?: ReleasedPhotoComparison[];
  onReleaseComparison?: (dataAntes: string, dataDepois: string) => void;
  onRevokeComparison?: (comparisonId: string) => void;
}

export interface ReleasedPhotoComparison {
  id: string;
  data_antes: string;
  data_depois: string;
  titulo?: string | null;
  observacoes?: string | null;
}

const TIPOS_FOTO: Record<string, string> = {
  frente: "Frente",
  costas: "Costas",
  lado_direito: "Lado direito",
  lado_esquerdo: "Lado esquerdo",
  outro: "Outro",
};

const MAIN_ANGLES = ["frente", "costas", "lado_direito", "lado_esquerdo"];

function getFotoDate(foto: FotoEvolucao) {
  return foto.data_foto || foto.created_at.split("T")[0];
}

function getDateTime(date: string) {
  const time = new Date(`${date}T00:00:00`).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getElapsedLabel(beforeDate: string, afterDate: string) {
  const before = new Date(`${beforeDate}T00:00:00`);
  const after = new Date(`${afterDate}T00:00:00`);
  const diffMs = after.getTime() - before.getTime();
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays <= 0) return "mesmo dia";
  if (diffDays < 30) return `${diffDays} dia${diffDays === 1 ? "" : "s"} depois`;

  const months =
    (after.getFullYear() - before.getFullYear()) * 12 +
    (after.getMonth() - before.getMonth()) -
    (after.getDate() < before.getDate() ? 1 : 0);

  if (months < 12) {
    const safeMonths = Math.max(1, months);
    return `${safeMonths} mes${safeMonths === 1 ? "" : "es"} depois`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths <= 0) return `${years} ano${years === 1 ? "" : "s"} depois`;
  return `${years} ano${years === 1 ? "" : "s"} e ${remainingMonths} mes${remainingMonths === 1 ? "" : "es"} depois`;
}

function normalizeComparisonDates(dateA: string, dateB: string): [string, string] {
  return getDateTime(dateA) <= getDateTime(dateB) ? [dateA, dateB] : [dateB, dateA];
}

function ComparisonImage({
  foto,
  label,
  onView,
  compact = false,
}: {
  foto: FotoEvolucao;
  label: string;
  onView: (url: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-2 min-w-0" : "space-y-3 min-w-0"}>
      <div className="relative aspect-[3/4] max-h-[68vh] overflow-hidden rounded-lg border bg-muted sm:max-h-[72vh]">
        <img
          src={foto.foto_url}
          alt={label}
          className="h-full w-full cursor-zoom-in object-cover object-center"
          onClick={() => onView(foto.foto_url)}
        />
      </div>
      <p className={`text-center font-medium text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
        {label} - {formatDisplayDate(getFotoDate(foto))}
      </p>
    </div>
  );
}

export function FotoTimeline({
  fotos,
  onView,
  releasedComparisons = [],
  onReleaseComparison,
  onRevokeComparison,
}: Props) {
  const [beforeDate, setBeforeDate] = useState("");
  const [afterDate, setAfterDate] = useState("");
  const [selectedAngle, setSelectedAngle] = useState("");
  const [mode, setMode] = useState<"side-by-side" | "slider">("side-by-side");
  const [sliderValue, setSliderValue] = useState(50);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, FotoEvolucao[]> = {};
    fotos.forEach((foto) => {
      const date = getFotoDate(foto);
      if (!groups[date]) groups[date] = [];
      groups[date].push(foto);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => getDateTime(b) - getDateTime(a))
      .map(([date, photos]) => ({
        date,
        photos,
        angleSet: new Set(photos.map((photo) => photo.tipo_foto)),
      }));
  }, [fotos]);

  const dateOptions = useMemo(() => groupedByDate.map((group) => group.date), [groupedByDate]);

  useEffect(() => {
    if (dateOptions.length === 0) return;
    if (!afterDate) setAfterDate(dateOptions[0]);
    if (!beforeDate) setBeforeDate(dateOptions[Math.min(1, dateOptions.length - 1)]);
  }, [afterDate, beforeDate, dateOptions]);

  const [normalizedBeforeDate, normalizedAfterDate] = useMemo(() => {
    if (!beforeDate || !afterDate) return [beforeDate, afterDate];
    return normalizeComparisonDates(beforeDate, afterDate);
  }, [afterDate, beforeDate]);

  const beforeGroup = groupedByDate.find((group) => group.date === normalizedBeforeDate);
  const afterGroup = groupedByDate.find((group) => group.date === normalizedAfterDate);

  const commonAngles = useMemo(() => {
    if (!beforeGroup || !afterGroup) return [];
    const allAngles = Array.from(
      new Set([...Array.from(beforeGroup.angleSet), ...Array.from(afterGroup.angleSet)])
    );

    return [...MAIN_ANGLES, ...allAngles.filter((angle) => !MAIN_ANGLES.includes(angle))]
      .filter((angle) => beforeGroup.angleSet.has(angle) && afterGroup.angleSet.has(angle));
  }, [afterGroup, beforeGroup]);

  useEffect(() => {
    if (commonAngles.length === 0) {
      setSelectedAngle("");
      return;
    }
    if (!selectedAngle || !commonAngles.includes(selectedAngle)) {
      setSelectedAngle(commonAngles[0]);
    }
  }, [commonAngles, selectedAngle]);

  const beforeFoto = beforeGroup?.photos.find((foto) => foto.tipo_foto === selectedAngle);
  const afterFoto = afterGroup?.photos.find((foto) => foto.tipo_foto === selectedAngle);
  const elapsedLabel =
    normalizedBeforeDate && normalizedAfterDate
      ? getElapsedLabel(normalizedBeforeDate, normalizedAfterDate)
      : "";
  const currentReleased = releasedComparisons.find(
    (comparison) =>
      comparison.data_antes === normalizedBeforeDate &&
      comparison.data_depois === normalizedAfterDate
  );

  if (groupedByDate.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Nenhuma foto para comparar.
      </p>
    );
  }

  if (groupedByDate.length === 1) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="font-semibold">Adicione fotos de outra data</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Para comparar a evolucao, cadastre pelo menos dois momentos diferentes do aluno.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Comparar fotos</h3>
            <p className="text-sm text-muted-foreground">
              Escolha duas datas e compare o mesmo angulo lado a lado.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            setBeforeDate(normalizedAfterDate);
            setAfterDate(normalizedBeforeDate);
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Trocar fotos
        </Button>
      </div>

      {releasedComparisons.length > 0 && (
        <Card className="border bg-muted/20">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="font-semibold">Comparativos liberados para o aluno</p>
              <p className="text-sm text-muted-foreground">
                Esses pares aparecem na area do aluno ate voce revogar.
              </p>
            </div>
            <div className="space-y-2">
              {releasedComparisons.map((comparison) => (
                <div
                  key={comparison.id}
                  className="flex flex-col gap-2 rounded-lg border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {formatDisplayDate(comparison.data_antes)} x {formatDisplayDate(comparison.data_depois)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getElapsedLabel(comparison.data_antes, comparison.data_depois)}
                    </p>
                  </div>
                  {onRevokeComparison && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => onRevokeComparison(comparison.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Revogar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="bg-muted/30">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">Antes</p>
            <Select value={beforeDate} onValueChange={setBeforeDate}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a data inicial" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((date) => (
                  <SelectItem key={date} value={date}>
                    {formatDisplayDate(date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">Depois</p>
            <Select value={afterDate} onValueChange={setAfterDate}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a data final" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((date) => (
                  <SelectItem key={date} value={date}>
                    {formatDisplayDate(date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {elapsedLabel && (
              <p className="text-sm font-medium">
                {formatDisplayDate(normalizedAfterDate)} - {elapsedLabel}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {commonAngles.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {commonAngles.map((angle) => (
            <Button
              key={angle}
              type="button"
              variant={selectedAngle === angle ? "default" : "secondary"}
              className="flex-shrink-0 rounded-full"
              onClick={() => setSelectedAngle(angle)}
            >
              {TIPOS_FOTO[angle] ?? angle}
            </Button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          As duas datas escolhidas nao possuem fotos do mesmo angulo. Troque uma das datas para comparar.
        </div>
      )}

      {beforeFoto && afterFoto && (
        <>
          {onReleaseComparison && (
            <div className="flex justify-end">
              {currentReleased ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => onRevokeComparison?.(currentReleased.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Revogar comparativo do aluno
                </Button>
              ) : (
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => onReleaseComparison(normalizedBeforeDate, normalizedAfterDate)}
                >
                  <Share2 className="h-4 w-4" />
                  Liberar comparativo para o aluno
                </Button>
              )}
            </div>
          )}

          {mode === "side-by-side" ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <ComparisonImage
                foto={beforeFoto}
                label={TIPOS_FOTO[selectedAngle] ?? selectedAngle}
                onView={onView}
                compact
              />
              <ComparisonImage
                foto={afterFoto}
                label={TIPOS_FOTO[selectedAngle] ?? selectedAngle}
                onView={onView}
                compact
              />
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-4">
              <div className="relative aspect-[3/4] max-h-[75vh] overflow-hidden rounded-lg border bg-muted md:aspect-[4/5]">
                <img
                  src={beforeFoto.foto_url}
                  alt="Antes"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div
                  className="absolute inset-0"
                  style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                >
                  <img
                    src={afterFoto.foto_url}
                    alt="Depois"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                </div>
                <div
                  className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
                  style={{ left: `${sliderValue}%` }}
                >
                  <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow">
                    <MoveHorizontal className="h-5 w-5" />
                  </div>
                </div>
                <Badge className="absolute left-3 top-3 bg-background/90 text-foreground">Depois</Badge>
                <Badge className="absolute right-3 top-3 bg-background/90 text-foreground">Antes</Badge>
              </div>
              <Slider
                value={[sliderValue]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setSliderValue(value[0] ?? 50)}
              />
            </div>
          )}

          <div className="flex justify-center gap-3">
            <Button
              variant={mode === "side-by-side" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setMode("side-by-side")}
            >
              <ImageIcon className="h-4 w-4" />
              Lado a lado
            </Button>
            <Button
              variant={mode === "slider" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setMode("slider")}
            >
              <MoveHorizontal className="h-4 w-4" />
              Deslizar
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            Fotos exibidas em uma moldura padronizada com recorte central para manter altura,
            proporcao e enquadramento visual semelhantes entre os dois periodos.
          </div>
        </>
      )}
    </div>
  );
}
