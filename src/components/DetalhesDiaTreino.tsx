// src/components/DetalhesDiaTreino.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTreinosHistorico } from "@/hooks/useTreinosHistorico";
import { useToast } from "@/hooks/use-toast";

interface DetalhesDiaTreinoProps {
  open: boolean;
  onClose: () => void;
  dia: Date;
  treinos: any[];
  profileId: string;
  personalId: string;
  themeColor?: string;
  onTreinoAtualizado?: () => void;
}

export function DetalhesDiaTreino({
  open,
  onClose,
  dia,
  treinos,
  profileId,
  personalId,
  themeColor,
  onTreinoAtualizado,
}: DetalhesDiaTreinoProps) {
  const { marcarConcluido, adicionarObservacao } = useTreinosHistorico(
    profileId,
    dia
  );
  const { toast } = useToast();
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const treino = treinos[0]; // ✅ Mantém apenas o primeiro treino (Treino do dia)

  if (!treino) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nenhum treino encontrado</DialogTitle>
          </DialogHeader>
          <p className="text-center text-muted-foreground py-4">
            Nenhum treino planejado para este dia.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const handleMarcarConcluido = async () => {
    try {
      await marcarConcluido(treino.id, !treino.concluido);

      toast({
        title: treino.concluido ? "Treino desmarcado" : "Treino concluído! 🎉",
        description: treino.concluido
          ? "Treino marcado como pendente"
          : "Parabéns por completar o treino!",
      });

      onTreinoAtualizado?.();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o treino.",
        variant: "destructive",
      });
    }
  };

  const handleSalvarObservacao = async () => {
    if (!observacao.trim()) {
      toast({
        title: "Atenção",
        description: "Digite uma observação antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    setSalvando(true);

    try {
      await adicionarObservacao(treino.id, observacao);

      toast({
        title: "Observação salva!",
        description: "Sua observação foi registrada com sucesso.",
      });

      setObservacao("");
      onTreinoAtualizado?.();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a observação.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-2xl capitalize"
            style={{ color: themeColor }}
          >
            {format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">
                    {treino.descricao || "Treino do dia"}
                  </h3>
                  <Badge
                    variant={treino.concluido ? "default" : "secondary"}
                    style={
                      treino.concluido && themeColor
                        ? { backgroundColor: themeColor, color: "white" }
                        : undefined
                    }
                  >
                    {treino.concluido ? "Concluído" : "Pendente"}
                  </Badge>
                </div>
              </div>

              <Button
                variant={treino.concluido ? "default" : "outline"}
                size="sm"
                onClick={handleMarcarConcluido}
                style={
                  treino.concluido && themeColor
                    ? {
                        backgroundColor: themeColor,
                        borderColor: themeColor,
                      }
                    : undefined
                }
              >
                {treino.concluido ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Concluído
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4 mr-2" />
                    Marcar como feito
                  </>
                )}
              </Button>
            </div>

            {/* Observações anteriores */}
            {treino.observacoes && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    Observações anteriores:
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {treino.observacoes}
                </p>
              </div>
            )}

            {/* Nova observação */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Adicionar observação:
              </label>
              <Textarea
                placeholder="Como foi o treino? Alguma dificuldade ou conquista?"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
              />
              <Button
                size="sm"
                onClick={handleSalvarObservacao}
                disabled={salvando}
                style={
                  themeColor
                    ? {
                        backgroundColor: `${themeColor}20`,
                        color: themeColor,
                        borderColor: themeColor,
                      }
                    : undefined
                }
              >
                {salvando ? "Salvando..." : "Salvar Observação"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
