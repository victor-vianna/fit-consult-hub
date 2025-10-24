import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ActionCardProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  iconColor?: string;
}

export function ActionCard({ title, icon: Icon, onClick, iconColor = 'text-primary' }: ActionCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all hover:scale-105 hover:shadow-md active:scale-95"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <span className="text-sm font-medium text-center">{title}</span>
      </CardContent>
    </Card>
  );
}
