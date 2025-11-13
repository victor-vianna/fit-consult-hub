import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, addDays, format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "./ui/button";
import { Calendar } from "lucide-react";

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

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarioSemanal({
  profileId,
  personalId,
  themeColor,
  onVerHistoricoCompleto,
  onTreinoAtualizado,
}: CalendarioSemanalProps) {
  const [treinos, setTreinos] = useState<TreinoSemanal[]>([]);
  const [semanaAtual, setSemanaAtual] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const { toast } = useToast();

  useEffect(() => {
    if (profileId) carregarTreinos();
  }, [profileId, semanaAtual]);

  const carregarTreinos = async () => {
    try {
      const { data, error } = await supabase
        .from("treinos_semanais")
        .select("*")
        .eq("profile_id", profileId);

      if (error) throw error;

      // 🔍 Filtro: pegar apenas os treinos que pertencem à semana atual (domingo a sábado)
      const inicioSemana = semanaAtual;
      const fimSemana = addDays(semanaAtual, 6);

      const treinosDaSemana = (data || []).filter((t) => {
        const dataTreino = addDays(parseISO(t.semana), t.dia_semana);
        return dataTreino >= inicioSemana && dataTreino <= fimSemana;
      });

      console.log("📅 Treinos da semana atual:", treinosDaSemana);

      // Se não houver treinos da semana, cria automaticamente
      if (treinosDaSemana.length === 0) {
        console.log("⚠️ Nenhum treino encontrado, criando nova semana...");
        await criarTreinosSemana();
      } else {
        setTreinos(treinosDaSemana);
      }
    } catch (err) {
      console.error("❌ Erro ao carregar treinos:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os treinos da semana",
        variant: "destructive",
      });
    }
  };

  const criarTreinosSemana = async () => {
    const novosTreinos = Array.from({ length: 7 }, (_, i) => ({
      profile_id: profileId,
      personal_id: personalId,
      dia_semana: i,
      semana: format(semanaAtual, "yyyy-MM-dd"),
      concluido: false,
    }));

    const { data, error } = await supabase
      .from("treinos_semanais")
      .insert(novosTreinos)
      .select();

    if (error) {
      console.error("Erro ao criar treinos:", error);
      return;
    }

    setTreinos(data || []);
  };

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
        <CardTitle className="text-xl md:text-lg">
          Frequência de Treinos da Semana
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {diasSemana.map((dia, index) => {
            const diaMes = addDays(semanaAtual, index);
            const treino = treinos.find((t) => {
              const dataTreino = addDays(parseISO(t.semana), t.dia_semana);
              return isSameDay(dataTreino, diaMes);
            });

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
