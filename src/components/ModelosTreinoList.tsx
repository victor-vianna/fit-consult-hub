// components/ModelosTreinoList.tsx
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Trash2,
  Calendar,
  Dumbbell,
  Blocks,
  BookTemplate,
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
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ModeloTreino } from "@/hooks/useModelosTreino";

interface ModelosTreinoListProps {
  modelos: ModeloTreino[];
  loading?: boolean;
  onAplicar: (modelo: ModeloTreino) => void;
  onDeletar: (modeloId: string) => Promise<void>;
}

export function ModelosTreinoList({
  modelos,
  loading = false,
  onAplicar,
  onDeletar,
}: ModelosTreinoListProps) {
  const [modeloDeletar, setModeloDeletar] = useState<string | null>(null);
  const [deletando, setDeletando] = useState(false);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando modelos...</p>
      </div>
    );
  }

  if (modelos.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modelos.map((modelo) => {
          const totalExercicios = modelo.exercicios?.length || 0;
          const totalBlocos = modelo.blocos?.length || 0;
          const tempoRelativo = formatDistanceToNow(
            new Date(modelo.created_at),
            {
              addSuffix: true,
              locale: ptBR,
            }
          );

          return (
            <Card
              key={modelo.id}
              className="group hover:shadow-md transition-all"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg line-clamp-1">
                      {modelo.nome}
                    </CardTitle>
                    {modelo.categoria && (
                      <div className="mt-2">
                        <Badge variant="secondary">{modelo.categoria}</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {modelo.descricao && (
                  <CardDescription className="line-clamp-2 mt-2">
                    {modelo.descricao}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  Criado {tempoRelativo}
                </p>

                {/* Ações */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onAplicar(modelo)}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Aplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModeloDeletar(modelo.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
