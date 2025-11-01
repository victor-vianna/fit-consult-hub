// components/WorkoutTimer.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Check, X, Timer } from "lucide-react";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";
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

interface WorkoutTimerProps {
  treinoId: string;
  profileId: string;
  personalId: string;
  readOnly?: boolean;
}

export function WorkoutTimer({
  treinoId,
  profileId,
  personalId,
  readOnly = false,
}: WorkoutTimerProps) {
  const [showFinalizarDialog, setShowFinalizarDialog] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);

  const {
    isRunning,
    isPaused,
    formattedTime,
    iniciar,
    togglePause,
    finalizar,
    cancelar,
  } = useWorkoutTimer({ treinoId, profileId, personalId });

  if (readOnly) return null;

  const handleFinalizar = async () => {
    await finalizar();
    setShowFinalizarDialog(false);
  };

  const handleCancelar = async () => {
    await cancelar();
    setShowCancelarDialog(false);
  };

  return (
    <>
      {/* Card do Cronômetro */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-xl backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            {/* Header */}
            <div className="flex items-center gap-2 text-primary">
              <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
              <h3 className="text-sm sm:text-base font-semibold">
                Cronômetro do Treino
              </h3>
            </div>

            {/* Tempo formatado */}
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono tabular-nums tracking-tight bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              {formattedTime}
            </div>

            {/* Indicador de status */}
            {(isRunning || isPaused) && (
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"
                  }`}
                />
                <span className="text-muted-foreground font-medium">
                  {isPaused ? "Pausado" : "Em andamento"}
                </span>
              </div>
            )}

            {/* Dica inicial */}
            {!isRunning && !isPaused && (
              <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-xs">
                Inicie o cronômetro para acompanhar seu desempenho
              </p>
            )}

            {/* Botões de controle */}
            <div className="flex gap-2 w-full flex-wrap sm:flex-nowrap">
              {!isRunning && !isPaused && (
                <Button
                  onClick={iniciar}
                  size="lg"
                  className="w-full shadow-lg hover:shadow-xl transition-all"
                >
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Iniciar Treino</span>
                </Button>
              )}

              {isRunning && (
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
            <AlertDialogTitle>Finalizar treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar este treino? Ele será marcado
              como concluído e o cronômetro será zerado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalizar}
              className="w-full sm:w-auto"
            >
              Sim, finalizar
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
            <AlertDialogTitle>Cancelar treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este treino? O progresso não será
              salvo e o cronômetro será zerado.
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
