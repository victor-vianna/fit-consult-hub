import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PersonalSettings {
  id: string;
  personal_id: string;
  display_name: string | null;
  logo_url: string | null;
  theme_color: string;
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

  const fetchSettings = async () => {
    if (!personalId) return;

    try {
      const { data, error } = await supabase
        .from("personal_settings")
        .select("*")
        .eq("personal_id", personalId)
        .single();

      if (error) {
        // Se não existir, criar configurações padrão
        if (error.code === "PGRST116") {
          await createDefaultSettings();
        } else {
          throw error;
        }
      } else {
        setSettings(data);
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
        })
        .select()
        .single();

      if (error) throw error;
      setSettings(data);
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

      setSettings(data);
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

  return {
    settings,
    loading,
    updateSettings,
    uploadLogo,
    removeLogo,
    refetch: fetchSettings,
  };
}
