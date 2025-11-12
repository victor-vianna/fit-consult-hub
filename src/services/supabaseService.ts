import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const fetchUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    toast.error("Erro ao carregar o perfil do usuário.");
    return null;
  }
};

export const fetchUserRole = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching user role:", error);
    toast.error("Erro ao carregar o nível de acesso do usuário.");
    return null;
  }
};
