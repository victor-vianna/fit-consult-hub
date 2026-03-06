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
import { FileDown, FileText } from "lucide-react";
import { toast } from "sonner";

interface ExportTreinoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultNome: string;
  semanaLabel: string;
  onExportWord: (nome: string) => void;
  onExportPDF: (nome: string) => void;
}

export function ExportTreinoDialog({
  open,
  onOpenChange,
  defaultNome,
  semanaLabel,
  onExportWord,
  onExportPDF,
}: ExportTreinoDialogProps) {
  const [nome, setNome] = useState(defaultNome);

  // Reset name when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) setNome(defaultNome);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Treino</DialogTitle>
          <DialogDescription>
            Edite o nome do aluno para reutilizar este treino com outra pessoa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="export-nome">Nome do aluno</Label>
            <Input
              id="export-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do aluno"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Semana: <span className="font-medium">{semanaLabel}</span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => {
              onExportWord(nome);
              onOpenChange(false);
              toast.success("Exportando Word...");
            }}
          >
            <FileText className="h-4 w-4" />
            Word (.docx)
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => {
              onExportPDF(nome);
              onOpenChange(false);
              toast.success("Exportando PDF...");
            }}
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
