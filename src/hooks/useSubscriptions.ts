import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export function useSubscriptions(studentId?: string) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (studentId) {
      fetchSubscriptions();
    }
  }, [studentId]);

  const fetchSubscriptions = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
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
    }
  ) => {
    try {
      const subscription = subscriptions.find((s) => s.id === subscriptionId);
      if (!subscription) throw new Error("Assinatura não encontrada");

      // Calcular nova data de expiração
      const dataExpiracao = new Date(paymentData.data_pagamento);
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

      // Atualizar assinatura
      await updateSubscription(subscriptionId, {
        status_pagamento: "pago",
        data_pagamento: paymentData.data_pagamento,
        data_expiracao: dataExpiracao.toISOString(),
      });

      // Registrar no histórico
      const { error: historyError } = await supabase
        .from("payment_history")
        .insert([
          {
            subscription_id: subscriptionId,
            student_id: subscription.student_id,
            personal_id: subscription.personal_id,
            valor: paymentData.valor,
            data_pagamento: paymentData.data_pagamento,
            metodo_pagamento: paymentData.metodo_pagamento,
            observacoes: paymentData.observacoes,
          },
        ]);

      if (historyError) throw historyError;

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso",
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
    return subscriptions.find(
      (sub) =>
        sub.status_pagamento === "pago" &&
        new Date(sub.data_expiracao) > new Date()
    );
  };

  return {
    subscriptions,
    loading,
    createSubscription,
    updateSubscription,
    registerPayment,
    deleteSubscription,
    getActiveSubscription,
    refetch: fetchSubscriptions,
  };
}
