// components/ExercicioDialog.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Library, Loader2 } from "lucide-react";
import ExercisePicker from "@/components/exercises/ExercisePicker";
import type { Exercise } from "@/types/exercise";
import { cn } from "@/lib/utils";

interface Exercicio {
  id?: string;
  nome: string;
  link_video: string;
  series: number;
  repeticoes: string;
  descanso: number;
  carga: string;
  observacoes: string;
}

interface ExercicioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (exercicio: Omit<Exercicio, "id">) => Promise<void>;
  exercicio?: Exercicio | null;
  diaNome?: string;
}

export function ExercicioDialog({
  open,
  onOpenChange,
  onSave,
  exercicio,
  diaNome,
}: ExercicioDialogProps) {
  // ✅ Estado do formulário
  const [formData, setFormData] = useState<Omit<Exercicio, "id">>({
    nome: "",
    link_video: "",
    series: 3,
    repeticoes: "10-12",
    descanso: 60,
    carga: "",
    observacoes: "",
  });

  // ✅ Estados auxiliares
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ Preenche o form ao abrir
  useEffect(() => {
    if (open) {
      if (exercicio) {
        setFormData({
          nome: exercicio.nome || "",
          link_video: exercicio.link_video || "",
          series: exercicio.series || 3,
          repeticoes: exercicio.repeticoes || "10-12",
          descanso: exercicio.descanso || 60,
          carga: exercicio.carga || "",
          observacoes: exercicio.observacoes || "",
        });
      } else {
        setFormData({
          nome: "",
          link_video: "",
          series: 3,
          repeticoes: "10-12",
          descanso: 60,
          carga: "",
          observacoes: "",
        });
      }
      setErrors({});
    }
  }, [open, exercicio]);

  // ✅ Validação simples e clara
  const validar = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!formData.nome.trim()) novosErros.nome = "O nome é obrigatório.";
    if (formData.series < 1 || formData.series > 20)
      novosErros.series = "Séries deve estar entre 1 e 20.";
    if (!formData.repeticoes.trim())
      novosErros.repeticoes = "Repetições é obrigatório.";
    if (formData.descanso < 0 || formData.descanso > 600)
      novosErros.descanso = "Descanso deve estar entre 0 e 600s.";
    if (
      formData.link_video &&
      !/^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/.test(formData.link_video)
    )
      novosErros.link_video = "URL inválida.";

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ✅ Salvar exercício
  const handleSave = async () => {
    if (!validar()) return;

    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar exercício:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Seleção pela biblioteca
  const handleExerciseSelect = (exercise: Exercise) => {
    setFormData((prev) => ({
      ...prev,
      nome: exercise.nome,
      link_video: exercise.link_youtube || "",
    }));
    setPickerOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {exercicio ? "Editar Exercício" : "Adicionar Exercício"}
              {diaNome && (
                <span className="text-muted-foreground"> — {diaNome}</span>
              )}
            </DialogTitle>
            <DialogDescription>
              {exercicio
                ? "Atualize as informações do exercício selecionado."
                : "Preencha as informações para adicionar um novo exercício."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ✅ Biblioteca de exercícios */}
            {!exercicio && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPickerOpen(true)}
              >
                <Library className="h-4 w-4 mr-2" />
                Buscar na Biblioteca de Exercícios
              </Button>
            )}

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Exercício *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Ex: Supino Reto com Barra"
                className={errors.nome ? "border-destructive" : ""}
              />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome}</p>
              )}
            </div>

            {/* Link vídeo */}
            <div className="space-y-2">
              <Label htmlFor="link_video" className="text-base md:text-sm">Link do Vídeo (opcional)</Label>
              <Input
                id="link_video"
                value={formData.link_video}
                onChange={(e) =>
                  setFormData({ ...formData, link_video: e.target.value })
                }
                placeholder="https://youtube.com/watch?v=..."
                className={cn("h-12 md:h-10 text-base md:text-sm", errors.link_video && "border-destructive")}
              />
              {errors.link_video && (
                <p className="text-sm md:text-xs text-destructive">{errors.link_video}</p>
              )}
            </div>

            {/* Grid principal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Séries */}
              <div className="space-y-2">
                <Label htmlFor="series" className="text-base md:text-sm">Séries *</Label>
                <Input
                  id="series"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.series}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      series: parseInt(e.target.value) || 1,
                    })
                  }
                  className={cn("h-12 md:h-10 text-base md:text-sm", errors.series && "border-destructive")}
                />
                {errors.series && (
                  <p className="text-sm md:text-xs text-destructive">{errors.series}</p>
                )}
              </div>

              {/* Repetições */}
              <div className="space-y-2">
                <Label htmlFor="repeticoes" className="text-base md:text-sm">Repetições *</Label>
                <Input
                  id="repeticoes"
                  value={formData.repeticoes}
                  onChange={(e) =>
                    setFormData({ ...formData, repeticoes: e.target.value })
                  }
                  placeholder="Ex: 10-12, até a falha"
                  className={cn("h-12 md:h-10 text-base md:text-sm", errors.repeticoes && "border-destructive")}
                />
                {errors.repeticoes && (
                  <p className="text-sm md:text-xs text-destructive">
                    {errors.repeticoes}
                  </p>
                )}
              </div>

              {/* Descanso */}
              <div className="space-y-2">
                <Label htmlFor="descanso">Descanso (s) *</Label>
                <Input
                  id="descanso"
                  type="number"
                  min={0}
                  max={600}
                  value={formData.descanso}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descanso: parseInt(e.target.value) || 0,
                    })
                  }
                  className={errors.descanso ? "border-destructive" : ""}
                />
                {errors.descanso && (
                  <p className="text-sm text-destructive">{errors.descanso}</p>
                )}
              </div>
            </div>

            {/* Carga */}
            <div className="space-y-2">
              <Label htmlFor="carga">Carga (opcional)</Label>
              <Input
                id="carga"
                value={formData.carga}
                onChange={(e) =>
                  setFormData({ ...formData, carga: e.target.value })
                }
                placeholder="Ex: 20kg, Peso corporal, Progressivo..."
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco se a carga variar de acordo com o aluno.
              </p>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">
                Observações / Dicas (opcional)
              </Label>
              <Textarea
                id="observacoes"
                rows={3}
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
                placeholder="Ex: Manter cotovelos a 45°, controlar a descida..."
              />
              <p className="text-xs text-muted-foreground">
                Essas dicas aparecem para o aluno durante o treino.
              </p>
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
            <Button onClick={handleSave} disabled={loading}>
              {loading
                ? "Salvando..."
                : exercicio
                ? "Salvar Alterações"
                : "Adicionar Exercício"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal da biblioteca */}
      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleExerciseSelect}
      />
    </>
  );
}
