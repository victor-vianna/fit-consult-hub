import { LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalPlanFeatures } from "@/hooks/usePersonalPlanFeatures";

interface MobileAccountMenuProps {
  userName?: string | null;
}

export function MobileAccountMenu({ userName }: MobileAccountMenuProps) {
  const { signOut, role, user } = useAuth();
  const { planName, loading } = usePersonalPlanFeatures(
    role === "personal" ? user?.id : null
  );
  const shouldShowPlan = role === "personal";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          aria-label="Abrir menu da conta"
        >
          <UserCircle className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-xs font-normal text-muted-foreground">
            Conta
          </span>
          <span className="block truncate">
            {userName || "Usuario"}
          </span>
          {shouldShowPlan && (
            <span className="mt-1 inline-flex max-w-full items-center rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <span className="mr-1 shrink-0">Plano:</span>
              <span className="truncate">
                {loading ? "Carregando..." : planName || "Sem plano ativo"}
              </span>
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          className="h-11 text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
