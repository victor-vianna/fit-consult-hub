import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const DEFAULT_CARDS_VISIVEIS = [
  "treinos",
  "chat",
  "avaliacao",
  "historico",
  "materiais",
  "plano",
  "biblioteca",
] as const;

export const DEFAULT_ALUNO_DASHBOARD_COMPONENTES = [
  "frequencia",
  "mensagens",
  "boas_vindas",
  "cards",
  "jornada",
] as const;

export const ALUNO_CARD_LABELS: Record<string, string> = {
  treinos: "Treinos",
  chat: "Chat",
  avaliacao: "Avaliacao",
  historico: "Historico",
  materiais: "Materiais",
  plano: "Meu Plano",
  biblioteca: "Biblioteca",
};

export const ALUNO_DASHBOARD_COMPONENT_LABELS: Record<string, string> = {
  frequencia: "Frequencia de treinos",
  mensagens: "Preview de mensagens",
  boas_vindas: "Boas-vindas",
  cards: "Cards de acesso",
  jornada: "Sua Jornada",
};

const normalizeStringArray = (
  value: unknown,
  fallback: readonly string[],
  allowed: readonly string[]
) => {
  if (!Array.isArray(value)) return [...fallback];

  const unique = value
    .filter((item): item is string => typeof item === "string" && allowed.includes(item))
    .filter((item, index, arr) => arr.indexOf(item) === index);

  return unique.length ? unique : [...fallback];
};

export interface PersonalSettings {
  id: string;
  personal_id: string;
  display_name: string | null;
  logo_url: string | null;
  letterhead_url: string | null;
  theme_color: string;
  mensagem_conclusao_treino: string | null;
  welcome_title: string | null;
  welcome_message: string | null;
  jornada_title: string | null;
  jornada_message: string | null;
  chat_welcome_message: string | null;
  cards_visiveis: string[] | null;
  aluno_dashboard_componentes: string[] | null;
  created_at: string;
  updated_at: string;
}

export function usePersonalSettings(personalId?: string) {
  const [settings, setSettings] = useState<PersonalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (personalId) {
      fetchSettings();
    }
  }, [personalId]);

  const normalize = (raw: any): PersonalSettings => ({
    ...raw,
    cards_visiveis: normalizeStringArray(
      raw?.cards_visiveis,
      DEFAULT_CARDS_VISIVEIS,
      DEFAULT_CARDS_VISIVEIS
    ),
    aluno_dashboard_componentes: normalizeStringArray(
      raw?.aluno_dashboard_componentes,
      DEFAULT_ALUNO_DASHBOARD_COMPONENTES,
      DEFAULT_ALUNO_DASHBOARD_COMPONENTES
    ),
  });

  const fetchSettings = async () => {
    if (!personalId) return;

    try {
      const { data, error } = await supabase
        .from("personal_settings")
        .select("*")
        .eq("personal_id", personalId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          await createDefaultSettings();
        } else {
          throw error;
        }
      } else {
        setSettings(normalize(data));
      }
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!personalId) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", personalId)
        .single();

      const { data, error } = await supabase
        .from("personal_settings")
        .insert({
          personal_id: personalId,
          display_name: profile?.nome || "Personal Trainer",
          theme_color: "#3b82f6",
          cards_visiveis: [...DEFAULT_CARDS_VISIVEIS],
          aluno_dashboard_componentes: [...DEFAULT_ALUNO_DASHBOARD_COMPONENTES],
        })
        .select()
        .single();

      if (error) throw error;
      setSettings(normalize(data));
    } catch (error) {
      console.error("Erro ao criar configurações padrão:", error);
    }
  };

  const updateSettings = async (updates: Partial<PersonalSettings>) => {
    if (!personalId) return;

    try {
      const { data, error } = await supabase
        .from("personal_settings")
        .update(updates)
        .eq("personal_id", personalId)
        .select()
        .single();

      if (error) throw error;

      setSettings(normalize(data));
      toast({
        title: "✅ Configurações atualizadas",
        description: "Suas configurações foram salvas com sucesso.",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar configurações",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const uploadLogo = async (file: File) => {
    if (!personalId) return;

    try {
      // Validar tipo de arquivo
      if (!file.type.startsWith("image/")) {
        throw new Error("Apenas imagens são permitidas");
      }

      // Validar tamanho (máx 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("A imagem deve ter no máximo 2MB");
      }

      // Deletar logo antiga se existir
      if (settings?.logo_url) {
        const oldPath = settings.logo_url.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("personal-logos")
            .remove([`${personalId}/${oldPath}`]);
        }
      }

      // Upload da nova logo
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${personalId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("personal-logos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from("personal-logos")
        .getPublicUrl(filePath);

      // Atualizar configurações com a nova URL
      await updateSettings({ logo_url: urlData.publicUrl });

      return urlData.publicUrl;
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload da logo",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeLogo = async () => {
    if (!personalId || !settings?.logo_url) return;

    try {
      // Deletar arquivo do storage
      const oldPath = settings.logo_url.split("/").pop();
      if (oldPath) {
        await supabase.storage
          .from("personal-logos")
          .remove([`${personalId}/${oldPath}`]);
      }

      // Atualizar configurações
      await updateSettings({ logo_url: null });
    } catch (error: any) {
      toast({
        title: "Erro ao remover logo",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const uploadLetterhead = async (file: File) => {
    if (!personalId) return;

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Apenas imagens são permitidas (PNG ou JPG)");
      }

      // Máx 5MB para papel timbrado (pode ser maior que logo)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("A imagem deve ter no máximo 5MB");
      }

      // Deletar timbrado antigo se existir
      if (settings?.letterhead_url) {
        const oldPath = settings.letterhead_url.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("personal-letterheads")
            .remove([`${personalId}/${oldPath}`]);
        }
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `letterhead-${Date.now()}.${fileExt}`;
      const filePath = `${personalId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("personal-letterheads")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("personal-letterheads")
        .getPublicUrl(filePath);

      await updateSettings({ letterhead_url: urlData.publicUrl });
      return urlData.publicUrl;
    } catch (error: any) {
      toast({
        title: "Erro ao enviar papel timbrado",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeLetterhead = async () => {
    if (!personalId || !settings?.letterhead_url) return;

    try {
      const oldPath = settings.letterhead_url.split("/").pop();
      if (oldPath) {
        await supabase.storage
          .from("personal-letterheads")
          .remove([`${personalId}/${oldPath}`]);
      }
      await updateSettings({ letterhead_url: null });
    } catch (error: any) {
      toast({
        title: "Erro ao remover papel timbrado",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    uploadLogo,
    removeLogo,
    uploadLetterhead,
    removeLetterhead,
    refetch: fetchSettings,
  };
}
