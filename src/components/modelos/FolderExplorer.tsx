// components/modelos/FolderExplorer.tsx
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  Home,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModeloPasta } from "@/hooks/useModeloPastas";
import type { ModeloTreino } from "@/hooks/useModelosTreino";

const CORES_PREDEFINIDAS = [
  { label: "Azul", value: "#3b82f6" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Verde", value: "#22c55e" },
  { label: "Roxo", value: "#a855f7" },
  { label: "Laranja", value: "#f97316" },
  { label: "Vermelho", value: "#ef4444" },
];

const TAGS_OPCOES = [
  { label: "Nenhuma", value: "" },
  { label: "Masculino", value: "masculino" },
  { label: "Feminino", value: "feminino" },
];

interface FolderExplorerProps {
  pastas: ModeloPasta[];
  modelos: ModeloTreino[];
  currentFolderId: string | null;
  tagFilter?: string;
  onNavigate: (folderId: string | null) => void;
  onCreateFolder: (dados: { nome: string; cor?: string; parent_id?: string | null; tag?: string | null }) => Promise<unknown>;
  onRenameFolder: (pastaId: string, dados: Partial<{ nome: string; cor: string; tag: string | null }>) => Promise<unknown>;
  onDeleteFolder: (pastaId: string) => Promise<unknown>;
  isCreating?: boolean;
  className?: string;
}

export function FolderExplorer({
  pastas,
  modelos,
  currentFolderId,
  tagFilter,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  isCreating = false,
  className,
}: FolderExplorerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<{ id: string; nome: string; cor: string; tag: string | null } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderCor, setNewFolderCor] = useState("#3b82f6");
  const [newFolderTag, setNewFolderTag] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Count total models in a folder + all subfolders recursively
  const contarModelosTotais = useMemo(() => {
    const counts: Record<string, number> = {};
    
    const getDescendantIds = (pastaId: string): string[] => {
      const children = pastas.filter(p => p.parent_id === pastaId);
      const ids = [pastaId];
      children.forEach(child => {
        ids.push(...getDescendantIds(child.id));
      });
      return ids;
    };

    pastas.forEach(pasta => {
      const allIds = getDescendantIds(pasta.id);
      counts[pasta.id] = modelos.filter(m => m.pasta_id && allIds.includes(m.pasta_id)).length;
    });

    return counts;
  }, [pastas, modelos]);

  // Obter subpastas da pasta atual, filtradas por tag se necessário
  const subpastas = useMemo(() => {
    let subs = pastas
      .filter((p) => p.parent_id === currentFolderId)
      .sort((a, b) => a.ordem - b.ordem);
    
    if (tagFilter) {
      subs = subs.filter(p => p.tag === tagFilter);
    }

    return subs;
  }, [pastas, currentFolderId, tagFilter]);

  // Obter pasta atual e ancestrais para breadcrumb
  const { currentFolder, breadcrumb } = useMemo(() => {
    const current = pastas.find((p) => p.id === currentFolderId) || null;
    const trail: ModeloPasta[] = [];
    
    let folder = current;
    while (folder) {
      trail.unshift(folder);
      folder = pastas.find((p) => p.id === folder?.parent_id) || null;
    }
    
    return { currentFolder: current, breadcrumb: trail };
  }, [pastas, currentFolderId]);

  // Contar modelos na pasta atual
  const modelosNaPastaAtual = useMemo(() => {
    return modelos.filter((m) => m.pasta_id === currentFolderId).length;
  }, [modelos, currentFolderId]);

  // Contar modelos sem pasta (só na raiz)
  const modelosSemPasta = useMemo(() => {
    if (currentFolderId !== null) return 0;
    return modelos.filter((m) => !m.pasta_id).length;
  }, [modelos, currentFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await onCreateFolder({
      nome: newFolderName.trim(),
      cor: newFolderCor,
      parent_id: currentFolderId,
      tag: newFolderTag || null,
    });
    setNewFolderName("");
    setNewFolderCor("#3b82f6");
    setNewFolderTag("");
    setCreateDialogOpen(false);
  };

  const handleEditFolder = async () => {
    if (!editDialog || !editDialog.nome.trim()) return;
    await onRenameFolder(editDialog.id, {
      nome: editDialog.nome.trim(),
      cor: editDialog.cor,
      tag: editDialog.tag,
    });
    setEditDialog(null);
  };

  const handleDeleteFolder = async () => {
    if (!deleteDialog) return;
    setIsDeleting(true);
    try {
      await onDeleteFolder(deleteDialog);
      setDeleteDialog(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const navigateUp = () => {
    if (currentFolder?.parent_id !== undefined) {
      onNavigate(currentFolder.parent_id);
    } else {
      onNavigate(null);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 flex-wrap text-sm">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 gap-1",
            currentFolderId === null && "bg-primary/10 text-primary"
          )}
          onClick={() => onNavigate(null)}
        >
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Raiz</span>
        </Button>

        {breadcrumb.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 gap-1",
                index === breadcrumb.length - 1 && "bg-primary/10 text-primary"
              )}
              onClick={() => onNavigate(folder.id)}
            >
              <Folder className="h-3.5 w-3.5" style={{ color: folder.cor }} />
              <span className="max-w-[120px] truncate">{folder.nome}</span>
              {folder.tag && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 ml-0.5">
                  {folder.tag === "masculino" ? "M" : "F"}
                </Badge>
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Folder Grid/List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {/* Up button (if not at root) */}
        {currentFolderId !== null && (
          <button
            onClick={navigateUp}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-dashed hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground min-h-[90px]"
          >
            <ArrowUp className="h-8 w-8" />
            <span className="text-xs font-medium">Voltar</span>
          </button>
        )}

        {/* Subfolders */}
        {subpastas.map((pasta) => {
          const totalModelos = contarModelosTotais[pasta.id] || 0;

          return (
            <div
              key={pasta.id}
              className="group relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer min-h-[90px]"
              onClick={() => onNavigate(pasta.id)}
            >
              <div className="relative">
                <FolderOpen
                  className="h-10 w-10"
                  style={{ color: pasta.cor }}
                />
                {totalModelos > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-3 h-5 min-w-[20px] text-[10px] px-1"
                  >
                    {totalModelos}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium text-center line-clamp-2 max-w-full">
                {pasta.nome}
              </span>
              {pasta.tag && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  {pasta.tag === "masculino" ? "♂ Masc" : "♀ Fem"}
                </Badge>
              )}

              {/* Folder actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={() => setEditDialog({ id: pasta.id, nome: pasta.nome, cor: pasta.cor, tag: pasta.tag || null })}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialog(pasta.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

        {/* Create new folder button */}
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-dashed hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground min-h-[90px]"
        >
          <FolderPlus className="h-8 w-8" />
          <span className="text-xs font-medium">Nova Pasta</span>
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <span>{subpastas.length} pasta{subpastas.length !== 1 ? "s" : ""}</span>
        <span>
          {currentFolderId === null ? modelosSemPasta : modelosNaPastaAtual} modelo
          {(currentFolderId === null ? modelosSemPasta : modelosNaPastaAtual) !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>
              {currentFolder
                ? `Criar pasta dentro de "${currentFolder.nome}"`
                : "Criar pasta na raiz"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                placeholder="Nome da pasta..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-2 mt-1">
                {CORES_PREDEFINIDAS.map((cor) => (
                  <button
                    key={cor.value}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      newFolderCor === cor.value ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: cor.value }}
                    onClick={() => setNewFolderCor(cor.value)}
                    title={cor.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Tag (opcional)</Label>
              <Select value={newFolderTag} onValueChange={setNewFolderTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  {TAGS_OPCOES.map((t) => (
                    <SelectItem key={t.value} value={t.value || "none"}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder} disabled={isCreating || !newFolderName.trim()}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={editDialog?.nome || ""}
                onChange={(e) =>
                  editDialog && setEditDialog({ ...editDialog, nome: e.target.value })
                }
                onKeyDown={(e) => e.key === "Enter" && handleEditFolder()}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-2 mt-1">
                {CORES_PREDEFINIDAS.map((cor) => (
                  <button
                    key={cor.value}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      editDialog?.cor === cor.value ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: cor.value }}
                    onClick={() => editDialog && setEditDialog({ ...editDialog, cor: cor.value })}
                    title={cor.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Tag</Label>
              <Select
                value={editDialog?.tag || "none"}
                onValueChange={(v) => editDialog && setEditDialog({ ...editDialog, tag: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  {TAGS_OPCOES.map((t) => (
                    <SelectItem key={t.value || "none"} value={t.value || "none"}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditFolder}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              A pasta será excluída permanentemente. Os modelos dentro dela ficarão sem pasta
              (não serão excluídos). As subpastas também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
