import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { dateInputToIsoString, parseDateInputValue } from "@/utils/dateFormat";

export interface Subscription {
  id: string;
  student_id: string;
  personal_id: string;
  plano: "mensal" | "trimestral" | "semestral" | "anual";
  valor: number;
  status_pagamento: "pago" | "pendente" | "atrasado";
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

type PaymentHistoryDraft = {
  subscription_id: string;
  student_id: string;
  personal_id: string;
  valor: number;
  data_pagamento: string;
  metodo_pagamento?: string;
  observacoes?: string;
};

type ExistingPaymentHistory = {
  id: string;
  valor: number;
  data_pagamento: string;
  metodo_pagamento: string | null;
  observacoes: string | null;
};

const roundCurrency = (value: number) => Math.round(Number(value || 0) * 100) / 100;

const PLAN_MONTHS: Record<Subscription["plano"], number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

const getPaymentDayKey = (date: string) => {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return String(date || "");
  return parsed.toISOString().split("T")[0];
};

const normalizePaymentText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isSameFinancialPayment = (
  existing: ExistingPaymentHistory,
  draft: PaymentHistoryDraft
) =>
  getPaymentDayKey(existing.data_pagamento) === getPaymentDayKey(draft.data_pagamento) &&
  Math.abs(roundCurrency(existing.valor) - roundCurrency(draft.valor)) <= 0.01 &&
  normalizePaymentText(existing.metodo_pagamento) === normalizePaymentText(draft.metodo_pagamento) &&
  normalizePaymentText(existing.observacoes) === normalizePaymentText(draft.observacoes);

const calculateExpirationDate = (plano: Subscription["plano"], paymentDate: string) => {
  const baseDate = parseDateInputValue(paymentDate);
  if (!baseDate) return null;

  const expiration = new Date(baseDate);
  expiration.setMonth(expiration.getMonth() + PLAN_MONTHS[plano]);
  return expiration;
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
      setSubscriptions((data || []) as Subscription[]);
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

      const dataPagamentoIso =
        dateInputToIsoString(paymentData.data_pagamento) ?? paymentData.data_pagamento;
      const dataExpiracao = calculateExpirationDate(
        paymentData.plano,
        paymentData.data_pagamento
      );
      if (!dataExpiracao) throw new Error("Data de pagamento invalida");

      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .insert([
          {
            student_id: studentId,
            personal_id: personalId,
            plano: paymentData.plano,
            valor: normalizedValue,
            status_pagamento: "pago",
            data_pagamento: dataPagamentoIso,
            data_expiracao: dataExpiracao.toISOString(),
            observacoes: paymentData.observacoes || null,
            parcelas: 1,
          },
        ])
        .select()
        .single();

      if (subscriptionError) throw subscriptionError;

      const { error: historyError } = await supabase
        .from("payment_history")
        .insert({
          subscription_id: subscription.id,
          student_id: studentId,
          personal_id: personalId,
          valor: normalizedValue,
          data_pagamento: dataPagamentoIso,
          metodo_pagamento: paymentData.metodo_pagamento,
          observacoes: paymentData.observacoes || null,
        });

      if (historyError) {
        await supabase.from("subscriptions").delete().eq("id", subscription.id);
        throw historyError;
      }

      toast({
        title: "Pagamento registrado",
        description:
          paymentData.origem_pagamento === "stripe"
            ? "Pagamento registrado como recebido pela plataforma."
            : "Pagamento manual registrado como recebido.",
      });

      await fetchSubscriptions();
      return subscription as Subscription;
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

      // Calcular nova data de expiração
      const dataPagamentoBase = parseDateInputValue(paymentData.data_pagamento);
      if (!dataPagamentoBase) throw new Error("Data de pagamento invalida");

      const dataPagamentoIso = dateInputToIsoString(paymentData.data_pagamento) ?? paymentData.data_pagamento;
      const dataExpiracao = new Date(dataPagamentoBase);
      switch (subscription.plano) {
        case "mensal":
          dataExpiracao.setMonth(dataExpiracao.getMonth() + 1);
          break;
        case "trimestral":
          dataExpiracao.setMonth(dataExpiracao.getMonth() + 3);
          break;
        case "semestral":
          dataExpiracao.setMonth(dataExpiracao.getMonth() + 6);
          break;
        case "anual":
          dataExpiracao.setFullYear(dataExpiracao.getFullYear() + 1);
          break;
      }

      // Atualizar assinatura (incluindo parcelas)
      await updateSubscription(subscriptionId, {
        status_pagamento: "pago",
        data_pagamento: dataPagamentoIso,
        data_expiracao: dataExpiracao.toISOString(),
      });

      // Registrar no histórico - com suporte a parcelas
      const valorParcela = paymentData.valor / parcelas;
      const paymentRecords: PaymentHistoryDraft[] = [];

      for (let i = 0; i < parcelas; i++) {
        const dataParcela = new Date(dataPagamentoBase);
        dataParcela.setMonth(dataParcela.getMonth() + i);

        paymentRecords.push({
          subscription_id: subscriptionId,
          student_id: subscription.student_id,
          personal_id: subscription.personal_id,
          valor: Math.round(valorParcela * 100) / 100,
          data_pagamento: dataParcela.toISOString(),
          metodo_pagamento: paymentData.metodo_pagamento,
          observacoes: parcelas > 1
            ? `${paymentData.observacoes || ""} (Parcela ${i + 1}/${parcelas})`.trim()
            : paymentData.observacoes,
        });
      }

      const { data: existingPayments, error: existingPaymentsError } = await supabase
        .from("payment_history")
        .select("id, valor, data_pagamento, metodo_pagamento, observacoes")
        .eq("subscription_id", subscriptionId);

      if (existingPaymentsError) throw existingPaymentsError;

      const newPaymentRecords = paymentRecords.filter(
        (record) =>
          !(existingPayments || []).some((existing) =>
            isSameFinancialPayment(existing, record)
          )
      );

      if (newPaymentRecords.length === 0) {
        toast({
          title: "Pagamento já registrado",
          description: "Esta baixa já existe no histórico financeiro.",
        });
        return;
      }

      const { error: historyError } = await supabase
        .from("payment_history")
        .insert(newPaymentRecords);

      if (historyError) throw historyError;

      toast({
        title: "Sucesso",
        description: parcelas > 1
          ? `Pagamento registrado em ${parcelas}x de R$ ${valorParcela.toFixed(2)}`
          : "Pagamento registrado com sucesso",
      });
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
