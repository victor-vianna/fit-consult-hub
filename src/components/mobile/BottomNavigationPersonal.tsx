import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  FileText,
  DollarSign,
  Menu,
  Library,
  UserIcon,
} from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";

interface BottomNavigationPersonalProps {
  onMenuClick: () => void;
  themeColor?: string;
}

export function BottomNavigationPersonal({
  onMenuClick,
  themeColor,
}: BottomNavigationPersonalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { light } = useHaptic();

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    light();
    navigate(path);
  };

  const handleMenuClick = () => {
    light();
    onMenuClick();
  };

  const navItems = [
    {
      icon: Home,
      label: "Início",
      path: "/",
    },
    {
      icon: UserIcon,
      label: "Alunos",
      path: "/alunos",
    },
    {
      icon: Library,
      label: "Biblioteca",
      path: "/biblioteca",
    },
    {
      icon: DollarSign,
      label: "Financeiro",
      path: "/financeiro",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            className={cn(
              "flex flex-col items-center gap-1 h-14 px-3",
              "transition-all duration-300 ease-in-out",
              "active:scale-95",
              "touch-target",
              isActive(item.path) 
                ? "text-primary scale-105" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => handleNavigate(item.path)}
            style={
              isActive(item.path) && themeColor
                ? { color: themeColor }
                : undefined
            }
          >
            <item.icon className="h-5 w-5 transition-transform" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex flex-col items-center gap-1 h-14 px-3",
            "transition-all duration-300 ease-in-out",
            "active:scale-95",
            "touch-target",
            "text-muted-foreground hover:text-foreground"
          )}
          onClick={handleMenuClick}
        >
          <Menu className="h-5 w-5 transition-transform" />
          <span className="text-xs">Menu</span>
        </Button>
      </div>
    </div>
  );
}
