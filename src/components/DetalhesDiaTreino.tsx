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
  onTreinoAtualizado?: () => void; // ✅ NOVO PROP
}

export function DetalhesDiaTreino({
  open,
  onClose,
  dia,
  treinos,
  profileId,
  personalId,
  themeColor,
  onTreinoAtualizado, // ✅ RECEBER CALLBACK
}: DetalhesDiaTreinoProps) {
  const { marcarConcluido, adicionarObservacao } = useTreinosHistorico(
    profileId,
    dia
  );
  const { toast } = useToast();
  const [observacoes, setObservacoes] = useState<{ [key: string]: string }>({});
  const [salvando, setSalvando] = useState<{ [key: string]: boolean }>({});

  // ✅ MARCAR TREINO COMO CONCLUÍDO COM SINCRONIZAÇÃO
  const handleMarcarConcluido = async (
    treinoId: string,
    concluido: boolean
  ) => {
    try {
      await marcarConcluido(treinoId, concluido);

      toast({
        title: concluido ? "Treino concluído! 🎉" : "Treino desmarcado",
        description: concluido
          ? "Parabéns por completar o treino!"
          : "Treino marcado como pendente",
      });

      // ✅ NOTIFICAR COMPONENTE PAI PARA SINCRONIZAR
      onTreinoAtualizado?.();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o treino",
        variant: "destructive",
      });
    }
  };

  // ✅ SALVAR OBSERVAÇÃO COM FEEDBACK
  const handleSalvarObservacao = async (treinoId: string) => {
    const observacao = observacoes[treinoId] || "";

    if (!observacao.trim()) {
      toast({
        title: "Atenção",
        description: "Digite uma observação antes de salvar",
        variant: "destructive",
      });
      return;
    }

    setSalvando({ ...salvando, [treinoId]: true });

    try {
      await adicionarObservacao(treinoId, observacao);

      toast({
        title: "Observação salva!",
        description: "Sua observação foi registrada com sucesso",
      });

      // Limpar campo após salvar
      setObservacoes({ ...observacoes, [treinoId]: "" });

      // ✅ NOTIFICAR COMPONENTE PAI
      onTreinoAtualizado?.();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a observação",
        variant: "destructive",
      });
    } finally {
      setSalvando({ ...salvando, [treinoId]: false });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-2xl capitalize"
            style={{ color: themeColor || undefined }}
          >
            {format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {treinos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum treino planejado para este dia
            </div>
          ) : (
            treinos.map((treino) => (
              <Card key={treino.id}>
                <CardContent className="pt-6">
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
                              ? {
                                  backgroundColor: themeColor,
                                  color: "white",
                                }
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
                      onClick={() =>
                        handleMarcarConcluido(treino.id, !treino.concluido)
                      }
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

                  {/* Observações existentes */}
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

                  {/* Adicionar nova observação */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Adicionar observação:
                    </label>
                    <Textarea
                      placeholder="Como foi o treino? Alguma dificuldade ou conquista?"
                      value={observacoes[treino.id] || ""}
                      onChange={(e) =>
                        setObservacoes({
                          ...observacoes,
                          [treino.id]: e.target.value,
                        })
                      }
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSalvarObservacao(treino.id)}
                      disabled={salvando[treino.id]}
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
                      {salvando[treino.id]
                        ? "Salvando..."
                        : "Salvar Observação"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
