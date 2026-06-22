import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  DollarSign,
  LayoutDashboard,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminItems = [
  { title: "Inicio", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Personals", url: "/admin/personals", icon: UserCog },
  { title: "Pagamentos", url: "/admin/pagamentos", icon: DollarSign },
  { title: "Monitor", url: "/admin/monitoramento", icon: Activity },
];

export function AdminMobileBottomNavigation() {
  const { pathname } = useLocation();

  const isActive = (url: string, end?: boolean) =>
    end ? pathname === url : pathname === url || pathname.startsWith(`${url}/`);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-bottom">
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {adminItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.url, item.end);

          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.end}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium",
                "transition-colors touch-target",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
