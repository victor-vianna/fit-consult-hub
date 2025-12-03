import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnamneseCheckin } from "@/hooks/useAnamneseCheckin";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { NotificacoesDropdown } from "@/components/NotificacoesDropdown";
import { CheckinObrigatorioModal } from "@/components/CheckinObrigatorioModal";
import { AnamneseObrigatoriaModal } from "./AnamneseObrigatorioModal";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  const { settings: personalSettings } = usePersonalSettings(
    profile?.personal_id
  );

  const { mostrarModalAnamnese, mostrarModalCheckin, loading, refresh, dismissCheckinModal } =
    useAnamneseCheckin(user?.id, profile?.personal_id);

  const handleAnamneseComplete = () => {
    refresh();
  };

  const handleCheckinComplete = () => {
    // Se o check-in foi preenchido, refresh para atualizar o estado
    // Se foi apenas fechado (primeira semana), o dismissCheckinModal já foi chamado
    refresh();
  };

  const handleCheckinClose = () => {
    // Chamado quando o modal é fechado sem preencher (primeira semana)
    dismissCheckinModal();
  };

  // Renderiza os modais apenas se:
  // 1. Não está loading
  // 2. Há usuário e profile
  // 3. O profile tem personal_id (é aluno)
  const shouldRenderModals = !loading && user && profile?.personal_id;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header fixo com notificações */}
      <header className="border-b bg-background h-16 flex items-center justify-end px-6">
        {user && <NotificacoesDropdown userId={user.id} />}
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Modal obrigatório de anamnese - tem prioridade sobre o de check-in */}
      {shouldRenderModals && mostrarModalAnamnese && (
        <AnamneseObrigatoriaModal
          profileId={user.id}
          personalId={profile.personal_id}
          themeColor={personalSettings?.theme_color}
          open={mostrarModalAnamnese}
          onComplete={handleAnamneseComplete}
        />
      )}

      {/* Modal obrigatório de check-in semanal - só mostra se anamnese não estiver aberta */}
      {shouldRenderModals && !mostrarModalAnamnese && mostrarModalCheckin && (
        <CheckinObrigatorioModal
          profileId={user.id}
          personalId={profile.personal_id}
          themeColor={personalSettings?.theme_color}
          open={mostrarModalCheckin}
          onComplete={handleCheckinComplete}
          onClose={handleCheckinClose}
        />
      )}
    </div>
  );
}
