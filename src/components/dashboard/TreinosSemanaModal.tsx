import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, CheckCircle2, Clock, Dumbbell, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { formatDisplayDateRange } from "@/utils/dateFormat";

export interface AlunoTreinoSemana {
  id: string;
  nome: string;
  total_treinos: number;
  ultimo_treino: string;
  duracao_total_minutos: number;
}

interface TreinosSemanaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunos: AlunoTreinoSemana[];
  inicioSemana: Date;
  fimSemana: Date;
  totalTreinos: number;
  themeColor?: string;
}

export function TreinosSemanaModal({
  open,
  onOpenChange,
  alunos,
  inicioSemana,
  fimSemana,
  totalTreinos,
  themeColor,
}: TreinosSemanaModalProps) {
  const navigate = useNavigate();

  const handleAlunoClick = (alunoId: string) => {
    onOpenChange(false);
    navigate(`/aluno/${alunoId}?tab=historico`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" style={{ color: themeColor }} />
            Treinos da Semana
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Finalizados
              </div>
              <p className="mt-1 text-2xl font-bold">{totalTreinos}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Alunos
              </div>
              <p className="mt-1 text-2xl font-bold">{alunos.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDisplayDateRange(inicioSemana, fimSemana)}
          </div>

          <ScrollArea className="h-[320px]">
            {alunos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum aluno finalizou treino nesta semana.
              </p>
            ) : (
              <div className="space-y-2">
                {alunos.map((aluno) => (
                  <button
                    key={aluno.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg bg-green-500/10 p-3 text-left transition-colors hover:bg-green-500/20"
                    onClick={() => handleAlunoClick(aluno.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{aluno.nome}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Ultimo: {format(parseISO(aluno.ultimo_treino), "dd/MM 'as' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {aluno.duracao_total_minutos > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {aluno.duracao_total_minutos}min
                        </span>
                      )}
                      <Badge variant="outline" className="border-green-600 text-green-600">
                        {aluno.total_treinos} treino{aluno.total_treinos === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
