import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

type Tone = "default" | "success" | "info" | "warning" | "destructive";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  trend?: { value: number; label?: string };
}

const toneMap: Record<Tone, { iconWrap: string; icon: string; ring: string }> = {
  default: {
    iconWrap: "bg-muted",
    icon: "text-foreground",
    ring: "",
  },
  success: {
    iconWrap: "bg-success-muted",
    icon: "text-success",
    ring: "ring-1 ring-success/20",
  },
  info: {
    iconWrap: "bg-info-muted",
    icon: "text-info",
    ring: "ring-1 ring-info/20",
  },
  warning: {
    iconWrap: "bg-warning-muted",
    icon: "text-warning",
    ring: "ring-1 ring-warning/20",
  },
  destructive: {
    iconWrap: "bg-destructive/10",
    icon: "text-destructive",
    ring: "ring-1 ring-destructive/20",
  },
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  tone = "default",
  hint,
  trend,
}: KpiCardProps) {
  const t = toneMap[tone];
  const trendUp = trend && trend.value >= 0;
  return (
    <Card className={cn("transition-all hover:shadow-md", t.ring)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
              {value}
            </p>
            {hint && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                {hint}
              </p>
            )}
          </div>
          <div
            className={cn(
              "shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
              t.iconWrap
            )}
          >
            <Icon className={cn("h-5 w-5", t.icon)} />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trendUp ? (
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            <span
              className={cn(
                "font-medium",
                trendUp ? "text-success" : "text-destructive"
              )}
            >
              {trendUp ? "+" : ""}
              {trend.value}%
            </span>
            {trend.label && (
              <span className="text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
