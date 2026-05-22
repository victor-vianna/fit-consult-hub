import { useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const TITLES: Record<string, string> = {
  "/admin": "Visão Geral",
  "/admin/usuarios": "Usuários",
  "/admin/personals": "Personals",
  "/admin/assinaturas": "Assinaturas",
  "/admin/pagamentos": "Pagamentos",
  "/admin/planos": "Planos",
  "/admin/relatorios": "Relatórios",
  "/admin/analytics": "Analytics",
  "/admin/notificacoes": "Notificações",
  "/admin/configuracoes": "Configurações",
};

export function AdminHeader() {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? "Admin";

  return (
    <header className="sticky top-0 z-30 flex topbar-safe-mobile-compact items-center gap-2 border-b bg-card/80 backdrop-blur-xl px-3 md:px-4">
      <SidebarTrigger className="touch-target" />
      <Separator orientation="vertical" className="h-6" />
      <h1 className="text-sm md:text-base font-semibold truncate flex-1">
        {title}
      </h1>
      <div className="flex items-center gap-1 md:gap-2">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="touch-target"
        >
          <LogOut className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
