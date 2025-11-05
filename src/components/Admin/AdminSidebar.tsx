// src/components/AdminComponents/AdminSidebar.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  Settings,
  FileText,
  TrendingUp,
  UserCog,
  Bell,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  notifications?: number;
}

export default function AdminSidebar({
  activeSection,
  onSectionChange,
  notifications = 0,
}: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "usuarios",
      label: "Usuários",
      icon: Users,
      badge: null,
    },
    {
      id: "personals",
      label: "Personals",
      icon: UserCog,
      badge: null,
    },
    {
      id: "assinaturas",
      label: "Assinaturas",
      icon: CreditCard,
      badge: null,
    },
    {
      id: "pagamentos",
      label: "Pagamentos",
      icon: DollarSign,
      badge: null,
    },
    {
      id: "planos",
      label: "Planos",
      icon: Package,
      badge: null,
    },
    {
      id: "relatorios",
      label: "Relatórios",
      icon: FileText,
      badge: null,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: TrendingUp,
      badge: null,
    },
    {
      id: "notificacoes",
      label: "Notificações",
      icon: Bell,
      badge: notifications > 0 ? notifications : null,
    },
    {
      id: "configuracoes",
      label: "Configurações",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <div
      className={`${
        collapsed ? "w-20" : "w-64"
      } bg-card border-r transition-all duration-300 flex flex-col h-screen sticky top-0`}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="font-bold text-lg">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">Gerenciamento</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start relative ${
                  collapsed ? "px-2" : "px-3"
                } ${isActive ? "bg-primary/10 text-primary" : ""}`}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className={`h-5 w-5 ${collapsed ? "" : "mr-3"}`} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant="destructive"
                        className="ml-auto h-5 px-2 text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <div className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>FitConsult Admin v1.0</p>
            <p>© 2025 Todos os direitos reservados</p>
          </div>
        </div>
      )}
    </div>
  );
}
