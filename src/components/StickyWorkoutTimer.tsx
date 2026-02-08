// components/StickyWorkoutTimer.tsx
// 🔧 Timer sticky para mobile - fica visível durante scroll
import { useState, useEffect } from "react";
import { Timer, Pause, Play, Check, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StickyWorkoutTimerProps {
  isRunning: boolean;
  isPaused: boolean;
  isResting: boolean;
  formattedTime: string;
  formattedRestTime: string;
  restType: "serie" | "exercicio" | null;
  onTogglePause: () => void;
  onFinish: () => void;
  onEncerrarDescanso: () => void;
}

export function StickyWorkoutTimer({
  isRunning,
  isPaused,
  isResting,
  formattedTime,
  formattedRestTime,
  restType,
  onTogglePause,
  onFinish,
  onEncerrarDescanso,
}: StickyWorkoutTimerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // 🔧 Mostrar sticky quando scrollar para baixo
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Mostrar após scrollar 200px
      if (currentScrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Só mostrar se treino estiver ativo
  if (!isRunning && !isPaused) return null;
  
  // Só mostrar se passou do threshold de scroll
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 z-50",
        "bg-card/95 backdrop-blur-lg border-2 shadow-2xl rounded-2xl",
        "transition-all duration-300 ease-out",
        "safe-area-inset-bottom",
        isPaused ? "border-warning/50" : isResting ? "border-accent/50" : "border-primary/50"
      )}
    >
      <div className="flex items-center justify-between p-3 gap-3">
        {/* Timer Display */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Indicador pulsante */}
          <div className="relative shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isPaused ? "bg-warning/20" : isResting ? "bg-accent/20" : "bg-primary/20"
            )}>
              {isResting ? (
                <Coffee className="h-5 w-5 text-accent animate-pulse" />
              ) : (
                <Timer className={cn(
                  "h-5 w-5",
                  isPaused ? "text-warning" : "text-primary"
                )} />
              )}
            </div>
            {/* Indicador de ativo */}
            {!isPaused && (
              <div className={cn(
                "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full",
                isResting ? "bg-accent" : "bg-primary",
                "animate-pulse"
              )} />
            )}
          </div>

          {/* Tempo */}
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "text-2xl font-bold font-mono tabular-nums",
              isPaused ? "text-warning" : isResting ? "text-accent" : "text-primary"
            )}>
              {isResting ? formattedRestTime : formattedTime}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {isPaused ? "Pausado" : isResting 
                ? `Descanso ${restType === "serie" ? "séries" : "exercícios"}`
                : "Em andamento"
              }
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 shrink-0">
          {isResting ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onEncerrarDescanso}
              className="h-10 px-3 border-accent text-accent hover:bg-accent/10"
            >
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onTogglePause}
                className={cn(
                  "h-10 w-10 p-0",
                  isPaused ? "border-primary text-primary" : "border-warning text-warning"
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
                onClick={onFinish}
                className="h-10 px-3 shadow-lg"
              >
                <Check className="h-4 w-4 mr-1" />
                <span className="text-xs">Finalizar</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default StickyWorkoutTimer;
