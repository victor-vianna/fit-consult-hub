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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Library, Loader2, Plus, X, Link2 } from "lucide-react";
import ExercisePicker from "@/components/exercises/ExercisePicker";
import type { Exercise } from "@/types/exercise";
import { cn } from "@/lib/utils";
import {
  TIPOS_AGRUPAMENTO,
  TipoAgrupamento,
} from "@/types/exerciseGroup";

interface ExercicioItem {
  id?: string;
  nome: string;
  link_video: string;
  series: number;
  repeticoes: string;
  descanso: number;
  carga: string;
  observacoes: string;
}

// Resultado simples (exercício único)
interface ExercicioSimpleResult {
  type: "simple";
  exercicio: Omit<ExercicioItem, "id">;
}

// Resultado agrupado (conjugado)
interface ExercicioGroupResult {
  type: "group";
  tipoAgrupamento: TipoAgrupamento;
  descansoEntreGrupos: number;
  exercicios: Omit<ExercicioItem, "id">[];
}

export type ExercicioDialogResult = ExercicioSimpleResult | ExercicioGroupResult;

interface GrupoEditando {
  grupo_id: string;
  tipo_agrupamento: TipoAgrupamento;
  descanso_entre_grupos?: number | null;
  exercicios: Array<{
    nome: string;
    link_video?: string | null;
    series?: number | null;
    repeticoes?: string | null;
    descanso?: number | null;
    carga?: string | number | null;
    observacoes?: string | null;
  }>;
}

interface ExercicioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (exercicio: Omit<ExercicioItem, "id">) => Promise<void>;
  onSaveGroup?: (result: ExercicioGroupResult) => Promise<void>;
  onUpdateGroup?: (grupoId: string, result: ExercicioGroupResult) => Promise<void>;
  exercicio?: ExercicioItem | null;
  grupoEditando?: GrupoEditando | null;
  diaNome?: string;
}

const defaultExercicio = (): Omit<ExercicioItem, "id"> => ({
  nome: "",
  link_video: "",
  series: 3,
  repeticoes: "10-12",
  descanso: 60,
  carga: "",
  observacoes: "",
});

export function ExercicioDialog({
  open,
  onOpenChange,
  onSave,
  onSaveGroup,
  onUpdateGroup,
  exercicio,
  grupoEditando,
  diaNome,
}: ExercicioDialogProps) {
  // Modo: "simple" ou "group"
  const [modo, setModo] = useState<"simple" | "group">("simple");

  // Estado para modo simples
  const [formData, setFormData] = useState<Omit<ExercicioItem, "id">>(defaultExercicio());

  // Estado para modo agrupado
  const [grupoExercicios, setGrupoExercicios] = useState<Omit<ExercicioItem, "id">[]>([]);
  const [tipoAgrupamento, setTipoAgrupamento] = useState<TipoAgrupamento>("bi-set");
  const [descansoEntreGrupos, setDescansoEntreGrupos] = useState(90);

  // Estados auxiliares
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preenche o form ao abrir
  useEffect(() => {
    if (open) {
      if (grupoEditando) {
        // Modo edição de grupo
        setModo("group");
        setTipoAgrupamento(grupoEditando.tipo_agrupamento || "bi-set");
        setDescansoEntreGrupos(grupoEditando.descanso_entre_grupos ?? 90);
        setGrupoExercicios(
          grupoEditando.exercicios.map((ex) => ({
            nome: ex.nome || "",
            link_video: ex.link_video || "",
            series: ex.series || 3,
            repeticoes: ex.repeticoes || "10-12",
            descanso: ex.descanso ?? 0,
            carga: ex.carga != null ? String(ex.carga) : "",
            observacoes: ex.observacoes || "",
          }))
        );
        setFormData(defaultExercicio());
      } else if (exercicio) {
        // Modo edição: sempre simples
        setModo("simple");
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
        setModo("simple");
        setFormData(defaultExercicio());
        setGrupoExercicios([]);
        setTipoAgrupamento("bi-set");
        setDescansoEntreGrupos(90);
      }
      setErrors({});
    }
  }, [open, exercicio, grupoEditando]);

  // Validação
  const validarExercicio = (ex: Omit<ExercicioItem, "id">, prefix = ""): Record<string, string> => {
    const erros: Record<string, string> = {};
    if (!ex.nome.trim()) erros[`${prefix}nome`] = "O nome é obrigatório.";
    if (ex.series < 1 || ex.series > 20) erros[`${prefix}series`] = "Séries: 1-20.";
    if (!ex.repeticoes.trim()) erros[`${prefix}repeticoes`] = "Repetições é obrigatório.";
    if (ex.descanso < 0 || ex.descanso > 600) erros[`${prefix}descanso`] = "Descanso: 0-600s.";
    if (ex.link_video && !/^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/.test(ex.link_video))
      erros[`${prefix}link_video`] = "URL inválida.";
    return erros;
  };

  const validar = (): boolean => {
    let novosErros: Record<string, string> = {};

    if (modo === "simple") {
      novosErros = validarExercicio(formData);
    } else {
      if (grupoExercicios.length < 2) {
        novosErros.grupo = "Adicione pelo menos 2 exercícios ao conjugado.";
      }
      grupoExercicios.forEach((ex, i) => {
        const exErrors = validarExercicio(ex, `grupo_${i}_`);
        novosErros = { ...novosErros, ...exErrors };
      });
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // Salvar
  const handleSave = async () => {
    if (!validar()) return;

    setLoading(true);
    try {
      if (modo === "simple") {
        await onSave(formData);
      } else if (onSaveGroup) {
        await onSaveGroup({
          type: "group",
          tipoAgrupamento,
          descansoEntreGrupos,
          exercicios: grupoExercicios,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar exercício:", error);
    } finally {
      setLoading(false);
    }
  };

  // Picker
  const handleExerciseSelect = (exercise: Exercise) => {
    const data = {
      nome: exercise.nome,
      link_video: exercise.link_youtube || "",
    };

    if (modo === "simple" || pickerTargetIndex === null) {
      setFormData((prev) => ({ ...prev, ...data }));
    } else {
      // Atualizar exercício específico no grupo
      setGrupoExercicios((prev) => {
        const updated = [...prev];
        if (pickerTargetIndex < updated.length) {
          updated[pickerTargetIndex] = { ...updated[pickerTargetIndex], ...data };
        }
        return updated;
      });
    }
    setPickerOpen(false);
    setPickerTargetIndex(null);
  };

  // Funções do modo agrupado
  const transformarEmConjugado = () => {
    setModo("group");
    // Mover dados do form simples como primeiro exercício do grupo
    if (formData.nome.trim()) {
      setGrupoExercicios([{ ...formData }, defaultExercicio()]);
    } else {
      setGrupoExercicios([defaultExercicio(), defaultExercicio()]);
    }
  };

  const voltarParaSimples = () => {
    setModo("simple");
    // Manter o primeiro exercício do grupo no form simples
    if (grupoExercicios.length > 0) {
      setFormData(grupoExercicios[0]);
    }
    setGrupoExercicios([]);
  };

  const tipoConfig = TIPOS_AGRUPAMENTO[tipoAgrupamento];
  const podeAdicionarMais = grupoExercicios.length < tipoConfig.max_exercicios;

  const adicionarExercicioAoGrupo = () => {
    if (!podeAdicionarMais) return;
    setGrupoExercicios((prev) => [...prev, defaultExercicio()]);
  };

  const removerExercicioDoGrupo = (index: number) => {
    if (grupoExercicios.length <= 2) return;
    setGrupoExercicios((prev) => prev.filter((_, i) => i !== index));
  };

  const atualizarExercicioGrupo = (index: number, field: keyof Omit<ExercicioItem, "id">, value: any) => {
    setGrupoExercicios((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const isEditing = !!exercicio;

  // Garantir que ao mudar tipo de agrupamento, ajuste o número de exercícios
  const handleTipoChange = (novoTipo: TipoAgrupamento) => {
    setTipoAgrupamento(novoTipo);
    const maxEx = TIPOS_AGRUPAMENTO[novoTipo].max_exercicios;
    if (grupoExercicios.length > maxEx) {
      setGrupoExercicios((prev) => prev.slice(0, maxEx));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {isEditing ? "Editar Exercício" : modo === "group" ? "Criar Exercício Conjugado" : "Adicionar Exercício"}
              {diaNome && (
                <span className="text-muted-foreground"> — {diaNome}</span>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Atualize as informações do exercício selecionado."
                : modo === "group"
                ? "Monte um conjunto de exercícios conjugados com configuração individual."
                : "Preencha as informações para adicionar um novo exercício."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ========== MODO SIMPLES ========== */}
            {modo === "simple" && (
              <>
                {/* Biblioteca de exercícios */}
                {!isEditing && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setPickerTargetIndex(null);
                      setPickerOpen(true);
                    }}
                  >
                    <Library className="h-4 w-4 mr-2" />
                    Buscar na Biblioteca de Exercícios
                  </Button>
                )}

                {/* Campos do exercício simples */}
                <ExerciseFields
                  data={formData}
                  errors={errors}
                  prefix=""
                  onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
                />

                {/* Botão para transformar em conjugado */}
                {!isEditing && onSaveGroup && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5"
                      onClick={transformarEmConjugado}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Transformar em exercício conjugado (bi-set, tri-set, circuito...)
                    </Button>
                  </>
                )}
              </>
            )}

            {/* ========== MODO AGRUPADO ========== */}
            {modo === "group" && (
              <>
                {/* Tipo de agrupamento */}
                <div className="space-y-2">
                  <Label>Tipo de Agrupamento</Label>
                  <Select
                    value={tipoAgrupamento}
                    onValueChange={(v) => handleTipoChange(v as TipoAgrupamento)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_AGRUPAMENTO)
                        .filter(([key]) => key !== "normal" && key !== "drop-set")
                        .map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span>{config.icon}</span>
                              <span className="font-medium">{config.label}</span>
                              <span className="text-xs text-muted-foreground">
                                — {config.descricao}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {tipoConfig.exemplo && (
                    <p className="text-xs text-muted-foreground">
                      💡 Exemplo: {tipoConfig.exemplo}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Lista de exercícios do grupo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      Exercícios do conjugado ({grupoExercicios.length}/{tipoConfig.max_exercicios})
                    </Label>
                  </div>

                  {errors.grupo && (
                    <p className="text-sm text-destructive">{errors.grupo}</p>
                  )}

                  <div className="space-y-4">
                    {grupoExercicios.map((ex, index) => (
                      <Card key={index} className="relative border-primary/20">
                        <CardContent className="p-4 space-y-3">
                          {/* Header do exercício */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono">
                                {index + 1}
                              </Badge>
                              <span className="text-sm font-medium">
                                {ex.nome || "Exercício sem nome"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPickerTargetIndex(index);
                                  setPickerOpen(true);
                                }}
                                className="h-7 text-xs"
                              >
                                <Library className="h-3 w-3 mr-1" />
                                Biblioteca
                              </Button>
                              {grupoExercicios.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => removerExercicioDoGrupo(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Campos individuais */}
                          <ExerciseFields
                            data={ex}
                            errors={errors}
                            prefix={`grupo_${index}_`}
                            onChange={(field, value) => atualizarExercicioGrupo(index, field, value)}
                            compact
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Botão adicionar mais */}
                  {podeAdicionarMais && (
                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={adicionarExercicioAoGrupo}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar outro exercício ao conjunto
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Descanso entre rodadas */}
                <div className="space-y-2">
                  <Label>Descanso entre rodadas (segundos)</Label>
                  <Input
                    type="number"
                    value={descansoEntreGrupos}
                    onChange={(e) => setDescansoEntreGrupos(Number(e.target.value) || 0)}
                    min={0}
                    max={600}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Descanso após completar todos os exercícios do conjunto.
                  </p>
                </div>

                {/* Link para voltar a simples */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={voltarParaSimples}
                >
                  ← Voltar para exercício simples
                </Button>
              </>
            )}
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
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                "Salvar Alterações"
              ) : modo === "group" ? (
                "Criar Conjugado"
              ) : (
                "Adicionar Exercício"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal da biblioteca */}
      <ExercisePicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerTargetIndex(null);
        }}
        onSelect={handleExerciseSelect}
      />
    </>
  );
}

// ========== Componente auxiliar para campos de exercício ==========
interface ExerciseFieldsProps {
  data: Omit<ExercicioItem, "id">;
  errors: Record<string, string>;
  prefix: string;
  onChange: (field: keyof Omit<ExercicioItem, "id">, value: any) => void;
  compact?: boolean;
}

function ExerciseFields({ data, errors, prefix, onChange, compact = false }: ExerciseFieldsProps) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {/* Nome */}
      <div className="space-y-1">
        <Label htmlFor={`${prefix}nome`} className={compact ? "text-xs" : ""}>
          Nome do Exercício *
        </Label>
        <Input
          id={`${prefix}nome`}
          value={data.nome}
          onChange={(e) => onChange("nome", e.target.value)}
          placeholder="Ex: Supino Reto com Barra"
          className={cn(
            compact ? "h-9 text-sm" : "h-10",
            errors[`${prefix}nome`] && "border-destructive"
          )}
        />
        {errors[`${prefix}nome`] && (
          <p className="text-xs text-destructive">{errors[`${prefix}nome`]}</p>
        )}
      </div>

      {/* Link vídeo */}
      <div className="space-y-1">
        <Label htmlFor={`${prefix}link_video`} className={compact ? "text-xs" : ""}>
          Link do Vídeo (opcional)
        </Label>
        <Input
          id={`${prefix}link_video`}
          value={data.link_video}
          onChange={(e) => onChange("link_video", e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className={cn(
            compact ? "h-9 text-sm" : "h-10",
            errors[`${prefix}link_video`] && "border-destructive"
          )}
        />
        {errors[`${prefix}link_video`] && (
          <p className="text-xs text-destructive">{errors[`${prefix}link_video`]}</p>
        )}
      </div>

      {/* Grid: séries, repetições, descanso */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${prefix}series`} className={compact ? "text-xs" : ""}>
            Séries *
          </Label>
          <Input
            id={`${prefix}series`}
            type="number"
            min={1}
            max={20}
            value={data.series}
            onChange={(e) => onChange("series", parseInt(e.target.value) || 1)}
            className={cn(
              compact ? "h-9 text-sm" : "h-10",
              errors[`${prefix}series`] && "border-destructive"
            )}
          />
          {errors[`${prefix}series`] && (
            <p className="text-xs text-destructive">{errors[`${prefix}series`]}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${prefix}repeticoes`} className={compact ? "text-xs" : ""}>
            Repetições *
          </Label>
          <Input
            id={`${prefix}repeticoes`}
            value={data.repeticoes}
            onChange={(e) => onChange("repeticoes", e.target.value)}
            placeholder="10-12"
            className={cn(
              compact ? "h-9 text-sm" : "h-10",
              errors[`${prefix}repeticoes`] && "border-destructive"
            )}
          />
          {errors[`${prefix}repeticoes`] && (
            <p className="text-xs text-destructive">{errors[`${prefix}repeticoes`]}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${prefix}descanso`} className={compact ? "text-xs" : ""}>
            Descanso (s)
          </Label>
          <Input
            id={`${prefix}descanso`}
            type="number"
            min={0}
            max={600}
            value={data.descanso}
            onChange={(e) => onChange("descanso", parseInt(e.target.value) || 0)}
            className={cn(
              compact ? "h-9 text-sm" : "h-10",
              errors[`${prefix}descanso`] && "border-destructive"
            )}
          />
        </div>
      </div>

      {/* Carga */}
      <div className="space-y-1">
        <Label htmlFor={`${prefix}carga`} className={compact ? "text-xs" : ""}>
          Carga (opcional)
        </Label>
        <Input
          id={`${prefix}carga`}
          value={data.carga}
          onChange={(e) => onChange("carga", e.target.value)}
          placeholder="Ex: 20kg, Peso corporal..."
          className={compact ? "h-9 text-sm" : "h-10"}
        />
      </div>

      {/* Observações */}
      <div className="space-y-1">
        <Label htmlFor={`${prefix}observacoes`} className={compact ? "text-xs" : ""}>
          Observações (opcional)
        </Label>
        <Textarea
          id={`${prefix}observacoes`}
          rows={compact ? 2 : 3}
          value={data.observacoes}
          onChange={(e) => onChange("observacoes", e.target.value)}
          placeholder="Ex: Manter cotovelos a 45°, controlar a descida..."
          className={compact ? "text-sm" : ""}
        />
      </div>
    </div>
  );
}
