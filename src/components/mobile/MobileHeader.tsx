import { Dumbbell } from 'lucide-react';
import { MobileAccountMenu } from '@/components/mobile/MobileAccountMenu';

interface MobileHeaderProps {
  userName?: string;
}

export function MobileHeader({ userName }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-card border-b backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 header-safe-top pb-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">FitConsult</span>
        </div>
        <MobileAccountMenu userName={userName} />
      </div>
    </header>
  );
}
