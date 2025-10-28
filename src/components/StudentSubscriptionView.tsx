import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";

interface StudentSubscriptionViewProps {
  studentId: string;
  personalId?: string;
}

export function StudentSubscriptionView({
  studentId,
  personalId,
}: StudentSubscriptionViewProps) {
  const { subscriptions, loading, getActiveSubscription } =
    useSubscriptions(studentId);
  const { settings: personalSettings } = usePersonalSettings(personalId);

  const activeSubscription = getActiveSubscription();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pago":
        return {
          icon: CheckCircle,
          color: "text-green-500",
          bgColor: "bg-green-500",
          label: "Pago",
        };
      case "pendente":
        return {
          icon: AlertCircle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500",
          label: "Pendente",
        };
      case "atrasado":
        return {
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-500",
          label: "Atrasado",
        };
      default:
        return {
          icon: AlertCircle,
          color: "text-gray-500",
          bgColor: "bg-gray-500",
          label: "Desconhecido",
        };
    }
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expiration = new Date(expirationDate);
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Carregando informações do plano...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status do Plano Ativo */}
      {activeSubscription ? (
        <Card
          className="border-2"
          style={{
            borderColor: personalSettings?.theme_color
              ? `${personalSettings.theme_color}50`
              : "#22c55e50",
            background: personalSettings?.theme_color
              ? `linear-gradient(to bottom right, ${personalSettings.theme_color}05, ${personalSettings.theme_color}10)`
              : "linear-gradient(to bottom right, #22c55e05, #22c55e10)",
          }}
        >
          <CardHeader>
            <CardTitle
              className="flex items-center gap-2"
              style={{
                color: personalSettings?.theme_color || "#22c55e",
              }}
            >
              <CheckCircle className="h-5 w-5" />
              Plano Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plano</p>
                <p className="text-lg font-semibold capitalize">
                  {activeSubscription.plano}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valor</p>
                <p className="text-lg font-semibold">
                  R$ {activeSubscription.valor.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Data de Pagamento
                </span>
                <span className="text-sm font-medium">
                  {activeSubscription.data_pagamento
                    ? format(
                        new Date(activeSubscription.data_pagamento),
                        "dd/MM/yyyy",
                        { locale: ptBR }
                      )
                    : "Não registrado"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Data de Expiração
                </span>
                <span className="text-sm font-medium">
                  {format(
                    new Date(activeSubscription.data_expiracao),
                    "dd/MM/yyyy",
                    { locale: ptBR }
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Dias Restantes
                </span>
                <Badge
                  variant="secondary"
                  style={{
                    backgroundColor: personalSettings?.theme_color
                      ? `${personalSettings.theme_color}20`
                      : undefined,
                    color: personalSettings?.theme_color || undefined,
                  }}
                >
                  {getDaysUntilExpiration(activeSubscription.data_expiracao)}{" "}
                  dias
                </Badge>
              </div>
            </div>

            {activeSubscription.observacoes && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground italic">
                  {activeSubscription.observacoes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Nenhum Plano Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Você não possui um plano ativo no momento. Entre em contato com
              seu personal trainer para mais informações.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Pagamentos */}
      {subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Assinaturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const statusInfo = getStatusInfo(sub.status_pagamento);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={sub.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold capitalize">
                              Plano {sub.plano}
                            </span>
                            <Badge className={statusInfo.bgColor}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            R$ {sub.valor.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {sub.data_pagamento && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="h-3 w-3" />
                            <span>
                              Pago em:{" "}
                              {format(
                                new Date(sub.data_pagamento),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {sub.status_pagamento === "pago"
                              ? "Válido até"
                              : "Vence em"}
                            :{" "}
                            {format(
                              new Date(sub.data_expiracao),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>

                        {sub.observacoes && (
                          <p className="text-muted-foreground italic pt-2 border-t">
                            {sub.observacoes}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
