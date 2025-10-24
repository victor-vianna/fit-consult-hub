import { BookOpen, ListChecks, Dumbbell, FileText, LogOut, KeyRound } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';

interface MobileMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSignOut: () => void;
}

const menuItems = [
  { title: 'Consultoria', icon: BookOpen, value: 'consultoria' },
  { title: 'Diretrizes', icon: ListChecks, value: 'diretrizes' },
  { title: 'Treinos', icon: Dumbbell, value: 'treinos' },
  { title: 'Materiais', icon: FileText, value: 'materiais' },
];

export function MobileMenuDrawer({ 
  open, 
  onOpenChange, 
  activeSection, 
  onSectionChange,
  onSignOut 
}: MobileMenuDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[280px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2 mt-6">
          {menuItems.map((item) => (
            <Button
              key={item.value}
              variant={activeSection === item.value ? 'default' : 'ghost'}
              className="justify-start w-full"
              onClick={() => onSectionChange(item.value)}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.title}
            </Button>
          ))}
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium">Tema</span>
            <ThemeToggle />
          </div>

          <Button
            variant="ghost"
            className="justify-start w-full"
            onClick={() => {
              // TODO: Implementar troca de senha
              alert('Funcionalidade em desenvolvimento');
            }}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Trocar senha
          </Button>

          <Button
            variant="ghost"
            className="justify-start w-full text-destructive hover:text-destructive"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
