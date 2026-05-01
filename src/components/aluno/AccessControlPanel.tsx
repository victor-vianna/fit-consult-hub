import { useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  Pause,
  ShieldAlert,
  Settings,
  ChevronDown,
  History,
} from "lucide-react";
import {
  AccessMotivo,
  AccessStatus,
  MOTIVO_LABELS,
  useStudentAccess,
} from "@/hooks/useStudentAccess";
import { ManageAccessDialog } from "./ManageAccessDialog";
import { AccessHistoryList } from "./AccessHistoryList";

interface Props {
  studentId: string;
  studentName: string;
}

const STATUS_META: Record<
  AccessStatus,
  { label: string; icon: typeof CheckCircle2; classes: string; desc: string }
> = {
  ativo: {
    label: "Ativo",
    icon: CheckCircle2,
    classes: "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/30",
    desc: "O aluno acessa a plataforma normalmente.",
  },
  pausado: {
    label: "Pausado",
    icon: Pause,
    classes:
      "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
    desc: "Pausa temporária — o aluno verá a mensagem na tela de bloqueio.",
  },
  suspenso: {
    label: "Suspenso",
    icon: ShieldAlert,
    classes: "text-destructive bg-destructive/10 border-destructive/30",
    desc: "Acesso bloqueado — o aluno verá a mensagem na tela de bloqueio.",
  },
};

export function AccessControlPanel({ studentId, studentName }: Props) {
  const { status, lastLog, logs, loading, mutate, isMutating, profile } =
    useStudentAccess(studentId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  const motivoLabel =
    lastLog?.motivo &&
    (MOTIVO_LABELS[lastLog.motivo as AccessMotivo] ?? lastLog.motivo);

  return (
    <>
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Acesso à plataforma
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Controle se o aluno pode entrar e treinar.
              </p>
            </div>
            <Badge
              variant="outline"
              className={`${meta.classes} border gap-1.5 px-3 py-1`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {meta.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className={`p-3 rounded-md border ${meta.classes}`}>
            <p className="text-sm">{meta.desc}</p>
            {status !== "ativo" && lastLog && (
              <div className="mt-2 space-y-1 text-sm">
                {motivoLabel && (
                  <p>
                    <span className="font-medium">Motivo:</span> {motivoLabel}
                  </p>
                )}
                {lastLog.mensagem_aluno && (
                  <p>
                    <span className="font-medium">Mensagem ao aluno:</span>{" "}
                    {lastLog.mensagem_aluno}
                  </p>
                )}
                <p className="text-xs opacity-80">
                  {formatDistanceToNow(parseISO(lastLog.created_at), {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={() => setDialogOpen(true)}
            disabled={loading}
            className="w-full sm:w-auto"
            variant={status === "ativo" ? "default" : "default"}
          >
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar acesso
          </Button>

          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <History className="h-4 w-4" />
                Histórico de acesso ({logs.length})
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    historyOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <AccessHistoryList logs={logs} />
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <ManageAccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        studentName={studentName}
        status={status}
        isMutating={isMutating}
        onConfirm={(p) => mutate(p)}
      />
    </>
  );
}

export function AccessStatusBadge({ studentId }: { studentId: string }) {
  const { status, loading } = useStudentAccess(studentId);
  if (loading) return null;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  return (
    <Badge variant="outline" className={`${meta.classes} border gap-1`}>
      <StatusIcon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}
