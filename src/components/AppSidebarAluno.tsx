import {
  Home,
  BookOpen,
  FileText,
  ListChecks,
  Dumbbell,
  Library,
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

const items = [
  { title: "Início", icon: Home, value: "inicio" },
  { title: "Consultoria", icon: BookOpen, value: "consultoria" },
  { title: "Diretrizes", icon: ListChecks, value: "diretrizes" },
  { title: "Treinos", icon: Dumbbell, value: "treinos" },
  { title: "Materiais", icon: FileText, value: "materiais" },
];

interface AppSidebarAlunoProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function AppSidebarAluno({
  activeSection,
  onSectionChange,
}: AppSidebarAlunoProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    isActive={activeSection === item.value}
                    onClick={() => onSectionChange(item.value)}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recursos Adicionais */}
        <SidebarGroup>
          <SidebarGroupLabel>Recursos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/exercicios">
                    <Library className="h-4 w-4" />
                    {!collapsed && <span>Exercícios</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
