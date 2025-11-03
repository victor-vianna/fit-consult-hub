import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnamneseCheckin } from "@/hooks/useAnamneseCheckin";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { CheckinObrigatorioModal } from "@/components/CheckinObrigatorioModal";
import { NotificacoesDropdown } from "@/components/NotificacoesDropdown";
import { AnamneseObrigatoriaModal } from "./AnamneseObrigatorioModal";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  const { settings: personalSettings } = usePersonalSettings(
    profile?.personal_id
  );

  const { mostrarModalAnamnese, mostrarModalCheckin, loading, refresh } =
    useAnamneseCheckin(user?.id, profile?.personal_id);

  const handleAnamneseComplete = () => {
    refresh(); // Atualiza o status e verifica se precisa do check-in
  };

  const handleCheckinComplete = () => {
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

      {/* Modal obrigatório de anamnese - Primeira prioridade */}
      {!loading && profile?.personal_id && mostrarModalAnamnese && (
        <AnamneseObrigatoriaModal
          profileId={user!.id}
          personalId={profile.personal_id}
          themeColor={personalSettings?.theme_color}
          open={mostrarModalAnamnese}
          onComplete={handleAnamneseComplete}
        />
      )}

      {/* Modal obrigatório de check-in semanal - Segunda prioridade */}
      {!loading && profile?.personal_id && mostrarModalCheckin && (
        <CheckinObrigatorioModal
          profileId={user!.id}
          personalId={profile.personal_id}
          themeColor={personalSettings?.theme_color}
          open={mostrarModalCheckin}
          onComplete={handleCheckinComplete}
        />
      )}
    </div>
  );
}
