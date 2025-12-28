import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "./ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { getWeekStart } from "@/utils/weekUtils";

interface TreinoSemanal {
  id: string;
  dia_semana: number;
  semana: string;
  concluido: boolean;
  observacoes: string | null;
}

interface CalendarioSemanalProps {
  profileId: string;
  personalId: string;
  themeColor?: string;
  onVerHistoricoCompleto?: () => void;
  onTreinoAtualizado?: () => void;
}

const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function CalendarioSemanal({
  profileId,
  personalId,
  themeColor,
  onVerHistoricoCompleto,
  onTreinoAtualizado,
}: CalendarioSemanalProps) {
  const [treinos, setTreinos] = useState<TreinoSemanal[]>([]);
  // ✅ Segunda-feira como início da semana
  const [semanaAtual, setSemanaAtual] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const { toast } = useToast();

  useEffect(() => {
    if (profileId) carregarTreinos();
  }, [profileId, semanaAtual]);

  const carregarTreinos = async () => {
    try {
      const semanaFormatada = format(semanaAtual, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("treinos_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .eq("semana", semanaFormatada);

      if (error) throw error;

      console.log("📅 Treinos da semana:", data);
      setTreinos(data || []);
    } catch (err) {
      console.error("❌ Erro ao carregar treinos:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os treinos da semana",
        variant: "destructive",
      });
    }
  };

  const irParaSemanaAnterior = () => {
    setSemanaAtual(prev => addDays(prev, -7));
  };

  const irParaProximaSemana = () => {
    setSemanaAtual(prev => addDays(prev, 7));
  };

  const irParaSemanaAtual = () => {
    setSemanaAtual(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const isSemanaAtualSelecionada = format(semanaAtual, "yyyy-MM-dd") === getWeekStart();

  const toggleTreino = async (treinoId: string, concluido: boolean) => {
    const { error } = await supabase
      .from("treinos_semanais")
      .update({
        concluido: !concluido,
        updated_at: new Date().toISOString(),
      })
      .eq("id", treinoId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o treino",
        variant: "destructive",
      });
      return;
    }

    setTreinos((prev) =>
      prev.map((t) => (t.id === treinoId ? { ...t, concluido: !concluido } : t))
    );

    onTreinoAtualizado?.();
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl md:text-lg">
            Frequência de Treinos
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={irParaSemanaAnterior}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isSemanaAtualSelecionada && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={irParaSemanaAtual}
              >
                Hoje
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={irParaProximaSemana}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(semanaAtual, "dd/MM", { locale: ptBR })} - {format(addDays(semanaAtual, 6), "dd/MM/yyyy", { locale: ptBR })}
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {diasSemana.map((dia, index) => {
            // ✅ Dias começam em segunda (index 0 = segunda)
            const diaMes = addDays(semanaAtual, index);
            const diaSemanaDb = index + 1; // 1=segunda, 7=domingo
            const treino = treinos.find((t) => t.dia_semana === diaSemanaDb);

            const isHoje = isSameDay(diaMes, new Date());

            return (
              <div
                key={index}
                className={`flex flex-col items-center p-3 md:p-2 rounded-lg border transition-all ${
                  isHoje
                    ? "border-primary bg-primary/15 shadow-md scale-105"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <p className="text-sm md:text-xs font-semibold mb-1">{dia}</p>
                <p className="text-sm md:text-xs text-muted-foreground mb-2">
                  {format(diaMes, "d", { locale: ptBR })}
                </p>
                {treino && (
                  <div className="flex items-center justify-center w-full touch-target">
                    <Checkbox
                      checked={treino.concluido}
                      onCheckedChange={() =>
                        toggleTreino(treino.id, treino.concluido)
                      }
                      className="h-6 w-6 md:h-5 md:w-5"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t">
          <Button
            variant="outline"
            className="w-full h-12 md:h-10 text-base md:text-sm"
            onClick={onVerHistoricoCompleto}
            style={{
              borderColor: themeColor ? `${themeColor}50` : undefined,
              color: themeColor || undefined,
            }}
          >
            <Calendar className="h-5 w-5 md:h-4 md:w-4 mr-2" />
            Ver Calendário Completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
