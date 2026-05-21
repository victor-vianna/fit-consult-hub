import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeloVisualizacaoModal } from "@/components/ModeloVisualizacaoModal";
import { useGlobalModelosTreino } from "@/hooks/useGlobalModelosTreino";
import type { GlobalModeloPasta } from "@/hooks/useGlobalModelosTreino";
import type { ModeloPasta } from "@/hooks/useModeloPastas";
import type { ModeloTreino } from "@/hooks/useModelosTreino";
import {
  GLOBAL_RESOURCES_MIN_PLAN_LEVEL,
  usePersonalPlanFeatures,
} from "@/hooks/usePersonalPlanFeatures";
import { copyModeloTreino } from "@/utils/modeloCopies";
import {
  ArrowUp,
  BookTemplate,
  Crown,
  Lock,
  FolderOpen,
  Home,
  Loader2,
  Search,
  Star,
} from "lucide-react";

const ROOT_FOLDER_VALUE = "root";

const planLabel = (level?: number | null) => {
  if (level === 4) return "Premium";
  if (level === 3) return "Profissional";
  if (level === 2) return "Basico";
  return "Gratuito";
};

interface GlobalModelosTreinoListProps {
  personalId: string;
  pastasDestino: ModeloPasta[];
}

export function GlobalModelosTreinoList({
  personalId,
  pastasDestino,
}: GlobalModelosTreinoListProps) {
  const queryClient = useQueryClient();
  const {
    canUseGlobalModels,
    planLevel,
    loading: loadingPlan,
  } = usePersonalPlanFeatures(personalId);
  const { data, isLoading } = useGlobalModelosTreino(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [targetFolderId, setTargetFolderId] = useState(ROOT_FOLDER_VALUE);
  const [modeloVisualizando, setModeloVisualizando] =
    useState<ModeloTreino | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const pastas = data?.pastas || [];
  const modelos = data?.modelos || [];

  const currentFolder = useMemo(
    () => pastas.find((pasta) => pasta.id === currentFolderId) || null,
    [pastas, currentFolderId]
  );

  const breadcrumb = useMemo(() => {
    const trail: GlobalModeloPasta[] = [];
    let folder = currentFolder;
    while (folder) {
      trail.unshift(folder);
      folder = pastas.find((pasta) => pasta.id === folder?.parent_id) || null;
    }
    return trail;
  }, [currentFolder, pastas]);

  const subpastas = useMemo(
    () =>
      pastas
        .filter((pasta) => pasta.parent_id === currentFolderId)
        .sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
        ),
    [pastas, currentFolderId]
  );

  const modelosNaPasta = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modelos
      .filter((modelo) =>
        q
          ? [modelo.nome, modelo.categoria || "", modelo.descricao || ""].some(
              (value) => value.toLowerCase().includes(q)
            )
          : modelo.pasta_id === currentFolderId
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [modelos, currentFolderId, search]);

  const getFolderLevel = (folderId?: string | null) =>
    pastas.find((pasta) => pasta.id === folderId)?.min_plan_level || 1;

  const effectiveLevel = (modelo: ModeloTreino) =>
    Math.max(modelo.min_plan_level || 1, getFolderLevel(modelo.pasta_id));

  const salvarCopia = async (modelo: ModeloTreino) => {
    try {
      setSavingId(modelo.id);
      await copyModeloTreino({
        sourceModeloId: modelo.id,
        personalId,
        pastaId: targetFolderId === ROOT_FOLDER_VALUE ? null : targetFolderId,
        isGlobal: false,
        minPlanLevel: 1,
        sourceModeloIdForAudit: null,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["modelos-treino", personalId] }),
        queryClient.invalidateQueries({ queryKey: ["modelo-pastas", personalId] }),
      ]);
      toast.success("Copia salva nos seus modelos");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar copia do modelo global");
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading || loadingPlan) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando modelos globais...</p>
      </div>
    );
  }

  if (!canUseGlobalModels || planLevel < GLOBAL_RESOURCES_MIN_PLAN_LEVEL) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
          <div className="rounded-full bg-warning/10 p-4 text-warning">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Modelos globais bloqueados</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Este recurso esta disponivel a partir do plano Profissional.
              Atualize o plano para acessar os modelos globais de treino.
            </p>
          </div>
          <Badge variant="outline">
            Plano recomendado: {planLabel(GLOBAL_RESOURCES_MIN_PLAN_LEVEL)}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar modelos globais..."
            className="pl-9"
          />
        </div>
        <Select value={targetFolderId} onValueChange={setTargetFolderId}>
          <SelectTrigger className="sm:w-[260px]">
            <SelectValue placeholder="Salvar copia em..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROOT_FOLDER_VALUE}>Minhas pastas: raiz</SelectItem>
            {pastasDestino.map((pasta) => (
              <SelectItem key={pasta.id} value={pasta.id}>
                {pasta.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!search.trim() && (
        <Card className="overflow-hidden">
          <div className="bg-primary px-3 py-3 text-primary-foreground">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Modelos globais</p>
                <p className="text-xs text-primary-foreground/80">
                  {pastas.length} pastas, {modelos.length} modelos
                </p>
              </div>
              <Badge variant="secondary">
                <Star className="mr-1 h-3 w-3" />
                Global
              </Badge>
            </div>
          </div>

          <div className="border-b bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 overflow-x-auto text-sm">
              <Button
                variant="ghost"
                size="sm"
                className={currentFolderId === null ? "bg-background text-primary" : ""}
                onClick={() => setCurrentFolderId(null)}
              >
                <Home className="mr-1.5 h-4 w-4" />
                Raiz
              </Button>
              {breadcrumb.map((folder) => (
                <Button
                  key={folder.id}
                  variant="ghost"
                  size="sm"
                  className={folder.id === currentFolderId ? "bg-background text-primary" : ""}
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <FolderOpen className="mr-1.5 h-4 w-4" />
                  {folder.nome}
                </Button>
              ))}
            </div>
          </div>

          <CardContent className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {currentFolderId && (
              <button
                onClick={() => setCurrentFolderId(currentFolder?.parent_id || null)}
                className="flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-muted-foreground transition-all hover:bg-muted/50"
              >
                <ArrowUp className="h-8 w-8" />
                <span className="text-xs font-medium">Voltar</span>
              </button>
            )}
            {subpastas.map((folder) => {
              const locked = planLevel < (folder.min_plan_level || 1);
              return (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="relative flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-lg border bg-background p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FolderOpen className="h-12 w-12 fill-sky-100 text-sky-600" />
                  <span className="line-clamp-2 max-w-full text-xs font-semibold">
                    {folder.nome}
                  </span>
                  <Badge variant={locked ? "outline" : "secondary"} className="text-[10px]">
                    {locked ? "Upgrade" : `Plano ${planLabel(folder.min_plan_level)}`}
                  </Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {modelosNaPasta.map((modelo) => {
          const minLevel = effectiveLevel(modelo);
          const locked = planLevel < minLevel;
          return (
            <Card key={modelo.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between gap-3 text-base">
                  <span className="flex min-w-0 items-start gap-3">
                    <span className="rounded-md bg-primary/10 p-2 text-primary">
                      <BookTemplate className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{modelo.nome}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {modelo.categoria || "Modelo global"}
                      </span>
                    </span>
                  </span>
                  <Badge className="shrink-0">
                    <Star className="mr-1 h-3 w-3" />
                    Global
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={locked ? "outline" : "secondary"}>
                    {locked ? (
                      <Crown className="mr-1 h-3 w-3" />
                    ) : null}
                    Plano minimo: {planLabel(minLevel)}
                  </Badge>
                  <Badge variant="outline">
                    {(modelo.exercicios?.length || 0)} exercicios
                  </Badge>
                </div>
                {locked && (
                  <p className="text-xs text-muted-foreground">
                    Este conteudo fica visivel para navegacao, mas exige upgrade
                    para salvar uma copia.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setModeloVisualizando(modelo)}
                  >
                    Visualizar
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={locked || savingId === modelo.id}
                    onClick={() => salvarCopia(modelo)}
                  >
                    {savingId === modelo.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Salvar copia
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {modelosNaPasta.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum modelo global encontrado.
          </CardContent>
        </Card>
      )}

      <ModeloVisualizacaoModal
        modelo={modeloVisualizando}
        open={!!modeloVisualizando}
        onOpenChange={(open) => !open && setModeloVisualizando(null)}
        onAplicar={(modelo) => salvarCopia(modelo)}
        onAtualizar={async () => undefined}
        canEdit={false}
        applyLabel="Salvar copia"
      />
    </div>
  );
}
