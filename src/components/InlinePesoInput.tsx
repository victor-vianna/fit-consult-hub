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
    return (
      <button
        onClick={() => setEditing(true)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded transition-all",
          "font-mono font-semibold text-sm min-w-[44px] min-h-[44px]",
          pesoExecutado && pesoExecutado !== pesoRecomendado
            ? "text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-950 dark:hover:bg-blue-900"
            : "text-primary bg-primary/10 hover:bg-primary/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title={
          pesoExecutado && pesoExecutado !== pesoRecomendado
            ? `Recomendado: ${pesoRecomendado}kg | Executado: ${pesoExecutado}kg`
            : `Peso recomendado: ${pesoRecomendado}kg`
        }
      >
        <span>{value}kg</span>
        <Edit2 className="h-3 w-3 opacity-60" />
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
        className="h-9 w-20 px-2 text-xs font-mono"
        placeholder="kg"
        autoFocus
        disabled={saving}
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={handleSave}
        disabled={saving}
        className="h-9 w-9 text-green-600 hover:bg-green-100 dark:hover:bg-green-950"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCancel}
        disabled={saving}
        className="h-9 w-9 text-red-600 hover:bg-red-100 dark:hover:bg-red-950"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
