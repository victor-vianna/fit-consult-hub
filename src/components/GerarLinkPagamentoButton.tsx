import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Link as LinkIcon, Copy, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  studentId: string;
  studentName?: string;
  studentPhone?: string | null;
}

type Plano = "mensal" | "trimestral" | "semestral" | "anual";

export function GerarLinkPagamentoButton({ studentId, studentName, studentPhone }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [plano, setPlano] = useState<Plano>("mensal");
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const gerar = async () => {
    setLoading(true);
    setUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-payment-link", {
        body: { studentId, plano },
      });
      if (error) throw error;
      setUrl(data?.url ?? null);
    } catch (e: any) {
      toast({
        title: "Erro ao gerar link",
        description: e?.message ?? "Verifique se o preço deste plano está configurado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copiado" });
  };

  const enviarWhatsApp = () => {
    if (!url) return;
    const texto = `Olá${studentName ? ` ${studentName}` : ""}! Aqui está o link para ativar seu plano: ${url}`;
    const phone = (studentPhone ?? "").replace(/\D/g, "");
    const base = phone ? `https://wa.me/${phone}` : `https://wa.me/`;
    window.open(`${base}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <LinkIcon className="h-4 w-4 mr-2" />
        Link de pagamento
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setUrl(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar link de pagamento</DialogTitle>
            <DialogDescription>
              Escolha o plano e gere um link Stripe para enviar ao aluno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Plano</Label>
              <Select value={plano} onValueChange={(v) => setPlano(v as Plano)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {url && (
              <div className="rounded-md border p-3 text-sm break-all bg-muted/30">{url}</div>
            )}
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            {!url ? (
              <Button onClick={gerar} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Gerar link
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={copiar}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button onClick={enviarWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar no WhatsApp
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
