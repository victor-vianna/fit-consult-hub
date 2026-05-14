import { NavLink, useLocation } from "react-router-dom";
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
  Dumbbell,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Usuários", url: "/admin/usuarios", icon: Users },
  { title: "Personals", url: "/admin/personals", icon: UserCog },
  { title: "Assinaturas", url: "/admin/assinaturas", icon: CreditCard },
  { title: "Pagamentos", url: "/admin/pagamentos", icon: DollarSign },
  { title: "Planos", url: "/admin/planos", icon: Package },
];

const insightsItems = [
  { title: "Relatórios", url: "/admin/relatorios", icon: FileText },
  { title: "Analytics", url: "/admin/analytics", icon: TrendingUp },
  { title: "Notificações", url: "/admin/notificacoes", icon: Bell },
];

const systemItems = [
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (url: string, end?: boolean) =>
    end ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url, item.end)}
          tooltip={item.title}
          className="min-h-[44px]"
        >
          <NavLink to={item.url} end={item.end}>
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">FitConsult</p>
              <p className="text-xs text-muted-foreground truncate">
                Painel Admin
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(insightsItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(systemItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="border-t">
          <p className="px-2 py-1 text-[10px] text-muted-foreground">
            v1.0 · © {new Date().getFullYear()}
          </p>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
