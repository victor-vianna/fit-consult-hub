import { Home, MessageCircle, Menu } from 'lucide-react';
import { useState } from 'react';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSignOut: () => void;
  personalWhatsApp?: string;
}

export function BottomNavigation({ 
  activeSection, 
  onSectionChange, 
  onSignOut,
  personalWhatsApp 
}: BottomNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { light } = useHaptic();

  const handleWhatsAppClick = () => {
    light();
    if (personalWhatsApp) {
      const cleanPhone = personalWhatsApp.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleSectionChange = (section: string) => {
    light();
    onSectionChange(section);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t backdrop-blur-sm safe-area-bottom">
        <div className="flex items-center justify-around px-4 py-3">
          <button
            onClick={() => handleSectionChange('inicio')}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-2 rounded-lg",
              "transition-all duration-300 ease-in-out",
              "active:scale-95",
              "touch-target",
              activeSection === 'inicio' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Home className="h-6 w-6 transition-transform" />
            <span className="text-xs font-medium">Início</span>
          </button>

          <button
            onClick={handleWhatsAppClick}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-2 rounded-lg",
              "transition-all duration-300 ease-in-out",
              "active:scale-95",
              "touch-target",
              "text-muted-foreground hover:text-primary"
            )}
          >
            <MessageCircle className="h-6 w-6 transition-transform" />
            <span className="text-xs font-medium">WhatsApp</span>
          </button>

          <button
            onClick={() => {
              light();
              setMenuOpen(true);
            }}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-2 rounded-lg",
              "transition-all duration-300 ease-in-out",
              "active:scale-95",
              "touch-target",
              "text-muted-foreground hover:text-primary"
            )}
          >
            <Menu className="h-6 w-6 transition-transform" />
            <span className="text-xs font-medium">Menu</span>
          </button>
        </div>
      </nav>

      <MobileMenuDrawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
        activeSection={activeSection}
        onSectionChange={(section) => {
          onSectionChange(section);
          setMenuOpen(false);
        }}
        onSignOut={onSignOut}
      />
    </>
  );
}
