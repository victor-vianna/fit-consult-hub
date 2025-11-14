// components/SalvarComoModeloDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

interface SalvarComoModeloDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dados: {
    nome: string;
    descricao?: string;
    categoria?: string;
  }) => Promise<void>;
  loading?: boolean;
}

const CATEGORIAS_SUGERIDAS = [
  { value: "ABC", label: "ABC (3 dias)" },
  { value: "ABCD", label: "ABCD (4 dias)" },
  { value: "ABCDE", label: "ABCDE (5 dias)" },
  { value: "Upper/Lower", label: "Upper/Lower" },
  { value: "Push/Pull/Legs", label: "Push/Pull/Legs" },
  { value: "Full Body", label: "Full Body" },
  { value: "Outro", label: "Outro" },
];

export function SalvarComoModeloDialog({
  open,
  onOpenChange,
  onSave,
  loading = false,
}: SalvarComoModeloDialogProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");

  const handleSave = async () => {
    if (!nome.trim()) {
      return;
    }

    await onSave({
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      categoria: categoria || undefined,
    });

    // Limpar campos após salvar
    setNome("");
    setDescricao("");
    setCategoria("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full md:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Save className="h-5 w-5" />
            Salvar como Modelo Reutilizável
          </DialogTitle>
          <DialogDescription className="text-base md:text-sm">
            Crie um modelo de treino que pode ser aplicado rapidamente a outros
            alunos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome-modelo" className="required text-base md:text-sm">
              Nome do Modelo
            </Label>
            <Input
              id="nome-modelo"
              placeholder="Ex: Treino A - Peito e Tríceps"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              disabled={loading}
              className="h-12 md:h-10 text-base md:text-sm"
            />
            <p className="text-sm md:text-xs text-muted-foreground">
              Dê um nome claro e descritivo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria-modelo">Categoria (Opcional)</Label>
            <Select
              value={categoria}
              onValueChange={setCategoria}
              disabled={loading}
            >
              <SelectTrigger id="categoria-modelo">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_SUGERIDAS.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ajuda a organizar seus modelos
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao-modelo">Descrição (Opcional)</Label>
            <Textarea
              id="descricao-modelo"
              placeholder="Ex: Treino focado em hipertrofia de peito com volume alto..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {descricao.length}/500 caracteres
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-12 md:h-10 w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !nome.trim()} className="h-12 md:h-10 w-full sm:w-auto">
            {loading && <Loader2 className="h-5 w-5 md:h-4 md:w-4 mr-2 animate-spin" />}
            Salvar Modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
