import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnamneseCheckin } from "@/hooks/useAnamneseCheckin";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";

import { CheckinObrigatorioModal } from "@/components/CheckinObrigatorioModal";
import { AnamneseObrigatoriaModal } from "./AnamneseObrigatorioModal";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  const { settings: personalSettings } = usePersonalSettings(
    profile?.personal_id
  );

  const { mostrarModalAnamnese, mostrarModalCheckin, isRenovacao, loading, refresh, dismissCheckinModal } =
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
      {/* Header removido - cada página gerencia seu próprio header com NotificacoesDropdown */}

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
          isRenovacao={isRenovacao}
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
