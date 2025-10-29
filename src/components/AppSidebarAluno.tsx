import {
  Home,
  BookOpen,
  FileText,
  ListChecks,
  Dumbbell,
  Library,
  CreditCard,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";

const items = [
  { title: "Início", icon: Home, value: "inicio" },
  // { title: "Consultoria", icon: BookOpen, value: "consultoria" },
  // { title: "Diretrizes", icon: ListChecks, value: "diretrizes" },
  { title: "Treinos", icon: Dumbbell, value: "treinos" },
  { title: "Histórico", icon: Calendar, value: "historico" },
  { title: "Materiais", icon: FileText, value: "materiais" },
  { title: "Biblioteca", icon: Library, value: "biblioteca" },
  { title: "Meu Plano", icon: CreditCard, value: "plano" },
];

interface AppSidebarAlunoProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  personalId?: string;
}

export function AppSidebarAluno({
  activeSection,
  onSectionChange,
  personalId,
}: AppSidebarAlunoProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  // Buscar configurações do personal
  const { settings: personalSettings } = usePersonalSettings(personalId);

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
                <p className="text-xs text-muted-foreground">Área do Aluno</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = activeSection === item.value;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onSectionChange(item.value)}
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
