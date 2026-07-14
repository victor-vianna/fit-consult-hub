import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Lock,
  MoreHorizontal,
  Pause,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { StudentAccessState } from "@/hooks/useStudentAccess";
import { cn } from "@/lib/utils";
import { formatDateTimeForInput, formatDisplayDateTime } from "@/utils/dateFormat";

interface StudentSummary {
  id: string;
  nome: string;
  telefone?: string | null;
}

interface Props {
  student: StudentSummary;
  personalId: string;
  accessState?: StudentAccessState | null;
  onChanged?: () => void;
}

const STATUS_META = {
  ativo: {
    label: "Liberado",
    icon: CheckCircle2,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  pagamento_pendente: {
    label: "Bloqueado por pagamento",
    icon: CreditCard,
    className: "border-amber-500/45 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  suspenso: {
    label: "Suspenso",
    icon: ShieldAlert,
    className: "border-destructive/45 bg-destructive/10 text-destructive",
  },
  pausado: {
    label: "Pausado",
    icon: Pause,
    className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
} as const;

type ReleaseOption = "24h" | "3d" | "7d" | "custom";

function addDuration(option: Exclude<ReleaseOption, "custom">) {
  const now = new Date();
  const hours = option === "24h" ? 24 : option === "3d" ? 72 : 168;
  now.setHours(now.getHours() + hours);
  return now;
}

function toDatetimeLocal(date: Date) {
  return formatDateTimeForInput(date);
}

function formatUntil(value?: string | null) {
  if (!value) return null;
  return formatDisplayDateTime(value);
}

export function QuickStudentAccessActions({
  student,
  personalId,
  accessState,
  onChanged,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tempDialogOpen, setTempDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [openCreateSignal, setOpenCreateSignal] = useState(0);
  const [releaseOption, setReleaseOption] = useState<ReleaseOption>("24h");
  const [customUntil, setCustomUntil] = useState(() => toDatetimeLocal(addDuration("24h")));

  const state = accessState;
  const status = state?.status ?? "ativo";
  const meta = STATUS_META[status as keyof typeof STATUS_META] ?? STATUS_META.ativo;
  const StatusIcon = meta.icon;
  const temporaryUntil = state?.manual_release_until;
  const hasTemporaryRelease =
    !!temporaryUntil &&
    state?.allowed === true &&
    new Date(temporaryUntil).getTime() > Date.now();
  const hasFinancialPending =
    !!state?.payment_required && !state?.has_active_payment;

  const releaseCopy = useMemo(() => {
    if (hasFinancialPending) {
      return {
        title: "Liberar manualmente?",
        description:
          "Esta acao libera o aluno sem dar baixa financeira. A pendencia continua visivel no card e no historico.",
        observation: "Liberacao manual emergencial sem baixa financeira.",
      };
    }

    return {
      title: "Liberar acesso?",
      description: "Esta acao remove uma pausa ou suspensao manual e libera o acesso do aluno.",
      observation: "Acesso liberado manualmente pela lista de alunos.",
    };
  }, [hasFinancialPending]);

  const accessMutation = useMutation({
    mutationFn: async (params: {
      eventType: "manual_release" | "manual_suspend";
      reasonCode?: string | null;
      message?: string | null;
      observation?: string | null;
      manualReleaseUntil?: string | null;
    }) => {
      const payload: Record<string, string | null> = {
        _student_id: student.id,
        _event_type: params.eventType,
        _reason_code: params.reasonCode ?? null,
        _message_aluno: params.message ?? null,
        _observation: params.observation ?? null,
      };

      if (params.manualReleaseUntil) {
        payload._manual_release_until = params.manualReleaseUntil;
      }

      const { error } = await (supabase as any).rpc("register_student_access_event", {
        ...payload,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students-access-states", personalId] }),
        queryClient.invalidateQueries({ queryKey: ["student-access-state", student.id] }),
        queryClient.invalidateQueries({ queryKey: ["student-access-events", student.id] }),
        queryClient.invalidateQueries({ queryKey: ["alunos", personalId] }),
      ]);
      onChanged?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar acesso",
        description: error?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleTemporaryRelease = async () => {
    const until =
      releaseOption === "custom"
        ? new Date(customUntil)
        : addDuration(releaseOption);

    if (!Number.isFinite(until.getTime()) || until.getTime() <= Date.now()) {
      toast({
        title: "Prazo invalido",
        description: "Escolha uma data futura para a liberacao temporaria.",
        variant: "destructive",
      });
      return;
    }

    await accessMutation.mutateAsync({
      eventType: "manual_release",
      reasonCode: "manual_temporary_release",
      observation: `Liberacao temporaria ate ${formatDisplayDateTime(until)}. Pendencia financeira mantida quando existir.`,
      manualReleaseUntil: until.toISOString(),
    });
    setTempDialogOpen(false);
    toast({ title: "Acesso liberado temporariamente" });
  };

  const handleManualRelease = async () => {
    await accessMutation.mutateAsync({
      eventType: "manual_release",
      reasonCode: "manual_release",
      observation: releaseCopy.observation,
    });
    setReleaseDialogOpen(false);
    toast({ title: "Acesso liberado" });
  };

  const handleBlock = async () => {
    await accessMutation.mutateAsync({
      eventType: "manual_suspend",
      reasonCode: "outro",
      message: "Seu acesso foi temporariamente suspenso. Entre em contato com seu personal trainer.",
      observation: "Bloqueio rapido executado pela lista de alunos.",
    });
    setBlockDialogOpen(false);
    toast({ title: "Acesso bloqueado" });
  };

  return (
    <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn("gap-1.5 border px-2 py-1 text-[11px]", meta.className)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {meta.label}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Acoes rapidas de acesso">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Acoes rapidas</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setReleaseDialogOpen(true)}>
              <Unlock className="mr-2 h-4 w-4" />
              {hasFinancialPending ? "Liberar manualmente" : "Liberar acesso"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTempDialogOpen(true)}>
              <Clock3 className="mr-2 h-4 w-4" />
              Liberar temporariamente
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setBlockDialogOpen(true)} className="text-destructive focus:text-destructive">
              <Lock className="mr-2 h-4 w-4" />
              Bloquear
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setPaymentDialogOpen(true);
                setOpenCreateSignal((value) => value + 1);
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Registrar pagamento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasTemporaryRelease && (
        <div className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Liberado ate {formatUntil(temporaryUntil)}. Baixa financeira ainda pendente.
          </span>
        </div>
      )}

      <Dialog open={tempDialogOpen} onOpenChange={setTempDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Liberar temporariamente</DialogTitle>
            <DialogDescription>
              {student.nome} acessa ate o prazo escolhido. A pendencia financeira continua registrada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            {[
              ["24h", "24 horas"],
              ["3d", "3 dias"],
              ["7d", "7 dias"],
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={releaseOption === value ? "default" : "outline"}
                onClick={() => setReleaseOption(value as ReleaseOption)}
              >
                {label}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant={releaseOption === "custom" ? "default" : "outline"}
            className="justify-start gap-2"
            onClick={() => setReleaseOption("custom")}
          >
            <CalendarClock className="h-4 w-4" />
            Data especifica
          </Button>

          {releaseOption === "custom" && (
            <Input
              type="datetime-local"
              value={customUntil}
              min={toDatetimeLocal(new Date())}
              onChange={(event) => setCustomUntil(event.target.value)}
            />
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setTempDialogOpen(false)} disabled={accessMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleTemporaryRelease} disabled={accessMutation.isPending}>
              Liberar temporariamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{releaseCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{releaseCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accessMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleManualRelease} disabled={accessMutation.isPending}>
              Confirmar liberacao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear acesso de {student.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              O aluno perdera o acesso imediatamente. Esta acao fica registrada no historico de acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accessMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={accessMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Bloquear agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              Dar baixa ou criar assinatura para {student.nome}.
            </DialogDescription>
          </DialogHeader>
          <SubscriptionManager
            studentId={student.id}
            personalId={personalId}
            studentName={student.nome}
            embedded
            createButtonLabel="Nova baixa"
            openCreateSignal={openCreateSignal}
            onChanged={() => {
              queryClient.invalidateQueries({ queryKey: ["students-access-states", personalId] });
              queryClient.invalidateQueries({ queryKey: ["alunos", personalId] });
              onChanged?.();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
