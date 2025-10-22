import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAluno } from '@/components/AppSidebarAluno';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dumbbell, LogOut, Download, Eye } from 'lucide-react';
import { DocumentViewer } from '@/components/DocumentViewer';
import { format } from 'date-fns';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CalendarioSemanal } from '@/components/CalendarioSemanal';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { TreinosManager } from '@/components/TreinosManager';

interface Material {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  arquivo_url: string;
  arquivo_nome: string;
  created_at: string;
}

export default function AreaAluno() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [activeSection, setActiveSection] = useState('inicio');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      const { data: materiaisData } = await supabase
        .from('materiais')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      setMateriais(materiaisData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleVisualizarMaterial = (material: Material) => {
    setSelectedFile({
      url: material.arquivo_url,
      name: material.arquivo_nome,
      type: material.arquivo_nome.split('.').pop() || '',
    });
    setViewerOpen(true);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'inicio':
        return (
          <div className="space-y-6 animate-fade-in">
            {profile?.personal_id && (
              <CalendarioSemanal profileId={user!.id} personalId={profile.personal_id} />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Bem-vindo(a), {profile?.nome}! 🎉</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Seja muito bem-vindo(a) à minha consultoria online!
                </p>
                <p>
                  Fico muito feliz por ter você aqui, e quero te dizer que este é um espaço exclusivo, 
                  criado para oferecer orientação de qualidade, com um acompanhamento próximo e personalizado.
                </p>
                <p>
                  Aqui, tudo é feito por mim, com total dedicação para garantir que você tenha o suporte 
                  necessário para alcançar os melhores resultados!
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle>Sua Jornada Começa Agora</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                <p className="mb-4">
                  Agora que você já conhece o funcionamento da minha consultoria, chegou o momento de dar 
                  o primeiro passo! Estou aqui para te guiar nessa jornada, garantindo que você tenha o 
                  suporte necessário para evoluir de forma consistente e alcançar seus objetivos.
                </p>
                <p className="font-semibold">
                  Vamos juntos transformar sua rotina, superar desafios e conquistar os seus melhores 
                  resultados. Estou pronto para te acompanhar – vem comigo! 💪
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'consultoria':
        return (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Como Funciona a Consultoria</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">AVALIAÇÃO INICIAL</CardTitle>
                    <CardDescription>
                      Antes de tudo, fazemos uma avaliação detalhada para entender melhor o seu perfil e seus objetivos.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-14 space-y-2 text-muted-foreground">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Composição corporal (peso, percentual de gordura, massa magra etc.)</li>
                  <li>Histórico de saúde e análise de risco de doenças cardíacas</li>
                  <li>Rotina pessoal e alimentar</li>
                </ul>
                <p className="text-sm italic">
                  Se não for possível uma avaliação presencial, utilizaremos fotos seguindo critérios específicos 
                  para garantir uma comparação fiel e precisa dos resultados ao longo do tempo.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">PERIODIZAÇÃO E TREINO</CardTitle>
                    <CardDescription>
                      Com base nas informações da sua avaliação, monto sua periodização e, em até 3 dias, envio seu treino personalizado.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-14 space-y-2 text-muted-foreground">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Este treino é individualizado e por isso é intransferível</li>
                  <li>Duração média de 4 a 6 semanas com progressão de dificuldade embutida</li>
                  <li>Evita zona de conforto e garante evolução constante</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">MATERIAIS DE APOIO E CONTROLE</CardTitle>
                    <CardDescription>
                      Junto com sua rotina de treinos serão enviados alguns arquivos que podem te ajudar a 
                      direcionar sua caminhada e organizar o processo de forma eficiente.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-14 space-y-2 text-muted-foreground">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Planilha com a Avaliação física</li>
                  <li>Questionário de feedback semanal</li>
                  <li>Regras da consultoria</li>
                  <li>Tabelas de referência de alguns parâmetros de saúde</li>
                  <li>Organizador de hábitos e de rotina</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">FEEDBACK SEMANAL</CardTitle>
                    <CardDescription>
                      Para garantir um acompanhamento preciso e ajustes eficientes no seu treino e rotina, 
                      todo domingo você precisa preencher um questionário de feedback.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-14 space-y-2 text-muted-foreground">
                <p>Através do questionário, será possível avaliar:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Desempenho – empenho no treino, alimentação e qualidade do sono</li>
                  <li>Bem-estar – Dores, estado emocional, saúde física e mental</li>
                  <li>Treino – Dificuldade, progresso e dúvidas</li>
                  <li>Rotina – Mudanças que possam exigir ajustes</li>
                </ul>
                <p className="text-sm italic">
                  Com base nas suas respostas, faço os ajustes necessários no seu treino, carga ou rotina, 
                  garantindo que sua evolução continue de forma eficiente e personalizada.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    5
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">SUPORTE E DÚVIDAS</CardTitle>
                    <CardDescription>
                      O contato é direto comigo e o objetivo é garantir que você tenha suporte sempre que precisar, 
                      de forma ágil e eficiente.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-14 space-y-2 text-muted-foreground">
                <p>As dúvidas podem ser resolvidas de diferentes formas:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Áudios curtos e diretos (preferencialmente)</li>
                  <li>Textos objetivos</li>
                  <li>Chamadas de vídeo (quando necessário)</li>
                  <li>Resposta em até 24h úteis</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 'diretrizes':
        return (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Regras da Consultoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-3">
                  <li>
                    <strong>Compromisso com o treino:</strong> A consultoria exige dedicação. Siga o treino conforme prescrito 
                    para obter os melhores resultados.
                  </li>
                  <li>
                    <strong>Feedback semanal obrigatório:</strong> O questionário de feedback deve ser preenchido todo domingo. 
                    É através dele que monitoro sua evolução e faço ajustes necessários.
                  </li>
                  <li>
                    <strong>Comunicação direta:</strong> Todas as dúvidas devem ser enviadas diretamente para mim. 
                    Responderei em até 24h úteis.
                  </li>
                  <li>
                    <strong>Treinos personalizados são intransferíveis:</strong> O treino é elaborado especificamente para você, 
                    com base na sua avaliação e objetivos. Não compartilhe com outras pessoas.
                  </li>
                  <li>
                    <strong>Respeito aos prazos:</strong> Novos treinos são enviados a cada 4-6 semanas. Caso precise de ajustes 
                    antes desse período, informe no feedback semanal.
                  </li>
                  <li>
                    <strong>Acompanhamento fotográfico:</strong> Para avaliar sua evolução visual, envie fotos periódicas 
                    seguindo as orientações que serão fornecidas.
                  </li>
                  <li>
                    <strong>Honestidade no feedback:</strong> Seja sincero(a) ao preencher o questionário semanal. 
                    Isso garante ajustes precisos e melhores resultados.
                  </li>
                  <li>
                    <strong>Paciência com o processo:</strong> Resultados consistentes levam tempo. Confie no processo e 
                    mantenha a consistência.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 'treinos':
        return (
          <div className="space-y-6 animate-fade-in">
            {profile?.personal_id && (
              <TreinosManager 
                profileId={user!.id} 
                personalId={profile.personal_id} 
                readOnly={true}
              />
            )}
          </div>
        );

      case 'materiais':
        return (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Meus Materiais</CardTitle>
                <CardDescription>
                  Aqui estão todos os materiais enviados pelo seu personal trainer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materiais.map((material) => (
                    <Card key={material.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{material.titulo}</h3>
                              <Badge variant="secondary">{material.tipo}</Badge>
                            </div>
                            {material.descricao && (
                              <p className="text-sm text-muted-foreground mb-2">{material.descricao}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              📎 {material.arquivo_nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Enviado em: {format(new Date(material.created_at), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVisualizarMaterial(material)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={material.arquivo_url} download={material.arquivo_nome}>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {materiais.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum material recebido ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebarAluno 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <Dumbbell className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">FitConsult</h1>
                  <p className="text-sm text-muted-foreground">{profile?.nome}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                {profile?.personal_id && (
                  <WhatsAppButton 
                    telefone={profile.telefone || ''}
                    nome="Personal"
                  />
                )}
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <div className="container max-w-4xl mx-auto">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {selectedFile && (
        <DocumentViewer
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          fileUrl={selectedFile.url}
          fileName={selectedFile.name}
          fileType={selectedFile.type}
        />
      )}
    </SidebarProvider>
  );
}
