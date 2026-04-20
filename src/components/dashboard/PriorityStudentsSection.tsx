import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight, CreditCard, MessageSquare, Calendar, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PriorityFlag, PriorityStudent } from "@/hooks/usePriorityStudents";

interface PriorityStudentsSectionProps {
  students: PriorityStudent[];
  themeColor?: string;
  loading?: boolean;
}

const ICON_BY_REASON: Record<PriorityFlag["reason"], React.ComponentType<{ className?: string }>> = {
  plano_vencendo: Calendar,
  plano_vencido: AlertCircle,
  pagamento_pendente: CreditCard,
  feedback_nao_respondido: MessageSquare,
  mensagem_nao_lida: MessageSquare,
};

function FlagBadge({ flag }: { flag: PriorityFlag }) {
  const Icon = ICON_BY_REASON[flag.reason];
  return (
    <Badge
      variant={flag.severity === "alta" ? "destructive" : "secondary"}
      className="gap-1 text-[10px] py-0 h-5"
    >
      <Icon className="h-3 w-3" />
      <span>{flag.label}</span>
      {flag.detail && <span className="opacity-80">· {flag.detail}</span>}
    </Badge>
  );
}

export function PriorityStudentsSection({ students, themeColor, loading }: PriorityStudentsSectionProps) {
  const navigate = useNavigate();

  if (loading || students.length === 0) return null;

  const top = students.slice(0, 6);

  return (
    <Card
      className="border-2 border-destructive/30 bg-destructive/5"
      style={{
        borderColor: themeColor ? `${themeColor}60` : undefined,
      }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <span>Alunos Prioritários</span>
          <Badge variant="destructive" className="ml-1">{students.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/aluno/${s.id}`)}
            className={cn(
              "w-full text-left flex items-center gap-3 p-3 rounded-lg",
              "bg-background hover:bg-accent transition-colors border",
              "group",
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{s.nome}</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {s.flags.map((f, i) => (
                  <FlagBadge key={i} flag={f} />
                ))}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </button>
        ))}

        {students.length > 6 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => navigate("/alunos")}
          >
            Ver todos os {students.length} prioritários
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
