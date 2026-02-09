// components/modelos/ModeloGrid.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import {
  MoreHorizontal,
  Eye,
  Calendar,
  Trash2,
  Dumbbell,
  Blocks,
  FolderInput,
  Folder,
  BookTemplate,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ModeloTreino } from "@/hooks/useModelosTreino";
import type { ModeloPasta } from "@/hooks/useModeloPastas";

interface ModeloGridProps {
  modelos: ModeloTreino[];
  pastas: ModeloPasta[];
  currentFolderId: string | null;
  showAll?: boolean; // When true, shows all models (for search results)
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
  // Filtrar modelos da pasta atual (ou todos se showAll)
  const modelosVisiveis = showAll
    ? modelos
    : modelos.filter((m) => m.pasta_id === currentFolderId);

  if (modelosVisiveis.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookTemplate className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nenhum modelo nesta pasta</p>
        <p className="text-xs mt-1">
          Crie um modelo ou mova um existente para cá
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
          currentFolderId={currentFolderId}
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
  currentFolderId: string | null;
  onAplicar: (modelo: ModeloTreino) => void;
  onVisualizar: (modelo: ModeloTreino) => void;
  onDeletar: (modeloId: string) => void;
  onMoverModelo: (modeloId: string, pastaId: string | null) => Promise<void>;
}

function ModeloCard({
  modelo,
  pastas,
  currentFolderId,
  onAplicar,
  onVisualizar,
  onDeletar,
  onMoverModelo,
}: ModeloCardProps) {
  const totalExercicios = modelo.exercicios?.length || 0;
  const totalBlocos = modelo.blocos?.length || 0;
  const tempoRelativo = formatDistanceToNow(new Date(modelo.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  // Obter subpastas da pasta atual (para mover)
  const subpastas = pastas.filter((p) => p.parent_id === currentFolderId);
  const pastaAtual = pastas.find((p) => p.id === currentFolderId);
  const pastaPai = pastaAtual ? pastas.find((p) => p.id === pastaAtual.parent_id) : null;

  // Pastas disponíveis para mover (todas exceto a atual)
  const pastasParaMover = pastas.filter((p) => p.id !== modelo.pasta_id);

  return (
    <Card
      className="group hover:shadow-md transition-all cursor-pointer"
      onClick={() => onVisualizar(modelo)}
    >
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onVisualizar(modelo);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                  <FolderInput className="h-4 w-4 mr-2" />
                  Mover para pasta
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                  {/* Opção: Sem pasta (raiz) */}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoverModelo(modelo.id, null);
                    }}
                    disabled={!modelo.pasta_id}
                  >
                    <BookTemplate className="h-4 w-4 mr-2" />
                    Raiz (sem pasta)
                  </DropdownMenuItem>
                  {pastasParaMover.length > 0 && <DropdownMenuSeparator />}
                  {/* Lista de pastas */}
                  {pastasParaMover.map((pasta) => {
                    // Mostrar caminho da pasta para contexto
                    const nivel = pasta.nivel || 0;
                    const indent = "  ".repeat(nivel);
                    return (
                      <DropdownMenuItem
                        key={pasta.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoverModelo(modelo.id, pasta.id);
                        }}
                      >
                        <Folder className="h-4 w-4 mr-2" style={{ color: pasta.cor }} />
                        <span className="truncate max-w-[180px]">
                          {pasta.caminho || pasta.nome}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
  );
}
