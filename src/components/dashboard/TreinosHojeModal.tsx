import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, Dumbbell, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface AlunoTreinoHoje {
  id: string;
  nome: string;
  treinou: boolean;
  horario_treino?: string;
  duracao_minutos?: number;
}

interface TreinosHojeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunosTreinaram: AlunoTreinoHoje[];
  alunosNaoTreinaram: AlunoTreinoHoje[];
  themeColor?: string;
}

export function TreinosHojeModal({
  open,
  onOpenChange,
  alunosTreinaram,
  alunosNaoTreinaram,
  themeColor,
}: TreinosHojeModalProps) {
  const navigate = useNavigate();

  const handleAlunoClick = (alunoId: string) => {
    onOpenChange(false);
    navigate(`/alunos/${alunoId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" style={{ color: themeColor }} />
            Treinos de Hoje
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alunos que treinaram */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                Treinaram ({alunosTreinaram.length})
              </span>
            </div>
            <ScrollArea className="h-[150px]">
              {alunosTreinaram.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum aluno treinou ainda hoje
                </p>
              ) : (
                <div className="space-y-2">
                  {alunosTreinaram.map((aluno) => (
                    <div
                      key={aluno.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 cursor-pointer hover:bg-green-500/20 transition-colors"
                      onClick={() => handleAlunoClick(aluno.id)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{aluno.nome}</p>
                          {aluno.horario_treino && (
                            <p className="text-xs text-muted-foreground">
                              às {format(parseISO(aluno.horario_treino), "HH:mm", { locale: ptBR })}
                              {aluno.duracao_minutos && ` • ${aluno.duracao_minutos}min`}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        ✓ Concluído
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Alunos que não treinaram */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Ainda não treinaram ({alunosNaoTreinaram.length})
              </span>
            </div>
            <ScrollArea className="h-[150px]">
              {alunosNaoTreinaram.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Todos os alunos já treinaram! 🎉
                </p>
              ) : (
                <div className="space-y-2">
                  {alunosNaoTreinaram.map((aluno) => (
                    <div
                      key={aluno.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleAlunoClick(aluno.id)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-sm">{aluno.nome}</p>
                      </div>
                      <Badge variant="secondary">Pendente</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
