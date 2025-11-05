// src/pages/AdminDashboard.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Dumbbell, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// Importar os componentes de seção
import DashboardOverview from "./Sections/DashboardOverview";
import AdminSidebar from "./AdminSidebar";
import UsuariosManager from "./Sections/UsuariosManager";
import PersonalsManager from "./Sections/PersonalsManager";
import AssinaturasManager from "./Sections/AssinaturasManager";
import PagamentosManager from "./Sections/PagamentosManager";
import PlanosManager from "./Sections/PlanosManager";
import RelatoriosSection from "./Sections/RelatoriosSection";
import AnalyticsSection from "./Sections/AnalyticsSection";
import NotificacoesSection from "./Sections/NotificacoesSection";
import ConfiguracoesSection from "./Sections/ConfiguracoesSection";

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardOverview />;
      case "usuarios":
        return <UsuariosManager />;
      case "personals":
        return <PersonalsManager />;
      case "assinaturas":
        return <AssinaturasManager />;
      case "pagamentos":
        return <PagamentosManager />;
      case "planos":
        return <PlanosManager />;
      case "relatorios":
        return <RelatoriosSection />;
      case "analytics":
        return <AnalyticsSection />;
      case "notificacoes":
        return <NotificacoesSection />;
      case "configuracoes":
        return <ConfiguracoesSection />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        notifications={3}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card/80 backdrop-blur-xl z-40 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">FitConsult Admin</h1>
                  <p className="text-xs text-muted-foreground">
                    Painel Administrativo
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container mx-auto px-6 py-8">{renderSection()}</div>
        </main>
      </div>
    </div>
  );
}
