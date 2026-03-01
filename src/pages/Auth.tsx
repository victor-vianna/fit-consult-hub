import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dumbbell } from 'lucide-react';

type UserRole = 'aluno' | 'personal';

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<UserRole>('aluno');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (data?.role) {
          setCurrentUserRole(data.role);
          setCurrentUserId(session.user.id);
          // Se não é admin nem personal, redireciona
          if (data.role === 'aluno') {
            navigate('/aluno');
          }
        }
      }
    });
  }, []);

  const redirectBasedOnRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (data?.role === 'admin') navigate('/admin');
    else if (data?.role === 'personal') navigate('/');
    else if (data?.role === 'aluno') navigate('/aluno');
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) await redirectBasedOnRole(data.user.id);
    } catch (error: any) {
      toast({ title: 'Erro ao fazer login', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast({ title: 'Digite seu email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Email enviado!', description: 'Verifique sua caixa de entrada para redefinir a senha.' });
      setForgotMode(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    const telefone = formData.get('telefone') as string;
    const password = formData.get('password') as string;

    if (password.length < 6) {
      toast({ title: 'Senha muito curta', description: 'Mínimo 6 caracteres', variant: 'destructive' });
      setLoading(false);
      return;
    }

    try {
      // Personal logado criando aluno
      if (currentUserRole === 'personal' && tipoUsuario === 'aluno') {
        const { data, error } = await supabase.functions.invoke('create-aluno-user', {
          body: { email, password, nome, telefone, personal_id: currentUserId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: 'Aluno criado com sucesso!', description: `${nome} já pode fazer login.` });
      }
      // Admin logado criando personal
      else if (currentUserRole === 'admin' && tipoUsuario === 'personal') {
        const { data, error } = await supabase.functions.invoke('create-personal-user', {
          body: { email, password, nome, telefone },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: 'Personal criado com sucesso!', description: `${nome} já pode fazer login.` });
      }
      // Admin criando aluno (sem personal vinculado)
      else if (currentUserRole === 'admin' && tipoUsuario === 'aluno') {
        const { data, error } = await supabase.functions.invoke('create-aluno-user', {
          body: { email, password, nome, telefone },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: 'Aluno criado com sucesso!', description: `${nome} já pode fazer login.` });
      }
      // Cadastro público (sem login) - cria aluno autônomo
      else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').update({ telefone }).eq('id', data.user.id);
          toast({ title: 'Cadastro realizado!', description: 'Você já pode fazer login.' });
        }
      }

      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const canCreatePersonal = currentUserRole === 'admin';
  const isLoggedInWithRole = currentUserRole === 'admin' || currentUserRole === 'personal';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">FitConsult</CardTitle>
          <CardDescription>
            {isLoggedInWithRole
              ? `Logado como ${currentUserRole} — Criar novo usuário`
              : 'Sistema de Consultoria Fitness'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={isLoggedInWithRole ? 'cadastro' : 'login'} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" disabled={isLoggedInWithRole}>Login</TabsTrigger>
              <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {forgotMode ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>
                    Voltar ao login
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" name="email" type="email" placeholder="seu@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" name="password" type="password" placeholder="••••••" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                  <Button type="button" variant="link" className="w-full text-sm text-muted-foreground" onClick={() => setForgotMode(true)}>
                    Esqueci minha senha
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="cadastro">
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Toggle tipo de usuário - visível para admin */}
                {canCreatePersonal && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Tipo de usuário</p>
                      <p className="text-xs text-muted-foreground">
                        {tipoUsuario === 'aluno' ? 'Criando um aluno' : 'Criando um personal'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Aluno</span>
                      <Switch
                        checked={tipoUsuario === 'personal'}
                        onCheckedChange={(checked) => setTipoUsuario(checked ? 'personal' : 'aluno')}
                      />
                      <span className="text-xs text-muted-foreground">Personal</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-nome">Nome</Label>
                  <Input id="signup-nome" name="nome" type="text" placeholder="Nome completo" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="seu@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-telefone">Telefone (opcional)</Label>
                  <Input id="signup-telefone" name="telefone" type="tel" placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" name="password" type="password" placeholder="Mínimo 6 caracteres" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Cadastrando...' : `Cadastrar ${tipoUsuario === 'personal' ? 'Personal' : 'Aluno'}`}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
