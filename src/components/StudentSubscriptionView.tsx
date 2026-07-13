import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  CreditCard,
  ExternalLink,
  Loader2,
  Ban,
} from "lucide-react";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { AlunoCheckoutPlanos } from "@/components/AlunoCheckoutPlanos";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDateForInput, formatDisplayDateOnly, parseDateInputValue } from "@/utils/dateFormat";

interface StudentSubscriptionViewProps {
  studentId: string;
  personalId?: string;
}

export function StudentSubscriptionView({
  studentId,
  personalId,
}: StudentSubscriptionViewProps) {
  const { subscriptions, loading, getActiveSubscription, refetch } =
    useSubscriptions(studentId, personalId);
  const { settings: personalSettings } = usePersonalSettings(personalId);
  const { toast } = useToast();
  const [openingPortal, setOpeningPortal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const activeSubscription = getActiveSubscription();

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast({
        title: "Erro ao abrir o portal",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase.functions.invoke("stripe-cancel-subscription");
      if (error) throw error;
      toast({
        title: "Cancelamento agendado",
        description: "Sua assinatura será encerrada ao fim do ciclo atual.",
      });
      await refetch();
    } catch (e: any) {
      toast({
        title: "Erro ao cancelar",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const getStatusInfo = (sub: { status_pagamento: string; data_expiracao: string }) => {
    const expired = getCalendarDate(sub.data_expiracao) < startOfDay(new Date());
    if (sub.status_pagamento === "pago" && expired) {
      return {
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-red-500",
        label: "Expirado",
        subtext: "Acesso encerrado",
      };
    }
    switch (sub.status_pagamento) {
      case "pago":
        return { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500", label: "Ativo", subtext: null };
      case "pendente":
        return { icon: AlertCircle, color: "text-yellow-500", bgColor: "bg-yellow-500", label: "Pendente", subtext: null };
      case "atrasado":
        return { icon: XCircle, color: "text-red-500", bgColor: "bg-red-500", label: "Atrasado", subtext: null };
      default:
        return { icon: AlertCircle, color: "text-gray-500", bgColor: "bg-gray-500", label: "Desconhecido", subtext: null };
    }
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    return differenceInCalendarDays(
      getCalendarDate(expirationDate),
      startOfDay(new Date())
    );
  };

  const getCalendarDate = (value: string) => {
    return parseDateInputValue(formatDateForInput(value)) ?? startOfDay(new Date(value));
  };

  const diasParaExpirar = activeSubscription
    ? getDaysUntilExpiration(activeSubscription.data_expiracao)
    : null;
  const mostrarAlertaVencimento =
    diasParaExpirar !== null && diasParaExpirar >= 1 && diasParaExpirar <= 3;

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
      {mostrarAlertaVencimento && (
        <Card className="border-amber-500/60 bg-amber-500/10">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Seu acesso expira em {diasParaExpirar} dia{diasParaExpirar === 1 ? "" : "s"}
              </p>
              <p className="text-amber-700/80 dark:text-amber-400/80">
                Renove para continuar treinando sem interrupções.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
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
                  {activeSubscription.valor.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
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
                    ? formatDisplayDateOnly(activeSubscription.data_pagamento)
                    : "Não registrado"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Data de Expiração
                </span>
                <span className="text-sm font-medium">
                  {formatDisplayDateOnly(activeSubscription.data_expiracao)}
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

            {(activeSubscription as any).cancela_no_fim_do_ciclo && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                Sua assinatura será encerrada em{" "}
                {formatDisplayDateOnly(activeSubscription.data_expiracao)}.
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-3 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenPortal}
                disabled={openingPortal}
              >
                {openingPortal ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Gerenciar pagamento
              </Button>
              {!(activeSubscription as any).cancela_no_fim_do_ciclo && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmCancel(true)}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Cancelar assinatura
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                Nenhum Plano Ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Você não possui um plano ativo no momento. Escolha um dos planos abaixo para começar.
              </p>
            </CardContent>
          </Card>
          {personalId && <AlunoCheckoutPlanos personalId={personalId} />}
        </>
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
                const statusInfo = getStatusInfo(sub);
                const StatusIcon = statusInfo.icon;
                const isRealPaid = statusInfo.label === "Ativo";

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
                          {statusInfo.subtext && (
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                              {statusInfo.subtext}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {sub.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {sub.data_pagamento && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="h-3 w-3" />
                            <span>
                              Pago em:{" "}
                              {formatDisplayDateOnly(sub.data_pagamento)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {isRealPaid
                              ? "Válido até"
                              : "Vence em"}
                            :{" "}
                            {formatDisplayDateOnly(sub.data_expiracao)}
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

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Você manterá o acesso até o fim do ciclo atual. Após isso, a assinatura será encerrada
              e você precisará assinar novamente para continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

