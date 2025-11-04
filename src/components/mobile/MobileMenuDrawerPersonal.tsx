import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  FileText,
  Calendar,
  DollarSign,
  LogOut,
  Home,
  Dumbbell,
  CreditCard,
  MessageSquare,
  Library,
  UserIcon,
} from "lucide-react";

interface MobileMenuDrawerPersonalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personalSettings?: {
    theme_color?: string;
    display_name?: string;
  };
  onSignOut: () => void;
}

export function MobileMenuDrawerPersonal({
  open,
  onOpenChange,
  personalSettings,
  onSignOut,
}: MobileMenuDrawerPersonalProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const menuItems = [
    {
      icon: Home,
      label: "Dashboard",
      onClick: () => {
        navigate("/");
        onOpenChange(false);
      },
    },
    {
      icon: UserIcon,
      label: "Alunos",
      onClick: () => {
        navigate("/alunos");
        onOpenChange(false);
      },
    },
    {
      icon: Library,
      label: "Biblioteca",
      onClick: () => {
        navigate("/biblioteca");
        onOpenChange(false);
      },
    },
    {
      icon: DollarSign,
      label: "Financeiro",
      onClick: () => {
        navigate("/financeiro");
        onOpenChange(false);
      },
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader
          className="p-6 border-b"
          style={{
            backgroundColor: personalSettings?.theme_color
              ? `${personalSettings.theme_color}10`
              : undefined,
            borderColor: personalSettings?.theme_color
              ? `${personalSettings.theme_color}30`
              : undefined,
          }}
        >
          <SheetTitle
            style={{
              color: personalSettings?.theme_color || "inherit",
            }}
          >
            {personalSettings?.display_name || "FitConsult"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-5rem)]">
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start"
                onClick={item.onClick}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => {
                onSignOut();
                onOpenChange(false);
              }}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
