import {
  Activity,
  Calendar,
  CreditCard,
  Dumbbell,
  FileText,
  Home,
  Library,
  LogOut,
  Menu,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";
import { useHaptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";
import {
  ALUNO_CARD_LABELS,
  DEFAULT_CARDS_VISIVEIS,
} from "@/hooks/usePersonalSettings";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  onSignOut,
  chatNaoLidas = 0,
  cardsVisiveis,
}: BottomNavigationProps) {
  const { light } = useHaptic();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSectionChange = (section: string) => {
    light();
    onSectionChange(section);
  };

  const configuredItems = (cardsVisiveis?.length ? cardsVisiveis : [...DEFAULT_CARDS_VISIVEIS])
    .map((id) => navConfig[id])
    .filter(Boolean);

  const primaryItems = [
    { section: "inicio", label: "Inicio", icon: Home },
    navConfig.treinos,
    navConfig.chat,
  ];
  const drawerItems = configuredItems.filter(
    (item) => !["treinos", "chat"].includes(item.section)
  );
  const isDrawerActive = drawerItems.some((item) => item.section === activeSection);

  const handleDrawerNavigate = (section: string) => {
    handleSectionChange(section);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t backdrop-blur-sm safe-area-bottom">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.section;
            const isChat = item.section === "chat";

            return (
              <button
                key={item.section}
                onClick={() => handleSectionChange(item.section)}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1.5 py-2",
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

          <button
            type="button"
            onClick={() => {
              light();
              setMenuOpen(true);
            }}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1.5 py-2",
              "transition-all duration-300 ease-in-out",
              "active:scale-95",
              "touch-target",
              isDrawerActive
                ? "text-primary bg-primary/10 scale-105"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Menu className="h-5 w-5 transition-transform" />
            <span className="max-w-full truncate text-[11px] font-medium">
              Menu
            </span>
          </button>
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
              const isActive = activeSection === item.section;
              return (
                <Button
                  key={item.section}
                  variant={isActive ? "default" : "ghost"}
                  className="h-12 w-full justify-start"
                  onClick={() => handleDrawerNavigate(item.section)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
            {drawerItems.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Nenhum item adicional disponivel.
              </p>
            )}
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
            <Button
              variant="ghost"
              className="h-12 w-full justify-start text-destructive hover:text-destructive"
              onClick={() => {
                light();
                onSignOut();
                setMenuOpen(false);
              }}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
