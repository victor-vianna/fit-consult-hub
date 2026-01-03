import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Clock,
  CheckCircle2,
  Circle,
  Edit,
  Trash2,
  Activity,
  Zap,
  Timer,
  GripVertical,
  Heart,
  Gauge,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  BlocoTreino,
  TIPOS_BLOCO,
  TipoBloco,
  formatarDuracao,
  formatarIntensidadeCardio,
  getCorTipoBloco,
} from "@/types/workoutBlocks";
import { cn } from "@/lib/utils";

interface WorkoutBlockCardProps {
  bloco: BlocoTreino;
  index: number;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleConcluido?: (id: string, concluido: boolean) => void;
  onSaveAsTemplate?: (bloco: BlocoTreino, nome: string) => Promise<unknown>;
}

export function WorkoutBlockCard({
  bloco,
  index,
  readOnly = false,
  onEdit,
  onDelete,
  onToggleConcluido,
  onSaveAsTemplate,
}: WorkoutBlockCardProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState(bloco.nome);
  const [isSaving, setIsSaving] = useState(false);
  const tipoConfig = TIPOS_BLOCO[bloco.tipo];
  const cor = getCorTipoBloco(bloco.tipo);
  const tipoChave = bloco.tipo as TipoBloco;
  const tipoInfo = TIPOS_BLOCO[tipoChave] ?? TIPOS_BLOCO.outro;

  const handleToggleBloco = async () => {
    if (!onToggleConcluido) return;
    
    // Haptic feedback
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    const novoStatus = !bloco.concluido;
    
    try {
      await onToggleConcluido(bloco.id, novoStatus);
      
      if (novoStatus) {
        toast.success(`✓ ${bloco.nome} concluído!`, {
          duration: 2000,
        });
      } else {
        toast.info(`↻ ${bloco.nome} desmarcado`, {
          duration: 1500
        });
      }
    } catch (error) {
      console.error("Erro ao marcar bloco:", error);
      toast.error("Erro ao atualizar bloco");
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!onSaveAsTemplate || !templateName.trim()) return;
    
    setIsSaving(true);
    try {
      await onSaveAsTemplate(bloco, templateName.trim());
      setSaveDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const corClasses: Record<string, string> = {
    red: "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
    blue: "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20",
    purple: "border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20",
    orange: "border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20",
    green: "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
    teal: "border-teal-500/50 bg-teal-50/50 dark:bg-teal-950/20",
    gray: "border-gray-500/50 bg-gray-50/50 dark:bg-gray-950/20",
  };

  const corClass = corClasses[cor] || corClasses.gray;

  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all",
        corClass,
        bloco.concluido && "opacity-75"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Grip + Checkbox/Index */}
            <div className="flex flex-col items-center gap-1 pt-1">
              {!readOnly && (
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              )}

              {readOnly && onToggleConcluido ? (
                <button
                  onClick={handleToggleBloco}
                  className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  {bloco.concluido ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  )}
                </button>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {index + 1}
                </Badge>
              )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{tipoConfig.icon}</span>
                  <h4
                    className={cn(
                      "font-semibold text-lg md:text-base",
                      bloco.concluido && "line-through text-muted-foreground"
                    )}
                  >
                    {bloco.nome}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {tipoConfig.label}
                  </Badge>
                  {bloco.obrigatorio && (
                    <Badge variant="destructive" className="text-xs">
                      Obrigatório
                    </Badge>
                  )}
                  {bloco.concluido && (
                    <Badge variant="default" className="text-xs bg-green-600">
                      ✓ Concluído
                    </Badge>
                  )}
                </div>
              </div>

              {/* Descrição - fallback para observações das configs */}
              {(bloco.descricao || 
                bloco.config_alongamento?.observacoes || 
                bloco.config_aquecimento?.observacoes) && (
                <p className="text-base md:text-sm text-muted-foreground">
                  {bloco.descricao || 
                   bloco.config_alongamento?.observacoes || 
                   bloco.config_aquecimento?.observacoes}
                </p>
              )}

              {/* Detalhes por tipo */}
              <div className="space-y-2">
                {/* CARDIO */}
                {bloco.tipo === "cardio" && bloco.config_cardio && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-red-600" />
                        <span className="font-medium capitalize">
                          {bloco.config_cardio.tipo.replace("-", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-orange-600" />
                        <span className="capitalize">
                          {bloco.config_cardio.modalidade}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>
                          {formatarDuracao(bloco.config_cardio.duracao_minutos)}
                        </span>
                      </div>
                    </div>

                    {/* HIIT/Intervalado */}
                    {(bloco.config_cardio.modalidade === "hiit" ||
                      bloco.config_cardio.modalidade === "intervalado") && (
                      <div className="p-3 bg-background/80 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Timer className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            Protocolo de Intervalos
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Trabalho:
                            </span>{" "}
                            <strong>
                              {bloco.config_cardio.trabalho_segundos}s
                            </strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Descanso:
                            </span>{" "}
                            <strong>
                              {bloco.config_cardio.descanso_segundos}s
                            </strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Rounds:
                            </span>{" "}
                            <strong>{bloco.config_cardio.rounds}x</strong>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatarIntensidadeCardio(bloco.config_cardio)}
                        </p>
                      </div>
                    )}

                    {/* Métricas adicionais */}
                    {bloco.config_cardio.modalidade === "continuo" && (
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {bloco.config_cardio.velocidade_kmh && (
                          <div className="flex items-center gap-1.5">
                            <Gauge className="h-4 w-4 text-blue-600" />
                            <span>
                              {bloco.config_cardio.velocidade_kmh} km/h
                            </span>
                          </div>
                        )}
                        {bloco.config_cardio.inclinacao_percentual && (
                          <div>
                            <span className="text-muted-foreground">
                              Inclinação:
                            </span>{" "}
                            <strong>
                              {bloco.config_cardio.inclinacao_percentual}%
                            </strong>
                          </div>
                        )}
                        {bloco.config_cardio.batimentos_alvo && (
                          <div className="flex items-center gap-1.5">
                            <Heart className="h-4 w-4 text-red-600" />
                            <span>
                              {bloco.config_cardio.batimentos_alvo.minimo}-
                              {bloco.config_cardio.batimentos_alvo.maximo} BPM
                            </span>
                          </div>
                        )}
                        {bloco.config_cardio.intensidade && (
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-orange-600" />
                            <span>
                              {bloco.config_cardio.intensidade.valor}
                              {bloco.config_cardio.intensidade.unidade ===
                              "percentual"
                                ? "%"
                                : bloco.config_cardio.intensidade.unidade ===
                                  "rpm"
                                ? " RPM"
                                : bloco.config_cardio.intensidade.unidade ===
                                  "watts"
                                ? "W"
                                : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ALONGAMENTO/MOBILIDADE */}
                {(bloco.tipo === "alongamento" ||
                  bloco.tipo === "mobilidade") &&
                  bloco.config_alongamento && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>
                          {formatarDuracao(
                            bloco.config_alongamento.duracao_minutos
                          )}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {bloco.config_alongamento.tipo}
                        </Badge>
                      </div>

                      {bloco.config_alongamento.grupos_musculares.length >
                        0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {bloco.config_alongamento.grupos_musculares.map(
                            (grupo, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {grupo}
                              </Badge>
                            )
                          )}
                        </div>
                      )}

                      {bloco.config_alongamento.observacoes && (
                        <p className="text-xs text-muted-foreground italic">
                          💡 {bloco.config_alongamento.observacoes}
                        </p>
                      )}
                    </div>
                  )}

                {/* AQUECIMENTO */}
                {bloco.tipo === "aquecimento" && bloco.config_aquecimento && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span>
                        {formatarDuracao(
                          bloco.config_aquecimento.duracao_minutos
                        )}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {bloco.config_aquecimento.tipo}
                      </Badge>
                    </div>

                    {bloco.config_aquecimento.atividades.length > 0 && (
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {bloco.config_aquecimento.atividades.map(
                          (atividade, idx) => (
                            <li key={idx} className="text-muted-foreground">
                              {atividade}
                            </li>
                          )
                        )}
                      </ul>
                    )}
                  </div>
                )}

                {/* Duração total */}
                {bloco.duracao_estimada_minutos && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Clock className="h-3 w-3" />
                    <span>
                      Duração estimada:{" "}
                      {formatarDuracao(bloco.duracao_estimada_minutos)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ações (só para Personal) */}
          {!readOnly && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onSaveAsTemplate && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => {
                    setTemplateName(bloco.nome);
                    setSaveDialogOpen(true);
                  }}
                  className="h-10 w-10 md:h-9 md:w-9 touch-target"
                  title="Salvar como template"
                >
                  <Save className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              )}
              {onEdit && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={onEdit}
                  className="h-10 w-10 md:h-9 md:w-9 touch-target"
                >
                  <Edit className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 md:h-9 md:w-9 text-destructive hover:text-destructive touch-target"
                  onClick={onDelete}
                >
                  <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {/* Dialog para salvar como template */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como Template</DialogTitle>
            <DialogDescription>
              Salve este bloco como um template reutilizável
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Template</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: HIIT Bike 10x30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={isSaving || !templateName.trim()}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
