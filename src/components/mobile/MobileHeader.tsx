import { Dumbbell, Bell } from 'lucide-react';
import { getTimeGreeting } from '@/utils/timeGreeting';

interface MobileHeaderProps {
  userName?: string;
}

export function MobileHeader({ userName }: MobileHeaderProps) {
  const greeting = getTimeGreeting();

  return (
    <header className="sticky top-0 z-20 bg-card border-b backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">FitConsult</span>
        </div>
        <Bell className="h-5 w-5 text-muted-foreground" />
      </div>
      {userName && (
        <div className="px-4 pb-3">
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <p className="font-semibold text-lg">{userName}! 👋</p>
        </div>
      )}
    </header>
  );
}
