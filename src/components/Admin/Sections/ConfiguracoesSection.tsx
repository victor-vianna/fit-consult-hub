// src/components/admin/sections/ConfiguracoesSection.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Mail,
  CreditCard,
  Shield,
  Database,
  Bell,
  Palette,
  Key,
  Users,
  Save,
  AlertCircle,
  CheckCircle,
  FileText,
} from "lucide-react";

interface Configuracao {
  categoria: string;
  configuracoes: {
    nome: string;
    descricao: string;
    valor: string | boolean;
    tipo: "text" | "boolean" | "select";
    opcoes?: string[];
  }[];
}

export default function ConfiguracoesSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([
    {
      categoria: "Geral",
      configuracoes: [
        {
          nome: "Nome da Plataforma",
          descricao: "Nome exibido no sistema",
          valor: "FitConsult",
          tipo: "text",
        },
        {
          nome: "Email de Contato",
          descricao: "Email principal para contato",
          valor: "contato@fitconsult.com",
          tipo: "text",
        },
        {
          nome: "Modo Manutenção",
          descricao: "Ativar modo de manutenção",
          valor: false,
          tipo: "boolean",
        },
      ],
    },
    {
      categoria: "Email",
      configuracoes: [
        {
          nome: "Servidor SMTP",
          descricao: "Servidor de email",
          valor: "smtp.gmail.com",
          tipo: "text",
        },
        {
          nome: "Porta SMTP",
          descricao: "Porta do servidor",
          valor: "587",
          tipo: "text",
        },
        {
          nome: "Email Remetente",
          descricao: "Email que envia notificações",
          valor: "noreply@fitconsult.com",
          tipo: "text",
        },
        {
          nome: "Enviar Boas-Vindas",
          descricao: "Email automático ao cadastrar",
          valor: true,
          tipo: "boolean",
        },
        {
          nome: "Notificar Pagamentos",
          descricao: "Email de confirmação de pagamento",
          valor: true,
          tipo: "boolean",
        },
      ],
    },
    {
      categoria: "Pagamentos",
      configuracoes: [
        {
          nome: "Gateway Padrão",
          descricao: "Gateway de pagamento ativo",
          valor: "Stripe",
          tipo: "select",
          opcoes: ["Stripe", "PayPal", "Mercado Pago"],
        },
        {
          nome: "Moeda",
          descricao: "Moeda padrão do sistema",
          valor: "BRL",
          tipo: "select",
          opcoes: ["BRL", "USD", "EUR"],
        },
        {
          nome: "Trial Automático",
          descricao: "Ativar período trial automaticamente",
          valor: true,
          tipo: "boolean",
        },
        {
          nome: "Dias Trial",
          descricao: "Duração do período trial",
          valor: "14",
          tipo: "text",
        },
      ],
    },
    {
      categoria: "Segurança",
      configuracoes: [
        {
          nome: "Autenticação 2FA",
          descricao: "Forçar 2FA para admins",
          valor: false,
          tipo: "boolean",
        },
        {
          nome: "Sessão Expira (min)",
          descricao: "Tempo de expiração da sessão",
          valor: "60",
          tipo: "text",
        },
        {
          nome: "Tentativas Login",
          descricao: "Máximo de tentativas antes de bloquear",
          valor: "5",
          tipo: "text",
        },
        {
          nome: "Log de Auditoria",
          descricao: "Registrar todas as ações",
          valor: true,
          tipo: "boolean",
        },
      ],
    },
    {
      categoria: "Notificações",
      configuracoes: [
        {
          nome: "Push Notifications",
          descricao: "Ativar notificações push",
          valor: true,
          tipo: "boolean",
        },
        {
          nome: "Email Diário",
          descricao: "Resumo diário por email",
          valor: true,
          tipo: "boolean",
        },
        {
          nome: "Alertas Sistema",
          descricao: "Notificar sobre erros do sistema",
          valor: true,
          tipo: "boolean",
        },
      ],
    },
  ]);

  const handleSalvarConfiguracoes = async () => {
    try {
      setLoading(true);

      // Aqui você salvaria as configurações no banco de dados
      // Por enquanto, vamos simular um salvamento

      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAlterarValor = (
    categoriaIndex: number,
    configIndex: number,
    novoValor: string | boolean
  ) => {
    const novasConfiguracoes = [...configuracoes];
    novasConfiguracoes[categoriaIndex].configuracoes[configIndex].valor =
      novoValor;
    setConfiguracoes(novasConfiguracoes);
  };

  const getCategoriaIcon = (categoria: string) => {
    switch (categoria) {
      case "Geral":
        return <Settings className="h-5 w-5" />;
      case "Email":
        return <Mail className="h-5 w-5" />;
      case "Pagamentos":
        return <CreditCard className="h-5 w-5" />;
      case "Segurança":
        return <Shield className="h-5 w-5" />;
      case "Notificações":
        return <Bell className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const exportarBackup = () => {
    toast({
      title: "Backup iniciado",
      description: "O backup dos dados está sendo gerado",
    });
  };

  const limparCache = () => {
    toast({
      title: "Cache limpo",
      description: "O cache do sistema foi limpo com sucesso",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações do Sistema
            </CardTitle>
            <Button onClick={handleSalvarConfiguracoes} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Configurações por Categoria */}
      {configuracoes.map((categoria, catIndex) => (
        <Card key={catIndex}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getCategoriaIcon(categoria.categoria)}
              {categoria.categoria}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoria.configuracoes.map((config, configIndex) => (
                <div
                  key={configIndex}
                  className="p-4 border rounded-lg hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{config.nome}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {config.descricao}
                      </p>

                      {config.tipo === "text" && (
                        <Input
                          value={config.valor as string}
                          onChange={(e) =>
                            handleAlterarValor(
                              catIndex,
                              configIndex,
                              e.target.value
                            )
                          }
                          className="max-w-md"
                        />
                      )}

                      {config.tipo === "boolean" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={config.valor as boolean}
                            onChange={(e) =>
                              handleAlterarValor(
                                catIndex,
                                configIndex,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4"
                          />
                          <span className="text-sm">
                            {config.valor ? "Ativado" : "Desativado"}
                          </span>
                        </div>
                      )}

                      {config.tipo === "select" && (
                        <select
                          value={config.valor as string}
                          onChange={(e) =>
                            handleAlterarValor(
                              catIndex,
                              configIndex,
                              e.target.value
                            )
                          }
                          className="max-w-md px-3 py-2 border rounded-md"
                        >
                          {config.opcoes?.map((opcao) => (
                            <option key={opcao} value={opcao}>
                              {opcao}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <Badge
                      variant={
                        config.tipo === "boolean"
                          ? config.valor
                            ? "default"
                            : "secondary"
                          : "outline"
                      }
                    >
                      {config.tipo === "boolean"
                        ? config.valor
                          ? "Ativo"
                          : "Inativo"
                        : "Configurado"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Ações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Manutenção do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-24 flex-col"
              onClick={exportarBackup}
            >
              <Database className="h-6 w-6 mb-2" />
              <span>Exportar Backup</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex-col"
              onClick={limparCache}
            >
              <AlertCircle className="h-6 w-6 mb-2" />
              <span>Limpar Cache</span>
            </Button>

            <Button variant="outline" className="h-24 flex-col">
              <FileText className="h-6 w-6 mb-2" />
              <span>Logs do Sistema</span>
            </Button>

            <Button variant="outline" className="h-24 flex-col">
              <Users className="h-6 w-6 mb-2" />
              <span>Gerenciar Admins</span>
            </Button>

            <Button variant="outline" className="h-24 flex-col">
              <Key className="h-6 w-6 mb-2" />
              <span>API Keys</span>
            </Button>

            <Button variant="outline" className="h-24 flex-col">
              <Palette className="h-6 w-6 mb-2" />
              <span>Personalização</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Versão</p>
              <p className="font-semibold">v1.0.0</p>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Última Atualização
              </p>
              <p className="font-semibold">04/11/2024</p>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Banco de Dados
              </p>
              <p className="font-semibold">Supabase PostgreSQL</p>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-600">Online</span>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Uptime</p>
              <p className="font-semibold">99.9%</p>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Último Backup
              </p>
              <p className="font-semibold">Hoje às 03:00</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zona de Perigo */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
              <h4 className="font-semibold mb-2 text-red-900">
                Resetar Configurações
              </h4>
              <p className="text-sm text-red-700 mb-3">
                Restaura todas as configurações para os valores padrão
              </p>
              <Button variant="destructive" size="sm">
                Resetar Configurações
              </Button>
            </div>

            <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
              <h4 className="font-semibold mb-2 text-red-900">
                Limpar Banco de Dados
              </h4>
              <p className="text-sm text-red-700 mb-3">
                Remove todos os dados de teste (ação irreversível)
              </p>
              <Button variant="destructive" size="sm">
                Limpar Dados de Teste
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
