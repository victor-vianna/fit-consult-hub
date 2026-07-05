import { useState, useEffect, type MouseEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Edit2, History, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDisplayMonthDay } from "@/utils/dateFormat";

interface InlinePesoInputProps {
  exercicioId: string;
  pesoRecomendado: string | null;
  pesoExecutado: string | null;
  onSave: (exercicioId: string, peso: string) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
  ultimoPesoHistorico?: string | null;
  ultimaDataHistorico?: string | null;
  sugestaoPeso?: string | null;
}

export function InlinePesoInput({
  exercicioId,
  pesoRecomendado,
  pesoExecutado,
  onSave,
  disabled = false,
  compact = false,
  ultimoPesoHistorico = null,
  ultimaDataHistorico = null,
  sugestaoPeso = null,
}: InlinePesoInputProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(pesoExecutado || pesoRecomendado || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(pesoExecutado || pesoRecomendado || "");
  }, [pesoExecutado, pesoRecomendado]);

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error("Informe um peso válido");
      return;
    }

    setSaving(true);
    try {
      await onSave(exercicioId, value.trim());
      setEditing(false);
      toast.success("Peso atualizado!");
    } catch (error) {
      console.error("Erro ao salvar peso:", error);
      toast.error("Erro ao salvar peso");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSave = async (peso: string) => {
    if (!peso.trim()) return;
    setValue(peso.trim());
    setSaving(true);
    try {
      await onSave(exercicioId, peso.trim());
      setEditing(false);
      toast.success("Peso atualizado!");
    } catch (error) {
      console.error("Erro ao salvar peso:", error);
      toast.error("Erro ao salvar peso");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(pesoExecutado || pesoRecomendado || "");
    setEditing(false);
  };

  const stopCardToggle = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  if (!editing) {
    const displayValue = value || pesoRecomendado || "";
    
    if (!pesoExecutado && ultimoPesoHistorico) {
      return (
        <div
          className="w-full min-w-[220px] space-y-2 rounded-lg border bg-muted/30 p-2"
          onClick={stopCardToggle}
        >
          <div className="flex items-start gap-2">
            <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 text-xs">
              <p className="text-muted-foreground">Ultima carga usada</p>
              <p className="font-mono font-semibold text-foreground">
                {ultimoPesoHistorico}kg
                {ultimaDataHistorico && (
                  <span className="font-sans font-normal text-muted-foreground">
                    {" "}em {formatDisplayMonthDay(ultimaDataHistorico)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto flex-col gap-0.5 px-1 py-2 text-xs"
              disabled={disabled || saving}
              onClick={(event) => {
                event.stopPropagation();
                handleQuickSave(ultimoPesoHistorico);
              }}
            >
              <span className="font-mono font-bold">{ultimoPesoHistorico}kg</span>
              <span className="text-[10px] text-muted-foreground">Manter</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto flex-col gap-0.5 border-green-500/60 px-1 py-2 text-xs text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
              disabled={disabled || saving || !sugestaoPeso}
              onClick={(event) => {
                event.stopPropagation();
                if (sugestaoPeso) handleQuickSave(sugestaoPeso);
              }}
            >
              <span className="flex items-center gap-1 font-mono font-bold">
                <TrendingUp className="h-3 w-3" />
                {sugestaoPeso || ultimoPesoHistorico}kg
              </span>
              <span className="text-[10px] text-green-700/80 dark:text-green-400/80">Aumentar</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto flex-col gap-0.5 px-1 py-2 text-xs"
              disabled={disabled || saving}
              onClick={(event) => {
                event.stopPropagation();
                setValue(sugestaoPeso || ultimoPesoHistorico);
                setEditing(true);
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span className="text-[10px] text-muted-foreground">Outra</span>
            </Button>
          </div>
        </div>
      );
    }

    if (!displayValue) {
      // No weight set yet - show "Registrar" button
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setEditing(true);
          }}
          disabled={disabled}
          className={cn(
            "flex items-center rounded transition-all",
            compact ? "gap-1 px-1.5 py-0.5 text-xs" : "gap-1.5 px-3 py-2 font-medium text-sm md:text-xs touch-target",
            "text-muted-foreground bg-muted/50 hover:bg-muted",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Edit2 className={cn("opacity-60", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          <span>{compact ? "Registrar" : "Registrar peso"}</span>
        </button>
      );
    }
    
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setEditing(true);
        }}
        disabled={disabled}
        className={cn(
          "flex items-center rounded transition-all",
          compact
            ? "gap-1 px-1.5 py-0.5 font-mono text-xs font-semibold"
            : "gap-1.5 px-3 py-2 font-mono font-semibold text-base md:text-sm touch-target",
          pesoExecutado && pesoExecutado !== pesoRecomendado
            ? "text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-950 dark:hover:bg-blue-900"
            : "text-primary bg-primary/10 hover:bg-primary/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title={
          pesoExecutado && pesoExecutado !== pesoRecomendado
            ? `Recomendado: ${pesoRecomendado}kg | Executado: ${pesoExecutado}kg`
            : pesoRecomendado 
              ? `Peso recomendado: ${pesoRecomendado}kg`
              : `Peso executado: ${pesoExecutado}kg`
        }
      >
        <span>
          {compact ? `${displayValue}kg` : pesoExecutado ? `Ultima ${displayValue}kg` : `${displayValue}kg`}
        </span>
        <Edit2 className={cn("opacity-60", compact ? "h-3 w-3" : "h-4 w-4 md:h-3 md:w-3")} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={stopCardToggle}>
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
        className={cn(
          "font-mono",
          compact
            ? "h-8 w-16 px-2 text-xs"
            : "h-11 md:h-9 w-24 md:w-20 px-3 md:px-2 text-base md:text-xs"
        )}
        placeholder="kg"
        autoFocus
        disabled={saving}
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={(event) => {
          event.stopPropagation();
          handleSave();
        }}
        disabled={saving}
        className={cn(
          "text-green-600 hover:bg-green-100 dark:hover:bg-green-950",
          compact ? "h-8 w-8" : "h-11 w-11 md:h-9 md:w-9 touch-target"
        )}
      >
        <Check className={cn(compact ? "h-4 w-4" : "h-5 w-5 md:h-4 md:w-4")} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={(event) => {
          event.stopPropagation();
          handleCancel();
        }}
        disabled={saving}
        className={cn(
          "text-red-600 hover:bg-red-100 dark:hover:bg-red-950",
          compact ? "h-8 w-8" : "h-11 w-11 md:h-9 md:w-9 touch-target"
        )}
      >
        <X className={cn(compact ? "h-4 w-4" : "h-5 w-5 md:h-4 md:w-4")} />
      </Button>
    </div>
  );
}
