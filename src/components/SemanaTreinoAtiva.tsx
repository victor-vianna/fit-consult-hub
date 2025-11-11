import { useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import { format, addWeeks, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SemanaTreinoAtivaProps {
  profileId: string;
  personalId: string;
  alunoNome: string;
}

export function SemanaTreinoAtiva({
  profileId,
  personalId,
  alunoNome,
}: SemanaTreinoAtivaProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Buscar semana ativa atual
  const { data: semanaAtiva, isLoading } = useQuery({
    queryKey: ["semana-ativa", profileId, personalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treino_semana_ativa")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Mutation para definir semana ativa
  const definirSemanaMutation = useMutation({
    mutationFn: async (semanaInicio: Date) => {
      const semanaInicioStr = format(semanaInicio, "yyyy-MM-dd");

      const { error } = await supabase
        .from("treino_semana_ativa")
        .upsert(
          {
            profile_id: profileId,
            personal_id: personalId,
            semana_inicio: semanaInicioStr,
          },
          {
            onConflict: "profile_id,personal_id",
          }
        );

      if (error) throw error;
      return semanaInicioStr;
    },
    onSuccess: (semana) => {
      queryClient.invalidateQueries({ queryKey: ["semana-ativa", profileId, personalId] });
      queryClient.invalidateQueries({ queryKey: ["treinos", profileId, personalId] });
      toast.success(`Semana de ${format(new Date(semana), "dd/MM/yyyy", { locale: ptBR })} ativada`);
      setOpen(false);
    },
    onError: (error) => {
      console.error("Erro ao definir semana ativa:", error);
      toast.error("Erro ao definir semana ativa");
    },
  });

  // Mutation para remover semana ativa (volta para semana atual)
  const removerSemanaMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("treino_semana_ativa")
        .delete()
        .eq("profile_id", profileId)
        .eq("personal_id", personalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["semana-ativa", profileId, personalId] });
      queryClient.invalidateQueries({ queryKey: ["treinos", profileId, personalId] });
      toast.success("Voltando para semana atual automaticamente");
      setOpen(false);
    },
    onError: (error) => {
      console.error("Erro ao remover semana ativa:", error);
      toast.error("Erro ao remover semana ativa");
    },
  });

  // Gerar opções de semanas (últimas 4 e próximas 4 semanas)
  const hoje = new Date();
  const inicioDaSemanaAtual = startOfWeek(hoje, { weekStartsOn: 1 });
  const semanasDisponiveis = Array.from({ length: 9 }, (_, i) => {
    const offset = i - 4; // -4 a +4
    return addWeeks(inicioDaSemanaAtual, offset);
  });

  const semanaAtualStr = format(inicioDaSemanaAtual, "yyyy-MM-dd");
  const semanaAtivaStr = semanaAtiva?.semana_inicio;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          {semanaAtivaStr && semanaAtivaStr !== semanaAtualStr ? (
            <span className="text-xs">
              Semana: {format(new Date(semanaAtivaStr), "dd/MM")}
            </span>
          ) : (
            <span className="text-xs">Semana Atual</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Definir Semana de Treino</DialogTitle>
          <DialogDescription>
            Escolha qual semana de treino {alunoNome} deve seguir
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {semanasDisponiveis.map((semana) => {
              const semanaStr = format(semana, "yyyy-MM-dd");
              const isAtual = semanaStr === semanaAtualStr;
              const isAtiva = semanaStr === semanaAtivaStr;
              const isFutura = semana > hoje;

              return (
                <Card
                  key={semanaStr}
                  className={`p-3 cursor-pointer transition-all hover:bg-accent ${
                    isAtiva ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => definirSemanaMutation.mutate(semana)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Semana de {format(semana, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {isAtual && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Atual
                          </span>
                        )}
                        {isFutura && (
                          <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                            Futura
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(semana, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                    {isAtiva && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {semanaAtivaStr && semanaAtivaStr !== semanaAtualStr && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => removerSemanaMutation.mutate()}
              disabled={removerSemanaMutation.isPending}
              className="w-full gap-2"
            >
              <X className="h-4 w-4" />
              Voltar para Semana Atual Automaticamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
