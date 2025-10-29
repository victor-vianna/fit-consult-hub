import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, addDays, format, isSameDay } from "date-fns";
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
  onTreinoAtualizado?: () => void; // ✅ NOVO CALLBACK
}

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarioSemanal({
  profileId,
  personalId,
  themeColor,
  onVerHistoricoCompleto,
  onTreinoAtualizado, // ✅ NOVO PROP
}: CalendarioSemanalProps) {
  const [treinos, setTreinos] = useState<TreinoSemanal[]>([]);
  const [semanaAtual, setSemanaAtual] = useState<Date>(
    startOfWeek(new Date(), {
      weekStartsOn: 0,
    })
  );
  const { toast } = useToast();

  useEffect(() => {
    carregarTreinos();
  }, [profileId, semanaAtual]);

  const carregarTreinos = async () => {
    const { data, error } = await supabase
      .from("treinos_semanais")
      .select("*")
      .eq("profile_id", profileId)
      .eq("semana", format(semanaAtual, "yyyy-MM-dd"));

    if (error) {
      console.error("Erro ao carregar treinos:", error);
      return;
    }

    if (data && data.length > 0) {
      setTreinos(data);
    } else {
      await criarTreinosSemana();
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
        updated_at: new Date().toISOString(), // ✅ ATUALIZAR TIMESTAMP
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

    // ✅ ATUALIZAR ESTADO LOCAL
    setTreinos(
      treinos.map((t) =>
        t.id === treinoId ? { ...t, concluido: !concluido } : t
      )
    );

    // ✅ NOTIFICAR COMPONENTE PAI
    onTreinoAtualizado?.();
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">
          Frequência de Treinos da Semana
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {diasSemana.map((dia, index) => {
            const treino = treinos.find((t) => t.dia_semana === index);
            const diaMes = addDays(semanaAtual, index);
            const isHoje = isSameDay(diaMes, new Date());

            return (
              <div
                key={index}
                className={`flex flex-col items-center p-2 md:p-3 rounded-lg border transition-all ${
                  isHoje
                    ? "border-primary bg-primary/15 shadow-md scale-105"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <p className="text-xs font-semibold mb-1">{dia}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  {format(diaMes, "d", { locale: ptBR })}
                </p>
                {treino && (
                  <div className="flex items-center justify-center w-full">
                    <Checkbox
                      checked={treino.concluido}
                      onCheckedChange={() =>
                        toggleTreino(treino.id, treino.concluido)
                      }
                      className="h-5 w-5 md:h-4 md:w-4"
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
            className="w-full"
            onClick={onVerHistoricoCompleto}
            style={{
              borderColor: themeColor ? `${themeColor}50` : undefined,
              color: themeColor || undefined,
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ver Calendário Completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
