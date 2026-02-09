// components/modelos/FolderExplorer.tsx
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronLeft,
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

interface FolderExplorerProps {
  pastas: ModeloPasta[];
  modelos: ModeloTreino[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  onCreateFolder: (dados: { nome: string; cor?: string; parent_id?: string | null }) => Promise<unknown>;
  onRenameFolder: (pastaId: string, novoNome: string) => Promise<unknown>;
  onDeleteFolder: (pastaId: string) => Promise<unknown>;
  isCreating?: boolean;
  className?: string;
}

export function FolderExplorer({
  pastas,
  modelos,
  currentFolderId,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  isCreating = false,
  className,
}: FolderExplorerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ id: string; nome: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Contar modelos por pasta
  const modelosPorPasta = useMemo(() => {
    const counts: Record<string, number> = {};
    modelos.forEach((m) => {
      if (m.pasta_id) {
        counts[m.pasta_id] = (counts[m.pasta_id] || 0) + 1;
      }
    });
    return counts;
  }, [modelos]);

  // Obter subpastas da pasta atual
  const subpastas = useMemo(() => {
    return pastas
      .filter((p) => p.parent_id === currentFolderId)
      .sort((a, b) => a.ordem - b.ordem);
  }, [pastas, currentFolderId]);

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
      parent_id: currentFolderId,
    });
    setNewFolderName("");
    setCreateDialogOpen(false);
  };

  const handleRenameFolder = async () => {
    if (!renameDialog || !renameDialog.nome.trim()) return;
    await onRenameFolder(renameDialog.id, renameDialog.nome.trim());
    setRenameDialog(null);
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
          const modelCount = modelosPorPasta[pasta.id] || 0;
          const subfolderCount = pastas.filter((p) => p.parent_id === pasta.id).length;

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
                {(modelCount > 0 || subfolderCount > 0) && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-3 h-5 min-w-[20px] text-[10px] px-1"
                  >
                    {modelCount + subfolderCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium text-center line-clamp-2 max-w-full">
                {pasta.nome}
              </span>

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
                    onClick={() => setRenameDialog({ id: pasta.id, nome: pasta.nome })}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Renomear
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
          <Input
            placeholder="Nome da pasta..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
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

      {/* Rename Folder Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDialog?.nome || ""}
            onChange={(e) =>
              renameDialog && setRenameDialog({ ...renameDialog, nome: e.target.value })
            }
            onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameFolder}>Salvar</Button>
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
