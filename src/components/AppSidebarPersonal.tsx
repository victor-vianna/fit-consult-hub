import {
  Home,
  Users,
  Library,
  LogOut,
  Wallet,
  FileText,
  Dumbbell,
  Calendar,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/" },
  { title: "Financeiro", icon: Wallet, path: "/financeiro" },
  { title: "Assinaturas", icon: CreditCard, path: "/subscription-manager" },
  { title: "Biblioteca", icon: Library, path: "/biblioteca" },
];

export function AppSidebarPersonal() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Buscar configurações do personal
  const { settings: personalSettings } = usePersonalSettings(user?.id);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Header com Logo e Nome do Personal */}
        {!collapsed && (
          <div
            className="p-4 border-b"
            style={{
              backgroundColor: personalSettings?.theme_color
                ? `${personalSettings.theme_color}10`
                : undefined,
              borderColor: personalSettings?.theme_color
                ? `${personalSettings.theme_color}30`
                : undefined,
            }}
          >
            <div className="flex items-center gap-3">
              {personalSettings?.logo_url && (
                <img
                  src={personalSettings.logo_url}
                  alt="Logo"
                  className="h-10 w-10 rounded-full object-cover border-2"
                  style={{
                    borderColor: personalSettings.theme_color || "#3b82f6",
                  }}
                />
              )}
              <div>
                <h2
                  className="font-bold text-lg"
                  style={{
                    color: personalSettings?.theme_color || "inherit",
                  }}
                >
                  {personalSettings?.display_name || "FitConsult"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Área do Personal
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                      style={
                        isActive && personalSettings?.theme_color
                          ? {
                              backgroundColor: `${personalSettings.theme_color}20`,
                              color: personalSettings.theme_color,
                            }
                          : undefined
                      }
                    >
                      <item.icon
                        className="h-4 w-4"
                        style={
                          isActive && personalSettings?.theme_color
                            ? { color: personalSettings.theme_color }
                            : undefined
                        }
                      />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
