import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderExplorer } from "@/components/modelos/FolderExplorer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { copyModeloTreino } from "@/utils/modeloCopies";
import {
  BookTemplate,
  CheckCircle,
  Dumbbell,
  Eye,
  Folder,
  FolderPlus,
  Loader2,
  Search,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";

type ExerciseRow = {
  id: string;
  nome: string;
  grupo_muscular: string | null;
  equipamento?: string | null;
  nivel_dificuldade?: string | null;
  created_by: string | null;
  is_global: boolean;
  created_at: string | null;
};

type ModelRow = {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  personal_id: string | null;
  pasta_id?: string | null;
  is_global: boolean;
  min_plan_level?: number | null;
  source_modelo_id?: string | null;
  created_at: string | null;
  has_exercises?: boolean;
  exercicios?: any[];
  blocos?: any[];
};

type GlobalFolder = {
  id: string;
  personal_id: string;
  nome: string;
  cor: string;
  ordem: number;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  nivel: number;
  caminho: string | null;
  tag?: string | null;
  is_global?: boolean;
  min_plan_level?: number | null;
};

const PLAN_LEVELS = [
  { value: 1, label: "Gratuito" },
  { value: 2, label: "Basico" },
  { value: 3, label: "Profissional" },
  { value: 4, label: "Premium" },
];

const ROOT_FOLDER_VALUE = "root";

export default function ConteudosGlobaisSection() {
  const { toast } = useToast();
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [modelFolders, setModelFolders] = useState<GlobalFolder[]>([]);
  const [globalFolders, setGlobalFolders] = useState<GlobalFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState<"exercicios" | "modelos" | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [exerciseTab, setExerciseTab] = useState("promover");
  const [modelTab, setModelTab] = useState("promover");
  const [modelFolderId, setModelFolderId] = useState(ROOT_FOLDER_VALUE);
  const [modelMinPlanLevel, setModelMinPlanLevel] = useState("2");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState(ROOT_FOLDER_VALUE);
  const [newFolderMinLevel, setNewFolderMinLevel] = useState("2");
  const [currentGlobalFolderId, setCurrentGlobalFolderId] = useState<string | null>(
    null
  );
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseGroup, setNewExerciseGroup] = useState("outro");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedGlobalModelIds, setSelectedGlobalModelIds] = useState<string[]>(
    []
  );
  const [previewModel, setPreviewModel] = useState<ModelRow | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);

      const [
        { data: exercisesData, error: exercisesError },
        { data: modelsData, error: modelsError },
        { data: foldersData, error: foldersError },
        { data: allFoldersData, error: allFoldersError },
        { data: modelExercisesData, error: modelExercisesError },
      ] = await Promise.all([
        (supabase as any)
          .from("exercises_library")
          .select("*")
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("treino_modelos")
          .select("*")
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("modelo_pastas")
          .select("*")
          .eq("is_global", true)
          .order("ordem", { ascending: true }),
        (supabase as any)
          .from("modelo_pastas")
          .select("*")
          .order("nome", { ascending: true }),
        (supabase as any)
          .from("treino_modelo_exercicios")
          .select("modelo_id"),
      ]);

      if (exercisesError) throw exercisesError;
      if (modelsError) throw modelsError;
      if (foldersError) throw foldersError;
      if (allFoldersError) throw allFoldersError;
      if (modelExercisesError) throw modelExercisesError;

      const modelIdsWithExercises = new Set(
        (modelExercisesData || [])
          .map((item: any) => item.modelo_id)
          .filter(Boolean)
      );

      setExercises(
        (exercisesData || []).map((item: any) => ({
          ...item,
          is_global: Boolean(item.is_global),
        }))
      );
      setModels(
        (modelsData || []).map((item: any) => ({
          ...item,
          is_global: Boolean(item.is_global),
          min_plan_level: item.min_plan_level ?? 1,
          has_exercises: modelIdsWithExercises.has(item.id),
        }))
      );
      setGlobalFolders(
        (foldersData || []).map((item: any) => ({
          ...item,
          cor: item.cor || "#3b82f6",
          ordem: item.ordem ?? 0,
          nivel: item.nivel ?? 0,
          min_plan_level: item.min_plan_level ?? 1,
        }))
      );
      setModelFolders(
        (allFoldersData || []).map((item: any) => ({
          ...item,
          cor: item.cor || "#3b82f6",
          ordem: item.ordem ?? 0,
          nivel: item.nivel ?? 0,
          min_plan_level: item.min_plan_level ?? 1,
        }))
      );
    } catch (error: any) {
      toast({
        title: "Erro ao carregar conteudos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const availableExercises = useMemo(
    () =>
      exercises
        .filter((item) => !item.is_global)
        .filter((item) => matchesSearch([item.nome, item.grupo_muscular], normalizedSearch)),
    [exercises, normalizedSearch]
  );
  const globalExercises = useMemo(
    () =>
      exercises
        .filter((item) => item.is_global)
        .filter((item) => matchesSearch([item.nome, item.grupo_muscular], normalizedSearch)),
    [exercises, normalizedSearch]
  );
  const sourceModels = useMemo(
    () =>
      models
        .filter((item) => !item.is_global)
        .filter((item) => item.has_exercises)
        .filter((item) => matchesSearch([item.nome, item.categoria], normalizedSearch)),
    [models, normalizedSearch]
  );
  const globalModels = useMemo(
    () =>
      models
        .filter((item) => item.is_global)
        .filter((item) => matchesSearch([item.nome, item.categoria], normalizedSearch)),
    [models, normalizedSearch]
  );

  const activeExerciseList =
    exerciseTab === "globais" ? globalExercises : availableExercises;
  const activeExerciseIds = activeExerciseList.map((item) => item.id);
  const allActiveExercisesSelected =
    activeExerciseIds.length > 0 &&
    activeExerciseIds.every((id) => selectedExerciseIds.includes(id));
  const sourceModelIds = sourceModels.map((item) => item.id);
  const allSourceModelsSelected =
    sourceModelIds.length > 0 &&
    sourceModelIds.every((id) => selectedModelIds.includes(id));
  const globalModelIds = globalModels.map((item) => item.id);
  const allGlobalModelsSelected =
    globalModelIds.length > 0 &&
    globalModelIds.every((id) => selectedGlobalModelIds.includes(id));

  const toggleExerciseSelection = (id: string) => {
    setSelectedExerciseIds((current) => toggleId(current, id));
  };

  const toggleModelSelection = (id: string) => {
    setSelectedModelIds((current) => toggleId(current, id));
  };

  const toggleGlobalModelSelection = (id: string) => {
    setSelectedGlobalModelIds((current) => toggleId(current, id));
  };

  const toggleAllActiveExercises = () => {
    setSelectedExerciseIds((current) =>
      allActiveExercisesSelected
        ? current.filter((id) => !activeExerciseIds.includes(id))
        : Array.from(new Set([...current, ...activeExerciseIds]))
    );
  };

  const toggleAllSourceModels = () => {
    setSelectedModelIds((current) =>
      allSourceModelsSelected
        ? current.filter((id) => !sourceModelIds.includes(id))
        : Array.from(new Set([...current, ...sourceModelIds]))
    );
  };

  const toggleAllGlobalModels = () => {
    setSelectedGlobalModelIds((current) =>
      allGlobalModelsSelected
        ? current.filter((id) => !globalModelIds.includes(id))
        : Array.from(new Set([...current, ...globalModelIds]))
    );
  };

  const getFolderPath = (folderId?: string | null) => {
    if (!folderId) return "Sem pasta";

    const trail: string[] = [];
    let folder = modelFolders.find((item) => item.id === folderId) || null;

    while (folder) {
      trail.unshift(folder.nome);
      folder = modelFolders.find((item) => item.id === folder?.parent_id) || null;
    }

    return trail.length > 0 ? trail.join(" / ") : "Pasta nao encontrada";
  };

  const openModelPreview = async (model: ModelRow) => {
    try {
      setPreviewLoading(true);
      setPreviewModel({ ...model, exercicios: [], blocos: [] });

      const [{ data: exercicios, error: exerciciosError }, { data: blocos, error: blocosError }] =
        await Promise.all([
          (supabase as any)
            .from("treino_modelo_exercicios")
            .select("*")
            .eq("modelo_id", model.id)
            .order("ordem", { ascending: true }),
          (supabase as any)
            .from("treino_modelo_blocos")
            .select("*")
            .eq("modelo_id", model.id)
            .order("ordem", { ascending: true }),
        ]);

      if (exerciciosError) throw exerciciosError;
      if (blocosError) throw blocosError;

      setPreviewModel({
        ...model,
        exercicios: exercicios || [],
        blocos: blocos || [],
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar modelo",
        description: error.message,
        variant: "destructive",
      });
      setPreviewModel(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const updateSelectedExercisesGlobal = async (isGlobal: boolean) => {
    const ids = selectedExerciseIds.filter((id) => activeExerciseIds.includes(id));
    if (ids.length === 0) return;

    try {
      setBulkSaving("exercicios");
      const { error } = await (supabase as any)
        .from("exercises_library")
        .update({ is_global: isGlobal })
        .in("id", ids);

      if (error) throw error;

      toast({
        title: isGlobal
          ? "Exercicios promovidos"
          : "Exercicios removidos dos globais",
        description: `${ids.length} item(ns) atualizados.`,
      });
      setSelectedExerciseIds([]);
      await fetchContent();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar exercicios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkSaving(null);
    }
  };

  const promoteSelectedModels = async () => {
    if (selectedModelIds.length === 0) return;

    try {
      setBulkSaving("modelos");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("Usuario admin nao identificado.");
      }

      const targetFolderId =
        modelFolderId === ROOT_FOLDER_VALUE ? null : modelFolderId;
      const minLevel = Number(modelMinPlanLevel) || 1;

      for (const sourceModeloId of selectedModelIds) {
        await copyModeloTreino({
          sourceModeloId,
          personalId: user.id,
          pastaId: targetFolderId,
          isGlobal: true,
          minPlanLevel: minLevel,
          sourceModeloIdForAudit: sourceModeloId,
        });
      }

      toast({
        title: "Modelos promovidos",
        description: `${selectedModelIds.length} copia(s) globais criadas sem alterar os originais.`,
      });
      setSelectedModelIds([]);
      await fetchContent();
    } catch (error: any) {
      toast({
        title: "Erro ao promover modelos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkSaving(null);
    }
  };

  const deleteGlobalModels = async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      setBulkSaving("modelos");
      await Promise.all(
        ids.map(async (id) => {
          await (supabase as any).from("treino_modelo_exercicios").delete().eq("modelo_id", id);
          await (supabase as any).from("treino_modelo_blocos").delete().eq("modelo_id", id);
          const { error } = await (supabase as any)
            .from("treino_modelos")
            .delete()
            .eq("id", id)
            .eq("is_global", true);
          if (error) throw error;
        })
      );

      toast({
        title: "Modelos globais removidos",
        description: `${ids.length} copia(s) global(is) removidas. Os modelos originais permanecem intactos.`,
      });
      setSelectedGlobalModelIds([]);
      await fetchContent();
    } catch (error: any) {
      toast({
        title: "Erro ao remover modelos globais",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkSaving(null);
    }
  };

  const updateGlobalModel = async (
    modelId: string,
    changes: Partial<Pick<ModelRow, "pasta_id" | "min_plan_level">>
  ) => {
    try {
      setSavingId(modelId);
      const { error } = await (supabase as any)
        .from("treino_modelos")
        .update(changes)
        .eq("id", modelId)
        .eq("is_global", true);

      if (error) throw error;
      await fetchContent();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar modelo global",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const createGlobalFolder = async (override?: {
    nome?: string;
    parent_id?: string | null;
    min_plan_level?: number;
  }) => {
    const nome = (override?.nome ?? newFolderName).trim();
    if (!nome) return;

    try {
      setSavingId("new-global-folder");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) throw new Error("Usuario admin nao identificado.");

      const parentId =
        override?.parent_id !== undefined
          ? override.parent_id
          : newFolderParentId === ROOT_FOLDER_VALUE
            ? null
            : newFolderParentId;
      const minPlanLevel =
        override?.min_plan_level ?? Number(newFolderMinLevel) ?? 1;

      const siblingCount = globalFolders.filter(
        (folder) =>
          folder.parent_id === parentId
      ).length;

      const { error } = await (supabase as any).from("modelo_pastas").insert({
        personal_id: user.id,
        nome,
        cor: "#3b82f6",
        ordem: siblingCount + 1,
        parent_id: parentId,
        is_global: true,
        min_plan_level: minPlanLevel || 1,
      });

      if (error) throw error;

      toast({ title: "Pasta global criada" });
      setNewFolderName("");
      setNewFolderParentId(ROOT_FOLDER_VALUE);
      await fetchContent();
    } catch (error: any) {
      toast({
        title: "Erro ao criar pasta global",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const updateGlobalFolder = async (
    folderId: string,
    changes: Partial<GlobalFolder>
  ) => {
    try {
      setSavingId(folderId);
      const { error } = await (supabase as any)
        .from("modelo_pastas")
        .update(changes)
        .eq("id", folderId)
        .eq("is_global", true);

      if (error) throw error;
      await fetchContent();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar pasta global",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const deleteGlobalFolder = async (folderId: string) => {
    const { error } = await (supabase as any)
      .from("modelo_pastas")
      .delete()
      .eq("id", folderId)
      .eq("is_global", true);
    if (error) throw error;
    await fetchContent();
  };

  const createGlobalExercise = async () => {
    const nome = newExerciseName.trim();
    const grupo = newExerciseGroup.trim() || "outro";

    if (!nome) {
      toast({
        title: "Nome obrigatorio",
        description: "Informe um nome para criar o exercicio global.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingId("new-global-exercise");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await (supabase as any)
        .from("exercises_library")
        .insert({
          nome,
          grupo_muscular: grupo,
          created_by: user?.id || null,
          is_global: true,
        });

      if (error) throw error;

      toast({
        title: "Exercicio global criado",
        description: `${nome} foi adicionado a biblioteca global.`,
      });
      setNewExerciseName("");
      setNewExerciseGroup("outro");
      await fetchContent();
    } catch (error: any) {
      toast({
        title: "Erro ao criar exercicio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">Carregando conteudos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conteudos Globais</h1>
        <p className="text-sm text-muted-foreground">
          Curadoria separada entre itens disponiveis para promocao e itens que
          ja pertencem ao espaco global.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Exercicios para promover" value={availableExercises.length} />
        <Metric label="Exercicios globais" value={globalExercises.length} />
        <Metric label="Modelos para promover" value={sourceModels.length} />
        <Metric label="Modelos globais" value={globalModels.length} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, categoria ou grupo muscular..."
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="modelos">
        <TabsList>
          <TabsTrigger value="modelos">Modelos de Treino</TabsTrigger>
          <TabsTrigger value="exercicios">Biblioteca de Exercicios</TabsTrigger>
        </TabsList>

        <TabsContent value="modelos" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pastas globais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
                <Input
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  placeholder="Nome da pasta global"
                />
                <FolderSelect
                  value={newFolderParentId}
                  folders={globalFolders}
                  onValueChange={setNewFolderParentId}
                  rootLabel="Raiz global"
                />
                <PlanLevelSelect
                  value={newFolderMinLevel}
                  onValueChange={setNewFolderMinLevel}
                />
                <Button
                  onClick={() => createGlobalFolder()}
                  disabled={savingId === "new-global-folder"}
                >
                  {savingId === "new-global-folder" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FolderPlus className="mr-2 h-4 w-4" />
                  )}
                  Criar pasta
                </Button>
              </div>

              <FolderExplorer
                pastas={globalFolders as any}
                modelos={globalModels as any}
                currentFolderId={currentGlobalFolderId}
                onNavigate={setCurrentGlobalFolderId}
                onCreateFolder={async (dados) => {
                  await createGlobalFolder({
                    nome: dados.nome,
                    parent_id: dados.parent_id || null,
                    min_plan_level: Number(newFolderMinLevel) || 1,
                  });
                }}
                onRenameFolder={(id, dados) => updateGlobalFolder(id, dados as any)}
                onDeleteFolder={deleteGlobalFolder}
              />

              {globalFolders.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2">
                  {globalFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{folder.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Nivel minimo da pasta
                        </p>
                      </div>
                      <PlanLevelSelect
                        value={String(folder.min_plan_level || 1)}
                        onValueChange={(value) =>
                          updateGlobalFolder(folder.id, {
                            min_plan_level: Number(value),
                          })
                        }
                        disabled={savingId === folder.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs value={modelTab} onValueChange={setModelTab}>
            <TabsList>
              <TabsTrigger value="promover">Modelos para promover</TabsTrigger>
              <TabsTrigger value="globais">Modelos ja globais</TabsTrigger>
            </TabsList>

            <TabsContent value="promover" className="mt-4 space-y-4">
              <Card>
                <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_220px_180px_auto]">
                  <div>
                    <Label className="text-xs">Destino global</Label>
                    <FolderSelect
                      value={modelFolderId}
                      folders={globalFolders}
                      onValueChange={setModelFolderId}
                      rootLabel="Raiz global"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Plano minimo</Label>
                    <PlanLevelSelect
                      value={modelMinPlanLevel}
                      onValueChange={setModelMinPlanLevel}
                    />
                  </div>
                  <div className="flex items-end">
                    <Badge variant="outline" className="mb-2">
                      Copia independente
                    </Badge>
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      disabled={selectedModelIds.length === 0 || bulkSaving === "modelos"}
                      onClick={promoteSelectedModels}
                    >
                      {bulkSaving === "modelos" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Promover selecionados
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <BulkSelectionBar
                label="modelos visiveis"
                totalVisible={sourceModels.length}
                selectedCount={selectedModelIds.length}
                allSelected={allSourceModelsSelected}
                disabled={bulkSaving === "modelos"}
                onToggleAll={toggleAllSourceModels}
                primaryLabel="Promover selecionados"
                onPrimary={promoteSelectedModels}
              />
              <ContentGrid emptyLabel="Nenhum modelo disponivel para promocao.">
                {sourceModels.map((model) => (
                  <SourceModelCard
                    key={model.id}
                    model={model}
                    checked={selectedModelIds.includes(model.id)}
                    onCheckedChange={() => toggleModelSelection(model.id)}
                    folderPath={getFolderPath(model.pasta_id)}
                    onPreview={() => openModelPreview(model)}
                  />
                ))}
              </ContentGrid>
            </TabsContent>

            <TabsContent value="globais" className="mt-4 space-y-4">
              <BulkSelectionBar
                label="modelos globais visiveis"
                totalVisible={globalModels.length}
                selectedCount={selectedGlobalModelIds.length}
                allSelected={allGlobalModelsSelected}
                disabled={bulkSaving === "modelos"}
                onToggleAll={toggleAllGlobalModels}
                primaryLabel="Remover selecionados"
                onPrimary={() => deleteGlobalModels(selectedGlobalModelIds)}
                destructive
              />
              <ContentGrid emptyLabel="Nenhum modelo global criado.">
                {globalModels.map((model) => (
                  <GlobalModelCard
                    key={model.id}
                    model={model}
                    folders={globalFolders}
                    checked={selectedGlobalModelIds.includes(model.id)}
                    saving={savingId === model.id}
                    onCheckedChange={() => toggleGlobalModelSelection(model.id)}
                    onFolderChange={(folderId) =>
                      updateGlobalModel(model.id, {
                        pasta_id:
                          folderId === ROOT_FOLDER_VALUE ? null : folderId,
                      })
                    }
                    onLevelChange={(level) =>
                      updateGlobalModel(model.id, {
                        min_plan_level: Number(level),
                      })
                    }
                    onDelete={() => deleteGlobalModels([model.id])}
                  />
                ))}
              </ContentGrid>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="exercicios" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criar exercicio global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <Input
                  value={newExerciseName}
                  onChange={(event) => setNewExerciseName(event.target.value)}
                  placeholder="Nome do exercicio"
                />
                <Input
                  value={newExerciseGroup}
                  onChange={(event) => setNewExerciseGroup(event.target.value)}
                  placeholder="Grupo muscular"
                />
                <Button
                  onClick={createGlobalExercise}
                  disabled={savingId === "new-global-exercise"}
                >
                  {savingId === "new-global-exercise" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Criar global
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs
            value={exerciseTab}
            onValueChange={(value) => {
              setExerciseTab(value);
              setSelectedExerciseIds([]);
            }}
          >
            <TabsList>
              <TabsTrigger value="promover">Exercicios para promover</TabsTrigger>
              <TabsTrigger value="globais">Exercicios ja globais</TabsTrigger>
            </TabsList>

            <TabsContent value="promover" className="mt-4">
              <BulkSelectionBar
                label="exercicios visiveis"
                totalVisible={availableExercises.length}
                selectedCount={selectedExerciseIds.length}
                allSelected={allActiveExercisesSelected}
                disabled={bulkSaving === "exercicios"}
                onToggleAll={toggleAllActiveExercises}
                primaryLabel="Promover selecionados"
                onPrimary={() => updateSelectedExercisesGlobal(true)}
              />
              <ExerciseGrid
                exercises={availableExercises}
                selectedIds={selectedExerciseIds}
                onToggle={toggleExerciseSelection}
                emptyLabel="Nenhum exercicio disponivel para promocao."
              />
            </TabsContent>

            <TabsContent value="globais" className="mt-4">
              <BulkSelectionBar
                label="exercicios globais visiveis"
                totalVisible={globalExercises.length}
                selectedCount={selectedExerciseIds.length}
                allSelected={allActiveExercisesSelected}
                disabled={bulkSaving === "exercicios"}
                onToggleAll={toggleAllActiveExercises}
                primaryLabel="Remover selecionados"
                onPrimary={() => updateSelectedExercisesGlobal(false)}
                destructive
              />
              <ExerciseGrid
                exercises={globalExercises}
                selectedIds={selectedExerciseIds}
                onToggle={toggleExerciseSelection}
                emptyLabel="Nenhum exercicio global cadastrado."
                global
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <ModelPreviewDialog
        model={previewModel}
        folderPath={getFolderPath(previewModel?.pasta_id)}
        loading={previewLoading}
        selected={previewModel ? selectedModelIds.includes(previewModel.id) : false}
        onOpenChange={(open) => !open && setPreviewModel(null)}
        onToggleSelected={() => {
          if (previewModel) toggleModelSelection(previewModel.id);
        }}
      />
    </div>
  );
}

function matchesSearch(values: Array<string | null | undefined>, q: string) {
  if (!q) return true;
  return values.some((value) => (value || "").toLowerCase().includes(q));
}

function toggleId(current: string[], id: string) {
  return current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function FolderSelect({
  value,
  folders,
  onValueChange,
  rootLabel,
}: {
  value: string;
  folders: GlobalFolder[];
  onValueChange: (value: string) => void;
  rootLabel: string;
}) {
  const sortedFolders = [...folders].sort((a, b) =>
    getFolderPathFromList(folders, a.id).localeCompare(
      getFolderPathFromList(folders, b.id),
      "pt-BR",
      { sensitivity: "base" }
    )
  );

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="min-w-0">
        <SelectValue placeholder={rootLabel} />
      </SelectTrigger>
      <SelectContent className="max-h-[320px]">
        <SelectItem value={ROOT_FOLDER_VALUE} textValue={rootLabel}>
          <span className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            {rootLabel}
          </span>
        </SelectItem>
        {sortedFolders.map((folder) => {
          const path = getFolderPathFromList(folders, folder.id);
          const parentPath = getParentPath(path);

          return (
          <SelectItem key={folder.id} value={folder.id} textValue={folder.nome}>
            <div className="flex min-w-0 items-center gap-2 py-1">
              <Folder className="h-4 w-4 shrink-0 text-sky-500" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{folder.nome}</p>
                {parentPath && (
                  <p className="max-w-[320px] truncate text-xs text-muted-foreground">
                    {parentPath}
                  </p>
                )}
              </div>
            </div>
          </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function getFolderPathFromList(folders: GlobalFolder[], folderId?: string | null) {
  if (!folderId) return "";

  const trail: string[] = [];
  let folder = folders.find((item) => item.id === folderId) || null;
  const visited = new Set<string>();

  while (folder && !visited.has(folder.id)) {
    visited.add(folder.id);
    trail.unshift(folder.nome);
    folder = folders.find((item) => item.id === folder?.parent_id) || null;
  }

  return trail.join(" / ");
}

function getParentPath(path: string) {
  const parts = path.split(" / ").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join(" / ");
}

function FolderPathPill({ path }: { path: string }) {
  const parts = path.split(" / ").filter(Boolean);
  const folderName = parts.at(-1) || path || "Sem pasta";
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join(" / ") : "";

  return (
    <Badge
      variant="secondary"
      className="max-w-full gap-1"
      title={path}
    >
      <Folder className="h-3 w-3 shrink-0" />
      <span className="truncate">{folderName}</span>
      {parentPath && (
        <span className="hidden max-w-[220px] truncate text-muted-foreground md:inline">
          em {parentPath}
        </span>
      )}
    </Badge>
  );
}

function PlanLevelSelect({
  value,
  onValueChange,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PLAN_LEVELS.map((plan) => (
          <SelectItem key={plan.value} value={String(plan.value)}>
            {plan.value} - {plan.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BulkSelectionBar({
  label,
  totalVisible,
  selectedCount,
  allSelected,
  disabled,
  onToggleAll,
  primaryLabel,
  onPrimary,
  destructive,
}: {
  label: string;
  totalVisible: number;
  selectedCount: number;
  allSelected: boolean;
  disabled: boolean;
  onToggleAll: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  destructive?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
          disabled={totalVisible === 0 || disabled}
        />
        Selecionar todos os {label}
        <Badge variant="secondary">{totalVisible}</Badge>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {selectedCount} selecionado(s)
        </span>
        <Button
          variant={destructive ? "destructive" : "default"}
          size="sm"
          disabled={selectedCount === 0 || disabled}
          onClick={onPrimary}
        >
          {disabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}

function ContentGrid({
  children,
  emptyLabel,
}: {
  children: ReactNode;
  emptyLabel: string;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  if (Array.isArray(items) && items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }
  return <div className="grid gap-3 lg:grid-cols-2">{children}</div>;
}

function ExerciseGrid({
  exercises,
  selectedIds,
  onToggle,
  emptyLabel,
  global,
}: {
  exercises: ExerciseRow[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyLabel: string;
  global?: boolean;
}) {
  if (exercises.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {exercises.map((exercise) => (
        <ContentCard
          key={exercise.id}
          checked={selectedIds.includes(exercise.id)}
          onCheckedChange={() => onToggle(exercise.id)}
          icon={<Dumbbell className="h-5 w-5" />}
          title={exercise.nome}
          subtitle={global ? "Biblioteca global" : "Disponivel para curadoria"}
          meta={[exercise.grupo_muscular, exercise.equipamento, exercise.nivel_dificuldade]}
          badge={global ? "Global" : "Local"}
        />
      ))}
    </div>
  );
}

function ContentCard({
  checked,
  onCheckedChange,
  icon,
  title,
  subtitle,
  meta,
  badge,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
  meta: Array<string | null | undefined>;
  badge: "Global" | "Local";
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between gap-3 text-base">
          <span className="flex min-w-0 items-start gap-3">
            <Checkbox
              checked={checked}
              onCheckedChange={onCheckedChange}
              className="mt-2 shrink-0"
            />
            <span className="rounded-md bg-primary/10 p-2 text-primary">
              {icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{title}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {subtitle}
              </span>
            </span>
          </span>
          {badge === "Global" ? (
            <Badge className="shrink-0">
              <Star className="mr-1 h-3 w-3" />
              Global
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0">
              Local
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {meta.filter(Boolean).slice(0, 3).map((item) => (
            <Badge key={item} variant="secondary" className="max-w-full truncate">
              {item}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SourceModelCard({
  model,
  checked,
  onCheckedChange,
  folderPath,
  onPreview,
}: {
  model: ModelRow;
  checked: boolean;
  onCheckedChange: () => void;
  folderPath: string;
  onPreview: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between gap-3 text-base">
          <span className="flex min-w-0 items-start gap-3">
            <Checkbox
              checked={checked}
              onCheckedChange={onCheckedChange}
              className="mt-2 shrink-0"
            />
            <span className="rounded-md bg-primary/10 p-2 text-primary">
              <BookTemplate className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate">{model.nome}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                Origem privada preservada
              </span>
            </span>
          </span>
          <Badge variant="outline" className="shrink-0">
            Local
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <FolderPathPill path={folderPath} />
          {[model.categoria, model.descricao].filter(Boolean).slice(0, 2).map((item) => (
            <Badge key={item} variant="secondary" className="max-w-full truncate">
              {item}
            </Badge>
          ))}
        </div>
        <Button variant="outline" className="w-full" onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" />
          Visualizar exercicios
        </Button>
      </CardContent>
    </Card>
  );
}

function ModelPreviewDialog({
  model,
  folderPath,
  loading,
  selected,
  onOpenChange,
  onToggleSelected,
}: {
  model: ModelRow | null;
  folderPath: string;
  loading: boolean;
  selected: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleSelected: () => void;
}) {
  return (
    <Dialog open={!!model} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{model?.nome || "Modelo de treino"}</DialogTitle>
          <DialogDescription>
            Visualizacao do conteudo antes de promover para global.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <FolderPathPill path={folderPath} />
          {model?.categoria && <Badge variant="outline">{model.categoria}</Badge>}
          <Badge variant="outline">
            {(model?.exercicios || []).length} exercicio(s)
          </Badge>
          <Badge variant="outline">{(model?.blocos || []).length} bloco(s)</Badge>
        </div>

        <ScrollArea className="min-h-0 flex-1 overflow-y-auto pr-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Carregando conteudo...
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {(model?.exercicios || []).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Exercicios</h3>
                  {(model?.exercicios || []).map((exercise, index) => (
                    <div
                      key={exercise.id || `${exercise.nome}-${index}`}
                      className="rounded-md border bg-card p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {index + 1}. {exercise.nome}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {exercise.series || 0}x{exercise.repeticoes || "-"} · descanso {exercise.descanso || 0}s
                          </p>
                        </div>
                        {exercise.tipo_agrupamento && (
                          <Badge variant="secondary" className="shrink-0">
                            {exercise.tipo_agrupamento}
                          </Badge>
                        )}
                      </div>
                      {exercise.observacoes && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {exercise.observacoes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(model?.blocos || []).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Blocos</h3>
                  {(model?.blocos || []).map((block, index) => (
                    <div
                      key={block.id || `${block.nome}-${index}`}
                      className="rounded-md border bg-card p-3"
                    >
                      <p className="text-sm font-medium">
                        {index + 1}. {block.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {block.tipo} · {block.posicao}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={onToggleSelected}>
            {selected ? "Remover da selecao" : "Selecionar para promover"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GlobalModelCard({
  model,
  folders,
  checked,
  saving,
  onCheckedChange,
  onFolderChange,
  onLevelChange,
  onDelete,
}: {
  model: ModelRow;
  folders: GlobalFolder[];
  checked: boolean;
  saving: boolean;
  onCheckedChange: () => void;
  onFolderChange: (folderId: string) => void;
  onLevelChange: (level: string) => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between gap-3 text-base">
          <span className="flex min-w-0 items-start gap-3">
            <Checkbox
              checked={checked}
              onCheckedChange={onCheckedChange}
              className="mt-2 shrink-0"
            />
            <span className="rounded-md bg-primary/10 p-2 text-primary">
              <BookTemplate className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate">{model.nome}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                Copia global independente
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
          {[model.categoria, model.descricao].filter(Boolean).slice(0, 2).map((item) => (
            <Badge key={item} variant="secondary" className="max-w-full truncate">
              {item}
            </Badge>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Pasta global</Label>
            <FolderSelect
              value={model.pasta_id || ROOT_FOLDER_VALUE}
              folders={folders}
              onValueChange={onFolderChange}
              rootLabel="Raiz global"
            />
          </div>
          <div>
            <Label className="text-xs">Plano minimo</Label>
            <PlanLevelSelect
              value={String(model.min_plan_level || 1)}
              onValueChange={onLevelChange}
              disabled={saving}
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Remover copia global
        </Button>
      </CardContent>
    </Card>
  );
}
