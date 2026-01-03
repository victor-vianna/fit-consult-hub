// components/ModelosTreinoList.tsx
import { useState, useMemo } from "react";
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
  Loader2,
  Trash2,
  Calendar,
  Dumbbell,
  Blocks,
  BookTemplate,
  FolderPlus,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  FolderInput,
  ChevronDown,
  ChevronRight,
  Eye,
  SortAsc,
  LayoutGrid,
  List,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ModeloTreino } from "@/hooks/useModelosTreino";
import type { ModeloPasta } from "@/hooks/useModeloPastas";
import { cn } from "@/lib/utils";
import { ModeloVisualizacaoModal } from "./ModeloVisualizacaoModal";

type OrdenacaoTipo = "pasta" | "alfabetica" | "recentes";
type VisualizacaoTipo = "grid" | "lista";

interface ModelosTreinoListProps {
  modelos: ModeloTreino[];
  pastas: ModeloPasta[];
  loading?: boolean;
  onAplicar: (modelo: ModeloTreino) => void;
  onDeletar: (modeloId: string) => Promise<void>;
  onCriarPasta: (nome: string) => Promise<void>;
  onDeletarPasta: (pastaId: string) => Promise<void>;
  onRenomearPasta: (pastaId: string, nome: string) => Promise<void>;
  onMoverModelo: (modeloId: string, pastaId: string | null) => Promise<void>;
  onAtualizarModelo: (modeloId: string, dados: { nome?: string; descricao?: string; categoria?: string }) => Promise<unknown>;
  isAtualizando?: boolean;
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
}: ModelosTreinoListProps) {
  const [modeloDeletar, setModeloDeletar] = useState<string | null>(null);
  const [deletando, setDeletando] = useState(false);
  const [novaPastaDialogOpen, setNovaPastaDialogOpen] = useState(false);
  const [novaPastaNome, setNovaPastaNome] = useState("");
  const [criandoPasta, setCriandoPasta] = useState(false);
  const [pastasDeletando, setPastasDeletando] = useState<string | null>(null);
  const [pastaEditando, setPastaEditando] = useState<{ id: string; nome: string } | null>(null);
  const [pastasAbertas, setPastasAbertas] = useState<Set<string>>(new Set());
  
  // Novos estados para modal e ordenação
  const [modeloVisualizando, setModeloVisualizando] = useState<ModeloTreino | null>(null);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>("pasta");

  // Ordenar modelos de acordo com a escolha do usuário
  const modelosOrdenados = useMemo(() => {
    if (ordenacao === "alfabetica") {
      return [...modelos].sort((a, b) => a.nome.localeCompare(b.nome));
    }
    if (ordenacao === "recentes") {
      return [...modelos].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return modelos; // pasta - usa a organização por pastas
  }, [modelos, ordenacao]);

  // Agrupar modelos por pasta (só usado quando ordenacao === "pasta")
  const modelosSemPasta = modelosOrdenados.filter((m) => !m.pasta_id);
  const modelosPorPasta = pastas.map((pasta) => ({
    pasta,
    modelos: modelosOrdenados.filter((m) => m.pasta_id === pasta.id),
  }));

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

  const handleCriarPasta = async () => {
    if (!novaPastaNome.trim()) return;
    setCriandoPasta(true);
    try {
      await onCriarPasta(novaPastaNome.trim());
      setNovaPastaNome("");
      setNovaPastaDialogOpen(false);
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
    } finally {
      setCriandoPasta(false);
    }
  };

  const handleRenomearPasta = async () => {
    if (!pastaEditando || !pastaEditando.nome.trim()) return;
    try {
      await onRenomearPasta(pastaEditando.id, pastaEditando.nome.trim());
      setPastaEditando(null);
    } catch (error) {
      console.error("Erro ao renomear pasta:", error);
    }
  };

  const handleDeletarPasta = async (pastaId: string) => {
    setPastasDeletando(pastaId);
    try {
      await onDeletarPasta(pastaId);
    } catch (error) {
      console.error("Erro ao deletar pasta:", error);
    } finally {
      setPastasDeletando(null);
    }
  };

  const togglePasta = (pastaId: string) => {
    setPastasAbertas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pastaId)) {
        newSet.delete(pastaId);
      } else {
        newSet.add(pastaId);
      }
      return newSet;
    });
  };

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
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNovaPastaDialogOpen(true)}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Nova Pasta
          </Button>
        </div>
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
        <NovaPastaDialog
          open={novaPastaDialogOpen}
          onOpenChange={setNovaPastaDialogOpen}
          nome={novaPastaNome}
          setNome={setNovaPastaNome}
          onConfirm={handleCriarPasta}
          isLoading={criandoPasta}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header com controles */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Controle de ordenação */}
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-muted-foreground" />
            <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as OrdenacaoTipo)}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pasta">
                  <span className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    Por Pastas
                  </span>
                </SelectItem>
                <SelectItem value="alfabetica">
                  <span className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    Alfabética
                  </span>
                </SelectItem>
                <SelectItem value="recentes">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Mais Recentes
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Botão de nova pasta */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNovaPastaDialogOpen(true)}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Nova Pasta
          </Button>
        </div>

        {/* Visualização por pastas */}
        {ordenacao === "pasta" && (
          <>
            {/* Pastas com modelos */}
            {modelosPorPasta.map(({ pasta, modelos: modelosDaPasta }) => (
          <Collapsible
            key={pasta.id}
            open={pastasAbertas.has(pasta.id)}
            onOpenChange={() => togglePasta(pasta.id)}
          >
            <div className="border rounded-lg overflow-hidden bg-card">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    {pastasAbertas.has(pasta.id) ? (
                      <FolderOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <Folder className="h-5 w-5 text-primary" />
                    )}
                    <span className="font-medium">{pasta.nome}</span>
                    <Badge variant="secondary" className="text-xs">
                      {modelosDaPasta.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setPastaEditando({ id: pasta.id, nome: pasta.nome });
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletarPasta(pasta.id);
                          }}
                          className="text-destructive focus:text-destructive"
                          disabled={pastasDeletando === pasta.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar pasta
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {pastasAbertas.has(pasta.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {modelosDaPasta.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t">
                    Nenhum modelo nesta pasta
                  </div>
                ) : (
                  <div className="p-3 pt-0 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {modelosDaPasta.map((modelo) => (
                      <ModeloCard
                        key={modelo.id}
                        modelo={modelo}
                        pastas={pastas}
                        onAplicar={onAplicar}
                        onVisualizar={() => setModeloVisualizando(modelo)}
                        onDeletar={() => setModeloDeletar(modelo.id)}
                        onMoverModelo={onMoverModelo}
                      />
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}

            {/* Modelos sem pasta */}
            {modelosSemPasta.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                  <BookTemplate className="h-4 w-4" />
                  <span>Sem pasta ({modelosSemPasta.length})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {modelosSemPasta.map((modelo) => (
                    <ModeloCard
                      key={modelo.id}
                      modelo={modelo}
                      pastas={pastas}
                      onAplicar={onAplicar}
                      onVisualizar={() => setModeloVisualizando(modelo)}
                      onDeletar={() => setModeloDeletar(modelo.id)}
                      onMoverModelo={onMoverModelo}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Visualização lista/alfabética ou recentes */}
        {ordenacao !== "pasta" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modelosOrdenados.map((modelo) => (
              <ModeloCard
                key={modelo.id}
                modelo={modelo}
                pastas={pastas}
                onAplicar={onAplicar}
                onVisualizar={() => setModeloVisualizando(modelo)}
                onDeletar={() => setModeloDeletar(modelo.id)}
                onMoverModelo={onMoverModelo}
              />
            ))}
          </div>
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

      {/* Dialog nova pasta */}
      <NovaPastaDialog
        open={novaPastaDialogOpen}
        onOpenChange={setNovaPastaDialogOpen}
        nome={novaPastaNome}
        setNome={setNovaPastaNome}
        onConfirm={handleCriarPasta}
        isLoading={criandoPasta}
      />

      {/* Dialog editar pasta */}
      <Dialog open={!!pastaEditando} onOpenChange={(open) => !open && setPastaEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
            <DialogDescription>Digite o novo nome para a pasta</DialogDescription>
          </DialogHeader>
          <Input
            value={pastaEditando?.nome || ""}
            onChange={(e) =>
              pastaEditando && setPastaEditando({ ...pastaEditando, nome: e.target.value })
            }
            placeholder="Nome da pasta"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPastaEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRenomearPasta}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Card de modelo individual
function ModeloCard({
  modelo,
  pastas,
  onAplicar,
  onVisualizar,
  onDeletar,
  onMoverModelo,
}: {
  modelo: ModeloTreino;
  pastas: ModeloPasta[];
  onAplicar: (modelo: ModeloTreino) => void;
  onVisualizar: () => void;
  onDeletar: () => void;
  onMoverModelo: (modeloId: string, pastaId: string | null) => Promise<void>;
}) {
  const totalExercicios = modelo.exercicios?.length || 0;
  const totalBlocos = modelo.blocos?.length || 0;
  const tempoRelativo = formatDistanceToNow(new Date(modelo.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Card className="group hover:shadow-md transition-all cursor-pointer" onClick={onVisualizar}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-1">{modelo.nome}</CardTitle>
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
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onVisualizar(); }}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                  <FolderInput className="h-4 w-4 mr-2" />
                  Mover para pasta
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onMoverModelo(modelo.id, null); }}
                    disabled={!modelo.pasta_id}
                  >
                    <BookTemplate className="h-4 w-4 mr-2" />
                    Sem pasta
                  </DropdownMenuItem>
                  {pastas.length > 0 && <DropdownMenuSeparator />}
                  {pastas.map((pasta) => (
                    <DropdownMenuItem
                      key={pasta.id}
                      onClick={(e) => { e.stopPropagation(); onMoverModelo(modelo.id, pasta.id); }}
                      disabled={modelo.pasta_id === pasta.id}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      {pasta.nome}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDeletar(); }} 
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </DropdownMenuItem>
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
        {/* Estatísticas */}
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
        </div>

        <Separator />

        {/* Data de criação */}
        <p className="text-xs text-muted-foreground">Criado {tempoRelativo}</p>

        {/* Ações */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onVisualizar(); }} 
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
          <Button 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onAplicar(modelo); }} 
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Aplicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Dialog de nova pasta
function NovaPastaDialog({
  open,
  onOpenChange,
  nome,
  setNome,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  setNome: (nome: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Pasta</DialogTitle>
          <DialogDescription>
            Crie uma pasta para organizar seus modelos de treino
          </DialogDescription>
        </DialogHeader>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Hipertrofia - Avançado - Fem"
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading || !nome.trim()}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
