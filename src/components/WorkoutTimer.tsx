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
      <Button onClick={iniciar} size="lg" className="w-full shadow-lg">
        <Play className="h-5 w-5 mr-2" />
        Iniciar Treino
      </Button>
    );
  }

  // ─── Active Workout: MFIT-style bottom bar ───
  return (
    <>
      {/* Fixed bottom bar — sits above BottomNavigation (68px) */}
      <div
        className={cn(
          "fixed left-0 right-0 z-40",
          "bottom-[68px] sm:bottom-0",
          "safe-area-bottom"
        )}
      >
        {/* Progress line — thin accent at top */}
        <div className="h-[2px] bg-border">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${Math.max(progresso, 2)}%` }}
          />
        </div>

        {/* Main bar */}
        <div
          className={cn(
            "bg-card/95 backdrop-blur-md border-t",
            "transition-colors duration-300",
            isPaused && "bg-warning/5"
          )}
        >
          <div className="flex items-center h-12 px-3 gap-2">
            {/* Left: Timer */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    isPaused
                      ? "bg-warning"
                      : "bg-primary"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-base font-bold font-mono tabular-nums tracking-tight",
                  isPaused ? "text-warning" : "text-foreground"
                )}
              >
                {formattedTime}
              </span>
              {isPaused && (
                <span className="text-[10px] font-semibold text-warning uppercase tracking-wider">
                  pausado
                </span>
              )}
              {!isPaused && progresso > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {progresso}%
                </span>
              )}
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Cancel */}
              <button
                onClick={() => setShowCancelarDialog(true)}
                className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Cancelar treino"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Pause / Resume */}
              <button
                onClick={togglePause}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-full transition-colors",
                  isPaused
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-warning/10 text-warning hover:bg-warning/20"
                )}
                aria-label={isPaused ? "Retomar" : "Pausar"}
              >
                {isPaused ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <Pause className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Finish */}
              <button
                onClick={() => setShowFinalizarDialog(true)}
                className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Finalizar</span>
              </button>
            </div>
          </div>
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
