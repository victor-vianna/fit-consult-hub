import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InlinePesoInputProps {
  exercicioId: string;
  pesoRecomendado: string | null;
  pesoExecutado: string | null;
  onSave: (exercicioId: string, peso: string) => Promise<void>;
  disabled?: boolean;
}

export function InlinePesoInput({
  exercicioId,
  pesoRecomendado,
  pesoExecutado,
  onSave,
  disabled = false
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

  const handleCancel = () => {
    setValue(pesoExecutado || pesoRecomendado || "");
    setEditing(false);
  };

  if (!editing) {
    const displayValue = value || pesoRecomendado || "";
    
    if (!displayValue) {
      // No weight set yet - show "Registrar" button
      return (
        <button
          onClick={() => setEditing(true)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded transition-all",
            "font-medium text-sm md:text-xs touch-target",
            "text-muted-foreground bg-muted/50 hover:bg-muted",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Edit2 className="h-3.5 w-3.5 opacity-60" />
          <span>Registrar peso</span>
        </button>
      );
    }
    
    return (
      <button
        onClick={() => setEditing(true)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded transition-all",
          "font-mono font-semibold text-base md:text-sm touch-target",
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
        <span>{displayValue}kg</span>
        <Edit2 className="h-4 w-4 md:h-3 md:w-3 opacity-60" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
        className="h-11 md:h-9 w-24 md:w-20 px-3 md:px-2 text-base md:text-xs font-mono"
        placeholder="kg"
        autoFocus
        disabled={saving}
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={handleSave}
        disabled={saving}
        className="h-11 w-11 md:h-9 md:w-9 text-green-600 hover:bg-green-100 dark:hover:bg-green-950 touch-target"
      >
        <Check className="h-5 w-5 md:h-4 md:w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCancel}
        disabled={saving}
        className="h-11 w-11 md:h-9 md:w-9 text-red-600 hover:bg-red-100 dark:hover:bg-red-950 touch-target"
      >
        <X className="h-5 w-5 md:h-4 md:w-4" />
      </Button>
    </div>
  );
}
