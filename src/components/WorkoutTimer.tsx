import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Check, X, Timer, Loader2, ChevronUp } from "lucide-react";
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
    return null; // Don't show skeleton for the fixed bar — let it appear naturally
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

  // Start button — rendered inline in the workout card
  if (!isActive) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Você está no <span className="font-semibold">modo visualização</span>.
            <br />
            Aperte <span className="font-semibold">INICIAR</span> para começar o treino.
          </p>
          <Button onClick={iniciar} size="lg" className="w-full h-12 text-base font-semibold shadow-lg">
            <Play className="h-5 w-5 mr-2" />
            Iniciar Treino
          </Button>
        </div>
      </div>
    );
  }

  // ─── Active Workout: MFIT-style inline card ───
  return (
    <>
      {/* Inline Timer Card */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${Math.max(progresso, 2)}%` }}
          />
        </div>

        {/* Timer Display */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Timer className={cn("h-5 w-5", isPaused ? "text-warning" : "text-primary")} />
            <span
              className={cn(
                "text-3xl sm:text-4xl font-bold font-mono tabular-nums",
                isPaused ? "text-warning" : "text-foreground"
              )}
            >
              {formattedTime}
            </span>
          </div>

          {isPaused && (
            <p className="text-center text-sm font-medium text-warning mb-3">
              Treino pausado
            </p>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={togglePause}
              variant={isPaused ? "default" : "outline"}
              size="lg"
              className="h-11"
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Retomar
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowFinalizarDialog(true)}
              variant="default"
              size="lg"
              className="h-11"
            >
              <Check className="h-4 w-4 mr-2" />
              Finalizar
            </Button>
          </div>

          {/* Cancel link */}
          <button
            onClick={() => setShowCancelarDialog(true)}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Cancelar treino
          </button>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <AlertDialog open={showFinalizarDialog} onOpenChange={setShowFinalizarDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Finalizar treino?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Seu treino será marcado como concluído.</p>
                <div className="bg-muted/50 p-3 rounded-xl space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tempo total</span>
                    <span className="font-semibold font-mono">{formattedTime}</span>
                  </div>
                  {progresso > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{progresso}%</span>
                    </div>
                  )}
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

      <AlertDialog open={showCancelarDialog} onOpenChange={setShowCancelarDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
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
