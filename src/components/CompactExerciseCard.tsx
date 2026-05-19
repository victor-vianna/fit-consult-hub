// components/CompactExerciseCard.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  Play,
  Clock,
  Dumbbell,
  Weight,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InlinePesoInput } from "@/components/InlinePesoInput";
import { WeightHistoryBadge } from "@/components/WeightHistoryBadge";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { useWeightHistory } from "@/hooks/useWeightHistory";
import { supabase } from "@/integrations/supabase/client";

interface CompactExerciseCardProps {
  exercicio: {
    id: string;
    nome: string;
    link_video?: string | null;
    series?: number;
    repeticoes?: string;
    descanso?: number;
    carga?: string | null;
    peso_executado?: string | null;
    observacoes?: string | null;
    concluido?: boolean;
    thumbnail?: string | null;
  };
  index: number;
  onToggleConcluido?: (id: string, concluido: boolean) => Promise<any>;
  profileId?: string;
}

export function CompactExerciseCard({
  exercicio,
  index,
  onToggleConcluido,
  profileId,
}: CompactExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localConcluido, setLocalConcluido] = useState(
    exercicio.concluido || false
  );
  const { abrirExercicioNaBiblioteca } = useExerciseLibrary();
  const { ultimoPeso, ultimaData, historico, loading: loadingHistory } = useWeightHistory(
    exercicio.nome,
    profileId || null
  );
  const handleToggle = async () => {
    const novoValor = !localConcluido;
    setLocalConcluido(novoValor);

    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    try {
      await onToggleConcluido?.(exercicio.id, novoValor);
    } catch (error) {
      console.error("Erro ao marcar exercício:", error);
      setLocalConcluido(!novoValor);
    }
  };

  const handleSavePeso = async (exercicioId: string, peso: string) => {
    try {
      const { error } = await supabase
        .from("exercicios")
        .update({ peso_executado: peso })
        .eq("id", exercicioId);

      if (error) throw error;
    } catch (error) {
      console.error("Erro ao atualizar peso:", error);
      throw error;
    }
  };

  // Auto-collapse when completed
  useEffect(() => {
    if (localConcluido) {
      setExpanded(false);
    }
  }, [localConcluido]);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300",
        localConcluido
          ? "bg-green-50/50 dark:bg-green-950/10 border-green-200/50"
          : "border-border hover:shadow-sm"
      )}
    >
      <CardContent className="p-0">
        {/* Minimized view when completed */}
        {localConcluido ? (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              onClick={handleToggle}
              className="shrink-0 transition-transform hover:scale-110 touch-target"
            >
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </button>
            <p className="flex-1 min-w-0 text-sm text-muted-foreground line-through break-words">
              {exercicio.nome}
            </p>
          </div>
        ) : (
          <>
            {/* Header Compacto */}
            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3">
              {/* Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
                aria-label="Marcar exercício como concluído"
                className="shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-1 transition-transform active:scale-95"
              >
                <Circle className="h-6 w-6 text-muted-foreground" />
              </button>

              {/* Thumbnail */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                {exercicio.thumbnail ? (
                  <img
                    src={exercicio.thumbnail}
                    alt={exercicio.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Dumbbell className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Nome + Info Rápida - área clicável para expandir */}
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                className="flex-1 min-w-0 text-left py-1 -my-1"
              >
                <p className="font-semibold text-sm sm:text-base break-words leading-snug">
                  {exercicio.nome}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    {exercicio.series || 3}x{exercicio.repeticoes || "12"}
                  </span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <InlinePesoInput
                      exercicioId={exercicio.id}
                      pesoRecomendado={exercicio.carga || null}
                      pesoExecutado={exercicio.peso_executado || null}
                      onSave={handleSavePeso}
                    />
                  </span>
                </div>
                {/* Referência de peso anterior */}
                {ultimoPeso && !exercicio.peso_executado && (
                  <span onClick={(e) => e.stopPropagation()} className="block mt-1">
                    <WeightHistoryBadge
                      ultimoPeso={ultimoPeso}
                      ultimaData={ultimaData}
                      historico={historico}
                      exercicioNome={exercicio.nome}
                      loading={loadingHistory}
                      compact
                    />
                  </span>
                )}
              </button>

              {/* Botão Expandir */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-label={expanded ? "Recolher" : "Expandir"}
                className="shrink-0 h-11 w-11 min-h-[44px] min-w-[44px]"
              >
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    expanded && "rotate-180"
                  )}
                />
              </Button>
            </div>

            {/* Detalhes Expandidos */}
            {expanded && (
              <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                {/* Links */}
                <div className="flex flex-wrap gap-2 pt-3">
                  {exercicio.link_video && (
                    <a
                      href={exercicio.link_video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-xs text-blue-600 hover:underline flex items-center gap-1 touch-target"
                    >
                      <Play className="h-4 w-4 md:h-3 md:w-3" />
                      Ver demonstração
                    </a>
                  )}
                  <button
                    onClick={() => abrirExercicioNaBiblioteca(exercicio.nome)}
                    className="text-sm md:text-xs text-purple-600 hover:underline flex items-center gap-1 touch-target"
                  >
                    <BookOpen className="h-4 w-4 md:h-3 md:w-3" />
                    Ver na biblioteca
                  </button>
                </div>

                {/* Detalhes Completos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-xs text-muted-foreground">Séries:</span>
                    <Badge variant="outline">{exercicio.series || 3}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-xs text-muted-foreground">
                      Repetições:
                    </span>
                    <Badge variant="outline">{exercicio.repeticoes || "12"}</Badge>
                  </div>

                  {exercicio.descanso && exercicio.descanso > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm md:text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4 md:h-3 md:w-3" />
                        Descanso:
                      </span>
                      <Badge variant="outline">{exercicio.descanso}s</Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-xs text-muted-foreground flex items-center gap-1">
                      <Weight className="h-4 w-4 md:h-3 md:w-3" />
                      {exercicio.carga ? "Carga:" : "Peso executado:"}
                    </span>
                    <InlinePesoInput
                      exercicioId={exercicio.id}
                      pesoRecomendado={exercicio.carga || null}
                      pesoExecutado={exercicio.peso_executado || null}
                      onSave={handleSavePeso}
                    />
                  </div>

                  {/* Histórico de peso */}
                  {ultimoPeso && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm md:text-xs text-muted-foreground">Histórico:</span>
                      <WeightHistoryBadge
                        ultimoPeso={ultimoPeso}
                        ultimaData={ultimaData}
                        historico={historico}
                        exercicioNome={exercicio.nome}
                        loading={loadingHistory}
                      />
                    </div>
                  )}
                </div>

                {/* Observações */}
                {exercicio.observacoes && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm md:text-xs text-muted-foreground italic">
                      💡 {exercicio.observacoes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CompactExerciseCard;
