import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Users, FileText, DollarSign, Menu, Library } from "lucide-react";

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

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      icon: Home,
      label: "Início",
      path: "/",
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
            className={`flex flex-col items-center gap-1 h-14 px-3 ${
              isActive(item.path) ? "text-primary" : "text-muted-foreground"
            }`}
            onClick={() => navigate(item.path)}
            style={
              isActive(item.path) && themeColor
                ? { color: themeColor }
                : undefined
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 h-14 px-3 text-muted-foreground"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs">Menu</span>
        </Button>
      </div>
    </div>
  );
}
