import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnamneseCheckin } from "@/hooks/useAnamneseCheckin";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { NotificacoesDropdown } from "@/components/NotificacoesDropdown";
import { AnamneseObrigatoriaModal } from "./AnamneseObrigatorioModal";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [showAnamneseModal, setShowAnamneseModal] = useState(false);

  // Buscar configurações do personal
  const { settings: personalSettings } = usePersonalSettings(
    profile?.personal_id
  );

  // Verificar status da anamnese
  const { anamnesePreenchida, loading, refresh } = useAnamneseCheckin(
    user?.id,
    profile?.personal_id
  );

  useEffect(() => {
    // Só mostra o modal se:
    // 1. Não está carregando
    // 2. O usuário é um aluno (tem personal_id)
    // 3. A anamnese não foi preenchida
    if (!loading && profile?.personal_id && !anamnesePreenchida) {
      setShowAnamneseModal(true);
    }
  }, [loading, anamnesePreenchida, profile]);

  const handleAnamneseComplete = () => {
    setShowAnamneseModal(false);
    refresh(); // Atualiza o status
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header fixo com notificações */}
      <header className="border-b bg-background h-16 flex items-center justify-end px-6">
        {user && <NotificacoesDropdown userId={user.id} />}
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Modal obrigatório de anamnese */}
      {profile?.personal_id && (
        <AnamneseObrigatoriaModal
          profileId={user!.id}
          personalId={profile.personal_id}
          themeColor={personalSettings?.theme_color}
          open={showAnamneseModal}
          onComplete={handleAnamneseComplete}
        />
      )}
    </div>
  );
}
