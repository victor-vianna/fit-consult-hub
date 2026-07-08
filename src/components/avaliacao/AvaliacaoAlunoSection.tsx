import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, Camera, HeartPulse, TrendingUp, Weight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { GENERAL_FIELDS, formatMetricValue } from "@/utils/avaliacaoMetrics";
import { getFotosSignedMap } from "@/utils/fotosEvolucao";
import { formatDisplayDate } from "@/utils/dateFormat";
import { EvolucaoSection } from "./EvolucaoSection";
import {
  FotoComparativosLiberados,
  type FotoComparativoLiberado,
  type FotoEvolucaoComparacao,
} from "./FotoComparativosLiberados";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
}

export function AvaliacaoAlunoSection({ profileId, personalId, themeColor }: Props) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [fotos, setFotos] = useState<FotoEvolucaoComparacao[]>([]);
  const [comparativos, setComparativos] = useState<FotoComparativoLiberado[]>([]);
  const [selectedFoto, setSelectedFoto] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchFotosData();
  }, [profileId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("*")
      .eq("profile_id", profileId)
      .order("data_avaliacao", { ascending: false });
    setRegistros(data || []);
  };

  const fetchFotosData = async () => {
    const [{ data: fotosData }, { data: comparativosData }] = await Promise.all([
      supabase
        .from("fotos_evolucao")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .order("created_at", { ascending: false }),
      (supabase.from("foto_comparativos_liberados") as any)
        .select("id, data_antes, data_depois, titulo, observacoes, created_at")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .order("created_at", { ascending: false }),
    ]);

    const list = (fotosData as any[]) || [];
    const map = await getFotosSignedMap(list.map((foto) => foto.foto_url));
    setFotos(
      list.map((foto) => ({
        ...foto,
        foto_url: map[foto.foto_url] || foto.foto_url,
      }))
    );
    setComparativos(comparativosData || []);
  };

  const composicoes = registros.filter(hasCompositionData);
  const cardios = registros.filter((registro) => registro.cardio_tipo);
  const flexibilidade = registros.filter((registro) =>
    registro.flexibilidade_sentar_alcancar !== null ||
    registro.flexibilidade_ombro ||
    registro.flexibilidade_quadril ||
    registro.flexibilidade_tornozelo
  );

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-md">
        <CardHeader className="bg-gradient-to-r from-card to-muted/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Minhas avaliacoes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualizacao dos registros feitos pelo seu personal trainer.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="evolucao">
        <TabsList className="mb-4 inline-flex h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/50 p-1">
          <TabsTrigger value="evolucao">Evolucao</TabsTrigger>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="composicao">Composicao</TabsTrigger>
          <TabsTrigger value="cardio">Cardio</TabsTrigger>
          <TabsTrigger value="flexibilidade">Flexibilidade</TabsTrigger>
        </TabsList>

        <TabsContent value="evolucao">
          <EvolucaoSection profileId={profileId} personalId={personalId} themeColor={themeColor} />
        </TabsContent>

        <TabsContent value="fotos">
          <FotosAlunoReadOnly
            fotos={fotos}
            comparativos={comparativos}
            onView={(url) => {
              setSelectedFoto(url);
              setViewerOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="composicao">
          <ReadOnlyList
            icon={<Weight className="h-5 w-5" />}
            title="Composicao corporal"
            empty="Nenhuma avaliacao corporal registrada ainda."
            items={composicoes}
            render={(item) => <CompositionReadOnly item={item} />}
          />
        </TabsContent>

        <TabsContent value="cardio">
          <ReadOnlyList
            icon={<HeartPulse className="h-5 w-5" />}
            title="Teste cardiorrespiratorio"
            empty="Nenhum teste cardiorrespiratorio registrado ainda."
            items={cardios}
            render={(item) => <CardioReadOnly item={item} />}
          />
        </TabsContent>

        <TabsContent value="flexibilidade">
          <ReadOnlyList
            icon={<Activity className="h-5 w-5" />}
            title="Flexibilidade"
            empty="Nenhum teste de flexibilidade registrado ainda."
            items={flexibilidade}
            render={(item) => <FlexReadOnly item={item} />}
          />
        </TabsContent>
      </Tabs>

      {selectedFoto && (
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 z-10 bg-black/50 text-white hover:bg-black/70"
                onClick={() => setViewerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img src={selectedFoto} alt="Foto" className="max-h-[85vh] w-full object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function FotosAlunoReadOnly({
  fotos,
  comparativos,
  onView,
}: {
  fotos: FotoEvolucaoComparacao[];
  comparativos: FotoComparativoLiberado[];
  onView: (url: string) => void;
}) {
  const grouped = groupByAngle(fotos);

  return (
    <div className="space-y-6">
      <FotoComparativosLiberados
        fotos={fotos}
        comparativos={comparativos}
        onView={onView}
        title="Antes x depois liberados"
        emptyMessage="Seu personal trainer ainda nao disponibilizou nenhuma comparacao antes x depois."
      />

      <Card className="border-2 shadow-md">
        <CardHeader className="bg-gradient-to-r from-card to-muted/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" />
            Galeria de fotos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {fotos.length > 0 ? (
            grouped.map(({ key, label, items }) => (
              <section key={key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{label}</h4>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {items.map((foto) => (
                    <button
                      key={foto.id}
                      type="button"
                      className="group text-left"
                      onClick={() => onView(foto.foto_url)}
                    >
                      <div className="aspect-square overflow-hidden rounded-lg border-2 transition-all group-hover:border-primary">
                        <img src={foto.foto_url} alt={foto.descricao || "Foto de evolucao"} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDisplayDate(foto.data_foto || foto.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhuma foto foi adicionada ainda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnlyList({
  icon,
  title,
  empty,
  items,
  render,
}: {
  icon: ReactNode;
  title: string;
  empty: string;
  items: any[];
  render: (item: any) => ReactNode;
}) {
  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-card to-muted/20">
        <CardTitle className="flex items-center gap-2 text-lg">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length > 0 ? (
          <div className="space-y-3">{items.map((item) => <div key={item.id}>{render(item)}</div>)}</div>
        ) : (
          <div className="py-10 text-center text-muted-foreground">{empty}</div>
        )}
      </CardContent>
    </Card>
  );
}

function CompositionReadOnly({ item }: { item: any }) {
  const pending = Array.isArray(item.campos_pendentes) ? item.campos_pendentes : [];

  return (
    <Card className="border bg-card/80">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">{formatDisplayDate(item.data_avaliacao)}</h4>
          {pending.length > 0 && <Badge variant="outline">Incompleta</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {GENERAL_FIELDS.filter(({ key }) => key !== "altura").map(({ key, label, unit }) => (
            <Metric key={key} label={label} value={item[key]} unit={unit} />
          ))}
        </div>
        {item.observacoes && <p className="text-sm text-muted-foreground">{item.observacoes}</p>}
      </CardContent>
    </Card>
  );
}

function CardioReadOnly({ item }: { item: any }) {
  return (
    <Card className="border bg-card/80">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">{formatDisplayDate(item.data_avaliacao)}</h4>
          <Badge variant="secondary">{item.cardio_tipo === "teste_1600m" ? "Teste 1600m" : "Velocidade media"}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="Distancia" value={item.cardio_distancia_m} unit="m" />
          <Metric label="Velocidade" value={item.cardio_velocidade_kmh} unit="km/h" />
          <Metric label="VO2 pico" value={item.cardio_vo2_pico} unit="ml/kg/min" />
          <Metric label="MSSL" value={item.cardio_mssl_kmh} unit="km/h" />
        </div>
      </CardContent>
    </Card>
  );
}

function FlexReadOnly({ item }: { item: any }) {
  return (
    <Card className="border bg-card/80">
      <CardContent className="space-y-3 p-4">
        <h4 className="font-semibold">{formatDisplayDate(item.data_avaliacao)}</h4>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="Sentar e alcancar" value={item.flexibilidade_sentar_alcancar} unit="cm" />
          <Metric label="Ombro" value={item.flexibilidade_ombro} unit="" />
          <Metric label="Quadril" value={item.flexibilidade_quadril} unit="" />
          <Metric label="Tornozelo" value={item.flexibilidade_tornozelo} unit="" />
        </div>
      </CardContent>
    </Card>
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

function hasCompositionData(record: any) {
  return Boolean(record.peso || record.percentual_gordura || record.massa_magra || record.dobras_medias);
}

const TIPOS_FOTO: Record<string, string> = {
  frente: "Frente",
  costas: "Costas",
  lado_direito: "Lado direito",
  lado_esquerdo: "Lado esquerdo",
  outro: "Outras fotos",
};

function groupByAngle(fotos: FotoEvolucaoComparacao[]) {
  return Object.entries(TIPOS_FOTO)
    .map(([key, label]) => ({
      key,
      label,
      items: fotos.filter((foto) => foto.tipo_foto === key),
    }))
    .filter((group) => group.items.length > 0);
}
