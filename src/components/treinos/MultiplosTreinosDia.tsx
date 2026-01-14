import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreinoDia } from "@/types/treino";

interface MultiplosTreinosDiaProps {
  dia: number;
  diaNome: string;
  treinos: TreinoDia[];
  onAddTreino: (dia: number, nomeTreino: string) => void;
  onRenameTreino: (treinoId: string, novoNome: string) => void;
  onDeleteTreino: (treinoId: string) => void;
  onSelectTreino: (treino: TreinoDia) => void;
  selectedTreinoId?: string | null;
  readOnly?: boolean;
  themeColor?: string;
}

export function MultiplosTreinosDia({
  dia,
  diaNome,
  treinos,
  onAddTreino,
  onRenameTreino,
  onDeleteTreino,
  onSelectTreino,
  selectedTreinoId,
  readOnly = false,
  themeColor,
}: MultiplosTreinosDiaProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [novoNomeTreino, setNovoNomeTreino] = useState("");
  const [treinoParaRenomear, setTreinoParaRenomear] = useState<TreinoDia | null>(null);

  const handleAddTreino = () => {
    if (novoNomeTreino.trim()) {
      onAddTreino(dia, novoNomeTreino.trim());
      setNovoNomeTreino("");
      setAddDialogOpen(false);
    }
  };

  const handleOpenRename = (treino: TreinoDia) => {
    setTreinoParaRenomear(treino);
    setNovoNomeTreino(treino.nome_treino || "Treino Principal");
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = () => {
    if (treinoParaRenomear?.treinoId && novoNomeTreino.trim()) {
      onRenameTreino(treinoParaRenomear.treinoId, novoNomeTreino.trim());
      setNovoNomeTreino("");
      setTreinoParaRenomear(null);
      setRenameDialogOpen(false);
    }
  };

  // Se não há treinos, mostrar estado vazio
  if (treinos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Dumbbell className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum treino para {diaNome}
          </p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Treino
            </Button>
          )}
        </CardContent>

        {/* Dialog para adicionar treino */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Treino - {diaNome}</DialogTitle>
              <DialogDescription>
                Dê um nome para identificar este treino (ex: "Manhã", "Cardio Tarde")
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Nome do treino..."
              value={novoNomeTreino}
              onChange={(e) => setNovoNomeTreino(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTreino()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTreino} disabled={!novoNomeTreino.trim()}>
                Criar Treino
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Se há apenas 1 treino, mostrar de forma simplificada
  if (treinos.length === 1) {
    const treino = treinos[0];
    const totalItens = treino.exercicios.length;
    const concluidos = treino.exercicios.filter((e) => e.concluido).length;
    const progresso = totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0;

    return (
      <>
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedTreinoId === treino.treinoId && "ring-2 ring-primary"
          )}
          onClick={() => onSelectTreino(treino)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {treino.nome_treino || "Treino Principal"}
                {treino.concluido && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </CardTitle>
              {!readOnly && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenRename(treino)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Renomear
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{totalItens} exercícios</Badge>
              {progresso > 0 && (
                <Badge variant={progresso === 100 ? "default" : "outline"}>
                  {progresso}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Treino - {diaNome}</DialogTitle>
              <DialogDescription>
                Adicione mais um treino para este dia (ex: "Cardio Tarde")
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Nome do treino..."
              value={novoNomeTreino}
              onChange={(e) => setNovoNomeTreino(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTreino()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTreino} disabled={!novoNomeTreino.trim()}>
                Criar Treino
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renomear Treino</DialogTitle>
            </DialogHeader>
            <Input
              value={novoNomeTreino}
              onChange={(e) => setNovoNomeTreino(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmRename()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmRename}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Múltiplos treinos no dia
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {treinos.length} treinos
          </span>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>

        {treinos
          .sort((a, b) => (a.ordem_no_dia || 1) - (b.ordem_no_dia || 1))
          .map((treino) => {
            const totalItens = treino.exercicios.length;
            const concluidos = treino.exercicios.filter((e) => e.concluido).length;
            const progresso = totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0;

            return (
              <Card
                key={treino.treinoId}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedTreinoId === treino.treinoId && "ring-2",
                  treino.concluido && "bg-green-500/5"
                )}
                style={{
                  borderColor:
                    selectedTreinoId === treino.treinoId
                      ? themeColor || "hsl(var(--primary))"
                      : undefined,
                }}
                onClick={() => onSelectTreino(treino)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {treino.concluido ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">
                        {treino.nome_treino || `Treino ${treino.ordem_no_dia || 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {totalItens} ex.
                      </Badge>
                      {progresso > 0 && (
                        <Badge
                          variant={progresso === 100 ? "default" : "outline"}
                          className="text-xs"
                        >
                          {progresso}%
                        </Badge>
                      )}

                      {!readOnly && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenRename(treino)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => treino.treinoId && onDeleteTreino(treino.treinoId)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Dialogs */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Treino - {diaNome}</DialogTitle>
            <DialogDescription>
              Adicione mais um treino para este dia
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nome do treino..."
            value={novoNomeTreino}
            onChange={(e) => setNovoNomeTreino(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTreino()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTreino} disabled={!novoNomeTreino.trim()}>
              Criar Treino
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Treino</DialogTitle>
          </DialogHeader>
          <Input
            value={novoNomeTreino}
            onChange={(e) => setNovoNomeTreino(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirmRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
