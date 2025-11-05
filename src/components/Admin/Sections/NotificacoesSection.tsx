// src/components/admin/sections/NotificacoesSection.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  Send,
  Filter,
  Search,
  Settings,
  Trash2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface Notificacao {
  id: string;
  tipo: "info" | "alerta" | "erro" | "sucesso";
  titulo: string;
  mensagem: string;
  destinatario?: string;
  lida: boolean;
  created_at: string;
  acao?: string;
}

interface AlertaAutomatico {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  condicao: string;
}

export default function NotificacoesSection() {
  const { toast } = useToast();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [alertas, setAlertas] = useState<AlertaAutomatico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    carregarNotificacoes();
    carregarAlertasAutomaticos();
  }, []);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);

      // Gerar notificações baseadas em eventos do sistema
      const notificacoesGeradas: Notificacao[] = [];

      // Verificar pagamentos atrasados
      const { data: pagamentosAtrasados } = await supabase
        .from("pagamentos")
        .select(
          `
          *,
          assinatura:assinaturas(
            personal:profiles(nome, email)
          )
        `
        )
        .eq("status", "atrasado");

      pagamentosAtrasados?.forEach((pag) => {
        notificacoesGeradas.push({
          id: `pag-${pag.id}`,
          tipo: "alerta",
          titulo: "Pagamento Atrasado",
          mensagem: `Pagamento de ${pag.assinatura?.personal?.nome} está atrasado`,
          destinatario: pag.assinatura?.personal?.email,
          lida: false,
          created_at: pag.data_vencimento,
          acao: "Ver Pagamento",
        });
      });

      // Verificar assinaturas próximas do vencimento
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() + 7);

      const { data: assinaturasVencendo } = await supabase
        .from("assinaturas")
        .select(
          `
          *,
          personal:profiles(nome, email)
        `
        )
        .eq("status", "ativa")
        .lte("data_fim", dataLimite.toISOString());

      assinaturasVencendo?.forEach((ass) => {
        notificacoesGeradas.push({
          id: `ass-${ass.id}`,
          tipo: "info",
          titulo: "Assinatura Próxima do Vencimento",
          mensagem: `Assinatura de ${ass.personal?.nome} vence em breve`,
          destinatario: ass.personal?.email,
          lida: false,
          created_at: new Date().toISOString(),
          acao: "Renovar",
        });
      });

      // Verificar novos cadastros (últimas 24h)
      const ultimasDia = new Date();
      ultimasDia.setHours(ultimasDia.getHours() - 24);

      const { data: novosUsuarios } = await supabase
        .from("profiles")
        .select("*")
        .gte("created_at", ultimasDia.toISOString());

      if (novosUsuarios && novosUsuarios.length > 0) {
        notificacoesGeradas.push({
          id: "novos-usuarios",
          tipo: "sucesso",
          titulo: "Novos Cadastros",
          mensagem: `${novosUsuarios.length} novos usuários nas últimas 24h`,
          lida: false,
          created_at: new Date().toISOString(),
          acao: "Ver Usuários",
        });
      }

      setNotificacoes(notificacoesGeradas);
    } catch (error: any) {
      console.error("Erro ao carregar notificações:", error);
      toast({
        title: "Erro ao carregar notificações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarAlertasAutomaticos = () => {
    const alertasPadrao: AlertaAutomatico[] = [
      {
        id: "1",
        nome: "Pagamento Atrasado",
        tipo: "pagamento",
        ativo: true,
        condicao: "Quando pagamento está 3+ dias atrasado",
      },
      {
        id: "2",
        nome: "Assinatura Vencendo",
        tipo: "assinatura",
        ativo: true,
        condicao: "7 dias antes do vencimento",
      },
      {
        id: "3",
        nome: "Novo Cadastro",
        tipo: "usuario",
        ativo: true,
        condicao: "A cada novo usuário cadastrado",
      },
      {
        id: "4",
        nome: "Meta de Receita",
        tipo: "financeiro",
        ativo: false,
        condicao: "Quando MRR atinge meta mensal",
      },
      {
        id: "5",
        nome: "Churn Alto",
        tipo: "alerta",
        ativo: true,
        condicao: "Quando taxa de churn > 5%",
      },
    ];

    setAlertas(alertasPadrao);
  };

  const filteredNotificacoes = notificacoes.filter((notificacao) => {
    const matchesTipo =
      filtroTipo === "todas" || notificacao.tipo === filtroTipo;
    const matchesSearch =
      notificacao.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notificacao.mensagem.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTipo && matchesSearch;
  });

  const marcarComoLida = (id: string) => {
    setNotificacoes(
      notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  };

  const excluirNotificacao = (id: string) => {
    setNotificacoes(notificacoes.filter((n) => n.id !== id));
    toast({
      title: "Notificação excluída",
      description: "A notificação foi removida",
    });
  };

  const toggleAlerta = (id: string) => {
    setAlertas(
      alertas.map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a))
    );
    toast({
      title: "Alerta atualizado",
      description: "As configurações foram salvas",
    });
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "alerta":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "erro":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "sucesso":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "alerta":
        return "border-yellow-200 bg-yellow-50/50";
      case "erro":
        return "border-red-200 bg-red-50/50";
      case "sucesso":
        return "border-green-200 bg-green-50/50";
      default:
        return "border-blue-200 bg-blue-50/50";
    }
  };

  const stats = {
    total: notificacoes.length,
    naoLidas: notificacoes.filter((n) => !n.lida).length,
    alertas: notificacoes.filter((n) => n.tipo === "alerta").length,
    sucessos: notificacoes.filter((n) => n.tipo === "sucesso").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-700">
              {stats.naoLidas}
            </div>
            <p className="text-xs text-blue-700">Não Lidas</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-700">
              {stats.alertas}
            </div>
            <p className="text-xs text-yellow-700">Alertas</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">
              {stats.sucessos}
            </div>
            <p className="text-xs text-green-700">Sucessos</p>
          </CardContent>
        </Card>
      </div>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Central de Notificações</span>
            <Button variant="outline" size="sm">
              <Mail className="mr-2 h-4 w-4" />
              Enviar Notificação
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["todas", "info", "alerta", "erro", "sucesso"].map((tipo) => (
                <Button
                  key={tipo}
                  variant={filtroTipo === tipo ? "default" : "outline"}
                  onClick={() => setFiltroTipo(tipo)}
                  size="sm"
                >
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredNotificacoes.map((notificacao) => (
              <div
                key={notificacao.id}
                className={`p-4 border-2 rounded-lg ${getTipoColor(
                  notificacao.tipo
                )} ${
                  notificacao.lida ? "opacity-60" : ""
                } hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <div className="mt-1">{getTipoIcon(notificacao.tipo)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{notificacao.titulo}</h4>
                        {!notificacao.lida && (
                          <Badge variant="default" className="h-5 px-2">
                            Nova
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notificacao.mensagem}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(
                              new Date(notificacao.created_at),
                              "dd/MM/yyyy HH:mm"
                            )}
                          </span>
                        </div>
                        {notificacao.destinatario && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{notificacao.destinatario}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {notificacao.acao && (
                      <Button variant="outline" size="sm">
                        {notificacao.acao}
                      </Button>
                    )}
                    {!notificacao.lida && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => marcarComoLida(notificacao.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => excluirNotificacao(notificacao.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredNotificacoes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma notificação encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alertas Automáticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Alertas Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <div
                key={alerta.id}
                className="p-4 border-2 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{alerta.nome}</h4>
                      <Badge variant={alerta.ativo ? "default" : "secondary"}>
                        {alerta.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {alerta.condicao}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {alerta.tipo}
                    </Badge>
                  </div>
                  <Button
                    variant={alerta.ativo ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleAlerta(alerta.id)}
                  >
                    {alerta.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
