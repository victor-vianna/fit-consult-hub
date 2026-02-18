// components/ModelosTreinoList.tsx
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  BookTemplate,
  SortAsc,
  Calendar,
  Search,
} from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ModeloTreino } from "@/hooks/useModelosTreino";
import type { ModeloPasta } from "@/hooks/useModeloPastas";
import { ModeloVisualizacaoModal } from "./ModeloVisualizacaoModal";
import { FolderExplorer } from "./modelos/FolderExplorer";
import { ModeloGrid } from "./modelos/ModeloGrid";

type OrdenacaoTipo = "recentes" | "alfabetica";

interface ModelosTreinoListProps {
  modelos: ModeloTreino[];
  pastas: ModeloPasta[];
  loading?: boolean;
  onAplicar: (modelo: ModeloTreino) => void;
  onDeletar: (modeloId: string) => Promise<void>;
  onCriarPasta: (dados: { nome: string; cor?: string; parent_id?: string | null; tag?: string | null }) => Promise<unknown>;
  onDeletarPasta: (pastaId: string) => Promise<unknown>;
  onRenomearPasta: (pastaId: string, dados: Partial<{ nome: string; cor: string; tag: string | null }>) => Promise<unknown>;
  onMoverModelo: (modeloId: string, pastaId: string | null) => Promise<void>;
  onAtualizarModelo: (modeloId: string, dados: { nome?: string; descricao?: string; categoria?: string; duracao_total_minutos?: number | null }) => Promise<unknown>;
  isAtualizando?: boolean;
  isCriandoPasta?: boolean;
}

export function ModelosTreinoList({
  modelos,
  pastas,
  loading = false,
  onAplicar,
  onDeletar,
  onCriarPasta,
  onDeletarPasta,
  onRenomearPasta,
  onMoverModelo,
  onAtualizarModelo,
  isAtualizando = false,
  isCriandoPasta = false,
}: ModelosTreinoListProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>("recentes");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [modeloDeletar, setModeloDeletar] = useState<string | null>(null);
  const [deletando, setDeletando] = useState(false);
  const [modeloVisualizando, setModeloVisualizando] = useState<ModeloTreino | null>(null);

  // Filtrar modelos por busca
  const modelosFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return modelos;
    const query = searchQuery.toLowerCase();
    return modelos.filter(
      (m) =>
        m.nome.toLowerCase().includes(query) ||
        m.descricao?.toLowerCase().includes(query) ||
        m.categoria?.toLowerCase().includes(query)
    );
  }, [modelos, searchQuery]);

  // Ordenar modelos
  const modelosOrdenados = useMemo(() => {
    const lista = [...modelosFiltrados];
    if (ordenacao === "alfabetica") {
      return lista.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return lista.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [modelosFiltrados, ordenacao]);

  const isSearching = searchQuery.trim().length > 0;

  const handleConfirmarDelecao = async () => {
    if (!modeloDeletar) return;
    setDeletando(true);
    try {
      await onDeletar(modeloDeletar);
      setModeloDeletar(null);
    } catch (error) {
      console.error("Erro ao deletar modelo:", error);
    } finally {
      setDeletando(false);
    }
  };

  // Check if any folder has a tag
  const hasTaggedFolders = useMemo(() => {
    return pastas.some(p => p.tag);
  }, [pastas]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando modelos...</p>
      </div>
    );
  }

  if (modelos.length === 0 && pastas.length === 0) {
    return (
      <div className="space-y-4">
        <FolderExplorer
          pastas={pastas}
          modelos={modelos}
          currentFolderId={null}
          onNavigate={setCurrentFolderId}
          onCreateFolder={onCriarPasta}
          onRenameFolder={(id, dados) => {
            if (typeof dados === "string") return onRenomearPasta(id, { nome: dados });
            return onRenomearPasta(id, dados);
          }}
          onDeleteFolder={onDeletarPasta}
          isCreating={isCriandoPasta}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <BookTemplate className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Nenhum modelo criado</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Crie modelos de treino reutilizáveis para economizar tempo ao
                montar treinos para seus alunos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search, Sort, and Tag Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar modelos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tag filter */}
          {hasTaggedFolders && (
            <ToggleGroup
              type="single"
              value={tagFilter}
              onValueChange={(v) => setTagFilter(v)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="" className="text-xs h-9 px-3">
                Todos
              </ToggleGroupItem>
              <ToggleGroupItem value="masculino" className="text-xs h-9 px-3">
                ♂ Masc
              </ToggleGroupItem>
              <ToggleGroupItem value="feminino" className="text-xs h-9 px-3">
                ♀ Fem
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as OrdenacaoTipo)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ordenar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Recentes
                  </span>
                </SelectItem>
                <SelectItem value="alfabetica">
                  <span className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    A-Z
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Folder Explorer (hidden when searching) */}
        {!isSearching && (
          <FolderExplorer
            pastas={pastas}
            modelos={modelos}
            currentFolderId={currentFolderId}
            tagFilter={tagFilter}
            onNavigate={setCurrentFolderId}
            onCreateFolder={onCriarPasta}
            onRenameFolder={(id, dados) => {
              if (typeof dados === "string") return onRenomearPasta(id, { nome: dados });
              return onRenomearPasta(id, dados);
            }}
            onDeleteFolder={onDeletarPasta}
            isCreating={isCriandoPasta}
          />
        )}

        {/* Search Results or Folder Content */}
        {isSearching ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <Search className="h-4 w-4" />
              <span>
                {modelosOrdenados.length} resultado{modelosOrdenados.length !== 1 ? "s" : ""} para "{searchQuery}"
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSearchQuery("")}
              >
                Limpar
              </Button>
            </div>
            <ModeloGrid
              modelos={modelosOrdenados}
              pastas={pastas}
              currentFolderId={null}
              showAll={true}
              onAplicar={onAplicar}
              onVisualizar={setModeloVisualizando}
              onDeletar={setModeloDeletar}
              onMoverModelo={onMoverModelo}
            />
          </div>
        ) : (
          <ModeloGrid
            modelos={modelosOrdenados}
            pastas={pastas}
            currentFolderId={currentFolderId}
            onAplicar={onAplicar}
            onVisualizar={setModeloVisualizando}
            onDeletar={setModeloDeletar}
            onMoverModelo={onMoverModelo}
          />
        )}
      </div>

      {/* Modal de visualização/edição */}
      <ModeloVisualizacaoModal
        modelo={modeloVisualizando}
        open={!!modeloVisualizando}
        onOpenChange={(open) => !open && setModeloVisualizando(null)}
        onAplicar={(modelo) => {
          onAplicar(modelo);
          setModeloVisualizando(null);
        }}
        onAtualizar={onAtualizarModelo}
        isAtualizando={isAtualizando}
      />

      {/* Dialog de confirmação de deleção */}
      <AlertDialog
        open={!!modeloDeletar}
        onOpenChange={(open) => !open && setModeloDeletar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar modelo de treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O modelo será deletado
              permanentemente.
              <br />
              <strong className="text-foreground">
                Os treinos já aplicados a alunos não serão afetados.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarDelecao}
              disabled={deletando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
