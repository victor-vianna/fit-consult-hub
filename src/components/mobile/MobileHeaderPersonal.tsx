import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PersonalSettingsDialog } from "@/components/PersonalSettingsDialog";
import { NotificacoesDropdown } from "@/components/NotificacoesDropdown";
import { MobileAccountMenu } from "@/components/mobile/MobileAccountMenu";

interface MobileHeaderPersonalProps {
  onMenuClick?: () => void;
  personalId?: string;
  personalSettings?: {
    logo_url?: string;
    display_name?: string;
    theme_color?: string;
  };
  profileName?: string;
  userId?: string;
}

export function MobileHeaderPersonal({
  onMenuClick,
  personalId,
  personalSettings,
  profileName,
  userId,
}: MobileHeaderPersonalProps) {
  return (
    <header
      className="border-b backdrop-blur-sm sticky top-0 z-50"
      style={{
        backgroundColor: personalSettings?.theme_color
          ? `${personalSettings.theme_color}10`
          : "hsl(var(--card) / 0.5)",
        borderColor: personalSettings?.theme_color
          ? `${personalSettings.theme_color}30`
          : "hsl(var(--border))",
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3 header-safe-top-compact pb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="h-9 w-9 shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {personalSettings?.logo_url && (
            <img
              src={personalSettings.logo_url}
              alt="Logo"
              className="h-8 w-8 rounded-full object-cover border-2 shrink-0"
              style={{
                borderColor: personalSettings.theme_color || "#3b82f6",
              }}
            />
          )}

          <div className="min-w-0 flex-1">
            <h1
              className="text-base font-bold truncate leading-tight"
              style={{
                color: personalSettings?.theme_color || "inherit",
              }}
            >
              {personalSettings?.display_name || "FitConsult"}
            </h1>
            {profileName && (
              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                {profileName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {userId && <NotificacoesDropdown userId={userId} />}
          {personalId && (
            <PersonalSettingsDialog personalId={personalId} iconOnly />
          )}
          <MobileAccountMenu userName={profileName} />
        </div>
      </div>
    </header>
  );
}
