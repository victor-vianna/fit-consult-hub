import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, ExternalLink, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface Exercicio {
  id: string;
  nome: string;
  link_video: string | null;
  ordem: number;
}

interface TreinoDia {
  dia: number;
  treinoId: string | null;
  exercicios: Exercicio[];
}

interface TreinosManagerProps {
  profileId: string;
  personalId: string;
  readOnly?: boolean;
}

const diasSemana = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

export function TreinosManager({ profileId, personalId, readOnly = false }: TreinosManagerProps) {
  const [treinos, setTreinos] = useState<TreinoDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [novoExercicio, setNovoExercicio] = useState({ nome: '', link_video: '' });
  const [exercicioEditando, setExercicioEditando] = useState<Exercicio | null>(null);

  useEffect(() => {
    carregarTreinos();
  }, [profileId]);

  const carregarTreinos = async () => {
    try {
      setLoading(true);
      const hoje = new Date();
      const inicioDaSemana = new Date(hoje);
      inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);

      const { data: treinosSemanais, error: treinosError } = await supabase
        .from('treinos_semanais')
        .select('*')
        .eq('profile_id', profileId)
        .eq('personal_id', personalId)
        .gte('semana', inicioDaSemana.toISOString().split('T')[0])
        .order('dia_semana');

      if (treinosError) throw treinosError;

      const treinosComExercicios: TreinoDia[] = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const dia = i + 1;
          const treino = treinosSemanais?.find((t) => t.dia_semana === dia);

          if (treino) {
            const { data: exercicios, error: exerciciosError } = await supabase
              .from('exercicios')
              .select('*')
              .eq('treino_semanal_id', treino.id)
              .order('ordem');

            if (exerciciosError) throw exerciciosError;

            return {
              dia,
              treinoId: treino.id,
              exercicios: exercicios || [],
            };
          }

          return {
            dia,
            treinoId: null,
            exercicios: [],
          };
        })
      );

      setTreinos(treinosComExercicios);
    } catch (error) {
      console.error('Erro ao carregar treinos:', error);
      toast.error('Erro ao carregar treinos');
    } finally {
      setLoading(false);
    }
  };

  const criarTreinoSeNecessario = async (dia: number): Promise<string> => {
    const treino = treinos.find((t) => t.dia === dia);
    if (treino?.treinoId) return treino.treinoId;

    const hoje = new Date();
    const inicioDaSemana = new Date(hoje);
    inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);

    const { data, error } = await supabase
      .from('treinos_semanais')
      .insert({
        profile_id: profileId,
        personal_id: personalId,
        semana: inicioDaSemana.toISOString().split('T')[0],
        dia_semana: dia,
        concluido: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const handleAdicionarExercicio = async () => {
    if (!novoExercicio.nome.trim() || selectedDia === null) {
      toast.error('Preencha o nome do exercício');
      return;
    }

    try {
      const treinoId = await criarTreinoSeNecessario(selectedDia);
      const treino = treinos.find((t) => t.dia === selectedDia);
      const proximaOrdem = treino ? treino.exercicios.length : 0;

      const { error } = await supabase.from('exercicios').insert({
        treino_semanal_id: treinoId,
        nome: novoExercicio.nome,
        link_video: novoExercicio.link_video || null,
        ordem: proximaOrdem,
      });

      if (error) throw error;

      toast.success('Exercício adicionado com sucesso');
      setDialogOpen(false);
      setNovoExercicio({ nome: '', link_video: '' });
      carregarTreinos();
    } catch (error) {
      console.error('Erro ao adicionar exercício:', error);
      toast.error('Erro ao adicionar exercício');
    }
  };

  const handleEditarExercicio = async () => {
    if (!exercicioEditando || !exercicioEditando.nome.trim()) {
      toast.error('Preencha o nome do exercício');
      return;
    }

    try {
      const { error } = await supabase
        .from('exercicios')
        .update({
          nome: exercicioEditando.nome,
          link_video: exercicioEditando.link_video || null,
        })
        .eq('id', exercicioEditando.id);

      if (error) throw error;

      toast.success('Exercício atualizado com sucesso');
      setEditDialogOpen(false);
      setExercicioEditando(null);
      carregarTreinos();
    } catch (error) {
      console.error('Erro ao editar exercício:', error);
      toast.error('Erro ao editar exercício');
    }
  };

  const handleRemoverExercicio = async (exercicioId: string) => {
    try {
      const { error } = await supabase.from('exercicios').delete().eq('id', exercicioId);

      if (error) throw error;

      toast.success('Exercício removido com sucesso');
      carregarTreinos();
    } catch (error) {
      console.error('Erro ao remover exercício:', error);
      toast.error('Erro ao remover exercício');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando treinos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Treinos da Semana</h2>
      </div>

      <div className="grid gap-4">
        {treinos.map((treino) => (
          <Collapsible key={treino.dia} defaultOpen={treino.exercicios.length > 0}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                      <CardTitle className="text-lg">{diasSemana[treino.dia - 1]}</CardTitle>
                      {treino.exercicios.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          ({treino.exercicios.length} {treino.exercicios.length === 1 ? 'exercício' : 'exercícios'})
                        </span>
                      )}
                    </div>
                    {!readOnly && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDia(treino.dia);
                          setDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Exercício
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  {treino.exercicios.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nenhum exercício cadastrado para este dia</p>
                  ) : (
                    <div className="space-y-2">
                      {treino.exercicios.map((exercicio, index) => (
                        <div key={exercicio.id} className="flex items-center gap-2 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                          {!readOnly && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-muted-foreground">#{index + 1}</span>
                              <span className="font-medium">{exercicio.nome}</span>
                            </div>
                            {exercicio.link_video && (
                              <a
                                href={exercicio.link_video}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                              >
                                Ver demonstração
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {!readOnly && (
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setExercicioEditando(exercicio);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleRemoverExercicio(exercicio.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Dialog para adicionar exercício */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Exercício</DialogTitle>
            <DialogDescription>
              Adicione um novo exercício para {selectedDia !== null && diasSemana[selectedDia - 1]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do Exercício *</Label>
              <Input
                id="nome"
                value={novoExercicio.nome}
                onChange={(e) => setNovoExercicio({ ...novoExercicio, nome: e.target.value })}
                placeholder="Ex: Supino Reto"
              />
            </div>
            <div>
              <Label htmlFor="link">Link do Vídeo (opcional)</Label>
              <Input
                id="link"
                value={novoExercicio.link_video}
                onChange={(e) => setNovoExercicio({ ...novoExercicio, link_video: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionarExercicio}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar exercício */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Exercício</DialogTitle>
            <DialogDescription>Edite as informações do exercício</DialogDescription>
          </DialogHeader>
          {exercicioEditando && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-nome">Nome do Exercício *</Label>
                <Input
                  id="edit-nome"
                  value={exercicioEditando.nome}
                  onChange={(e) => setExercicioEditando({ ...exercicioEditando, nome: e.target.value })}
                  placeholder="Ex: Supino Reto"
                />
              </div>
              <div>
                <Label htmlFor="edit-link">Link do Vídeo (opcional)</Label>
                <Input
                  id="edit-link"
                  value={exercicioEditando.link_video || ''}
                  onChange={(e) => setExercicioEditando({ ...exercicioEditando, link_video: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditarExercicio}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
