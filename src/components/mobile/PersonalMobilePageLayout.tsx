import { ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MobileHeaderPersonal } from "@/components/mobile/MobileHeaderPersonal";
import { BottomNavigationPersonal } from "@/components/mobile/BottomNavigationPersonal";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { cn } from "@/lib/utils";

interface PersonalMobilePageLayoutProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
}

export function PersonalMobilePageLayout({
  children,
  className,
  showHeader = true,
}: PersonalMobilePageLayoutProps) {
  const { user, profile } = useAuth();
  const { settings: personalSettings } = usePersonalSettings(user?.id);

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col bg-background">
        {showHeader && (
          <MobileHeaderPersonal
            personalId={user?.id}
            personalSettings={personalSettings}
            profileName={profile?.nome}
            userId={user?.id}
          />
        )}

        <main
          className={cn(
            "flex-1 overflow-auto px-4 pb-24 pt-4",
            className
          )}
        >
          {children}
        </main>

        <BottomNavigationPersonal themeColor={personalSettings?.theme_color} />
      </div>
    </AppLayout>
  );
}
