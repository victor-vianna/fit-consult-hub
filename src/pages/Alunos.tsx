import { AppSidebarPersonal } from "@/components/AppSidebarPersonal";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppLayout } from "@/components/AppLayout";
import AlunosManager from "@/components/AlunosManager";
import { PersonalMobilePageLayout } from "@/components/mobile/PersonalMobilePageLayout";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Alunos() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <PersonalMobilePageLayout showHeader={false} className="px-0 pt-0">
        <AlunosManager />
      </PersonalMobilePageLayout>
    );
  }

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
              <h1 className="text-xl font-semibold">Área Meus Alunos</h1>
              <ThemeToggle />
            </div>
          </header>

          {/* Conteúdo principal */}
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <AlunosManager />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AppLayout>
  );
}
