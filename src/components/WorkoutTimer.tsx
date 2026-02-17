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
    isLoading,
    formattedTime,
    formattedDescansoTotal,
    showCompletionScreen,
    completionData,
    iniciar,
    togglePause,
    finalizar,
    cancelar,
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

  // Botão de iniciar (antes de começar o treino)
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

  // Timer fixo no topo - duas linhas no mobile
  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6",
          "bg-card/95 backdrop-blur-lg border-b shadow-md",
          "transition-colors duration-200",
          isPaused && "border-b-warning/50"
        )}
      >
        {/* Linha 1: Timer centralizado */}
        <div className="flex items-center justify-center py-2 gap-2">
          <div className="relative">
            <Timer className={cn(
              "h-5 w-5",
              isPaused ? "text-warning" : "text-primary"
            )} />
            {!isPaused && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <span className={cn(
            "text-2xl font-bold font-mono tabular-nums",
            isPaused ? "text-warning" : "text-primary"
          )}>
            {formattedTime}
          </span>
          {isPaused && (
            <span className="text-xs text-warning font-medium">Pausado</span>
          )}
        </div>

        {/* Linha 2: Botões distribuídos */}
        <div className="flex items-center justify-center gap-3 pb-3">
          <Button
            size="sm"
            variant="outline"
            onClick={togglePause}
            className={cn(
              "h-11 min-w-[44px] px-4",
              isPaused
                ? "border-primary text-primary hover:bg-primary/10"
                : "border-warning text-warning hover:bg-warning/10"
            )}
          >
            {isPaused ? <Play className="h-4 w-4 mr-1.5" /> : <Pause className="h-4 w-4 mr-1.5" />}
            <span className="text-sm">{isPaused ? "Retomar" : "Pausar"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowFinalizarDialog(true)}
            className="h-11 min-w-[44px] px-4 shadow-sm"
          >
            <Check className="h-4 w-4 mr-1.5" />
            <span className="text-sm">Finalizar</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowCancelarDialog(true)}
            className="h-11 w-11 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Dialog de Finalizar */}
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
