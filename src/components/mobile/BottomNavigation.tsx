import {
  Activity,
  Calendar,
  CreditCard,
  Dumbbell,
  FileText,
  Home,
  Library,
  MessageCircle,
} from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";
import {
  ALUNO_CARD_LABELS,
  DEFAULT_CARDS_VISIVEIS,
} from "@/hooks/usePersonalSettings";

interface BottomNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSignOut: () => void;
  personalWhatsApp?: string;
  chatNaoLidas?: number;
  cardsVisiveis?: string[];
}

const navConfig: Record<string, { section: string; label: string; icon: any }> = {
  treinos: { section: "treinos", label: ALUNO_CARD_LABELS.treinos, icon: Dumbbell },
  chat: { section: "chat", label: ALUNO_CARD_LABELS.chat, icon: MessageCircle },
  avaliacao: { section: "avaliacao", label: ALUNO_CARD_LABELS.avaliacao, icon: Activity },
  historico: { section: "historico", label: ALUNO_CARD_LABELS.historico, icon: Calendar },
  materiais: { section: "materiais", label: ALUNO_CARD_LABELS.materiais, icon: FileText },
  plano: { section: "plano", label: "Planos", icon: CreditCard },
  biblioteca: { section: "biblioteca", label: ALUNO_CARD_LABELS.biblioteca, icon: Library },
};

export function BottomNavigation({
  activeSection,
  onSectionChange,
  chatNaoLidas = 0,
  cardsVisiveis,
}: BottomNavigationProps) {
  const { light } = useHaptic();

  const handleSectionChange = (section: string) => {
    light();
    onSectionChange(section);
  };

  const navItems = [
    { section: "inicio", label: "Inicio", icon: Home },
    ...(cardsVisiveis?.length ? cardsVisiveis : [...DEFAULT_CARDS_VISIVEIS])
      .map((id) => navConfig[id])
      .filter(Boolean),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.section;
          const isChat = item.section === "chat";

          return (
            <button
              key={item.section}
              onClick={() => handleSectionChange(item.section)}
              className={cn(
                "flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-lg px-1.5 py-2",
                "transition-all duration-300 ease-in-out",
                "active:scale-95",
                "touch-target",
                isActive
                  ? "text-primary bg-primary/10 scale-105"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5 transition-transform" />
                {isChat && chatNaoLidas > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {chatNaoLidas > 9 ? "9+" : chatNaoLidas}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate text-[11px] font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
