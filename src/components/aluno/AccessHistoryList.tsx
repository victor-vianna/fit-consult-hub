import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Clock } from "lucide-react";
import {
  AccessLogWithAuthor,
  AccessMotivo,
  MOTIVO_LABELS,
} from "@/hooks/useStudentAccess";
import { Badge } from "@/components/ui/badge";

interface Props {
  logs: AccessLogWithAuthor[];
  limit?: number;
}

export function AccessHistoryList({ logs, limit }: Props) {
  const items = limit ? logs.slice(0, limit) : logs;

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Nenhuma alteração de acesso registrada ainda.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((log) => {
        const motivoLabel = log.motivo
          ? MOTIVO_LABELS[log.motivo as AccessMotivo] ?? log.motivo
          : null;
        return (
          <li
            key={log.id}
            className="flex gap-3 p-3 rounded-md border bg-card text-sm"
          >
            <div className="flex flex-col items-center pt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={log.to_active ? "default" : "destructive"}
                  className="text-[10px]"
                >
                  {log.to_active ? "Ativado" : "Bloqueado"}
                </Badge>
                {motivoLabel && (
                  <Badge variant="secondary" className="text-[10px]">
                    {motivoLabel}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  {log.from_active === null
                    ? null
                    : (
                        <>
                          {log.from_active ? "Ativo" : "Bloqueado"}
                          <ArrowRight className="h-3 w-3" />
                          {log.to_active ? "Ativo" : "Bloqueado"}
                        </>
                      )}
                </span>
              </div>
              {log.mensagem_aluno && (
                <p className="mt-1 text-foreground">
                  <span className="text-muted-foreground">Mensagem ao aluno: </span>
                  {log.mensagem_aluno}
                </p>
              )}
              {log.observacao_personal && (
                <p className="mt-1 text-muted-foreground italic">
                  Nota interna: {log.observacao_personal}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {log.author_name ? `Por ${log.author_name} · ` : ""}
                {format(parseISO(log.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
