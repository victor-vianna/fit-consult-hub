import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanResourceFlags = {
  acesso_plataforma: boolean;
  biblioteca_global: boolean;
  modelos_globais: boolean;
};

export const DEFAULT_PLAN_RESOURCES: PlanResourceFlags = {
  acesso_plataforma: true,
  biblioteca_global: false,
  modelos_globais: false,
};

const ACTIVE_SUBSCRIPTION_STATUSES = ["ativa", "ativo", "trial"];

const normalizePlanName = (name?: string | null) =>
  (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const inferResourcesFromPlanName = (
  planName?: string | null
): PlanResourceFlags => {
  const normalized = normalizePlanName(planName);
  const isUpperTier =
    normalized.includes("intermediario") ||
    normalized.includes("avancado") ||
    normalized.includes("premium") ||
    normalized.includes("pro");

  return {
    acesso_plataforma: true,
    biblioteca_global: isUpperTier,
    modelos_globais: isUpperTier,
  };
};

export const parsePlanResources = (
  features: unknown,
  planName?: string | null
): PlanResourceFlags => {
  const inferred = inferResourcesFromPlanName(planName);

  if (!features || Array.isArray(features) || typeof features !== "object") {
    return inferred;
  }

  const recursos = (features as { recursos?: Partial<PlanResourceFlags> })
    .recursos;

  return {
    acesso_plataforma:
      typeof recursos?.acesso_plataforma === "boolean"
        ? recursos.acesso_plataforma
        : inferred.acesso_plataforma,
    biblioteca_global:
      typeof recursos?.biblioteca_global === "boolean"
        ? recursos.biblioteca_global
        : inferred.biblioteca_global,
    modelos_globais:
      typeof recursos?.modelos_globais === "boolean"
        ? recursos.modelos_globais
        : inferred.modelos_globais,
  };
};

export function usePersonalPlanFeatures(personalId?: string | null) {
  const { role } = useAuth();

  const query = useQuery({
    queryKey: ["personal-plan-features", personalId],
    queryFn: async () => {
      if (!personalId) return null;

      const { data, error } = await supabase
        .from("assinaturas")
        .select("status, plano:planos(nome, features)")
        .eq("personal_id", personalId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!personalId && role !== "admin",
    staleTime: 1000 * 60 * 5,
  });

  const features = useMemo<PlanResourceFlags>(() => {
    if (role === "admin") {
      return {
        acesso_plataforma: true,
        biblioteca_global: true,
        modelos_globais: true,
      };
    }

    const assinatura = query.data;
    const status = assinatura?.status;
    const isActive = status
      ? ACTIVE_SUBSCRIPTION_STATUSES.includes(status)
      : false;

    if (!isActive) {
      return { ...DEFAULT_PLAN_RESOURCES, acesso_plataforma: false };
    }

    const plano = assinatura?.plano;
    return parsePlanResources(plano?.features, plano?.nome);
  }, [query.data, role]);

  return {
    features,
    loading: query.isLoading,
    error: query.error,
    canAccessPlatform: features.acesso_plataforma,
    canUseGlobalLibrary: features.biblioteca_global,
    canUseGlobalModels: features.modelos_globais,
  };
}
