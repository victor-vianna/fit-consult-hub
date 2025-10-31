// src/components/AppLayout.tsx
import { NotificacoesDropdown } from "@/components/NotificacoesDropdown";
import { useAuth } from "@/hooks/useAuth";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background h-16 flex items-center justify-end px-6">
        {user && <NotificacoesDropdown userId={user.id} />}
      </header>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
