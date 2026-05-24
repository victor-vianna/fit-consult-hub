import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw, X } from "lucide-react";

interface RestCountdownDialogProps {
  open: boolean;
  seconds: number;
  onOpenChange: (open: boolean) => void;
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function RestCountdownDialog({
  open,
  seconds,
  onOpenChange,
}: RestCountdownDialogProps) {
  const initialSeconds = useMemo(() => Math.max(0, Math.floor(seconds || 0)), [seconds]);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (open) {
      setRemainingSeconds(initialSeconds);
      setRunning(initialSeconds > 0);
    }
  }, [initialSeconds, open]);

  useEffect(() => {
    if (!open || !running || remainingSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, remainingSeconds, running]);

  const progress = initialSeconds > 0
    ? (remainingSeconds / initialSeconds) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tempo entre séries</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2 text-center">
          <div
            className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full p-2"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${progress}%, hsl(var(--muted)) 0)`,
            }}
          >
            <div
              className="absolute inset-2 rounded-full bg-background"
            />
            <span className="relative font-mono text-5xl font-bold tabular-nums">
              {formatSeconds(remainingSeconds)}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            Descanse antes da próxima série.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRemainingSeconds(initialSeconds);
                setRunning(initialSeconds > 0);
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={() => setRunning((value) => !value)}
              disabled={remainingSeconds <= 0}
              className="gap-2"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pausar" : "Iniciar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RestCountdownDialog;
