// components/WorkoutTimer.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Check, X, Timer, Coffee, Dumbbell, Loader2 } from "lucide-react";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";
import { WorkoutCompletionScreen } from "./WorkoutCompletionScreen";
import { StickyWorkoutTimer } from "./StickyWorkoutTimer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface WorkoutTimerProps {
  treinoId: string;
  profileId: string;
  personalId: string;
  readOnly?: boolean;
  onWorkoutComplete?: () => void;
  onWorkoutCancel?: () => void;
}

export function WorkoutTimer({
  treinoId,
  profileId,
  personalId,
  readOnly = false,
  onWorkoutComplete,
  onWorkoutCancel,
}: WorkoutTimerProps) {
  const [showFinalizarDialog, setShowFinalizarDialog] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [isFinalizando, setIsFinalizando] = useState(false);

  const {
    isRunning,
    isPaused,
    isResting,
    isLoading,
    formattedTime,
    formattedRestTime,
    formattedDescansoTotal,
    restType,
    tempoDescansoTotal,
    descansos,
    showCompletionScreen,
    completionData,
    iniciar,
    togglePause,
    finalizar,
    cancelar,
    iniciarDescanso,
    encerrarDescanso,
    fecharTelaConclusao,
  } = useWorkoutTimer({ treinoId, profileId, personalId });

  if (readOnly) return null;

  // Mostrar tela de conclusão
  if (showCompletionScreen && completionData) {
    return (
      <WorkoutCompletionScreen
        data={completionData}
        treinoId={treinoId}
        onClose={() => {
          fecharTelaConclusao();
          onWorkoutComplete?.();
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-14 w-48" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleFinalizar = async () => {
    setIsFinalizando(true);
    await finalizar();
    setShowFinalizarDialog(false);
    setIsFinalizando(false);
  };

  const handleCancelar = async () => {
    await cancelar();
    setShowCancelarDialog(false);
    onWorkoutCancel?.();
  };

  const isActive = isRunning || isPaused;

  return (
    <>
      {/* 🔧 Timer sticky para mobile - aparece ao scrollar */}
      <StickyWorkoutTimer
        isRunning={isRunning}
        isPaused={isPaused}
        isResting={isResting}
        formattedTime={formattedTime}
        formattedRestTime={formattedRestTime}
        restType={restType}
        onTogglePause={togglePause}
        onFinish={() => setShowFinalizarDialog(true)}
        onEncerrarDescanso={encerrarDescanso}
      />

      <Card className={cn(
        "border-2 shadow-xl backdrop-blur-sm",
        "bg-gradient-to-br from-primary/5 via-background to-primary/5",
        isActive && "border-primary/30",
        isPaused && "border-yellow-500/30",
        isResting && "border-blue-500/30 animate-pulse"
      )}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            {/* Header com indicador de status */}
            <div className="flex items-center gap-2">
              {/* 🔧 Indicador pulsante quando ativo */}
              {isActive && (
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  isPaused ? "bg-yellow-500" : isResting ? "bg-blue-500 animate-pulse" : "bg-green-500 animate-pulse"
                )} />
              )}
              <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-sm sm:text-base font-semibold text-primary">
                Cronômetro do Treino
              </h3>
            </div>

            {/* Tempo total - maior e mais visível */}
            <div className={cn(
              "text-5xl sm:text-6xl md:text-7xl font-bold font-mono tabular-nums tracking-tight",
              "bg-gradient-to-br bg-clip-text text-transparent",
              isPaused 
                ? "from-yellow-500 to-yellow-600" 
                : isResting 
                  ? "from-blue-500 to-blue-600"
                  : "from-primary to-primary/60"
            )}>
              {formattedTime}
            </div>

            {/* Indicador de status */}
            {isActive && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
                  <span className={cn(
                    "font-medium px-3 py-1 rounded-full",
                    isPaused 
                      ? "bg-yellow-500/10 text-yellow-600" 
                      : isResting 
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-green-500/10 text-green-600"
                  )}>
                    {isPaused ? "⏸️ Pausado" : isResting ? "☕ Descansando" : "▶️ Em andamento"}
                  </span>
                </div>
                
                {/* Info de descanso total */}
                {tempoDescansoTotal > 0 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Coffee className="h-3 w-3" />
                    Descanso total: {formattedDescansoTotal}
                  </div>
                )}
              </div>
            )}

            {/* Dica inicial */}
            {!isActive && (
              <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-xs">
                Inicie o cronômetro para acompanhar seu desempenho
              </p>
            )}

            {/* Seção de Descanso */}
            {isActive && !isPaused && (
              <div className="w-full border rounded-lg p-3 bg-muted/30">
                {isResting ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Coffee className="h-4 w-4 animate-bounce" />
                      <span className="text-sm font-medium">
                        Descanso {restType === "serie" ? "entre séries" : "entre exercícios"}
                      </span>
                    </div>
                    <div className="text-4xl font-mono font-bold text-blue-600">
                      {formattedRestTime}
                    </div>
                    <Button
                      onClick={encerrarDescanso}
                      variant="outline"
                      className="w-full border-blue-500 text-blue-600 hover:bg-blue-500/10"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Encerrar Descanso
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Coffee className="h-4 w-4" />
                      <span className="text-xs font-medium">Iniciar descanso</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => iniciarDescanso("serie")}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Dumbbell className="h-3 w-3 mr-1" />
                        Entre Séries
                      </Button>
                      <Button
                        onClick={() => iniciarDescanso("exercicio")}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Coffee className="h-3 w-3 mr-1" />
                        Entre Exercícios
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resumo de descansos */}
            {isActive && descansos.length > 0 && (
              <div className="w-full text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Descansos realizados:</span>
                  <span className="font-medium">{descansos.filter(d => d.duracao_segundos).length}</span>
                </div>
              </div>
            )}

            {/* Botões de controle */}
            <div className="flex gap-2 w-full flex-wrap sm:flex-nowrap">
              {!isActive && (
                <Button
                  onClick={iniciar}
                  size="lg"
                  className="w-full shadow-lg hover:shadow-xl transition-all"
                >
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Iniciar Treino</span>
                </Button>
              )}

              {isRunning && !isResting && (
                <>
                  <Button
                    onClick={togglePause}
                    variant="outline"
                    size="lg"
                    className="flex-1 min-w-[100px]"
                  >
                    <Pause className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="text-sm sm:text-base">Pausar</span>
                  </Button>

                  <Button
                    onClick={() => setShowFinalizarDialog(true)}
                    size="lg"
                    className="flex-1 min-w-[100px] shadow-lg"
                  >
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="text-sm sm:text-base">Finalizar</span>
                  </Button>

                  <Button
                    onClick={() => setShowCancelarDialog(true)}
                    variant="ghost"
                    size="lg"
                    className="w-auto px-3 sm:px-4"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </>
              )}

              {isRunning && isResting && (
                <Button
                  onClick={() => setShowFinalizarDialog(true)}
                  size="lg"
                  className="w-full shadow-lg"
                >
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="text-sm sm:text-base">Finalizar Treino</span>
                </Button>
              )}

              {isPaused && (
                <>
                  <Button
                    onClick={togglePause}
                    size="lg"
                    className="flex-1 min-w-[100px] shadow-lg"
                  >
                    <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="text-sm sm:text-base">Retomar</span>
                  </Button>

                  <Button
                    onClick={() => setShowFinalizarDialog(true)}
                    size="lg"
                    className="flex-1 min-w-[100px] shadow-lg"
                  >
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="text-sm sm:text-base">Finalizar</span>
                  </Button>

                  <Button
                    onClick={() => setShowCancelarDialog(true)}
                    variant="ghost"
                    size="lg"
                    className="w-auto px-3 sm:px-4"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Finalizar */}
      <AlertDialog
        open={showFinalizarDialog}
        onOpenChange={setShowFinalizarDialog}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Finalizar treino?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Seu treino será marcado como concluído.</p>
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Tempo total:</span>
                  <span className="font-medium">{formattedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tempo de descanso:</span>
                  <span className="font-medium">{formattedDescansoTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Descansos realizados:</span>
                  <span className="font-medium">{descansos.filter(d => d.duracao_segundos).length}</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto" disabled={isFinalizando}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalizar}
              className="w-full sm:w-auto"
              disabled={isFinalizando}
            >
              {isFinalizando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                "Sim, finalizar!"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Cancelar */}
      <AlertDialog
        open={showCancelarDialog}
        onOpenChange={setShowCancelarDialog}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-destructive" />
              Cancelar treino?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar? O progresso não será salvo e o
              cronômetro será zerado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Não, continuar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelar}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
