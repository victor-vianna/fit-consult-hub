import {
  Home,
  BookOpen,
  ListChecks,
  Dumbbell,
  FileText,
  Library,
  LogOut,
  KeyRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MobileMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSignOut: () => void;
}

const menuItems = [
  { title: "Início", icon: Home, value: "inicio" },
  { title: "Consultoria", icon: BookOpen, value: "consultoria" },
  { title: "Diretrizes", icon: ListChecks, value: "diretrizes" },
  { title: "Treinos", icon: Dumbbell, value: "treinos" },
  { title: "Biblioteca", icon: Library, value: "exercicios" },
  { title: "Materiais", icon: FileText, value: "materiais" },
];

export function MobileMenuDrawer({
  open,
  onOpenChange,
  activeSection,
  onSectionChange,
  onSignOut,
}: MobileMenuDrawerProps) {
  const navigate = useNavigate();

  const handleNavigateToExercises = () => {
    navigate("/exercicios");
    onOpenChange(false); // Fecha o drawer após navegar
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[280px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        {/* Menu Principal */}
        <div className="flex flex-col gap-2 mt-6">
          <p className="text-xs font-semibold text-muted-foreground px-3 mb-1">
            MENU
          </p>
          {menuItems.map((item) => (
            <Button
              key={item.value}
              variant={activeSection === item.value ? "default" : "ghost"}
              className="justify-start w-full"
              onClick={() => {
                onSectionChange(item.value);
                onOpenChange(false); // Fecha o drawer
              }}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.title}
            </Button>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Recursos Adicionais */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground px-3 mb-1">
            RECURSOS
          </p>
          <Button
            variant="ghost"
            className="justify-start w-full"
            onClick={handleNavigateToExercises}
          >
            <Library className="h-4 w-4 mr-2" />
            Exercícios
          </Button>
        </div>

        <Separator className="my-4" />

        {/* Configurações */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground px-3 mb-1">
            CONFIGURAÇÕES
          </p>

          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium">Tema</span>
            <ThemeToggle />
          </div>

          <Button
            variant="ghost"
            className="justify-start w-full"
            onClick={() => {
              // TODO: Implementar troca de senha
              alert("Funcionalidade em desenvolvimento");
              onOpenChange(false);
            }}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Trocar senha
          </Button>

          <Button
            variant="ghost"
            className="justify-start w-full text-destructive hover:text-destructive"
            onClick={() => {
              onSignOut();
              onOpenChange(false);
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
