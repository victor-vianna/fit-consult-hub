import { ArrowRight, Clock } from "lucide-react";
import {
  AccessLogWithAuthor,
  getAccessReasonLabel,
} from "@/hooks/useStudentAccess";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDateTime } from "@/utils/dateFormat";

interface Props {
  logs: AccessLogWithAuthor[];
  limit?: number;
}

function getEffectLabel(effect: AccessLogWithAuthor["effect"]) {
  if (effect === "allow") return "Liberou";
  if (effect === "block") return "Bloqueou";
  return "Registrou";
}

function getSourceLabel(source: string) {
  if (source === "manual") return "Manual";
  if (source === "payment") return "Pagamento";
  if (source === "settings") return "Regra";
  if (source === "legacy") return "Legado";
  return "Sistema";
}

export function AccessHistoryList({ logs, limit }: Props) {
  const items = limit ? logs.slice(0, limit) : logs;

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Nenhuma alteracao de acesso registrada ainda.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((log) => {
        const motivoLabel = getAccessReasonLabel(log.reason_code);
        return (
          <li key={log.id} className="flex gap-3 p-3 rounded-md border bg-card text-sm">
            <div className="flex flex-col items-center pt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={log.effect === "block" ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {getEffectLabel(log.effect)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {getSourceLabel(log.source)}
                </Badge>
                {motivoLabel && (
                  <Badge variant="secondary" className="text-[10px]">
                    {motivoLabel}
                  </Badge>
                )}
                {log.effect !== "neutral" && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    {log.effect === "allow" ? "Bloqueado" : "Ativo"}
                    <ArrowRight className="h-3 w-3" />
                    {log.effect === "allow" ? "Ativo" : "Bloqueado"}
                  </span>
                )}
              </div>

              {log.message_aluno && (
                <p className="mt-1 text-foreground">
                  <span className="text-muted-foreground">Mensagem ao aluno: </span>
                  {log.message_aluno}
                </p>
              )}

              {log.observation && (
                <p className="mt-1 text-muted-foreground italic">
                  Nota interna: {log.observation}
                </p>
              )}

              <p className="mt-1 text-xs text-muted-foreground">
                {log.actor_name ? `Por ${log.actor_name} - ` : ""}
                {formatDisplayDateTime(log.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
