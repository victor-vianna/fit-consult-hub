// src/components/HistoricoAlunoPersonal.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarioTreinosMensal } from "./CalendarioTreinosMensal";
import { Calendar, TrendingUp, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HistoricoAlunoPersonalProps {
  personalId: string;
  themeColor?: string;
}

export function HistoricoAlunoPersonal({
  personalId,
  themeColor,
}: HistoricoAlunoPersonalProps) {
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>("");

  // Buscar lista de alunos do personal
  const { data: alunos } = useQuery({
    queryKey: ["alunos-personal", personalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("personal_id", personalId)
        .eq("is_active", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle
            className="text-2xl"
            style={{ color: themeColor || undefined }}
          >
            Histórico de Treinos dos Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Selecione um aluno:
              </label>
              <Select
                value={alunoSelecionado}
                onValueChange={setAlunoSelecionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um aluno..." />
                </SelectTrigger>
                <SelectContent>
                  {alunos?.map((aluno) => (
                    <SelectItem key={aluno.id} value={aluno.id}>
                      {aluno.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!alunoSelecionado && (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um aluno para ver o histórico de treinos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {alunoSelecionado && (
        <>
          <CalendarioTreinosMensal
            profileId={alunoSelecionado}
            personalId={personalId}
            themeColor={themeColor}
          />

          {/* Estatísticas adicionais */}
          <Card>
            <CardHeader>
              <CardTitle>Análise de Desempenho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <TrendingUp
                    className="h-8 w-8"
                    style={{ color: themeColor || undefined }}
                  />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Frequência Média
                    </div>
                    <div className="text-2xl font-bold">--</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Award
                    className="h-8 w-8"
                    style={{ color: themeColor || undefined }}
                  />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Melhor Semana
                    </div>
                    <div className="text-2xl font-bold">--</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Calendar
                    className="h-8 w-8"
                    style={{ color: themeColor || undefined }}
                  />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Dias Consecutivos
                    </div>
                    <div className="text-2xl font-bold">--</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
