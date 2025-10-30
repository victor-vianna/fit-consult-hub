import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PersonalSettingsDialog } from "@/components/PersonalSettingsDialog";

interface MobileHeaderPersonalProps {
  onMenuClick: () => void;
  personalId?: string;
  personalSettings?: {
    logo_url?: string;
    display_name?: string;
    theme_color?: string;
  };
  profileName?: string;
}

export function MobileHeaderPersonal({
  onMenuClick,
  personalId,
  personalSettings,
  profileName,
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
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {personalSettings?.logo_url && (
            <img
              src={personalSettings.logo_url}
              alt="Logo"
              className="h-10 w-10 rounded-full object-cover border-2"
              style={{
                borderColor: personalSettings.theme_color || "#3b82f6",
              }}
            />
          )}

          <div>
            <h1
              className="text-lg font-bold"
              style={{
                color: personalSettings?.theme_color || "inherit",
              }}
            >
              {personalSettings?.display_name || "FitConsult"}
            </h1>
            <p className="text-xs text-muted-foreground">{profileName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {personalId && <PersonalSettingsDialog personalId={personalId} />}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
