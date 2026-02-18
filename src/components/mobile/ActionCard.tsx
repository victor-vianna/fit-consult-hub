import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface ActionCardProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  iconColor?: string;
  badge?: number;
}

export function ActionCard({ title, icon: Icon, onClick, iconColor = 'text-primary', badge }: ActionCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all hover:scale-105 hover:shadow-md active:scale-95 relative"
      onClick={onClick}
    >
      {badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 px-1 flex items-center justify-center text-[10px]">
          {badge > 9 ? "9+" : badge}
        </Badge>
      )}
      <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <span className="text-sm font-medium text-center">{title}</span>
      </CardContent>
    </Card>
  );
}
