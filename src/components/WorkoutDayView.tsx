// components/WorkoutDayView.tsx
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dumbbell,
  Calendar,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { SortableExercicioCard } from "@/components/SortableExercicioCard";
import { GroupedExerciseCard } from "./GroupedExerciseCard";
import { WorkoutTimer } from "./WorkoutTimer";
import { useExerciseGroups } from "@/hooks/useExerciseGroups";
import type { TreinoDia } from "@/types/treino";

interface WorkoutDayViewProps {
  treinos: TreinoDia[];
  profileId: string;
  personalId: string;
  groupsByTreino?: Record<string, any[]>;
  onToggleConcluido: (
    id: string,
    concluido: boolean
  ) => Promise<{
    exercicioId: string;
    concluido: boolean;
  }>;
  onToggleGrupoConcluido?: (
    grupoId: string,
    concluido: boolean
  ) => Promise<void>;
}

const diasSemana = [
  { nome: "Segunda-feira", abrev: "SEG" },
  { nome: "Terça-feira", abrev: "TER" },
  { nome: "Quarta-feira", abrev: "QUA" },
  { nome: "Quinta-feira", abrev: "QUI" },
  { nome: "Sexta-feira", abrev: "SEX" },
  { nome: "Sábado", abrev: "SÁB" },
  { nome: "Domingo", abrev: "DOM" },
];

export function WorkoutDayView({
  treinos: initialTreinos,
  profileId,
  personalId,
  onToggleConcluido,
  onToggleGrupoConcluido,
}: WorkoutDayViewProps) {
  const [treinos, setTreinos] = useState<TreinoDia[]>(initialTreinos);
  const { obterGruposDoTreino } = useExerciseGroups();
  const [groupsByTreino, setGroupsByTreino] = useState<Record<string, any[]>>(
    {}
  );
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [localGroups, setLocalGroups] = useState(groupsByTreino);

  const getTreinoId = (treino: TreinoDia): string | null => {
    const rawId = (treino as any).treinoId ?? (treino as any).id;
    return rawId ? String(rawId) : null;
  };

  const calcularProgresso = (treino: TreinoDia) => {
    if (treino.exercicios.length === 0) return 0;
    const concluidos = treino.exercicios.filter((e) => e.concluido).length;
    return Math.round((concluidos / treino.exercicios.length) * 100);
  };

  const primeiroDiaComExercicios =
    treinos.find((t) => t.exercicios.length > 0)?.dia || 1;

  const handleToggleConcluido = async (id: string, concluido: boolean) => {
    try {
      return await onToggleConcluido(id, concluido);
    } catch (error) {
      console.error("Erro ao marcar exercício:", error);
      throw error;
    }
  };

  const handleOptimisticToggle = (id: string, concluido: boolean) => {
    setLocalGroups((prev) => {
      const updated = { ...prev };

      for (const treinoId in updated) {
        updated[treinoId] = updated[treinoId].map((grupo) => {
          const newExercicios = grupo.exercicios.map((ex) =>
            ex.id === id ? { ...ex, concluido } : ex
          );

          const changed = newExercicios.some(
            (ex, i) => ex.concluido !== grupo.exercicios[i]?.concluido
          );

          return changed ? { ...grupo, exercicios: newExercicios } : grupo;
        });
      }

      return { ...updated };
    });
  };

  // ✅ Toggle completo de grupo (marca/desmarca todos os exercícios)
  const handleToggleGrupo = async (grupoId: string, concluido: boolean) => {
    setLocalGroups((prev) => {
      const updated = { ...prev };
      for (const treinoId in updated) {
        updated[treinoId] = updated[treinoId].map((grupo) =>
          grupo.grupo_id === grupoId
            ? {
                ...grupo,
                exercicios: grupo.exercicios.map((ex) => ({
                  ...ex,
                  concluido,
                })),
              }
            : grupo
        );
      }
      return { ...updated };
    });

    if (onToggleGrupoConcluido) {
      await onToggleGrupoConcluido(grupoId, concluido);
    }
  };

  // ✅ Toggle individual (marca apenas um exercício)
  const handleToggleExercicio = async (id: string, concluido: boolean) => {
    handleOptimisticToggle(id, concluido);
    await onToggleConcluido(id, concluido);
  };

  // Carregar grupos ao montar ou atualizar treinos
  useEffect(() => {
    let mounted = true;

    const loadGroups = async () => {
      if (!treinos || treinos.length === 0) {
        if (mounted) {
          setGroupsByTreino({});
          setLoadingGroups(false);
        }
        return;
      }

      setLoadingGroups(true);
      const mapping: Record<string, any[]> = {};

      for (const treino of treinos) {
        if (!mounted) break;
        const treinoId = getTreinoId(treino);

        console.log("🔍 Carregando grupos do treino:", {
          dia: treino.dia,
          treinoId,
          exercicios: treino.exercicios.length,
        });

        if (!treinoId) {
          mapping[String(treino.dia)] = [];
          continue;
        }
        try {
          const grupos = await obterGruposDoTreino(treinoId);
          mapping[treinoId] = Array.isArray(grupos) ? grupos : [];

          console.log("✅ Grupos carregados:", {
            treinoId,
            totalGrupos: grupos.length,
            grupos,
            primeiroGrupo: grupos[0],
          });
        } catch (err) {
          console.warn(`[WorkoutDayView] Erro ao carregar grupos:`, err);
          mapping[treinoId] = [];
        }
      }

      if (mounted) {
        console.log("✅ Todos os grupos carregados:", mapping);
        setGroupsByTreino(mapping);
        setLoadingGroups(false);
      }
    };

    loadGroups();
    return () => {
      mounted = false;
    };
  }, [treinos, obterGruposDoTreino]);

  useEffect(() => {
    setLocalGroups(groupsByTreino);
  }, [groupsByTreino]);

  // ✅ Exemplo de handler completo para toggle de grupo
  const handleToggleGrupoConcluido = (grupoId: string, concluido: boolean) => {
    setGroupsByTreino((prev) => {
      const newGroups = { ...prev };
      for (const treinoId in newGroups) {
        newGroups[treinoId] = newGroups[treinoId].map((grupo) =>
          grupo.grupo_id === grupoId
            ? {
                ...grupo,
                exercicios: grupo.exercicios.map((ex) => ({
                  ...ex,
                  concluido,
                })),
              }
            : grupo
        );
      }
      return newGroups;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-xl shadow-lg">
            <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Meus Treinos
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Acompanhe seu progresso semanal
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={String(primeiroDiaComExercicios)} className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-card/50 backdrop-blur-sm border shadow-lg rounded-xl">
          {diasSemana.map((dia, index) => {
            const treino = treinos.find((t) => t.dia === index + 1);
            const temExercicios = treino && treino.exercicios.length > 0;
            const progresso = treino ? calcularProgresso(treino) : 0;

            return (
              <TabsTrigger
                key={index + 1}
                value={String(index + 1)}
                disabled={!temExercicios}
                className="flex flex-col gap-0.5 sm:gap-1 py-2 sm:py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg transition-all"
              >
                <span className="text-[10px] sm:text-xs font-bold">
                  {dia.abrev}
                </span>
                {temExercicios && (
                  <div className="flex flex-col items-center gap-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-3 sm:h-4"
                    >
                      {treino.exercicios.length}
                    </Badge>
                    {progresso > 0 && (
                      <span className="text-[9px] sm:text-[10px] font-bold opacity-80">
                        {progresso}%
                      </span>
                    )}
                  </div>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Conteúdo de cada dia */}
        {treinos.map((treino) => {
          const diaInfo = diasSemana[treino.dia - 1];
          const temExercicios = treino.exercicios.length > 0;
          const progresso = calcularProgresso(treino);

          const treinoId = getTreinoId(treino);
          const grupos = treinoId ? groupsByTreino[treinoId] ?? [] : [];

          return (
            <TabsContent
              key={treino.dia}
              value={String(treino.dia)}
              className="mt-4 sm:mt-6 space-y-4 sm:space-y-6"
            >
              {/* Cronômetro */}
              {temExercicios && treino.treinoId && (
                <WorkoutTimer
                  treinoId={treino.treinoId}
                  profileId={profileId}
                  personalId={personalId}
                  readOnly={false}
                />
              )}

              {/* Card do dia */}
              <Card className="border-primary/30 shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
                        {diaInfo.nome}
                      </CardTitle>
                    </div>

                    {treino.descricao && (
                      <CardDescription className="text-sm sm:text-base font-medium">
                        🎯 {treino.descricao}
                      </CardDescription>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs sm:text-sm"
                      >
                        <Dumbbell className="h-3 w-3 mr-1" />
                        {treino.exercicios.length} exercício
                        {treino.exercicios.length !== 1 ? "s" : ""}
                      </Badge>

                      {grupos.length > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs sm:text-sm bg-blue-50 border-blue-200"
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          {grupos.length} grupo
                          {grupos.length !== 1 ? "s" : ""}
                        </Badge>
                      )}

                      {progresso > 0 && progresso < 100 && (
                        <Badge
                          variant="default"
                          className="bg-primary text-xs sm:text-sm"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {progresso}% concluído
                        </Badge>
                      )}

                      {progresso === 100 && (
                        <Badge
                          variant="default"
                          className="bg-green-600 text-xs sm:text-sm animate-pulse"
                        >
                          ✓ Treino Completo!
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Conteúdo do Card */}
                <CardContent className="p-4 sm:p-6">
                  {!temExercicios ? (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center space-y-4">
                      <div className="p-4 sm:p-5 bg-muted/50 rounded-full">
                        <Dumbbell className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-base sm:text-lg font-semibold text-muted-foreground">
                          Dia de Descanso
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-4">
                          Nenhum exercício programado para este dia.
                          <br />
                          Aproveite para recuperar!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {/* ✅ GRUPOS DE EXERCÍCIOS */}
                      {grupos.length > 0 &&
                        grupos.map((grupo, idx) => (
                          <GroupedExerciseCard
                            key={grupo.grupo_id || grupo.id || idx}
                            grupo={grupo}
                            index={idx}
                            readOnly={false}
                            onToggleGrupoConcluido={handleToggleGrupoConcluido}
                            onToggleConcluido={handleOptimisticToggle}
                            onOptimisticToggle={handleOptimisticToggle}
                          />
                        ))}

                      {/* ✅ EXERCÍCIOS ISOLADOS */}
                      {treino.exercicios
                        .filter((ex) => !ex.grupo_id)
                        .map((exercicio, index) => (
                          <SortableExercicioCard
                            key={exercicio.id}
                            exercicio={exercicio}
                            index={index}
                            readOnly={false}
                            onToggleConcluido={handleToggleConcluido}
                            onOptimisticToggle={handleOptimisticToggle}
                          />
                        ))}

                      {/* Loader */}
                      {loadingGroups && (
                        <div className="flex items-center justify-center py-4 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-xs">Carregando grupos...</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export default WorkoutDayView;
