// components/WorkoutDayHeader.tsx
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle2,
  Dumbbell,
  Link as LinkIcon,
  Blocks,
} from "lucide-react";

interface WorkoutDayHeaderProps {
  diaNome: string;
  descricao?: string | null;
  totalExercicios: number;
  totalGrupos: number;
  totalBlocos: number;
  progresso: number;
  treinoIniciado: boolean;
}

export function WorkoutDayHeader({
  diaNome,
  descricao,
  totalExercicios,
  totalGrupos,
  totalBlocos,
  progresso,
  treinoIniciado,
}: WorkoutDayHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Título */}
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold">{diaNome}</h2>
          {descricao && (
            <p className="text-sm text-muted-foreground">🎯 {descricao}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-2">
        {totalExercicios > 0 && (
          <Badge variant="outline" className="text-xs">
            <Dumbbell className="h-3 w-3 mr-1" />
            {totalExercicios} exercício{totalExercicios !== 1 ? "s" : ""}
          </Badge>
        )}

        {totalGrupos > 0 && (
          <Badge variant="outline" className="text-xs">
            <LinkIcon className="h-3 w-3 mr-1" />
            {totalGrupos} grupo{totalGrupos !== 1 ? "s" : ""}
          </Badge>
        )}

        {totalBlocos > 0 && (
          <Badge variant="outline" className="text-xs">
            <Blocks className="h-3 w-3 mr-1" />
            {totalBlocos} bloco{totalBlocos !== 1 ? "s" : ""}
          </Badge>
        )}

        {progresso > 0 && progresso < 100 && (
          <Badge variant="default" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {progresso}% concluído
          </Badge>
        )}

        {progresso === 100 && (
          <Badge variant="default" className="bg-primary text-xs">
            ✓ Treino Completo!
          </Badge>
        )}
      </div>
    </div>
  );
}

export default WorkoutDayHeader;
