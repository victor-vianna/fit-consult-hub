import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AcessoSuspenso() {
  const navigate = useNavigate();
  const [personalPhone, setPersonalPhone] = useState<string | null>(null);
  const [personalName, setPersonalName] = useState<string>(
    "seu personal trainer"
  );

  useEffect(() => {
    fetchPersonalContact();
  }, []);

  async function fetchPersonalContact() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Busca dados do aluno
      const { data: profile } = await supabase
        .from("profiles")
        .select("personal_id")
        .eq("id", user.id)
        .single();

      if (profile?.personal_id) {
        // Busca telefone e nome do personal
        const { data: personal } = await supabase
          .from("profiles")
          .select("telefone, nome")
          .eq("id", profile.personal_id)
          .single();

        if (personal) {
          setPersonalPhone(personal.telefone || null);
          setPersonalName(personal.nome || "seu personal trainer");
        }
      }
    } catch (error) {
      console.error("Erro ao buscar contato:", error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-md w-full bg-white shadow-xl rounded-lg p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-red-100 p-4 rounded-full">
            <Lock size={48} className="text-red-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Acesso Temporariamente Suspenso
        </h1>

        <p className="text-gray-600 mb-6">
          {personalName} bloqueou temporariamente o acesso à sua conta no
          FitConsult.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 text-left">
          <p className="text-sm text-blue-800">
            <strong>O que fazer?</strong>
            <br />
            Entre em contato com {personalName} para entender o motivo e
            regularizar sua situação.
          </p>
        </div>

        {personalPhone && (
          <div className="mb-6">
            <WhatsAppButton telefone={personalPhone} nome={personalName} />
          </div>
        )}

        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
