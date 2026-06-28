import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  Grid2X2,
  Home,
  List,
  MoreVertical,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDisplayDate } from "@/utils/dateFormat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface MaterialExplorerItem {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  arquivo_url: string;
  arquivo_nome: string;
  created_at: string;
}

type FolderKey = "treino" | "dieta" | "avaliacao" | "outro";
type ViewMode = "grid" | "list";

interface MaterialFileExplorerProps {
  materiais: MaterialExplorerItem[];
  title: string;
  description?: string;
  action?: ReactNode;
  themeColor?: string;
  canDelete?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onView: (material: MaterialExplorerItem) => void;
  onDownload: (material: MaterialExplorerItem) => void;
  onDelete?: (material: MaterialExplorerItem) => void;
}

const FOLDERS: Array<{
  key: FolderKey;
  label: string;
  description: string;
  accepted: string[];
}> = [
  {
    key: "avaliacao",
    label: "Avaliacoes",
    description: "Relatorios, fotos e avaliacoes fisicas",
    accepted: ["avaliacao", "avaliação"],
  },
  {
    key: "dieta",
    label: "Dieta",
    description: "Arquivos de nutricao e orientacoes alimentares",
    accepted: ["dieta"],
  },
  {
    key: "outro",
    label: "Outros",
    description: "Documentos gerais e arquivos complementares",
    accepted: ["outro"],
  },
  {
    key: "treino",
    label: "Treinos",
    description: "Planilhas, orientacoes e materiais de treino",
    accepted: ["treino"],
  },
];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const getFolderKey = (tipo: string): FolderKey => {
  const normalized = normalize(tipo);
  const folder = FOLDERS.find((item) =>
    item.accepted.some((accepted) => normalize(accepted) === normalized)
  );
  return folder?.key || "outro";
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) {
    return FileImage;
  }
  if (ext === "pdf") return FileText;
  return FileArchive;
};

export function MaterialFileExplorer({
  materiais,
  title,
  description,
  action,
  themeColor,
  canDelete = false,
  emptyTitle = "Nenhum material encontrado",
  emptyDescription = "Os arquivos enviados aparecem aqui organizados por pastas.",
  onView,
  onDownload,
  onDelete,
}: MaterialFileExplorerProps) {
  const [currentFolder, setCurrentFolder] = useState<FolderKey | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [materialToDelete, setMaterialToDelete] =
    useState<MaterialExplorerItem | null>(null);

  const folderCounts = useMemo(() => {
    return FOLDERS.reduce<Record<FolderKey, number>>((acc, folder) => {
      acc[folder.key] = materiais.filter(
        (material) => getFolderKey(material.tipo) === folder.key
      ).length;
      return acc;
    }, {} as Record<FolderKey, number>);
  }, [materiais]);

  const currentFolderMeta = currentFolder
    ? FOLDERS.find((folder) => folder.key === currentFolder)
    : null;

  const visibleMaterials = useMemo(() => {
    const filteredByFolder = currentFolder
      ? materiais.filter((material) => getFolderKey(material.tipo) === currentFolder)
      : materiais;

    if (!query.trim()) return filteredByFolder;

    const normalizedQuery = normalize(query);
    return filteredByFolder.filter((material) =>
      [
        material.titulo,
        material.descricao || "",
        material.arquivo_nome,
        material.tipo,
      ].some((value) => normalize(value).includes(normalizedQuery))
    );
  }, [materiais, currentFolder, query]);

  const confirmDelete = () => {
    if (!materialToDelete || !onDelete) return;
    onDelete(materialToDelete);
    setMaterialToDelete(null);
  };

  const accentStyle = themeColor ? { backgroundColor: themeColor } : undefined;
  const accentBorderStyle = themeColor ? { borderColor: `${themeColor}33` } : undefined;

  return (
    <Card className="overflow-hidden border shadow-sm">
      <div className="border-b bg-primary text-primary-foreground" style={accentStyle}>
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-primary-foreground/80">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              className="h-9 w-9 text-primary-foreground hover:text-foreground"
              onClick={() => setViewMode("grid")}
              title="Visualizar em grade"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              className="h-9 w-9 text-primary-foreground hover:text-foreground"
              onClick={() => setViewMode("list")}
              title="Visualizar em lista"
            >
              <List className="h-4 w-4" />
            </Button>
            {action}
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        <div className="border-b bg-muted/30 p-3 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto text-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("h-8 gap-1.5", !currentFolder && "bg-background")}
                onClick={() => setCurrentFolder(null)}
              >
                <Home className="h-4 w-4" />
                Raiz
              </Button>
              {currentFolderMeta && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 bg-background"
                    onClick={() => setCurrentFolder(currentFolderMeta.key)}
                  >
                    <FolderOpen className="h-4 w-4 text-sky-500" />
                    {currentFolderMeta.label}
                  </Button>
                </>
              )}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar material..."
                className="h-9 bg-background pl-9"
              />
            </div>
          </div>
        </div>

        <div className="p-3 md:p-4">
          {!currentFolder && !query.trim() && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {FOLDERS.map((folder) => (
                <button
                  key={folder.key}
                  type="button"
                  onClick={() => setCurrentFolder(folder.key)}
                  className="group flex min-h-[128px] flex-col items-center justify-center rounded-lg border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={accentBorderStyle}
                >
                  <div className="relative">
                    <Folder className="h-14 w-14 fill-sky-100 text-sky-500 transition-transform group-hover:scale-105" />
                    {folderCounts[folder.key] > 0 && (
                      <Badge className="absolute -right-3 -top-2 h-5 min-w-5 px-1 text-[10px]">
                        {folderCounts[folder.key]}
                      </Badge>
                    )}
                  </div>
                  <span className="mt-2 w-full truncate text-sm font-semibold">
                    {folder.label}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {folder.description}
                  </span>
                </button>
              ))}
            </div>
          )}

          {(currentFolder || query.trim()) && (
            <div className="space-y-3">
              {currentFolder && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setCurrentFolder(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para raiz
                </Button>
              )}

              {visibleMaterials.length > 0 ? (
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                      : "space-y-2"
                  )}
                >
                  {visibleMaterials.map((material) => (
                    <MaterialFileCard
                      key={material.id}
                      material={material}
                      viewMode={viewMode}
                      canDelete={canDelete}
                      onView={onView}
                      onDownload={onDownload}
                      onDelete={
                        canDelete ? () => setMaterialToDelete(material) : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
                  <FileText className="mb-3 h-10 w-10 text-muted-foreground/60" />
                  <h3 className="font-semibold">{emptyTitle}</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {emptyDescription}
                  </p>
                </div>
              )}
            </div>
          )}

          {!currentFolder && !query.trim() && materiais.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <h3 className="font-semibold">{emptyTitle}</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {emptyDescription}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog
        open={!!materialToDelete}
        onOpenChange={(open) => !open && setMaterialToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover material?</AlertDialogTitle>
            <AlertDialogDescription>
              O material "{materialToDelete?.titulo}" sera removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function MaterialFileCard({
  material,
  viewMode,
  canDelete,
  onView,
  onDownload,
  onDelete,
}: {
  material: MaterialExplorerItem;
  viewMode: ViewMode;
  canDelete: boolean;
  onView: (material: MaterialExplorerItem) => void;
  onDownload: (material: MaterialExplorerItem) => void;
  onDelete?: () => void;
}) {
  const Icon = getFileIcon(material.arquivo_nome);
  const isList = viewMode === "list";

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        isList ? "flex items-center gap-3" : "space-y-3"
      )}
    >
      <button
        type="button"
        onClick={() => onView(material)}
        className={cn(
          "min-w-0 flex-1 text-left",
          isList ? "flex items-center gap-3" : "space-y-3"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-md bg-sky-50 text-sky-600",
            isList ? "h-12 w-12 shrink-0" : "h-24 w-full"
          )}
        >
          <Icon className={cn(isList ? "h-6 w-6" : "h-10 w-10")} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{material.titulo}</p>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {material.tipo}
            </Badge>
          </div>
          {material.descricao && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {material.descricao}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="truncate">{material.arquivo_nome}</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDisplayDate(material.created_at)}
            </span>
          </div>
        </div>
      </button>

      <div className={cn("flex gap-2", isList ? "shrink-0" : "pt-1")}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onView(material)}
          title="Visualizar"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onDownload(material)}
          title="Baixar"
        >
          <Download className="h-4 w-4" />
        </Button>
        {canDelete && onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                title="Mais opcoes"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(material)}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload(material)}>
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
