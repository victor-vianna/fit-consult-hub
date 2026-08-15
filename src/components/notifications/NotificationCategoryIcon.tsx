import { cn } from "@/lib/utils";
import { getNotificationCategoryMeta } from "@/components/notifications/NotificationCategoryMeta";

export function NotificationCategoryIcon({
  tipo,
  action,
  unread,
  className,
}: {
  tipo?: string | null;
  action?: unknown;
  unread?: boolean;
  className?: string;
}) {
  const meta = getNotificationCategoryMeta(tipo, action);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        meta.containerClassName,
        className
      )}
    >
      <Icon className={cn("h-4 w-4", meta.iconClassName)} />
      {unread && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-background bg-red-500" />
      )}
    </span>
  );
}
