import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Edit, ArrowLeftRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FotoEvolucao {
  id: string;
  avaliacao_id: string | null;
  tipo_foto: string;
  foto_url: string;
  foto_nome: string;
  descricao?: string;
  data_foto?: string;
  created_at: string;
}

interface Props {
  fotos: FotoEvolucao[];
  onDelete: (foto: FotoEvolucao) => void;
  onEditDate: (foto: FotoEvolucao) => void;
  onView: (url: string) => void;
}

const TIPOS_FOTO: Record<string, string> = {
  frente: "Frente",
  costas: "Costas",
  lado_direito: "Lado D",
  lado_esquerdo: "Lado E",
  outro: "Outro",
};

export function FotoTimeline({ fotos, onDelete, onEditDate, onView }: Props) {
  const [compareDates, setCompareDates] = useState<[string, string] | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, FotoEvolucao[]> = {};
    fotos.forEach((f) => {
      const date = f.data_foto || f.created_at.split("T")[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(f);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, photos]) => ({ date, photos }));
  }, [fotos]);

  const handleCompare = (date: string) => {
    if (!compareDates) {
      setCompareDates([date, ""]);
    } else if (!compareDates[1]) {
      setCompareDates([compareDates[0], date]);
    } else {
      setCompareDates([date, ""]);
    }
  };

  // Comparação lado a lado
  if (compareDates && compareDates[1]) {
    const left = grouped.find((g) => g.date === compareDates[0]);
    const right = grouped.find((g) => g.date === compareDates[1]);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Comparação</h3>
          <Button variant="outline" size="sm" onClick={() => setCompareDates(null)}>Voltar</Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-center mb-2">{format(new Date(compareDates[0] + "T12:00:00"), "dd/MM/yyyy")}</p>
            <div className="grid gap-2">
              {left?.photos.map((f) => (
                <div key={f.id} className="space-y-1">
                  <Badge variant="secondary" className="text-xs">{TIPOS_FOTO[f.tipo_foto]}</Badge>
                  <img src={f.foto_url} alt="" className="w-full rounded-lg border-2 cursor-pointer" onClick={() => onView(f.foto_url)} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-center mb-2">{format(new Date(compareDates[1] + "T12:00:00"), "dd/MM/yyyy")}</p>
            <div className="grid gap-2">
              {right?.photos.map((f) => (
                <div key={f.id} className="space-y-1">
                  <Badge variant="secondary" className="text-xs">{TIPOS_FOTO[f.tipo_foto]}</Badge>
                  <img src={f.foto_url} alt="" className="w-full rounded-lg border-2 cursor-pointer" onClick={() => onView(f.foto_url)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (grouped.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Nenhuma foto para exibir na timeline</p>;
  }

  return (
    <div className="space-y-6">
      {compareDates && !compareDates[1] && (
        <div className="bg-muted/50 p-3 rounded-lg text-sm text-center">
          <ArrowLeftRight className="h-4 w-4 inline mr-1" />
          Selecione a segunda data para comparar
        </div>
      )}
      {grouped.map(({ date, photos }) => (
        <div key={date} className="relative pl-6 border-l-2 border-primary/20">
          <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-semibold text-sm">
              {format(new Date(date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h4>
            <Badge variant="outline" className="text-xs">{photos.length} foto{photos.length !== 1 ? "s" : ""}</Badge>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleCompare(date)}>
              <ArrowLeftRight className="h-3 w-3 mr-1" /> Comparar
            </Button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((foto) => (
              <div key={foto.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border hover:border-primary transition-all">
                  <img src={foto.foto_url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => onView(foto.foto_url)} />
                </div>
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary" className="h-6 w-6 p-0 bg-background/90" onClick={() => onView(foto.foto_url)}><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="secondary" className="h-6 w-6 p-0 bg-background/90" onClick={() => onEditDate(foto)}><Edit className="h-3 w-3" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="secondary" className="h-6 w-6 p-0 bg-background/90"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Remover?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(foto)} className="bg-destructive">Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <Badge variant="secondary" className="text-xs mt-1">{TIPOS_FOTO[foto.tipo_foto]}</Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
