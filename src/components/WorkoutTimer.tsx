import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Check, X, Timer, Loader2 } from "lucide-react";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";
import { WorkoutCompletionScreen } from "./WorkoutCompletionScreen";
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
  progresso?: number;
}

export function WorkoutTimer({
  treinoId,
  profileId,
  personalId,
  readOnly = false,
  onWorkoutComplete,
  onWorkoutCancel,
  progresso = 0,
}: WorkoutTimerProps) {
  const [showFinalizarDialog, setShowFinalizarDialog] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [isFinalizando, setIsFinalizando] = useState(false);

  const {
    isRunning,
    isPaused,
    isLoading,
    formattedTime,
    showCompletionScreen,
    completionData,
    iniciar,
    togglePause,
    finalizar,
    cancelar,
    fecharTelaConclusao,
  } = useWorkoutTimer({ treinoId, profileId, personalId });

  if (readOnly) return null;

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
      <div className="w-full p-3 bg-card border rounded-xl">
        <div className="flex items-center justify-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
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

  // Start button (inline)
  if (!isActive) {
    return (
      <Button onClick={iniciar} size="lg" className="w-full shadow-lg">
        <Play className="h-5 w-5 mr-2" />
        Iniciar Treino
      </Button>
    );
  }

  // Active workout: fixed bottom bar above BottomNavigation
  // NO spacer here — parent handles padding via `pb-` class
  return (
    <>
      <div
        className={cn(
          "fixed left-0 right-0 z-40",
          "bottom-[68px] sm:bottom-0"
        )}
      >
        {/* Thin progress bar */}
        {progresso > 0 && (
          <div className="h-[3px] bg-muted/30">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
        )}

        {/* Compact single-row bar */}
        <div
          className={cn(
            "bg-card border-t shadow-[0_-2px_12px_rgba(0,0,0,0.08)]",
            "dark:shadow-[0_-2px_12px_rgba(0,0,0,0.25)]",
            isPaused && "border-t-warning/50"
          )}
        >
          <div className="flex items-center justify-between px-3 py-2">
            {/* Timer display */}
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <Timer
                  className={cn(
                    "h-4 w-4",
                    isPaused ? "text-warning" : "text-primary"
                  )}
                />
                {!isPaused && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <span
                className={cn(
                  "text-lg font-bold font-mono tabular-nums",
                  isPaused ? "text-warning" : "text-foreground"
                )}
              >
                {formattedTime}
              </span>
              {isPaused && (
                <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                  PAUSADO
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              {/* Cancel — small ghost icon */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCancelarDialog(true)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Pause/Resume */}
              <Button
                size="sm"
                variant="outline"
                onClick={togglePause}
                className={cn(
                  "h-8 w-8 p-0",
                  isPaused
                    ? "border-primary/50 text-primary"
                    : "border-warning/50 text-warning"
                )}
              >
                {isPaused ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <Pause className="h-3.5 w-3.5" />
                )}
              </Button>

              {/* Finalizar */}
              <Button
                size="sm"
                onClick={() => setShowFinalizarDialog(true)}
                className="h-8 px-3 text-xs font-semibold"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showFinalizarDialog} onOpenChange={setShowFinalizarDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Finalizar treino?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Seu treino será marcado como concluído.</p>
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Tempo total:</span>
                  <span className="font-medium">{formattedTime}</span>
                </div>
                {progresso > 0 && (
                  <div className="flex justify-between">
                    <span>Progresso:</span>
                    <span className="font-medium">{progresso}%</span>
                  </div>
                )}
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

      <AlertDialog open={showCancelarDialog} onOpenChange={setShowCancelarDialog}>
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
