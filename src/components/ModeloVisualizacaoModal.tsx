// components/ModeloVisualizacaoModal.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dumbbell,
  Blocks,
  Edit,
  Save,
  X,
  Loader2,
  Calendar,
  Clock,
  Link as LinkIcon,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { ModeloTreino, LinkDemonstracao } from "@/hooks/useModelosTreino";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModeloVisualizacaoModalProps {
  modelo: ModeloTreino | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAplicar: (modelo: ModeloTreino) => void;
  onAtualizar: (
    modeloId: string,
    dados: { nome?: string; descricao?: string; categoria?: string; duracao_total_minutos?: number | null }
  ) => Promise<unknown>;
  isAtualizando?: boolean;
}

export function ModeloVisualizacaoModal({
  modelo,
  open,
  onOpenChange,
  onAplicar,
  onAtualizar,
  isAtualizando = false,
}: ModeloVisualizacaoModalProps) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [duracao, setDuracao] = useState<string>("");

  // Sincronizar estado com modelo
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && modelo) {
      setNome(modelo.nome);
      setDescricao(modelo.descricao || "");
      setCategoria(modelo.categoria || "");
      setDuracao(modelo.duracao_total_minutos?.toString() || "");
      setEditando(false);
    }
    onOpenChange(isOpen);
  };

  const handleSalvar = async () => {
    if (!modelo) return;
    
    const duracaoNum = duracao.trim() ? parseInt(duracao) : null;
    
    await onAtualizar(modelo.id, {
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      categoria: categoria.trim() || undefined,
      duracao_total_minutos: duracaoNum,
    });
    
    setEditando(false);
  };

  const handleCancelarEdicao = () => {
    if (modelo) {
      setNome(modelo.nome);
      setDescricao(modelo.descricao || "");
      setCategoria(modelo.categoria || "");
      setDuracao(modelo.duracao_total_minutos?.toString() || "");
    }
    setEditando(false);
  };

  if (!modelo) return null;

  const totalExercicios = modelo.exercicios?.length || 0;
  const totalBlocos = modelo.blocos?.length || 0;
  const tempoRelativo = formatDistanceToNow(new Date(modelo.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {editando ? (
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Nome do modelo"
                />
              ) : (
                <DialogTitle className="text-xl">{modelo.nome}</DialogTitle>
              )}
            </div>
            {!editando && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditando(true)}
                className="shrink-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {editando ? (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Descrição
                </label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição do modelo..."
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Categoria
                  </label>
                  <Input
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Ex: Hipertrofia, Força..."
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Duração (min)
                  </label>
                  <Input
                    type="number"
                    value={duracao}
                    onChange={(e) => setDuracao(e.target.value)}
                    placeholder="60"
                    min={1}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {modelo.descricao && (
                <DialogDescription>{modelo.descricao}</DialogDescription>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {modelo.categoria && (
                  <Badge variant="secondary">{modelo.categoria}</Badge>
                )}
                {modelo.duracao_total_minutos && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {modelo.duracao_total_minutos} min
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Criado {tempoRelativo}
                </span>
              </div>
            </>
          )}
        </DialogHeader>

        <Separator />

        {/* Estatísticas */}
        <div className="flex items-center gap-6 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="font-medium">{totalExercicios}</span>
            <span className="text-muted-foreground">exercícios</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Blocks className="h-4 w-4 text-primary" />
            <span className="font-medium">{totalBlocos}</span>
            <span className="text-muted-foreground">blocos</span>
          </div>
        </div>

        <Separator />

        {/* Conteúdo */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* Blocos */}
            {modelo.blocos && modelo.blocos.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Blocks className="h-4 w-4" />
                  Blocos de Treino
                </h4>
                <div className="space-y-2">
                  {modelo.blocos.map((bloco, idx) => (
                    <div
                      key={bloco.id || idx}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {idx + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{bloco.nome}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {bloco.tipo}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {bloco.posicao}
                          </Badge>
                          {bloco.duracao_estimada_minutos && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {bloco.duracao_estimada_minutos}min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exercícios */}
            {modelo.exercicios && modelo.exercicios.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Exercícios
                </h4>
                <div className="space-y-2">
                  {modelo.exercicios.map((ex, idx) => {
                    const links = ex.links_demonstracao || (ex.link_video ? [{ label: "Vídeo", url: ex.link_video }] : []);
                    
                    return (
                      <div
                        key={ex.id || idx}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <Badge variant="outline" className="shrink-0 mt-0.5">
                          {idx + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ex.nome}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{ex.series}x{ex.repeticoes}</span>
                            {ex.carga && <span>• {ex.carga}</span>}
                            <span>• {ex.descanso}s descanso</span>
                          </div>
                          {ex.observacoes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {ex.observacoes}
                            </p>
                          )}
                          {/* Links de demonstração */}
                          {links.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {links.map((link, linkIdx) => (
                                <a
                                  key={linkIdx}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {link.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {totalExercicios === 0 && totalBlocos === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum conteúdo neste modelo</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2 sm:gap-0">
          {editando ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelarEdicao}
                disabled={isAtualizando}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={isAtualizando || !nome.trim()}
              >
                {isAtualizando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={() => onAplicar(modelo)}>
                <Calendar className="h-4 w-4 mr-2" />
                Aplicar Modelo
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
