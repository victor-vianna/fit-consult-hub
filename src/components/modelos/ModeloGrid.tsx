import { useMemo, useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  MoreHorizontal,
  Eye,
  Calendar,
  Trash2,
  Dumbbell,
  Blocks,
  FolderInput,
  BookTemplate,
  Clock,
  Search,
  CheckCircle2,
  FolderOpen,
  Loader2,
  ChevronRight,
  Home,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ModeloTreino } from "@/hooks/useModelosTreino";
import type { ModeloPasta } from "@/hooks/useModeloPastas";

interface ModeloGridProps {
  modelos: ModeloTreino[];
  pastas: ModeloPasta[];
  currentFolderId: string | null;
  showAll?: boolean;
  onAplicar: (modelo: ModeloTreino) => void;
  onVisualizar: (modelo: ModeloTreino) => void;
  onDeletar: (modeloId: string) => void;
  onMoverModelo: (modeloId: string, pastaId: string | null) => Promise<void>;
}

export function ModeloGrid({
  modelos,
  pastas,
  currentFolderId,
  showAll = false,
  onAplicar,
  onVisualizar,
  onDeletar,
  onMoverModelo,
}: ModeloGridProps) {
  const modelosVisiveis = showAll
    ? modelos
    : modelos.filter(
        (m) =>
          m.pasta_id === currentFolderId ||
          (m.is_global && currentFolderId === null)
      );

  if (modelosVisiveis.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookTemplate className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nenhum modelo nesta pasta</p>
        <p className="text-xs mt-1">
          Crie um modelo ou mova um existente para ca
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {modelosVisiveis.map((modelo) => (
        <ModeloCard
          key={modelo.id}
          modelo={modelo}
          pastas={pastas}
          onAplicar={onAplicar}
          onVisualizar={onVisualizar}
          onDeletar={onDeletar}
          onMoverModelo={onMoverModelo}
        />
      ))}
    </div>
  );
}

interface ModeloCardProps {
  modelo: ModeloTreino;
  pastas: ModeloPasta[];
  onAplicar: (modelo: ModeloTreino) => void;
  onVisualizar: (modelo: ModeloTreino) => void;
  onDeletar: (modeloId: string) => void;
  onMoverModelo: (modeloId: string, pastaId: string | null) => Promise<void>;
}

function ModeloCard({
  modelo,
  pastas,
  onAplicar,
  onVisualizar,
  onDeletar,
  onMoverModelo,
}: ModeloCardProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const totalExercicios = modelo.exercicios?.length || 0;
  const totalBlocos = modelo.blocos?.length || 0;
  const tempoRelativo = formatDistanceToNow(new Date(modelo.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <>
      <Card
        className="group hover:shadow-md transition-all cursor-pointer"
        onClick={() => onVisualizar(modelo)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base line-clamp-1">
                  {modelo.nome}
                </CardTitle>
                {modelo.is_global && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary"
                  >
                    Global
                  </Badge>
                )}
              </div>
              {modelo.categoria && (
                <div className="mt-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {modelo.categoria}
                  </Badge>
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisualizar(modelo);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>

                {!modelo.is_global && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoveDialogOpen(true);
                    }}
                  >
                    <FolderInput className="h-4 w-4 mr-2" />
                    Mover para pasta
                  </DropdownMenuItem>
                )}

                {!modelo.is_global && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletar(modelo.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {modelo.descricao && (
            <CardDescription className="line-clamp-2 mt-1">
              {modelo.descricao}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {totalExercicios > 0 && (
              <span className="flex items-center gap-1">
                <Dumbbell className="h-4 w-4" />
                {totalExercicios}
              </span>
            )}
            {totalBlocos > 0 && (
              <span className="flex items-center gap-1">
                <Blocks className="h-4 w-4" />
                {totalBlocos}
              </span>
            )}
            {modelo.duracao_total_minutos && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {modelo.duracao_total_minutos}min
              </span>
            )}
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground">Criado {tempoRelativo}</p>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onVisualizar(modelo);
              }}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAplicar(modelo);
              }}
              className="flex-1"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      <MoveModelDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        modelo={modelo}
        pastas={pastas}
        onMoverModelo={onMoverModelo}
      />
    </>
  );
}

function MoveModelDialog({
  open,
  onOpenChange,
  modelo,
  pastas,
  onMoverModelo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelo: ModeloTreino;
  pastas: ModeloPasta[];
  onMoverModelo: (modeloId: string, pastaId: string | null) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [movingTo, setMovingTo] = useState<string | null | "__root__">(null);
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null);

  const currentBrowseFolder = browseFolderId
    ? pastas.find((folder) => folder.id === browseFolderId) || null
    : null;

  const breadcrumb = useMemo(() => {
    return currentBrowseFolder ? getFolderTrail(currentBrowseFolder, pastas) : [];
  }, [currentBrowseFolder, pastas]);

  const folderOptions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pastas
      .filter((folder) => folder.id !== modelo.pasta_id)
      .filter((folder) => (q ? true : folder.parent_id === browseFolderId))
      .map((folder) => {
        const trail = getFolderTrail(folder, pastas);
        const fullPath = trail.map((item) => item.nome).join(" / ");
        const parentPath = trail.slice(0, -1).map((item) => item.nome).join(" / ");
        const childCount = pastas.filter((item) => item.parent_id === folder.id).length;

        return {
          folder,
          fullPath,
          parentPath,
          childCount,
        };
      })
      .filter((option) => {
        if (!q) return true;
        return [option.folder.nome, option.fullPath, option.parentPath].some(
          (value) => value.toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        a.fullPath.localeCompare(b.fullPath, "pt-BR", { sensitivity: "base" })
      );
  }, [browseFolderId, modelo.pasta_id, pastas, search]);

  const currentFolder = modelo.pasta_id
    ? pastas.find((folder) => folder.id === modelo.pasta_id)
    : null;
  const currentPath = currentFolder
    ? getFolderTrail(currentFolder, pastas).map((folder) => folder.nome).join(" / ")
    : "Raiz (sem pasta)";

  const handleMove = async (folderId: string | null) => {
    setMovingTo(folderId || "__root__");
    try {
      await onMoverModelo(modelo.id, folderId);
      setSearch("");
      setBrowseFolderId(null);
      onOpenChange(false);
    } finally {
      setMovingTo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] max-h-[720px] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 pb-4 pt-5">
          <DialogTitle className="text-lg">Mover modelo</DialogTitle>
          <DialogDescription className="line-clamp-1">
            {modelo.nome}
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3 px-5 py-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Local atual
            </p>
            <p className="mt-0.5 truncate text-sm font-medium" title={currentPath}>
              {currentPath}
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (event.target.value.trim()) setBrowseFolderId(null);
              }}
              placeholder="Buscar pasta..."
              className="h-10 pl-9"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-md border bg-muted/20 p-1.5 text-sm">
            <Button
              variant={browseFolderId === null ? "secondary" : "ghost"}
              size="sm"
              className="h-7 shrink-0 gap-1.5 px-2"
              onClick={() => setBrowseFolderId(null)}
            >
              <Home className="h-3.5 w-3.5" />
              Raiz
            </Button>
            {breadcrumb.map((folder) => (
              <span key={folder.id} className="flex shrink-0 items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Button
                  variant={folder.id === browseFolderId ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 max-w-[160px] gap-1.5 px-2"
                  onClick={() => setBrowseFolderId(folder.id)}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span className="truncate">{folder.nome}</span>
                </Button>
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Pasta aberta
              </p>
              <p className="truncate text-sm font-medium">
                {currentBrowseFolder?.nome || "Raiz"}
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              disabled={
                movingTo !== null ||
                (browseFolderId === null && !modelo.pasta_id) ||
                browseFolderId === modelo.pasta_id
              }
              onClick={() => handleMove(browseFolderId)}
            >
              {movingTo === (browseFolderId || "__root__") ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FolderInput className="mr-2 h-4 w-4" />
              )}
              Mover para aqui
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t px-5 py-3">
          <div className="space-y-2 pb-1">
            {folderOptions.map(({ folder, parentPath, childCount }) => (
              <FolderBrowseButton
                key={folder.id}
                title={folder.nome}
                subtitle={
                  search.trim()
                    ? parentPath || "Pasta principal"
                    : childCount > 0
                      ? `${childCount} subpasta${childCount !== 1 ? "s" : ""}`
                      : "Sem subpastas"
                }
                active={modelo.pasta_id === folder.id}
                disabled={movingTo !== null}
                loading={movingTo === folder.id}
                icon={
                  <FolderOpen
                    className="h-5 w-5"
                    style={{ color: folder.cor || "#3b82f6" }}
                  />
                }
                onOpen={() => {
                  setSearch("");
                  setBrowseFolderId(folder.id);
                }}
                onMove={() => handleMove(folder.id)}
              />
            ))}

            {folderOptions.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhuma pasta encontrada.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FolderBrowseButton({
  title,
  subtitle,
  active,
  disabled,
  loading,
  icon,
  onOpen,
  onMove,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  disabled: boolean;
  loading: boolean;
  icon: ReactNode;
  onOpen: () => void;
  onMove: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-2 rounded-lg border bg-card p-2 transition hover:bg-muted/30">
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="shrink-0 rounded-md bg-primary/10 p-1.5 text-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground" title={subtitle}>
            {subtitle}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {active && (
        <Badge variant="secondary" className="shrink-0">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Atual
        </Badge>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || active}
        onClick={onMove}
        className="h-8 shrink-0 px-3"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Mover
      </Button>
    </div>
  );
}

function getFolderTrail(folder: ModeloPasta, folders: ModeloPasta[]) {
  const trail = [folder];
  let current = folder;
  const visited = new Set<string>();

  while (current.parent_id && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = folders.find((item) => item.id === current.parent_id);
    if (!parent) break;
    trail.unshift(parent);
    current = parent;
  }

  return trail;
}
