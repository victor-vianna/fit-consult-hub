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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface WorkoutTimerProps {
  treinoId: string;
  profileId: string;
  personalId: string;
  readOnly?: boolean;
  onWorkoutComplete?: () => void;
  onWorkoutCancel?: () => void;
  /** Progress percentage 0-100 from parent */
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
  const [expanded, setExpanded] = useState(false);

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

  // Completion screen (full overlay)
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

  // Start button (inline, before workout begins)
  if (!isActive) {
    return (
      <Button
        onClick={iniciar}
        size="lg"
        className="w-full shadow-lg"
      >
        <Play className="h-5 w-5 mr-2" />
        Iniciar Treino
      </Button>
    );
  }

  // ── Active workout: bottom sticky bar ──
  return (
    <>
      {/* Bottom bar – sits above BottomNavigation (bottom ~70px) */}
      <div
        className={cn(
          "fixed left-0 right-0 z-40",
          // Above the safe-area bottom nav (~68px)
          "bottom-[68px] sm:bottom-0",
          "transition-all duration-300 ease-out"
        )}
      >
        {/* Progress strip along the top edge */}
        <div className="h-1 bg-muted/50">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* Main bar */}
        <div
          className={cn(
            "bg-card/95 backdrop-blur-xl border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]",
            "dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]",
            isPaused && "border-t-warning/40"
          )}
        >
          {/* Compact row – always visible */}
          <div className="flex items-center justify-between px-4 py-2.5">
            {/* Left: timer + status */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2.5 min-w-0 active:opacity-70 transition-opacity"
            >
              <div className="relative flex-shrink-0">
                <Timer
                  className={cn(
                    "h-5 w-5",
                    isPaused ? "text-warning" : "text-primary"
                  )}
                />
                {!isPaused && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <span
                className={cn(
                  "text-xl font-bold font-mono tabular-nums tracking-tight",
                  isPaused ? "text-warning" : "text-foreground"
                )}
              >
                {formattedTime}
              </span>
              {isPaused && (
                <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                  PAUSADO
                </span>
              )}
              <ChevronUp
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </button>

            {/* Right: quick actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={togglePause}
                className={cn(
                  "h-9 w-9 p-0 rounded-full",
                  isPaused
                    ? "border-primary text-primary hover:bg-primary/10"
                    : "border-warning text-warning hover:bg-warning/10"
                )}
              >
                {isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowFinalizarDialog(true)}
                className="h-9 px-3.5 rounded-full shadow-sm"
              >
                <Check className="h-4 w-4 mr-1" />
                <span className="text-xs font-semibold">Finalizar</span>
              </Button>
            </div>
          </div>

          {/* Expanded panel – shows more info + cancel */}
          {expanded && (
            <div className="px-4 pb-3 pt-1 border-t border-border/50 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {progresso > 0 && (
                    <div className="flex items-center gap-2">
                      <Progress value={progresso} className="w-20 h-2" />
                      <span className="text-xs text-muted-foreground font-medium">
                        {progresso}%
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCancelarDialog(true)}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancelar treino
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to prevent content from hiding behind the bar */}
      <div className="h-[56px] sm:h-[52px]" />

      {/* Dialog: Finalizar */}
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

      {/* Dialog: Cancelar */}
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
