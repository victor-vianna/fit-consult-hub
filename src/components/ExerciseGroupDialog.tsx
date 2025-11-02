// src/components/treinos/ExerciseGroupDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, X, GripVertical, ArrowRight, Info, Loader2 } from "lucide-react";
import { TIPOS_AGRUPAMENTO, TipoAgrupamento } from "@/types/exerciseGroup";
import ExercisePicker from "@/components/exercises/ExercisePicker";
import type { Exercise } from "@/types/exercise";

interface ExercicioTemp {
  id: string;
  nome: string;
  link_video?: string | null;
  series: number;
  repeticoes: string;
  descanso: number;
  carga?: string | null;
  observacoes?: string | null;
}

interface ExerciseGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (grupo: {
    tipo: TipoAgrupamento;
    exercicios: ExercicioTemp[]; // já normalizados (carga/link_video/observacoes podem ser null)
    descanso_entre_grupos: number;
    observacoes?: string | null;
  }) => Promise<void>;
  diaNome?: string;
}

export function ExerciseGroupDialog({
  open,
  onOpenChange,
  onSave,
  diaNome,
}: ExerciseGroupDialogProps) {
  const [tipo, setTipo] = useState<TipoAgrupamento>("bi-set");
  const [exercicios, setExercicios] = useState<ExercicioTemp[]>([]);
  const [descansoGrupo, setDescansoGrupo] = useState<number>(90);
  const [observacoes, setObservacoes] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const tipoConfig = TIPOS_AGRUPAMENTO[tipo];
  const podeAdicionar = exercicios.length < tipoConfig.max_exercicios;

  const handleAddExercicio = () => {
    if (!podeAdicionar) return;
    setEditandoIndex(null);
    setPickerOpen(true);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    const novoExercicio: ExercicioTemp = {
      id: crypto.randomUUID(),
      nome: exercise.nome,
      link_video: exercise.link_youtube ?? null,
      series: tipo === "drop-set" ? 1 : 3,
      repeticoes: "12",
      descanso: 0, // Sem descanso entre exercícios do grupo
      carga: null,
      observacoes: null,
    };

    if (editandoIndex !== null) {
      const novosExercicios = [...exercicios];
      novosExercicios[editandoIndex] = novoExercicio;
      setExercicios(novosExercicios);
    } else {
      setExercicios([...exercicios, novoExercicio]);
    }

    setPickerOpen(false);
    setEditandoIndex(null);
  };

  const handleRemoveExercicio = (index: number) => {
    setExercicios(exercicios.filter((_, i) => i !== index));
  };

  const handleUpdateExercicio = (
    index: number,
    field: keyof ExercicioTemp,
    value: ExercicioTemp[keyof ExercicioTemp] | string | number | null
  ) => {
    const novosExercicios = [...exercicios];
    // normalizar número para number e strings para string|null conforme campo
    const normalized = (() => {
      if (field === "series" || field === "descanso") {
        return Number(value) || 0;
      }
      if (
        field === "carga" ||
        field === "link_video" ||
        field === "observacoes"
      ) {
        const v = value as string | null;
        return v === "" ? null : v;
      }
      return value;
    })();

    novosExercicios[index] = {
      ...novosExercicios[index],
      [field]: normalized,
    } as ExercicioTemp;
    setExercicios(novosExercicios);
  };

  const handleSave = async () => {
    if (exercicios.length === 0) return;

    setLoading(true);
    try {
      // normalizar valores para enviar ao hook / backend
      const payloadExercicios: ExercicioTemp[] = exercicios.map((e) => ({
        ...e,
        carga: e.carga ?? null,
        link_video: e.link_video ?? null,
        observacoes: e.observacoes ?? null,
      }));

      await onSave({
        tipo,
        exercicios: payloadExercicios,
        descanso_entre_grupos: descansoGrupo,
        observacoes: observacoes || null,
      });

      // Reset
      setExercicios([]);
      setTipo("bi-set");
      setDescansoGrupo(90);
      setObservacoes("");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔗 Criar Agrupamento de Exercícios
            </DialogTitle>
            <DialogDescription>
              {diaNome && `Para ${diaNome} - `}
              Combine exercícios em bi-sets, tri-sets ou drop-sets
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Seletor de Tipo */}
            <div className="space-y-2">
              <Label>Tipo de Agrupamento</Label>
              <Select
                value={tipo}
                onValueChange={(v) => {
                  setTipo(v as TipoAgrupamento);
                  setExercicios([]); // Limpa exercícios ao mudar tipo
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS_AGRUPAMENTO).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{config.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {config.descricao}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {tipoConfig.exemplo && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    <span className="font-medium">Exemplo:</span>{" "}
                    {tipoConfig.exemplo}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Lista de Exercícios */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Exercícios ({exercicios.length}/{tipoConfig.max_exercicios})
                </Label>
                <Button
                  size="sm"
                  onClick={handleAddExercicio}
                  disabled={!podeAdicionar}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {exercicios.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 bg-muted rounded-full mb-3">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nenhum exercício adicionado
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em "Adicionar" para começar
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {exercicios.map((ex, index) => (
                    <Card key={ex.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Grip */}
                          <div className="flex flex-col items-center gap-1 pt-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 space-y-3">
                            {/* Nome do exercício */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{ex.nome}</p>
                                {ex.link_video && (
                                  <a
                                    href={ex.link_video}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    Ver vídeo
                                  </a>
                                )}
                              </div>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveExercicio(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Configurações */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <Label className="text-xs">Séries</Label>
                                <Input
                                  type="number"
                                  value={ex.series}
                                  onChange={(e) =>
                                    handleUpdateExercicio(
                                      index,
                                      "series",
                                      Number(e.target.value)
                                    )
                                  }
                                  min={1}
                                  className="h-8"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Repetições</Label>
                                <Input
                                  value={ex.repeticoes}
                                  onChange={(e) =>
                                    handleUpdateExercicio(
                                      index,
                                      "repeticoes",
                                      e.target.value
                                    )
                                  }
                                  placeholder="12"
                                  className="h-8"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Carga (kg)</Label>
                                <Input
                                  value={ex.carga ?? ""}
                                  onChange={(e) =>
                                    handleUpdateExercicio(
                                      index,
                                      "carga",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Opcional"
                                  className="h-8"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Descanso (s)</Label>
                                <Input
                                  type="number"
                                  value={ex.descanso}
                                  disabled
                                  className="h-8 bg-muted"
                                  title="Sem descanso entre exercícios do grupo"
                                />
                              </div>
                            </div>

                            {/* Observações */}
                            {tipo === "drop-set" && (
                              <div>
                                <Label className="text-xs">
                                  Cargas Drop-set
                                </Label>
                                <Input
                                  value={ex.observacoes ?? ""}
                                  onChange={(e) =>
                                    handleUpdateExercicio(
                                      index,
                                      "observacoes",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ex: 20kg → 15kg → 10kg"
                                  className="h-8"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Seta entre exercícios */}
                        {index < exercicios.length - 1 && (
                          <div className="flex justify-center my-2">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Descanso entre rodadas */}
            <div className="space-y-2">
              <Label>Descanso Entre Rodadas (segundos)</Label>
              <Input
                type="number"
                value={descansoGrupo}
                onChange={(e) => setDescansoGrupo(Number(e.target.value))}
                min={0}
                placeholder="90"
              />
              <p className="text-xs text-muted-foreground">
                Descanso após completar todos os exercícios do grupo
              </p>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Executar com controle, focar na contração..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={exercicios.length === 0 || loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Agrupamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setEditandoIndex(null);
        }}
        onSelect={handleSelectExercise}
      />
    </>
  );
}
