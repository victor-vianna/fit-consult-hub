import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ImageIcon, MoveHorizontal } from "lucide-react";
import { formatDisplayDate } from "@/utils/dateFormat";

export interface FotoComparativoLiberado {
  id: string;
  data_antes: string;
  data_depois: string;
  titulo?: string | null;
  observacoes?: string | null;
}

export interface FotoEvolucaoComparacao {
  id: string;
  avaliacao_id: string | null;
  tipo_foto: string;
  foto_url: string;
  foto_nome: string;
  descricao?: string | null;
  data_foto?: string | null;
  created_at: string;
}

interface Props {
  fotos: FotoEvolucaoComparacao[];
  comparativos: FotoComparativoLiberado[];
  onView: (url: string) => void;
  emptyMessage?: string;
  title?: string;
}

const TIPOS_FOTO: Record<string, string> = {
  frente: "Frente",
  costas: "Costas",
  lado_direito: "Lado direito",
  lado_esquerdo: "Lado esquerdo",
  outro: "Outro",
};

const MAIN_ANGLES = ["frente", "costas", "lado_direito", "lado_esquerdo"];

export function FotoComparativosLiberados({
  fotos,
  comparativos,
  onView,
  emptyMessage = "Nenhum comparativo foi liberado ainda.",
  title = "Comparativos liberados",
}: Props) {
  const groupedByDate = useMemo(() => groupPhotosByDate(fotos), [fotos]);

  if (comparativos.length === 0) {
    return (
      <Card className="border bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {comparativos.map((comparativo) => (
        <ReleasedComparisonCard
          key={comparativo.id}
          comparativo={comparativo}
          groupedByDate={groupedByDate}
          onView={onView}
        />
      ))}
    </div>
  );
}

function ReleasedComparisonCard({
  comparativo,
  groupedByDate,
  onView,
}: {
  comparativo: FotoComparativoLiberado;
  groupedByDate: PhotoDateGroup[];
  onView: (url: string) => void;
}) {
  const [selectedAngle, setSelectedAngle] = useState("");
  const [mode, setMode] = useState<"side-by-side" | "slider">("side-by-side");
  const [sliderValue, setSliderValue] = useState(50);

  const beforeGroup = groupedByDate.find((group) => group.date === comparativo.data_antes);
  const afterGroup = groupedByDate.find((group) => group.date === comparativo.data_depois);

  const commonAngles = useMemo(() => {
    if (!beforeGroup || !afterGroup) return [];
    const allAngles = Array.from(new Set([...Array.from(beforeGroup.angleSet), ...Array.from(afterGroup.angleSet)]));
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

  return (
    <Card className="border bg-card/80">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold">
              {comparativo.titulo || "Antes x depois"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDisplayDate(comparativo.data_antes)} x {formatDisplayDate(comparativo.data_depois)}
            </p>
          </div>
          <Badge variant="secondary">{getElapsedLabel(comparativo.data_antes, comparativo.data_depois)}</Badge>
        </div>

        {comparativo.observacoes && <p className="text-sm text-muted-foreground">{comparativo.observacoes}</p>}

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
            Esse comparativo nao possui fotos do mesmo angulo nas duas datas.
          </div>
        )}

        {beforeFoto && afterFoto && (
          <>
            {mode === "side-by-side" ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <ComparisonImage foto={beforeFoto} label="Antes" onView={onView} />
                <ComparisonImage foto={afterFoto} label="Depois" onView={onView} />
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-4">
                <div className="relative aspect-[3/4] max-h-[75vh] overflow-hidden rounded-lg border bg-muted md:aspect-[4/5]">
                  <img src={beforeFoto.foto_url} alt="Antes" className="absolute inset-0 h-full w-full object-cover object-center" />
                  <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}>
                    <img src={afterFoto.foto_url} alt="Depois" className="absolute inset-0 h-full w-full object-cover object-center" />
                  </div>
                  <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]" style={{ left: `${sliderValue}%` }}>
                    <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow">
                      <MoveHorizontal className="h-5 w-5" />
                    </div>
                  </div>
                  <Badge className="absolute left-3 top-3 bg-background/90 text-foreground">Depois</Badge>
                  <Badge className="absolute right-3 top-3 bg-background/90 text-foreground">Antes</Badge>
                </div>
                <Slider value={[sliderValue]} min={0} max={100} step={1} onValueChange={(value) => setSliderValue(value[0] ?? 50)} />
              </div>
            )}

            <div className="flex justify-center gap-3">
              <Button variant={mode === "side-by-side" ? "default" : "outline"} className="gap-2" onClick={() => setMode("side-by-side")}>
                <ImageIcon className="h-4 w-4" />
                Lado a lado
              </Button>
              <Button variant={mode === "slider" ? "default" : "outline"} className="gap-2" onClick={() => setMode("slider")}>
                <MoveHorizontal className="h-4 w-4" />
                Deslizar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonImage({
  foto,
  label,
  onView,
}: {
  foto: FotoEvolucaoComparacao;
  label: string;
  onView: (url: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="relative aspect-[3/4] max-h-[68vh] overflow-hidden rounded-lg border bg-muted sm:max-h-[72vh]">
        <img
          src={foto.foto_url}
          alt={label}
          className="h-full w-full cursor-zoom-in object-cover object-center"
          onClick={() => onView(foto.foto_url)}
        />
      </div>
      <p className="text-center text-xs font-medium text-muted-foreground">
        {label} - {TIPOS_FOTO[foto.tipo_foto] ?? foto.tipo_foto}
      </p>
    </div>
  );
}

type PhotoDateGroup = {
  date: string;
  photos: FotoEvolucaoComparacao[];
  angleSet: Set<string>;
};

function groupPhotosByDate(fotos: FotoEvolucaoComparacao[]): PhotoDateGroup[] {
  const groups: Record<string, FotoEvolucaoComparacao[]> = {};
  fotos.forEach((foto) => {
    const date = getFotoDate(foto);
    if (!groups[date]) groups[date] = [];
    groups[date].push(foto);
  });

  return Object.entries(groups).map(([date, photos]) => ({
    date,
    photos,
    angleSet: new Set(photos.map((photo) => photo.tipo_foto)),
  }));
}

function getFotoDate(foto: FotoEvolucaoComparacao) {
  return foto.data_foto || foto.created_at.split("T")[0];
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
