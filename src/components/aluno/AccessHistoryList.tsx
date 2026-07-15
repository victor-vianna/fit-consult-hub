import { AccessLogWithAuthor } from "@/hooks/useStudentAccess";
import { formatDisplayDateTime } from "@/utils/dateFormat";

interface Props {
  logs: AccessLogWithAuthor[];
  limit?: number;
}

function getReadableDescription(log: AccessLogWithAuthor) {
  if (log.source === "payment" && log.effect === "allow") {
    return "Pagamento aprovado e vigente";
  }

  if (
    log.source === "payment" ||
    log.event_type === "payment_block" ||
    log.reason_code === "payment_required" ||
    log.reason_code === "payment_expired" ||
    log.reason_code === "payment_pending"
  ) {
    return "Acesso bloqueado por pagamento pendente";
  }

  if (log.event_type === "manual_release" || log.effect === "allow") {
    return "Acesso liberado manualmente";
  }

  if (log.event_type === "manual_pause") {
    return "Acesso pausado manualmente";
  }

  if (log.event_type === "manual_suspend" || log.effect === "block") {
    return "Acesso suspenso manualmente";
  }

  return "Atualizacao de acesso registrada";
}

function getActorLabel(log: AccessLogWithAuthor) {
  if (log.actor_name) return `Por ${log.actor_name}`;
  if (log.source === "payment") return "Automatico";
  return "Sistema";
}

export function AccessHistoryList({ logs, limit }: Props) {
  const items = limit ? logs.slice(0, limit) : logs;

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma alteracao de acesso registrada ainda.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((log) => {
        const isBlock = log.effect === "block";
        return (
          <li key={log.id} className="flex gap-3 py-4 text-sm">
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                isBlock ? "bg-red-500" : "bg-green-500"
              }`}
            />
            <div className="min-w-0">
              <p className="font-medium text-foreground">{getReadableDescription(log)}</p>
              <p className="mt-1 text-muted-foreground">
                {getActorLabel(log)} - {formatDisplayDateTime(log.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
