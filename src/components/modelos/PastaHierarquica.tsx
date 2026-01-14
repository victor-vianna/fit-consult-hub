import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModeloPasta } from "@/hooks/useModeloPastas";

interface PastaHierarquicaProps {
  pasta: ModeloPasta;
  nivel?: number;
  selectedPastaId?: string | null;
  onSelect: (pastaId: string | null) => void;
  onCreateSubpasta: (parentId: string, nome: string, cor?: string) => void;
  onRename: (pastaId: string, novoNome: string) => void;
  onDelete: (pastaId: string) => void;
  modelosPorPasta?: Record<string, number>;
}

export function PastaHierarquica({
  pasta,
  nivel = 0,
  selectedPastaId,
  onSelect,
  onCreateSubpasta,
  onRename,
  onDelete,
  modelosPorPasta = {},
}: PastaHierarquicaProps) {
  const [isOpen, setIsOpen] = useState(nivel < 2); // Abre automaticamente até nível 2
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");

  const temSubpastas = pasta.subpastas && pasta.subpastas.length > 0;
  const isSelected = selectedPastaId === pasta.id;
  const totalModelos = modelosPorPasta[pasta.id] || 0;

  const handleCreateSubpasta = () => {
    if (novoNome.trim()) {
      onCreateSubpasta(pasta.id, novoNome.trim(), pasta.cor);
      setNovoNome("");
      setCreateDialogOpen(false);
    }
  };

  const handleRename = () => {
    if (novoNome.trim()) {
      onRename(pasta.id, novoNome.trim());
      setNovoNome("");
      setRenameDialogOpen(false);
    }
  };

  const openRenameDialog = () => {
    setNovoNome(pasta.nome);
    setRenameDialogOpen(true);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
            isSelected
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/50"
          )}
          style={{
            paddingLeft: `${nivel * 16 + 8}px`,
          }}
        >
          {/* Chevron para expandir (só aparece se tem subpastas) */}
          {temSubpastas ? (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-90"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-5" />
          )}

          {/* Ícone da pasta */}
          <div
            className="p-1 rounded"
            style={{ backgroundColor: `${pasta.cor}20` }}
            onClick={() => onSelect(pasta.id)}
          >
            {isOpen && temSubpastas ? (
              <FolderOpen className="h-4 w-4" style={{ color: pasta.cor }} />
            ) : (
              <Folder className="h-4 w-4" style={{ color: pasta.cor }} />
            )}
          </div>

          {/* Nome da pasta */}
          <span
            className="flex-1 text-sm font-medium truncate"
            onClick={() => onSelect(pasta.id)}
          >
            {pasta.nome}
          </span>

          {/* Badge com quantidade de modelos */}
          {totalModelos > 0 && (
            <Badge variant="secondary" className="h-5 text-xs">
              {totalModelos}
            </Badge>
          )}

          {/* Menu de opções */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Subpasta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openRenameDialog}>
                <Edit className="h-4 w-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(pasta.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Subpastas */}
        {temSubpastas && (
          <CollapsibleContent>
            {pasta.subpastas!.map((subpasta) => (
              <PastaHierarquica
                key={subpasta.id}
                pasta={subpasta}
                nivel={nivel + 1}
                selectedPastaId={selectedPastaId}
                onSelect={onSelect}
                onCreateSubpasta={onCreateSubpasta}
                onRename={onRename}
                onDelete={onDelete}
                modelosPorPasta={modelosPorPasta}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>

      {/* Dialog para criar subpasta */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Subpasta em "{pasta.nome}"</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da subpasta..."
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateSubpasta()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubpasta} disabled={!novoNome.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para renomear */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
          </DialogHeader>
          <Input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ListaPastasHierarquicasProps {
  pastas: ModeloPasta[];
  selectedPastaId?: string | null;
  onSelect: (pastaId: string | null) => void;
  onCreatePasta: (dados: { nome: string; cor?: string; parent_id?: string | null }) => void;
  onRenamePasta: (pastaId: string, novoNome: string) => void;
  onDeletePasta: (pastaId: string) => void;
  modelosPorPasta?: Record<string, number>;
}

export function ListaPastasHierarquicas({
  pastas,
  selectedPastaId,
  onSelect,
  onCreatePasta,
  onRenamePasta,
  onDeletePasta,
  modelosPorPasta = {},
}: ListaPastasHierarquicasProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");

  const handleCreatePasta = () => {
    if (novoNome.trim()) {
      onCreatePasta({ nome: novoNome.trim() });
      setNovoNome("");
      setCreateDialogOpen(false);
    }
  };

  const handleCreateSubpasta = (parentId: string, nome: string, cor?: string) => {
    onCreatePasta({ nome, cor, parent_id: parentId });
  };

  return (
    <div className="space-y-1">
      {/* Opção "Todos os Modelos" */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
          selectedPastaId === null
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/50"
        )}
        onClick={() => onSelect(null)}
      >
        <Folder className="h-4 w-4" />
        <span className="flex-1 text-sm font-medium">Todos os Modelos</span>
      </div>

      {/* Lista de pastas hierárquicas */}
      {pastas.map((pasta) => (
        <PastaHierarquica
          key={pasta.id}
          pasta={pasta}
          selectedPastaId={selectedPastaId}
          onSelect={onSelect}
          onCreateSubpasta={handleCreateSubpasta}
          onRename={onRenamePasta}
          onDelete={onDeletePasta}
          modelosPorPasta={modelosPorPasta}
        />
      ))}

      {/* Botão para criar nova pasta raiz */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground"
        onClick={() => setCreateDialogOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Nova Pasta
      </Button>

      {/* Dialog para criar pasta raiz */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da pasta..."
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreatePasta()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePasta} disabled={!novoNome.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
