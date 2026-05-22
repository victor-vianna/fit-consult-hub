import { AppSidebarPersonal } from "@/components/AppSidebarPersonal";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppLayout } from "@/components/AppLayout";

export default function Financeiro() {
  return (
    <AppLayout>
      <SidebarProvider>
        <AppSidebarPersonal />
        <SidebarInset>
          {/* Header */}
          <header className="flex topbar-safe-mobile shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 items-center justify-between">
              <h1 className="text-xl font-semibold">Dashboard Financeiro</h1>
              <ThemeToggle />
            </div>
          </header>

          {/* Conteúdo principal */}
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <FinancialDashboard />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AppLayout>
  );
}
