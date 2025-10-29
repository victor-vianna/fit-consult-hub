import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { InstallPWAPrompt } from "./components/InstallPWAPrompt";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Personal from "./pages/Personal";
import AlunoDetalhes from "./pages/AlunoDetalhes";
import AreaAluno from "./pages/AreaAluno";
import NotFound from "./pages/NotFound";
import ExercisesLibrary from "./pages/ExercisesLibrary";
import AcessoSuspenso from "./pages/AcessoSuspenso";
import Financeiro from "./pages/Financeiro";
import Biblioteca from "./pages/Biblioteca";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPWAPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/admin"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <Admin />
              </AuthGuard>
            }
          />
          <Route
            path="/"
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
          <Route path="/acesso-suspenso" element={<AcessoSuspenso />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
