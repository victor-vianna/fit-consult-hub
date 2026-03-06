import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Weight, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
}

export function AvaliacaoAlunoSection({ profileId, personalId, themeColor }: Props) {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("id, data_avaliacao, peso, percentual_gordura, observacoes")
      .eq("profile_id", profileId)
      .order("data_avaliacao", { ascending: false });
    setRegistros(data || []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const peso = fd.get("peso") as string;
    const percentual = fd.get("percentual_gordura") as string;
    const obs = fd.get("observacoes") as string;

    if (!peso && !percentual && !obs) {
      toast({ title: "Preencha pelo menos um campo", variant: "destructive" });
      setLoading(false);
      return;
    }

    const data: any = {
      profile_id: profileId,
      personal_id: personalId,
      data_avaliacao: new Date().toISOString(),
    };
    if (peso) data.peso = Number(peso);
    if (percentual) data.percentual_gordura = Number(percentual);
    if (obs) data.observacoes = obs;

    try {
      const { error } = await supabase.from("avaliacoes_fisicas").insert(data);
      if (error) throw error;
      toast({ title: "✅ Registro salvo!" });
      setOpenDialog(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-md">
        <CardHeader className="bg-gradient-to-r from-card to-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Minha Evolução
            </CardTitle>
            <Button
              size="sm"
              style={{ backgroundColor: themeColor }}
              onClick={() => setOpenDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Novo Registro
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {registros.length > 0 ? (
            <div className="space-y-3">
              {registros.map((reg) => (
                <Card key={reg.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm">
                        {format(new Date(reg.data_avaliacao), "dd/MM/yyyy")}
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {reg.peso && (
                        <div className="bg-muted/50 px-3 py-2 rounded-lg">
                          <p className="text-xs text-muted-foreground">Peso</p>
                          <p className="font-bold">{reg.peso} kg</p>
                        </div>
                      )}
                      {reg.percentual_gordura && (
                        <div className="bg-muted/50 px-3 py-2 rounded-lg">
                          <p className="text-xs text-muted-foreground">% Gordura</p>
                          <p className="font-bold">{reg.percentual_gordura}%</p>
                        </div>
                      )}
                    </div>
                    {reg.observacoes && (
                      <p className="text-sm text-muted-foreground mt-2">{reg.observacoes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Weight className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                Nenhum registro de evolução ainda
              </p>
              <Button
                onClick={() => setOpenDialog(true)}
                style={{ backgroundColor: themeColor }}
              >
                <Plus className="h-4 w-4 mr-1" /> Registrar Agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Registro de Evolução</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Peso atual (kg)</Label>
              <Input name="peso" type="number" step="0.1" placeholder="Ex: 72.5" />
            </div>
            <div>
              <Label>% Gordura Corporal</Label>
              <Input name="percentual_gordura" type="number" step="0.1" placeholder="Ex: 18.5" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                name="observacoes"
                rows={3}
                placeholder="Como você está se sentindo? Alguma mudança na rotina?"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ backgroundColor: themeColor }}
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
