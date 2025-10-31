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
  readOnly?: boolean; // Personal não deve ver o timer, só o aluno
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
      {/* ✅ Card fixo e estilizado */}
      <Card className="sticky top-4 z-10 shadow-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {/* ✅ Header */}
            <div className="flex items-center gap-2 text-primary">
              <Timer className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Cronômetro do Treino</h3>
            </div>

            {/* ✅ Tempo formatado */}
            <div className="text-5xl font-bold font-mono tabular-nums tracking-tight">
              {formattedTime}
            </div>

            {/* ✅ Indicador de status */}
            {(isRunning || isPaused) && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"
                  }`}
                />
                <span className="text-muted-foreground">
                  {isPaused ? "Pausado" : "Em andamento"}
                </span>
              </div>
            )}

            {/* ✅ Dica inicial */}
            {!isRunning && !isPaused && (
              <p className="text-xs text-muted-foreground">
                Inicie o cronômetro para acompanhar seu desempenho
              </p>
            )}

            {/* ✅ Botões de controle */}
            <div className="flex gap-2 w-full">
              {!isRunning && !isPaused && (
                <Button onClick={iniciar} size="lg" className="w-full">
                  <Play className="h-5 w-5 mr-2" />
                  Iniciar Treino
                </Button>
              )}

              {isRunning && (
                <>
                  <Button
                    onClick={togglePause}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Pausar
                  </Button>

                  <Button
                    onClick={() => setShowFinalizarDialog(true)}
                    size="lg"
                    className="flex-1"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Finalizar
                  </Button>

                  <Button
                    onClick={() => setShowCancelarDialog(true)}
                    variant="ghost"
                    size="lg"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </>
              )}

              {isPaused && (
                <>
                  <Button
                    onClick={togglePause}
                    size="lg"
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Retomar
                  </Button>

                  <Button
                    onClick={() => setShowFinalizarDialog(true)}
                    size="lg"
                    className="flex-1"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Finalizar
                  </Button>

                  <Button
                    onClick={() => setShowCancelarDialog(true)}
                    variant="ghost"
                    size="lg"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Dialog de Finalizar */}
      <AlertDialog
        open={showFinalizarDialog}
        onOpenChange={setShowFinalizarDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar este treino? Ele será marcado
              como concluído e o cronômetro será zerado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalizar}>
              Sim, finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ✅ Dialog de Cancelar */}
      <AlertDialog
        open={showCancelarDialog}
        onOpenChange={setShowCancelarDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este treino? O progresso não será
              salvo e o cronômetro será zerado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, continuar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
