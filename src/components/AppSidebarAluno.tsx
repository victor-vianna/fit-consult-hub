import {
  Activity,
  Calendar,
  CreditCard,
  Dumbbell,
  FileText,
  Home,
  Library,
  MessageSquare,
} from "lucide-react";
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
import {
  ALUNO_CARD_LABELS,
  DEFAULT_CARDS_VISIVEIS,
  usePersonalSettings,
} from "@/hooks/usePersonalSettings";

const itemConfig: Record<string, { title: string; icon: any; value: string }> = {
  treinos: { title: ALUNO_CARD_LABELS.treinos, icon: Dumbbell, value: "treinos" },
  chat: { title: ALUNO_CARD_LABELS.chat, icon: MessageSquare, value: "chat" },
  avaliacao: { title: ALUNO_CARD_LABELS.avaliacao, icon: Activity, value: "avaliacao" },
  historico: { title: ALUNO_CARD_LABELS.historico, icon: Calendar, value: "historico" },
  materiais: { title: ALUNO_CARD_LABELS.materiais, icon: FileText, value: "materiais" },
  plano: { title: ALUNO_CARD_LABELS.plano, icon: CreditCard, value: "plano" },
  biblioteca: { title: ALUNO_CARD_LABELS.biblioteca, icon: Library, value: "biblioteca" },
};

interface AppSidebarAlunoProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  personalId?: string;
  cardsVisiveis?: string[];
}

export function AppSidebarAluno({
  activeSection,
  onSectionChange,
  personalId,
  cardsVisiveis,
}: AppSidebarAlunoProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { settings: personalSettings } = usePersonalSettings(personalId);
  const configuredItemIds = cardsVisiveis?.length ? cardsVisiveis : [...DEFAULT_CARDS_VISIVEIS];
  const menuItemIds = configuredItemIds.includes("chat")
    ? configuredItemIds
    : ["chat", ...configuredItemIds];

  const items = [
    { title: "Inicio", icon: Home, value: "inicio" },
    ...menuItemIds.map((id) => itemConfig[id]).filter(Boolean),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
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
                <p className="text-xs text-muted-foreground">Area do Aluno</p>
              </div>
            </div>
          </div>
        )}

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
