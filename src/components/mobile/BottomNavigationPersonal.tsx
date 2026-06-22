import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Home,
  Library,
  Menu,
  MessageSquare,
  UserIcon,
} from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";

interface BottomNavigationPersonalProps {
  themeColor?: string;
}

export function BottomNavigationPersonal({
  themeColor,
}: BottomNavigationPersonalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { light } = useHaptic();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    light();
    navigate(path);
  };

  const primaryItems = [
    { icon: Home, label: "Inicio", path: "/personal" },
    { icon: UserIcon, label: "Alunos", path: "/alunos" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
  ];

  const drawerItems = [
    { icon: Library, label: "Biblioteca", path: "/biblioteca" },
    { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  ];

  const isDrawerActive = drawerItems.some((item) => isActive(item.path));

  const handleDrawerNavigate = (path: string) => {
    handleNavigate(path);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-bottom">
        <div className="grid h-16 grid-cols-4 gap-1 px-2">
          {primaryItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              className={cn(
                "flex h-14 flex-col items-center gap-1 px-2",
                "transition-all duration-300 ease-in-out",
                "active:scale-95",
                "touch-target",
                isActive(item.path)
                  ? "text-primary scale-105 bg-primary/10"
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
              "flex h-14 flex-col items-center gap-1 px-2",
              "transition-all duration-300 ease-in-out",
              "active:scale-95",
              "touch-target",
              isDrawerActive
                ? "text-primary scale-105 bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              light();
              setMenuOpen(true);
            }}
            style={isDrawerActive && themeColor ? { color: themeColor } : undefined}
          >
            <Menu className="h-5 w-5 transition-transform" />
            <span className="text-xs">Menu</span>
          </Button>
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[300px]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-2">
            <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
              Navegacao
            </p>
            {drawerItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Button
                  key={item.path}
                  variant={active ? "default" : "ghost"}
                  className="h-12 w-full justify-start"
                  onClick={() => handleDrawerNavigate(item.path)}
                  style={
                    active && themeColor
                      ? { backgroundColor: themeColor }
                      : undefined
                  }
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
          </div>

          <Separator className="my-5" />

          <div className="space-y-2">
            <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
              Configuracoes
            </p>
            <div className="flex items-center justify-between rounded-lg px-3 py-2">
              <span className="text-sm font-medium">Tema</span>
              <ThemeToggle />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
