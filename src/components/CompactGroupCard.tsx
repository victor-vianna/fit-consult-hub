// components/CompactGroupCard.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  Clock,
  Repeat,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompactExerciseCard } from "./CompactExerciseCard";

const TIPOS_AGRUPAMENTO = {
  normal: { label: "Normal", icon: "🏋️" },
  "bi-set": { label: "Bi-Set", icon: "🔄" },
  "tri-set": { label: "Tri-Set", icon: "🔄🔄" },
  "drop-set": { label: "Drop-Set", icon: "📉" },
  superset: { label: "Super-Set", icon: "⚡" },
} as const;

interface CompactGroupCardProps {
  grupo: {
    grupo_id: string;
    tipo_agrupamento: string;
    descanso_entre_grupos?: number | null;
    exercicios: any[];
  };
  index: number;
  onToggleConcluido?: (id: string, concluido: boolean) => Promise<any>;
  onToggleGrupoConcluido?: (
    grupoId: string,
    concluido: boolean
  ) => Promise<void>;
}

export function CompactGroupCard({
  grupo,
  index,
  onToggleConcluido,
  onToggleGrupoConcluido,
}: CompactGroupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localExercicios, setLocalExercicios] = useState(grupo.exercicios);

  useEffect(() => {
    setLocalExercicios(grupo.exercicios);
  }, [grupo.exercicios]);

  const tipoConfig =
    TIPOS_AGRUPAMENTO[
      grupo.tipo_agrupamento as keyof typeof TIPOS_AGRUPAMENTO
    ] || TIPOS_AGRUPAMENTO["bi-set"];

  const todosConcluidos =
    localExercicios.length > 0 && localExercicios.every((e) => e.concluido);
  const algumConcluido = localExercicios.some((e) => e.concluido);

  const handleToggleGrupo = async () => {
    if (!onToggleGrupoConcluido) return;
    const novoStatus = !todosConcluidos;

    // Update otimista
    setLocalExercicios((prev) =>
      prev.map((e) => ({ ...e, concluido: novoStatus }))
    );

    try {
      await onToggleGrupoConcluido(grupo.grupo_id, novoStatus);
    } catch (error) {
      console.error("Erro ao marcar grupo:", error);
      setLocalExercicios(grupo.exercicios);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        todosConcluidos && "bg-green-50 dark:bg-green-950/20 border-green-300",
        algumConcluido && !todosConcluidos && "border-yellow-500/50"
      )}
    >
      <CardContent className="p-0">
        {/* Header Compacto */}
        <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/20">
          {/* Checkbox Grupo */}
          {onToggleGrupoConcluido && (
            <button
              onClick={handleToggleGrupo}
              className="shrink-0 transition-transform hover:scale-110"
            >
              {todosConcluidos ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Circle className="h-6 w-6 text-primary" />
              )}
            </button>
          )}

          {/* Ícone de Grupo */}
          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <LinkIcon className="h-6 w-6 text-blue-600" />
          </div>

          {/* Info do Grupo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-semibold text-xs">
                {tipoConfig.icon} {tipoConfig.label}
              </Badge>
              {todosConcluidos && (
                <Badge className="bg-green-600 text-xs">Completo</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {localExercicios.length} exercício
              {localExercicios.length !== 1 ? "s" : ""} em sequência
            </p>
          </div>

          {/* Botão Expandir */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Lista de Exercícios Expandida */}
        {expanded && (
          <div className="p-3 space-y-2 border-t">
            {/* Instrução */}
            <div className="flex items-start gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg mb-3">
              <div className="flex flex-col items-center gap-1 mt-1">
                <Repeat className="h-4 w-4 text-primary" />
                <ArrowDown className="h-3 w-3 text-primary/60" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-primary">
                  Execute em sequência
                </p>
                <p className="text-xs text-muted-foreground">
                  Faça todos os exercícios, depois descanse{" "}
                  {grupo.descanso_entre_grupos || 60}s
                </p>
              </div>
            </div>

            {/* Exercícios do Grupo */}
            {localExercicios.map((exercicio, idx) => (
              <CompactExerciseCard
                key={exercicio.id}
                exercicio={exercicio}
                index={idx}
                onToggleConcluido={onToggleConcluido}
              />
            ))}

            {/* Descanso entre grupos */}
            {grupo.descanso_entre_grupos && grupo.descanso_entre_grupos > 0 && (
              <div className="flex items-center justify-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-700" />
                <span className="text-xs font-medium text-yellow-700">
                  Descanse {grupo.descanso_entre_grupos}s após este grupo
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CompactGroupCard;
