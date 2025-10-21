import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dumbbell, LogOut, Users, UserPlus, Trash2, FileText } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Aluno {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
}

export default function Personal() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [totalMateriais, setTotalMateriais] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Buscar perfil do personal
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Buscar alunos
      const { data: alunosData } = await supabase
        .from('profiles')
        .select('*')
        .eq('personal_id', user.id);

      setAlunos(alunosData || []);

      // Buscar total de materiais
      const { count } = await supabase
        .from('materiais')
        .select('*', { count: 'exact', head: true })
        .eq('personal_id', user.id);

      setTotalMateriais(count || 0);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleCreateAluno = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const dados = {
      nome: formData.get('nome') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      telefone: formData.get('telefone') as string,
      personal_id: user?.id,
    };

    try {
      const { data, error } = await supabase.functions.invoke('create-aluno-user', {
        body: dados,
      });

      if (error) throw error;

      toast({
        title: 'Aluno criado!',
        description: 'Aluno cadastrado com sucesso',
      });

      setOpenDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar aluno',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAluno = async (alunoId: string) => {
    try {
      // Deletar role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', alunoId);

      // Deletar profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', alunoId);

      if (error) throw error;

      toast({
        title: 'Aluno removido',
        description: 'Aluno removido com sucesso',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover aluno',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dumbbell className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">FitConsult</h1>
              <p className="text-sm text-muted-foreground">{profile?.nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alunos.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alunos.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Materiais Enviados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMateriais}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Meus Alunos</CardTitle>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Novo Aluno
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Aluno</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateAluno} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input id="nome" name="nome" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input id="password" name="password" type="password" minLength={6} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input id="telefone" name="telefone" type="tel" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Cadastrando...' : 'Cadastrar Aluno'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alunos.map((aluno) => (
                <Card
                  key={aluno.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/aluno/${aluno.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{aluno.nome}</h3>
                        <Badge variant="secondary" className="text-xs">Aluno</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{aluno.email}</p>
                      {aluno.telefone && (
                        <p className="text-sm text-muted-foreground">{aluno.telefone}</p>
                      )}
                      <div className="pt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover este aluno?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAluno(aluno.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {alunos.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum aluno cadastrado
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
