// components/TreinosManager.tsx
import { useState } from "react";
import { useTreinos } from "@/hooks/useTreinos";
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
import { Plus, Edit, ChevronDown, Loader2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ExercicioDialog } from "@/components/ExercicioDialog";
import { SortableExercicioCard } from "@/components/SortableExercicioCard";
import ExercisePicker from "@/components/exercises/ExercisePicker";
import type { Exercise } from "@/types/exercise";
import type { Exercicio as TreinoExercicio, TreinoDia } from "@/types/treino";
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
import { WorkoutTimer } from "./WorkoutTimer";

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
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

export function TreinosManager({
  profileId,
  personalId,
  readOnly = false,
}: TreinosManagerProps) {
  const {
    treinos,
    loading,
    adicionarExercicio,
    editarExercicio,
    removerExercicio,
    reordenarExercicios,
    editarDescricao,
    marcarExercicioConcluido,
    isAdicionando,
    isEditando,
    isRemovendo,
    isReordenando,
  } = useTreinos({ profileId, personalId });

  const [exercicioDialogOpen, setExercicioDialogOpen] = useState(false);
  const [editDescricaoOpen, setEditDescricaoOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [exercicioEditando, setExercicioEditando] =
    useState<DialogExercicio | null>(null);
  const [descricaoEditando, setDescricaoEditando] = useState("");
  const [exercicioTemp, setExercicioTemp] =
    useState<Partial<DialogExercicio> | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent, dia: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const treino = treinos.find((t) => t.dia === dia);
    if (!treino) return;

    const oldIndex = treino.exercicios.findIndex((ex) => ex.id === active.id);
    const newIndex = treino.exercicios.findIndex((ex) => ex.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(treino.exercicios, oldIndex, newIndex);
    reordenarExercicios(dia, newOrder).catch((e) =>
      console.error("Erro ao reordenar exercícios:", e)
    );
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
    if (!cargaTrim) {
      return {
        nome: d.nome,
        link_video: d.link_video ? d.link_video : null,
        series: d.series,
        repeticoes: d.repeticoes,
        descanso: d.descanso,
        carga: null,
        observacoes: d.observacoes ? d.observacoes : null,
      };
    }
    const parsed = Number(cargaTrim);
    return {
      nome: d.nome,
      link_video: d.link_video ? d.link_video : null,
      series: d.series,
      repeticoes: d.repeticoes,
      descanso: d.descanso,
      carga: Number.isNaN(parsed) ? null : parsed,
      observacoes: d.observacoes ? d.observacoes : null,
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
    try {
      const payload = dialogToPayload(dados);
      if (exercicioEditando?.id) {
        await editarExercicio(exercicioEditando.id, payload);
        setExercicioEditando(null);
      } else if (selectedDia !== null) {
        await adicionarExercicio(selectedDia, payload);
      }
      setExercicioDialogOpen(false);
      setExercicioTemp(null);
    } catch (err) {
      console.error("Erro ao salvar exercício:", err);
    }
  };

  const handleSaveDescricao = async () => {
    if (selectedDia !== null) {
      try {
        await editarDescricao(selectedDia, descricaoEditando || null);
        setEditDescricaoOpen(false);
      } catch (err) {
        console.error("Erro ao salvar descrição:", err);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando treinos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Treinos da Semana</h2>
      </div>

      <div className="grid gap-4">
        {treinos.map((treino: TreinoDia) => (
          <Collapsible
            key={treino.dia}
            defaultOpen={treino.exercicios.length > 0}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 w-full">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left group">
                    <ChevronDown className="h-4 w-4 transition-transform shrink-0 group-data-[state=open]:rotate-180" />
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {diasSemana[treino.dia - 1]}
                      </CardTitle>
                      {treino.descricao && (
                        <CardDescription className="text-sm mt-1">
                          {treino.descricao}
                        </CardDescription>
                      )}
                      {treino.exercicios.length > 0 && (
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {treino.exercicios.length}{" "}
                          {treino.exercicios.length === 1
                            ? "exercício"
                            : "exercícios"}
                        </span>
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <div className="flex items-center gap-3">
                    {treino.treinoId && (
                      <div className="mr-2">
                        <WorkoutTimer
                          treinoId={treino.treinoId}
                          profileId={profileId}
                          personalId={personalId}
                        />
                      </div>
                    )}

                    {!readOnly && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDia(treino.dia);
                            setDescricaoEditando(treino.descricao ?? "");
                            setEditDescricaoOpen(true);
                          }}
                          disabled={isEditando}
                        >
                          {isEditando ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Edit className="h-4 w-4 mr-2" />
                          )}
                          Grupo
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDia(treino.dia);
                            setExercicioTemp(null);
                            setExercicioEditando(null);
                            setExercicioDialogOpen(true);
                          }}
                          disabled={isAdicionando}
                        >
                          {isAdicionando ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Exercício
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  {treino.exercicios.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum exercício cadastrado para este dia
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, treino.dia)}
                    >
                      <SortableContext
                        items={treino.exercicios.map((ex) => ex.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {treino.exercicios.map((exercicio, index) => {
                            const cardEx = {
                              id: exercicio.id,
                              nome: exercicio.nome,
                              link_video: exercicio.link_video ?? null,
                              ordem: exercicio.ordem,
                              series: exercicio.series,
                              repeticoes: exercicio.repeticoes,
                              descanso: exercicio.descanso,
                              carga:
                                exercicio.carga != null
                                  ? String(exercicio.carga)
                                  : undefined,
                              observacoes: exercicio.observacoes ?? undefined,
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
                                onDelete={(id) => {
                                  removerExercicio(id).catch((e) =>
                                    console.error(
                                      "Erro ao remover exercício:",
                                      e
                                    )
                                  );
                                }}
                                onToggleConcluido={(id, concluido) => {
                                  marcarExercicioConcluido(id, concluido).catch(
                                    (e) =>
                                      console.error(
                                        "Erro ao marcar concluído:",
                                        e
                                      )
                                  );
                                }}
                                /* não passa isRemovendo/isReordenando — evite mismatch se filhos não aceitam */
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      <ExercicioDialog
        open={exercicioDialogOpen}
        onOpenChange={(open) => {
          setExercicioDialogOpen(open);
          if (!open) {
            setExercicioEditando(null);
            setExercicioTemp(null);
          }
        }}
        exercicio={
          (exercicioEditando ??
            (exercicioTemp as DialogExercicio) ??
            null) as any
        }
        onSave={handleSaveExercicio}
        diaNome={selectedDia !== null ? diasSemana[selectedDia - 1] : undefined}
        /* não passar isSaving aqui para não quebrar tipagem dos filhos */
      />

      <Dialog open={editDescricaoOpen} onOpenChange={setEditDescricaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo Muscular</DialogTitle>
            <DialogDescription>
              Defina o grupo muscular para{" "}
              {selectedDia !== null && diasSemana[selectedDia - 1]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="descricao">Grupo Muscular</Label>
              <Input
                id="descricao"
                value={descricaoEditando}
                onChange={(e) => setDescricaoEditando(e.target.value)}
                placeholder="Ex: Peito e Ombro, Pernas Completo, Costas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDescricaoOpen(false)}
              disabled={isEditando}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveDescricao} disabled={isEditando}>
              {isEditando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
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
    </div>
  );
}

export default TreinosManager;
