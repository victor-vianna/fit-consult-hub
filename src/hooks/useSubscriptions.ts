import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createStudentNotification } from "@/utils/studentNotifications";

export interface Subscription {
  id: string;
  student_id: string;
  personal_id: string;
  plano: "mensal" | "trimestral" | "semestral" | "anual";
  valor: number;
  status_pagamento: "pago" | "pendente" | "atrasado" | "cancelado" | "canceled";
  data_pagamento: string | null;
  data_expiracao: string;
  observacoes: string | null;
  parcelas?: number;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_account_id?: string | null;
  stripe_checkout_session_id?: string | null;
  cancela_no_fim_do_ciclo?: boolean;
  cancelado_em?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistory {
  id: string;
  subscription_id: string;
  student_id: string;
  personal_id: string;
  valor: number;
  data_pagamento: string;
  metodo_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
}

export type PaymentOrigin = "stripe" | "manual";
export type ManualPaymentMethod = "pix" | "dinheiro" | "transferencia" | "outro";
export type RegisterPaymentMethod = "stripe" | ManualPaymentMethod;

const roundCurrency = (value: number) => Math.round(Number(value || 0) * 100) / 100;

const normalizePaymentText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const buildManualPaymentKey = (parts: Array<string | number | null | undefined>) =>
  `manual:v1:${parts.map(normalizePaymentText).join(":")}`;

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDatePtBr = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const notifySubscriptionLifecycleAlerts = (
  studentId: string | undefined,
  personalId: string | undefined,
  subscriptions: Subscription[]
) => {
  if (!studentId || !personalId) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  subscriptions.forEach((subscription) => {
    if (subscription.status_pagamento !== "pago" || !subscription.data_expiracao) return;

    const expiration = new Date(subscription.data_expiracao);
    if (!Number.isFinite(expiration.getTime())) return;
    expiration.setHours(0, 0, 0, 0);

    const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / DAY_MS);

    if (daysUntilExpiration < 0) {
      void createStudentNotification({
        studentId,
        personalId,
        tipo: "plano_expirado",
        titulo: "Plano expirado",
        mensagem: "Seu plano expirou. Regularize para manter o acesso.",
        dados: { subscription_id: subscription.id, data_expiracao: subscription.data_expiracao },
        dedupeKey: `${subscription.id}:plano_expirado`,
      });
      return;
    }

    if (daysUntilExpiration <= 7) {
      void createStudentNotification({
        studentId,
        personalId,
        tipo: "plano_expirando",
        titulo: "Plano expirando",
        mensagem:
          daysUntilExpiration === 0
            ? "Seu plano expira hoje."
            : `Seu plano expira em ${daysUntilExpiration} dia${daysUntilExpiration === 1 ? "" : "s"} (${formatDatePtBr(subscription.data_expiracao)}).`,
        dados: { subscription_id: subscription.id, data_expiracao: subscription.data_expiracao },
        dedupeKey: `${subscription.id}:plano_expirando:${subscription.data_expiracao}`,
      });
    }
  });
};

export function useSubscriptions(studentId?: string, personalId?: string) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (studentId) {
      fetchSubscriptions();
    }
  }, [studentId, personalId]);

  const fetchSubscriptions = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      let query = supabase
        .from("subscriptions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (personalId) {
        query = query.eq("personal_id", personalId);
      }

      const { data, error } = await query;

      if (error) throw error;
      const fetchedSubscriptions = (data || []) as Subscription[];
      setSubscriptions(fetchedSubscriptions);
      notifySubscriptionLifecycleAlerts(studentId, personalId, fetchedSubscriptions);
    } catch (error: any) {
      console.error("Erro ao buscar assinaturas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as assinaturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (
    subscription: Omit<
      Subscription,
      "id" | "created_at" | "updated_at" | "status_pagamento"
    >
  ) => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .insert([subscription])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura criada com sucesso",
      });

      await fetchSubscriptions();
      return data;
    } catch (error: any) {
      console.error("Erro ao criar assinatura:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a assinatura",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createPaidSubscription = async (paymentData: {
    plano: Subscription["plano"];
    valor: number;
    data_pagamento: string;
    origem_pagamento: PaymentOrigin;
    metodo_pagamento: RegisterPaymentMethod;
    observacoes?: string;
  }) => {
    if (!studentId || !personalId) {
      throw new Error("Aluno ou personal nao informado");
    }

    try {
      const normalizedValue = roundCurrency(paymentData.valor);
      if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
        throw new Error("Valor do pagamento invalido");
      }

      const idempotencyKey = buildManualPaymentKey([
        studentId,
        "new",
        paymentData.plano,
        normalizedValue.toFixed(2),
        paymentData.data_pagamento,
        paymentData.metodo_pagamento,
      ]);
      const { data: result, error } = await (supabase as any).rpc(
        "record_manual_subscription_payment",
        {
          _student_id: studentId,
          _subscription_id: null,
          _plan: paymentData.plano,
          _value: normalizedValue,
          _payment_date: paymentData.data_pagamento,
          _payment_method: paymentData.metodo_pagamento,
          _notes: paymentData.observacoes || null,
          _installments: 1,
          _idempotency_key: idempotencyKey,
        }
      );

      if (error) throw error;
      const subscription = result?.subscription as Subscription | undefined;
      if (!subscription?.id) throw new Error("Assinatura nao retornada pelo servidor");

      toast({
        title: result?.duplicate ? "Pagamento ja registrado" : "Pagamento registrado",
        description: result?.duplicate
          ? "Esta baixa ja existe no historico financeiro."
          : paymentData.origem_pagamento === "stripe"
            ? "Pagamento registrado como recebido pela plataforma."
            : "Pagamento manual registrado como recebido.",
      });

      if (!result?.duplicate) {
        void createStudentNotification({
          studentId,
          personalId,
          tipo: "pagamento_registrado",
          titulo: "Pagamento registrado",
          mensagem: "Seu pagamento foi registrado e seu plano esta ativo.",
          dados: { subscription_id: subscription.id, plano: paymentData.plano },
          dedupeKey: `${subscription.id}:pagamento_registrado`,
        });
      }

      await fetchSubscriptions();
      return subscription;
    } catch (error: any) {
      console.error("Erro ao registrar pagamento:", error);
      toast({
        title: "Erro",
        description: "Nao foi possivel registrar o pagamento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSubscription = async (
    id: string,
    updates: Partial<Subscription>
  ) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura atualizada com sucesso",
      });

      if (studentId && personalId && updates.status_pagamento) {
        const notificationByStatus = {
          pendente: {
            tipo: "pagamento_pendente",
            titulo: "Pagamento pendente",
            mensagem: "Existe um pagamento pendente no seu plano.",
          },
          atrasado: {
            tipo: "pagamento_atrasado",
            titulo: "Pagamento atrasado",
            mensagem: "Seu pagamento esta atrasado. Regularize para manter o acesso.",
          },
          pago: {
            tipo: "pagamento_registrado",
            titulo: "Pagamento registrado",
            mensagem: "Seu pagamento foi registrado e seu plano esta ativo.",
          },
        }[updates.status_pagamento];

        if (notificationByStatus) {
          void createStudentNotification({
            studentId,
            personalId,
            ...notificationByStatus,
            dados: { subscription_id: id },
            dedupeKey: `${id}:${notificationByStatus.tipo}`,
          });
        }
      }

      await fetchSubscriptions();
    } catch (error: any) {
      console.error("Erro ao atualizar assinatura:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a assinatura",
        variant: "destructive",
      });
      throw error;
    }
  };

  const registerPayment = async (
    subscriptionId: string,
    paymentData: {
      valor: number;
      data_pagamento: string;
      metodo_pagamento?: string;
      observacoes?: string;
      parcelas?: number;
    }
  ) => {
    try {
      const subscription = subscriptions.find((s) => s.id === subscriptionId);
      if (!subscription) throw new Error("Assinatura não encontrada");

      const parcelas = paymentData.parcelas || 1;
      const normalizedValue = roundCurrency(paymentData.valor);
      if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
        throw new Error("Valor do pagamento invalido");
      }

      const idempotencyKey = buildManualPaymentKey([
        subscription.student_id,
        subscriptionId,
        subscription.plano,
        normalizedValue.toFixed(2),
        paymentData.data_pagamento,
        paymentData.metodo_pagamento,
        parcelas,
      ]);
      const { data: result, error } = await (supabase as any).rpc(
        "record_manual_subscription_payment",
        {
          _student_id: subscription.student_id,
          _subscription_id: subscriptionId,
          _plan: subscription.plano,
          _value: normalizedValue,
          _payment_date: paymentData.data_pagamento,
          _payment_method: paymentData.metodo_pagamento || null,
          _notes: paymentData.observacoes || null,
          _installments: parcelas,
          _idempotency_key: idempotencyKey,
        }
      );

      if (error) throw error;

      if (result?.duplicate) {
        toast({
          title: "Pagamento já registrado",
          description: "Esta baixa já existe no histórico financeiro.",
        });
        return;
      }

      const valorParcela = normalizedValue / parcelas;

      toast({
        title: "Sucesso",
        description: parcelas > 1
          ? `Pagamento registrado em ${parcelas}x de R$ ${valorParcela.toFixed(2)}`
          : "Pagamento registrado com sucesso",
      });

      await fetchSubscriptions();
    } catch (error: any) {
      console.error("Erro ao registrar pagamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar o pagamento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura removida com sucesso",
      });

      await fetchSubscriptions();
    } catch (error: any) {
      console.error("Erro ao deletar assinatura:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a assinatura",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getActiveSubscription = () => {
    return [...subscriptions]
      .filter(
        (sub) =>
          sub.status_pagamento === "pago" &&
          new Date(sub.data_expiracao) > new Date()
      )
      .sort(
        (a, b) =>
          new Date(b.data_expiracao).getTime() -
          new Date(a.data_expiracao).getTime()
      )[0];
  };

  return {
    subscriptions,
    loading,
    createSubscription,
    createPaidSubscription,
    updateSubscription,
    registerPayment,
    deleteSubscription,
    getActiveSubscription,
    refetch: fetchSubscriptions,
  };
}
