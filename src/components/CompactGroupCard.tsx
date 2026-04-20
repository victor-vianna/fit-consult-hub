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
  circuito: { label: "Circuito", icon: "🔁" },
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
  profileId?: string;
}

export function CompactGroupCard({
  grupo,
  index,
  onToggleConcluido,
  onToggleGrupoConcluido,
  profileId,
}: CompactGroupCardProps) {
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
  const concluidosCount = localExercicios.filter((e) => e.concluido).length;

  const [collapsed, setCollapsed] = useState(false);

  const handleToggleGrupo = async () => {
    if (!onToggleGrupoConcluido) return;
    const novoStatus = !todosConcluidos;

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
        "overflow-hidden transition-all duration-300",
        todosConcluidos && "bg-green-50/50 dark:bg-green-950/10 border-green-200/50",
        algumConcluido && !todosConcluidos && "border-yellow-500/50"
      )}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className={cn(
          "flex items-center gap-3 p-3",
          todosConcluidos
            ? "bg-green-50/30 dark:bg-green-950/10"
            : "bg-blue-50/50 dark:bg-blue-950/20"
        )}>
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

          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
            todosConcluidos
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-blue-100 dark:bg-blue-900/30"
          )}>
            <LinkIcon className={cn(
              "h-6 w-6",
              todosConcluidos ? "text-green-600" : "text-blue-600"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="font-semibold text-xs">
                {tipoConfig.icon} {tipoConfig.label}
              </Badge>
              {todosConcluidos ? (
                <Badge className="bg-green-600 text-xs">✓ Completo</Badge>
              ) : algumConcluido ? (
                <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-500">
                  {concluidosCount}/{localExercicios.length}
                </Badge>
              ) : null}
            </div>
            {/* Show exercise names in header */}
            <p className={cn(
              "text-xs text-muted-foreground mt-0.5",
              todosConcluidos && "line-through"
            )}>
              {localExercicios.map((e) => e.nome).join(" → ")}
            </p>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                !collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Exercícios - visible by default, can be collapsed */}
        {!collapsed && (
          <div className="p-3 space-y-2 border-t">
            {/* Instrução */}
            {!todosConcluidos && (
              <div className="flex items-start gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg mb-1">
                <div className="flex flex-col items-center gap-1 mt-0.5">
                  <Repeat className="h-3.5 w-3.5 text-primary" />
                  <ArrowDown className="h-2.5 w-2.5 text-primary/60" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Execute em sequência, depois descanse{" "}
                  <strong>{grupo.descanso_entre_grupos || 60}s</strong>
                </p>
              </div>
            )}

            {/* Exercícios do Grupo - individually configurable */}
            {localExercicios.map((exercicio, idx) => (
              <CompactExerciseCard
                key={exercicio.id}
                exercicio={exercicio}
                index={idx}
                onToggleConcluido={onToggleConcluido}
                profileId={profileId}
              />
            ))}

            {/* Descanso entre grupos */}
            {grupo.descanso_entre_grupos && grupo.descanso_entre_grupos > 0 && !todosConcluidos && (
              <div className="flex items-center justify-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
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
