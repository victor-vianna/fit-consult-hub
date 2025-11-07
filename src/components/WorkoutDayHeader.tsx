// components/WorkoutDayHeader.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckCircle2,
  Dumbbell,
  Link as LinkIcon,
  Blocks,
  Play,
} from "lucide-react";

interface WorkoutDayHeaderProps {
  diaNome: string;
  descricao?: string | null;
  totalExercicios: number;
  totalGrupos: number;
  totalBlocos: number;
  progresso: number;
  onIniciarTreino: () => void;
  treinoIniciado: boolean;
}

export function WorkoutDayHeader({
  diaNome,
  descricao,
  totalExercicios,
  totalGrupos,
  totalBlocos,
  progresso,
  onIniciarTreino,
  treinoIniciado,
}: WorkoutDayHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Título */}
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">{diaNome}</h2>
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
          <Badge
            variant="outline"
            className="text-xs bg-blue-50 border-blue-200 text-blue-700"
          >
            <LinkIcon className="h-3 w-3 mr-1" />
            {totalGrupos} grupo{totalGrupos !== 1 ? "s" : ""}
          </Badge>
        )}

        {totalBlocos > 0 && (
          <Badge
            variant="outline"
            className="text-xs bg-purple-50 border-purple-200 text-purple-700"
          >
            <Blocks className="h-3 w-3 mr-1" />
            {totalBlocos} bloco{totalBlocos !== 1 ? "s" : ""}
          </Badge>
        )}

        {progresso > 0 && progresso < 100 && (
          <Badge variant="default" className="bg-primary text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {progresso}% concluído
          </Badge>
        )}

        {progresso === 100 && (
          <Badge
            variant="default"
            className="bg-green-600 text-xs animate-pulse"
          >
            ✓ Treino Completo!
          </Badge>
        )}
      </div>

      {/* Botão Iniciar Treino */}
      {!treinoIniciado && totalExercicios > 0 && (
        <Button
          onClick={onIniciarTreino}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          size="lg"
        >
          <Play className="h-5 w-5 mr-2" />
          Iniciar Treino
        </Button>
      )}
    </div>
  );
}

export default WorkoutDayHeader;
