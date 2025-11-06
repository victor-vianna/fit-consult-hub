import { useState, useEffect } from "react";
import { useTreinos } from "@/hooks/useTreinos";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit,
  ChevronDown,
  Loader2,
  Dumbbell,
  Calendar,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  Blocks,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExercicioDialog } from "@/components/ExercicioDialog";
import { SortableExercicioCard } from "@/components/SortableExercicioCard";
import { WorkoutTimer } from "./WorkoutTimer";
import { WorkoutDayView } from "./WorkoutDayView";
import ExercisePicker from "@/components/exercises/ExercisePicker";
import { WorkoutBlockDialog } from "./WorkoutBlockDialog";
import { WorkoutBlockCard } from "./WorkoutBlockCard";
import type { Exercise } from "@/types/exercise";
import type { Exercicio as TreinoExercicio, TreinoDia } from "@/types/treino";
import type { BlocoTreino } from "@/types/workoutBlocks";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import {
  GrupoExerciciosInput,
  useExerciseGroups,
} from "@/hooks/useExerciseGroups";
import { useWorkoutBlocks } from "@/hooks/useWorkoutBlocks";
import { GroupedExerciseCard } from "./GroupedExerciseCard";
import { ExerciseGroupDialog } from "./ExerciseGroupDialog";

interface TreinosManagerProps {
  profileId: string;
  personalId: string;
  readOnly?: boolean;
}

type DialogExercicio = {
  id?: string;
  nome: string;
  link_video: string;
  series: number;
  repeticoes: string;
  descanso: number;
  carga: string;
  observacoes: string;
};

const diasSemana = [
  { nome: "Segunda-feira", abrev: "SEG" },
  { nome: "Terça-feira", abrev: "TER" },
  { nome: "Quarta-feira", abrev: "QUA" },
  { nome: "Quinta-feira", abrev: "QUI" },
  { nome: "Sexta-feira", abrev: "SEX" },
  { nome: "Sábado", abrev: "SÁB" },
  { nome: "Domingo", abrev: "DOM" },
];

export function TreinosManager({
  profileId,
  personalId,
  readOnly = false,
}: TreinosManagerProps) {
  const { user } = useAuth();
  const {
    treinos,
    loading,
    adicionarExercicio,
    editarExercicio,
    removerExercicio,
    reordenarExercicios,
    editarDescricao,
    marcarExercicioConcluido,
  } = useTreinos({ profileId, personalId });

  // Hook de agrupamentos
  const { criarGrupo, obterGruposDoTreino, deletarGrupo } = useExerciseGroups();

  // 🆕 Hook de blocos
  const {
    criarBloco,
    obterBlocos,
    deletarBloco,
    marcarConcluido: marcarBlocoConcluido,
    atualizarBloco,
  } = useWorkoutBlocks();

  const [exercicioDialogOpen, setExercicioDialogOpen] = useState(false);
  const [editDescricaoOpen, setEditDescricaoOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [exercicioEditando, setExercicioEditando] =
    useState<DialogExercicio | null>(null);
  const [descricaoEditando, setDescricaoEditando] = useState("");
  const [exercicioTemp, setExercicioTemp] =
    useState<Partial<DialogExercicio> | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    editando: false,
    adicionando: false,
    removendo: false,
  });

  // 🆕 Estado para abrir dialog de agrupamento e blocos
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blocoEditando, setBlocoEditando] = useState<BlocoTreino | null>(null);

  // Cache local (opcional - remover se usar apenas dados de treinos)
  const [groupsByTreino, setGroupsByTreino] = useState<Record<string, any[]>>({});
  const [blocosByTreino, setBlocosByTreino] = useState<Record<string, BlocoTreino[]>>({});

  const isAluno = user?.id === profileId;
  const isPersonal = user?.id === personalId;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 🔧 HELPER: Obter ID do treino de forma consistente
  const getTreinoId = (treino: TreinoDia): string | null => {
    const rawId = (treino as any).treinoId ?? (treino as any).id;
    return rawId ? String(rawId) : null;
  };

  const handleDragEnd = async (event: DragEndEvent, dia: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const treino = treinos.find((t) => t.dia === dia);
    if (!treino) return;

    const oldIndex = treino.exercicios.findIndex((ex) => ex.id === active.id);
    const newIndex = treino.exercicios.findIndex((ex) => ex.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(treino.exercicios, oldIndex, newIndex);

    try {
      await reordenarExercicios(dia, newOrder);
    } catch (error) {
      console.error("[TreinosManager] Erro ao reordenar:", error);
    }
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    setExercicioTemp({
      nome: exercise.nome,
      link_video: exercise.link_youtube ?? "",
      series: 3,
      repeticoes: "12",
      descanso: 60,
      carga: "",
      observacoes: "",
    });
    setPickerOpen(false);
    setExercicioDialogOpen(true);
  };

  const dialogToPayload = (
    d: Omit<DialogExercicio, "id">
  ): Partial<TreinoExercicio> => {
    const cargaTrim = d.carga?.trim();
    return {
      nome: d.nome,
      link_video: d.link_video || "",
      series: d.series,
      repeticoes: d.repeticoes,
      descanso: d.descanso,
      carga: cargaTrim ? String(cargaTrim) || null : null,
      observacoes: d.observacoes || "",
    };
  };

  const treinoExToDialog = (ex: TreinoExercicio): DialogExercicio => ({
    id: ex.id,
    nome: ex.nome,
    link_video: ex.link_video ?? "",
    series: ex.series ?? 3,
    repeticoes: ex.repeticoes ?? "12",
    descanso: ex.descanso ?? 60,
    carga: ex.carga != null ? String(ex.carga) : "",
    observacoes: ex.observacoes ?? "",
  });

  const handleSaveExercicio = async (dados: Omit<DialogExercicio, "id">) => {
    const isEditing = !!exercicioEditando?.id;

    try {
      setLoadingStates((prev) => ({
        ...prev,
        [isEditing ? "editando" : "adicionando"]: true,
      }));

      const payload = dialogToPayload(dados);

      if (isEditing) {
        await editarExercicio(exercicioEditando.id!, payload);
        setExercicioEditando(null);
      } else if (selectedDia !== null) {
        await adicionarExercicio(selectedDia, payload);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      setExercicioDialogOpen(false);
      setExercicioTemp(null);
    } catch (error) {
      console.error("[TreinosManager] Erro ao salvar:", error);
    } finally {
      setLoadingStates({
        editando: false,
        adicionando: false,
        removendo: false,
      });
    }
  };

  const handleSaveDescricao = async () => {
    if (selectedDia === null) return;

    try {
      setLoadingStates((prev) => ({ ...prev, editando: true }));
      await editarDescricao(selectedDia, descricaoEditando || null);
      setEditDescricaoOpen(false);
    } catch (error) {
      console.error("[TreinosManager] Erro ao salvar descrição:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, editando: false }));
    }
  };

  const handleRemover = async (id: string) => {
    try {
      setLoadingStates((prev) => ({ ...prev, removendo: true }));
      await removerExercicio(id);
    } catch (error) {
      console.error("[TreinosManager] Erro ao remover:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, removendo: false }));
    }
  };

  const calcularProgresso = (treino: TreinoDia) => {
    if (treino.exercicios.length === 0) return 0;
    const concluidos = treino.exercicios.filter((e) => e.concluido).length;
    return Math.round((concluidos / treino.exercicios.length) * 100);
  };

  // 🔧 Função para salvar grupo
  const handleSaveGroup = async (grupoData: GrupoExerciciosInput) => {
    if (selectedDia === null) return;

    try {
      setLoadingStates((prev) => ({ ...prev, adicionando: true }));

      const treino = treinos.find((t) => t.dia === selectedDia);
      if (!treino) {
        console.warn(
          "[TreinosManager] Treino não encontrado para o dia:",
          selectedDia
        );
        return;
      }

      const treinoId = getTreinoId(treino);
      if (!treinoId) {
        console.warn("[TreinosManager] Nenhum treinoId encontrado:", treino);
        return;
      }

      await criarGrupo(treinoId, grupoData);

      // Recarregar grupos deste treino
      try {
        const updated = await obterGruposDoTreino(treinoId);
        setGroupsByTreino((prev) => ({
          ...prev,
          [treinoId]: Array.isArray(updated) ? updated : [],
        }));
      } catch (err) {
        console.warn(
          "[TreinosManager] Erro ao recarregar grupos após criação:",
          err
        );
      }

      setGroupDialogOpen(false);
    } catch (error) {
      console.error("[TreinosManager] Erro ao criar grupo:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, adicionando: false }));
    }
  };

  // 🔧 Função para deletar grupo
  const handleDeleteGroup = async (treinoId: string, grupoId: string) => {
    if (!grupoId) {
      console.warn("[TreinosManager] grupoId inválido para deletar");
      return;
    }

    try {
      setLoadingStates((prev) => ({ ...prev, removendo: true }));
      await deletarGrupo(grupoId);

      // Recarregar grupos
      try {
        const updated = await obterGruposDoTreino(treinoId);
        setGroupsByTreino((prev) => ({
          ...prev,
          [treinoId]: Array.isArray(updated) ? updated : [],
        }));
      } catch (err) {
        console.warn(
          "[TreinosManager] Erro ao recarregar grupos após delete:",
          err
        );
      }
    } catch (err) {
      console.error("[TreinosManager] Erro ao deletar grupo:", err);
    } finally {
      setLoadingStates((prev) => ({ ...prev, removendo: false }));
    }
  };

  // 1. Adicionar função para marcar grupo completo (adicionar após handleDeleteGroup):
  const handleToggleGrupoConcluido = async (
    grupoId: string,
    concluido: boolean
  ) => {
    if (!grupoId) {
      console.warn("[TreinosManager] grupoId inválido para toggle");
      return;
    }

    try {
      setLoadingStates((prev) => ({ ...prev, editando: true }));

      // Encontrar o grupo e marcar todos os exercícios
      const grupoAtual = Object.values(groupsByTreino)
        .flat()
        .find((g: any) => g.grupo_id === grupoId);

      if (!grupoAtual) {
        console.warn("[TreinosManager] Grupo não encontrado:", grupoId);
        return;
      }

      // Marcar todos os exercícios do grupo
      const promises = grupoAtual.exercicios.map((exercicio: any) =>
        marcarExercicioConcluido(exercicio.id, concluido)
      );

      await Promise.all(promises);

      // Recarregar grupos para atualizar UI
      const treinoId = grupoAtual.treino_id;
      if (treinoId) {
        try {
          const updated = await obterGruposDoTreino(String(treinoId));
          setGroupsByTreino((prev) => ({
            ...prev,
            [String(treinoId)]: Array.isArray(updated) ? updated : [],
          }));
        } catch (err) {
          console.warn(
            "[TreinosManager] Erro ao recarregar grupos após toggle:",
            err
          );
        }
      }
    } catch (err) {
      console.error("[TreinosManager] Erro ao marcar grupo completo:", err);
    } finally {
      setLoadingStates((prev) => ({ ...prev, editando: false }));
    }
  };

  // 🆕 Função para salvar bloco
  const handleSaveBlock = async (blocoData: Partial<BlocoTreino>) => {
    if (selectedDia === null) return;

    try {
      setLoadingStates((prev) => ({ ...prev, adicionando: true }));

      const treino = treinos.find((t) => t.dia === selectedDia);
      if (!treino) return;

      const treinoId = getTreinoId(treino);
      if (!treinoId) return;

      if (blocoEditando) {
        // Editar
        await atualizarBloco(blocoEditando.id, blocoData);
      } else {
        // Criar
        await criarBloco(treinoId, blocoData);
      }

      // Recarregar blocos
      const blocos = await obterBlocos(treinoId);
      setBlocosByTreino((prev) => ({ ...prev, [treinoId]: blocos }));

      setBlockDialogOpen(false);
      setBlocoEditando(null);
    } catch (error) {
      console.error("[TreinosManager] Erro ao salvar bloco:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, adicionando: false }));
    }
  };

  // 🆕 Função para deletar bloco
  const handleDeleteBlock = async (treinoId: string, blocoId: string) => {
    if (!blocoId) {
      console.warn("[TreinosManager] blocoId inválido para deletar");
      return;
    }

    try {
      setLoadingStates((prev) => ({ ...prev, removendo: true }));
      await deletarBloco(blocoId);

      // Recarregar blocos
      try {
        const updated = await obterBlocos(treinoId);
        setBlocosByTreino((prev) => ({
          ...prev,
          [treinoId]: Array.isArray(updated) ? updated : [],
        }));
      } catch (err) {
        console.warn(
          "[TreinosManager] Erro ao recarregar blocos após delete:",
          err
        );
      }
    } catch (err) {
      console.error("[TreinosManager] Erro ao deletar bloco:", err);
    } finally {
      setLoadingStates((prev) => ({ ...prev, removendo: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando treinos...</p>
      </div>
    );
  }

  // SE FOR ALUNO, RENDERIZA O NOVO COMPONENTE
  if (isAluno) {
    return (
      <WorkoutDayView
        treinos={treinos}
        profileId={profileId}
        personalId={personalId}
        groupsByTreino={groupsByTreino}
        blocosByTreino={blocosByTreino}
        onToggleConcluido={marcarExercicioConcluido}
        onToggleGrupoConcluido={handleToggleGrupoConcluido}
        onToggleBlocoConcluido={marcarBlocoConcluido}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Treinos da Semana
            </h2>
            <p className="text-sm text-muted-foreground">
              Gerencie os treinos do aluno
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Treinos Grid - APENAS PARA PERSONAL */}
      <div className="grid gap-4">
        {treinos.map((treino: TreinoDia) => {
          const progresso = calcularProgresso(treino);
          const diaInfo = diasSemana[treino.dia - 1];
          const temExercicios = treino.exercicios.length > 0;

          // 🔧 Obter grupos e blocos do cache ou diretamente do treino
          const treinoId = getTreinoId(treino);
          const grupos = treino.grupos ?? (treinoId ? groupsByTreino[treinoId] ?? [] : []);
          const blocos = treino.blocos ?? (treinoId ? blocosByTreino[treinoId] ?? [] : []);
          const temBlocos = blocos.length > 0;

          // 🆕 Separar blocos por tipo
          const blocosInicio = blocos.filter((b) => b.posicao === "inicio");
          const blocosMeio = blocos.filter((b) => b.posicao === "meio");
          const blocosFim = blocos.filter((b) => b.posicao === "fim");

          // Exercícios não agrupados
          const exerciciosIsolados = treino.exercicios.filter(
            (ex) => !ex.grupo_id
          );

          return (
            <Collapsible
              key={treino.dia}
              defaultOpen={temExercicios || temBlocos}
              className="group"
            >
              <Card
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  (temExercicios || temBlocos) && "border-primary/20"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left group/trigger">
                      <ChevronDown className="h-5 w-5 transition-transform shrink-0 text-muted-foreground group-data-[state=open]/trigger:rotate-180 group-hover/trigger:text-primary" />

                      <div className="flex items-center gap-3 flex-1">
                        <Badge
                          variant={
                            temExercicios || temBlocos ? "default" : "outline"
                          }
                          className="font-mono text-xs px-2 py-1"
                        >
                          {diaInfo.abrev}
                        </Badge>

                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold">
                            {diaInfo.nome}
                          </CardTitle>

                          {treino.descricao && (
                            <CardDescription className="text-sm mt-1 flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {treino.descricao}
                            </CardDescription>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            {(temExercicios || temBlocos) && (
                              <>
                                {temExercicios && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Dumbbell className="h-3 w-3" />
                                    {treino.exercicios.length} exercício
                                    {treino.exercicios.length !== 1 ? "s" : ""}
                                  </span>
                                )}

                                {grupos.length > 0 && (
                                  <span className="text-xs text-blue-600 flex items-center gap-1">
                                    <LinkIcon className="h-3 w-3" />
                                    {grupos.length} grupo
                                    {grupos.length !== 1 ? "s" : ""}
                                  </span>
                                )}

                                {blocos.length > 0 && (
                                  <span className="text-xs text-purple-600 flex items-center gap-1">
                                    <Blocks className="h-3 w-3" />
                                    {blocos.length} bloco
                                    {blocos.length !== 1 ? "s" : ""}
                                  </span>
                                )}

                                {progresso > 0 && (
                                  <span className="text-xs text-primary flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {progresso}% concluído
                                  </span>
                                )}
                              </>
                            )}

                            {!temExercicios && !temBlocos && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Circle className="h-3 w-3" />
                                Sem conteúdo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    {/* Actions - APENAS PARA PERSONAL */}
                    {!readOnly && isPersonal && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDia(treino.dia);
                            setDescricaoEditando(treino.descricao ?? "");
                            setEditDescricaoOpen(true);
                          }}
                          disabled={loadingStates.editando}
                        >
                          {loadingStates.editando ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Edit className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Grupo</span>
                            </>
                          )}
                        </Button>

                        {/* BOTÃO AGRUPAR */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDia(treino.dia);
                            setGroupDialogOpen(true);
                          }}
                          disabled={loadingStates.adicionando}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Agrupar</span>
                        </Button>

                        {/* 🆕 BOTÃO ADICIONAR BLOCO */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDia(treino.dia);
                            setBlocoEditando(null);
                            setBlockDialogOpen(true);
                          }}
                        >
                          <Blocks className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Bloco</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDia(treino.dia);
                            setExercicioTemp(null);
                            setExercicioEditando(null);
                            setExercicioDialogOpen(true);
                          }}
                          disabled={loadingStates.adicionando}
                        >
                          {loadingStates.adicionando ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">
                                Exercício
                              </span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {!temExercicios && !temBlocos && grupos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                        <div className="p-3 bg-muted rounded-full">
                          <Dumbbell className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Nenhum conteúdo cadastrado
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Adicione exercícios, grupos ou blocos para o aluno
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* 🎬 BLOCOS DO INÍCIO */}
                        {blocosInicio.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Separator className="flex-1" />
                              <span>Início do Treino</span>
                              <Separator className="flex-1" />
                            </div>
                            {blocosInicio.map((bloco, idx) => {
                              const treinoId = getTreinoId(treino);
                              return (
                                <WorkoutBlockCard
                                  key={bloco.id}
                                  bloco={bloco}
                                  index={idx}
                                  readOnly={readOnly}
                                  onEdit={
                                    isPersonal
                                      ? () => {
                                          setBlocoEditando(bloco);
                                          setSelectedDia(treino.dia);
                                          setBlockDialogOpen(true);
                                        }
                                      : undefined
                                  }
                                  onDelete={
                                    isPersonal && treinoId
                                      ? () =>
                                          handleDeleteBlock(treinoId, bloco.id)
                                      : undefined
                                  }
                                  onToggleConcluido={
                                    isAluno ? marcarBlocoConcluido : undefined
                                  }
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* 💪 GRUPOS + EXERCÍCIOS (do meio) */}
                        <div className="space-y-3">
                          {/* Grupos agrupados */}
                          {grupos.length > 0 &&
                            grupos.map((grupo: any, idx: number) => (
                              <GroupedExerciseCard
                                key={grupo.grupo_id ?? `grupo-${idx}`}
                                grupo={grupo}
                                index={idx}
                                readOnly={readOnly}
                                onEdit={
                                  isPersonal
                                    ? () => {
                                        console.log(
                                          "[TreinosManager] Editar grupo:",
                                          grupo.grupo_id
                                        );
                                        // TODO: implementar edição de grupo
                                      }
                                    : undefined
                                }
                                onDelete={
                                  isPersonal
                                    ? () => {
                                        if (treinoId && grupo.grupo_id) {
                                          handleDeleteGroup(
                                            treinoId,
                                            grupo.grupo_id
                                          );
                                        }
                                      }
                                    : undefined
                                }
                              />
                            ))}

                          {/* Exercícios isolados com DnD */}
                          {exerciciosIsolados.length > 0 && (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) =>
                                handleDragEnd(event, treino.dia)
                              }
                            >
                              <SortableContext
                                items={exerciciosIsolados.map((ex) => ex.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {exerciciosIsolados.map(
                                    (exercicio, index) => {
                                      const cardEx = {
                                        id: exercicio.id,
                                        nome: exercicio.nome,
                                        link_video:
                                          exercicio.link_video ?? null,
                                        ordem: exercicio.ordem,
                                        series: exercicio.series,
                                        repeticoes: exercicio.repeticoes,
                                        descanso: exercicio.descanso,
                                        carga:
                                          exercicio.carga != null
                                            ? String(exercicio.carga)
                                            : undefined,
                                        observacoes:
                                          exercicio.observacoes ?? undefined,
                                        concluido: !!exercicio.concluido,
                                      };

                                      return (
                                        <SortableExercicioCard
                                          key={exercicio.id}
                                          exercicio={cardEx}
                                          index={index}
                                          readOnly={readOnly}
                                          onEdit={() => {
                                            setSelectedDia(treino.dia);
                                            setExercicioEditando(
                                              treinoExToDialog(exercicio)
                                            );
                                            setExercicioDialogOpen(true);
                                          }}
                                          onDelete={handleRemover}
                                        />
                                      );
                                    }
                                  )}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                        </div>

                        {/* 🧘 BLOCOS DO MEIO */}
                        {blocosMeio.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Separator className="flex-1" />
                              <span>Complementar</span>
                              <Separator className="flex-1" />
                            </div>
                            {blocosMeio.map((bloco, idx) => {
                              const treinoId = getTreinoId(treino);
                              return (
                                <WorkoutBlockCard
                                  key={bloco.id}
                                  bloco={bloco}
                                  index={idx}
                                  readOnly={readOnly}
                                  onEdit={
                                    isPersonal
                                      ? () => {
                                          setBlocoEditando(bloco);
                                          setSelectedDia(treino.dia);
                                          setBlockDialogOpen(true);
                                        }
                                      : undefined
                                  }
                                  onDelete={
                                    isPersonal && treinoId
                                      ? () =>
                                          handleDeleteBlock(treinoId, bloco.id)
                                      : undefined
                                  }
                                  onToggleConcluido={
                                    isAluno ? marcarBlocoConcluido : undefined
                                  }
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* 🏁 BLOCOS DO FIM */}
                        {blocosFim.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Separator className="flex-1" />
                              <span>Finalização</span>
                              <Separator className="flex-1" />
                            </div>
                            {blocosFim.map((bloco, idx) => {
                              const treinoId = getTreinoId(treino);
                              return (
                                <WorkoutBlockCard
                                  key={bloco.id}
                                  bloco={bloco}
                                  index={idx}
                                  readOnly={readOnly}
                                  onEdit={
                                    isPersonal
                                      ? () => {
                                          setBlocoEditando(bloco);
                                          setSelectedDia(treino.dia);
                                          setBlockDialogOpen(true);
                                        }
                                      : undefined
                                  }
                                  onDelete={
                                    isPersonal && treinoId
                                      ? () =>
                                          handleDeleteBlock(treinoId, bloco.id)
                                      : undefined
                                  }
                                  onToggleConcluido={
                                    isAluno ? marcarBlocoConcluido : undefined
                                  }
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Dialogs - APENAS PARA PERSONAL */}
      <>
        <ExercicioDialog
          open={exercicioDialogOpen}
          onOpenChange={(open) => {
            setExercicioDialogOpen(open);
            if (!open) {
              setExercicioEditando(null);
              setExercicioTemp(null);
            }
          }}
          exercicio={(exercicioEditando ?? exercicioTemp ?? null) as any}
          onSave={handleSaveExercicio}
          diaNome={
            selectedDia !== null ? diasSemana[selectedDia - 1].nome : undefined
          }
        />

        <Dialog open={editDescricaoOpen} onOpenChange={setEditDescricaoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Grupo Muscular</DialogTitle>
              <DialogDescription>
                Defina o grupo muscular para{" "}
                {selectedDia !== null && diasSemana[selectedDia - 1].nome}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="descricao">Grupo Muscular</Label>
                <Input
                  id="descricao"
                  value={descricaoEditando}
                  onChange={(e) => setDescricaoEditando(e.target.value)}
                  placeholder="Ex: Peito e Ombro, Pernas, Costas e Bíceps..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDescricaoOpen(false)}
                disabled={loadingStates.editando}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveDescricao}
                disabled={loadingStates.editando}
              >
                {loadingStates.editando && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ExercisePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleExerciseSelect}
        />

        {/* DIALOG DE AGRUPAMENTO */}
        <ExerciseGroupDialog
          open={groupDialogOpen}
          onOpenChange={setGroupDialogOpen}
          onSave={handleSaveGroup}
          diaNome={
            selectedDia !== null ? diasSemana[selectedDia - 1].nome : undefined
          }
        />

        {/* 🆕 DIALOG DE BLOCOS */}
        <WorkoutBlockDialog
          open={blockDialogOpen}
          onOpenChange={(open) => {
            setBlockDialogOpen(open);
            if (!open) setBlocoEditando(null);
          }}
          onSave={handleSaveBlock}
          blocoEditando={blocoEditando}
          diaNome={
            selectedDia !== null ? diasSemana[selectedDia - 1].nome : undefined
          }
        />
      </>
    </div>
  );
}

export default TreinosManager;
