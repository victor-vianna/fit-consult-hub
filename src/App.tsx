import { lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { InstallPWAPrompt } from "./components/InstallPWAPrompt";
import Auth from "./pages/Auth";
import AdminLayout from "./components/Admin/AdminLayout";
import Personal from "./pages/Personal";
import AlunoDetalhes from "./pages/AlunoDetalhes";
import AreaAluno from "./pages/AreaAluno";
import NotFound from "./pages/NotFound";
import AcessoSuspenso from "./pages/AcessoSuspenso";
import Financeiro from "./pages/Financeiro";
import Biblioteca from "./pages/Biblioteca";
import ResetPassword from "./pages/ResetPassword";
import AlunosManager from "./pages/Alunos";
import Chat from "./pages/Chat";
import { PushNotificationsBootstrap } from "./components/PushNotificationsBootstrap";
import Landing from "./pages/Landing";
import PublicPersonal from "./pages/PublicPersonal";

// Seções do painel admin (lazy)
const DashboardOverview = lazy(() => import("./components/Admin/Sections/DashboardOverview"));
const UsuariosManager = lazy(() => import("./components/Admin/Sections/UsuariosManager"));
const PersonalsManager = lazy(() => import("./components/Admin/Sections/PersonalsManager"));
const AssinaturasManager = lazy(() => import("./components/Admin/Sections/AssinaturasManager"));
const PagamentosManager = lazy(() => import("./components/Admin/Sections/PagamentosManager"));
const PlanosManager = lazy(() => import("./components/Admin/Sections/PlanosManager"));
const RelatoriosSection = lazy(() => import("./components/Admin/Sections/RelatoriosSection"));
const AnalyticsSection = lazy(() => import("./components/Admin/Sections/AnalyticsSection"));
const NotificacoesSection = lazy(() => import("./components/Admin/Sections/NotificacoesSection"));
const ConfiguracoesSection = lazy(() => import("./components/Admin/Sections/ConfiguracoesSection"));
const ConteudosGlobaisSection = lazy(() => import("./components/Admin/Sections/ConteudosGlobaisSection"));
const MonitoramentoSection = lazy(() => import("./components/Admin/Sections/MonitoramentoSection"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPWAPrompt />
        <BrowserRouter>
          <PushNotificationsBootstrap />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/p/:slug" element={<PublicPersonal />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/admin"
                element={
                  <AuthGuard allowedRoles={["admin"]}>
                    <AdminLayout />
                  </AuthGuard>
                }
              >
                <Route index element={<DashboardOverview />} />
                <Route path="usuarios" element={<UsuariosManager />} />
                <Route path="personals" element={<PersonalsManager />} />
                <Route path="assinaturas" element={<AssinaturasManager />} />
                <Route path="pagamentos" element={<PagamentosManager />} />
                <Route path="planos" element={<PlanosManager />} />
                <Route path="relatorios" element={<RelatoriosSection />} />
                <Route path="analytics" element={<AnalyticsSection />} />
                <Route path="notificacoes" element={<NotificacoesSection />} />
                <Route path="conteudos-globais" element={<ConteudosGlobaisSection />} />
                <Route path="monitoramento" element={<MonitoramentoSection />} />
                <Route path="configuracoes" element={<ConfiguracoesSection />} />
              </Route>
              <Route
                path="/personal"
                element={
                  <AuthGuard allowedRoles={["personal"]}>
                    <Personal />
                  </AuthGuard>
                }
              />
              <Route
                path="/aluno/:id"
                element={
                  <AuthGuard allowedRoles={["personal"]}>
                    <AlunoDetalhes />
                  </AuthGuard>
                }
              />
              <Route
                path="/aluno"
                element={
                  <AuthGuard allowedRoles={["aluno"]}>
                    <AreaAluno />
                  </AuthGuard>
                }
              />
              <Route
                path="/biblioteca"
                element={
                  <AuthGuard allowedRoles={["personal", "admin", "aluno"]}>
                    <Biblioteca />
                  </AuthGuard>
                }
              />
              <Route
                path="/financeiro"
                element={
                  <AuthGuard allowedRoles={["personal"]}>
                    <Financeiro />
                  </AuthGuard>
                }
              />
              <Route
                path="/alunos"
                element={
                  <AuthGuard allowedRoles={["personal"]}>
                    <AlunosManager />
                  </AuthGuard>
                }
              />
              <Route
                path="/chat"
                element={
                  <AuthGuard allowedRoles={["personal"]}>
                    <Chat />
                  </AuthGuard>
                }
              />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/acesso-suspenso" element={<AcessoSuspenso />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
