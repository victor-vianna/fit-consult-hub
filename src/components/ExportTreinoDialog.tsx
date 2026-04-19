import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { FileDown, FileText, FileImage } from "lucide-react";
import { toast } from "sonner";

interface ExportTreinoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultNome: string;
  semanaLabel: string;
  hasLetterhead?: boolean;
  letterheadUrl?: string | null;
  onExportWord: (nome: string, useLetterhead: boolean) => void;
  onExportPDF: (nome: string, useLetterhead: boolean) => void;
}

export function ExportTreinoDialog({
  open,
  onOpenChange,
  defaultNome,
  semanaLabel,
  hasLetterhead = false,
  letterheadUrl = null,
  onExportWord,
  onExportPDF,
}: ExportTreinoDialogProps) {
  const [nome, setNome] = useState(defaultNome);
  const [useLetterhead, setUseLetterhead] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(defaultNome);
      setUseLetterhead(hasLetterhead); // ligado por padrão se existir
    }
  }, [open, defaultNome, hasLetterhead]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          {hasLetterhead && (
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
              {letterheadUrl && (
                <img
                  src={letterheadUrl}
                  alt="Papel timbrado"
                  className="w-10 h-14 object-contain rounded border bg-background flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor="use-letterhead"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileImage className="h-4 w-4" />
                    Usar papel timbrado
                  </Label>
                  <Switch
                    id="use-letterhead"
                    checked={useLetterhead}
                    onCheckedChange={setUseLetterhead}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aplica sua imagem como fundo da página.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => {
              onExportWord(nome, useLetterhead);
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
              onExportPDF(nome, useLetterhead);
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
