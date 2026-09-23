import { useEffect, useState } from "react";
import { CalendarClock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeForInput, formatDisplayDateTime } from "@/utils/dateFormat";

type ReleaseOption = "24h" | "3d" | "7d" | "custom" | "indefinite";
type ReleaseReason = "partnership" | "payment_arrangement" | "courtesy" | "other";

const RELEASE_REASON_LABELS: Record<ReleaseReason, string> = {
  partnership: "Parceria / cortesia permanente",
  payment_arrangement: "Acordo de pagamento",
  courtesy: "Cortesia temporária",
  other: "Outro motivo",
};

function addDuration(option: "24h" | "3d" | "7d") {
  const date = new Date();
  const hours = option === "24h" ? 24 : option === "3d" ? 72 : 168;
  date.setHours(date.getHours() + hours);
  return date;
}

export interface ManualAccessReleaseInput {
  reasonCode: string;
  observation: string;
  manualReleaseUntil: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  isSubmitting: boolean;
  onConfirm: (input: ManualAccessReleaseInput) => Promise<void> | void;
}

export function ManualAccessReleaseDialog({
  open,
  onOpenChange,
  studentName,
  isSubmitting,
  onConfirm,
}: Props) {
  const { toast } = useToast();
  const [releaseOption, setReleaseOption] = useState<ReleaseOption>("7d");
  const [releaseReason, setReleaseReason] = useState<ReleaseReason>("payment_arrangement");
  const [customUntil, setCustomUntil] = useState(() =>
    formatDateTimeForInput(addDuration("7d"))
  );

  useEffect(() => {
    if (!open) return;
    setReleaseOption("7d");
    setReleaseReason("payment_arrangement");
    setCustomUntil(formatDateTimeForInput(addDuration("7d")));
  }, [open]);

  const handleConfirm = async () => {
    const until =
      releaseOption === "indefinite"
        ? null
        : releaseOption === "custom"
          ? new Date(customUntil)
          : addDuration(releaseOption);

    if (until && (!Number.isFinite(until.getTime()) || until.getTime() <= Date.now())) {
      toast({
        title: "Prazo inválido",
        description: "Escolha uma data futura para liberar o acesso.",
        variant: "destructive",
      });
      return;
    }

    const reasonCode =
      releaseOption === "indefinite"
        ? `manual_indefinite_${releaseReason}`
        : `manual_temporary_${releaseReason}`;
    const reasonLabel = RELEASE_REASON_LABELS[releaseReason];
    const observation = until
      ? `Liberação até ${formatDisplayDateTime(until)}. Motivo: ${reasonLabel}. Pendência financeira mantida quando existir.`
      : `Liberação sem prazo. Motivo: ${reasonLabel}. Pendência financeira mantida quando existir.`;

    await onConfirm({
      reasonCode,
      observation,
      manualReleaseUntil: until?.toISOString() ?? null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Liberar acesso sem pagamento</DialogTitle>
          <DialogDescription>
            {studentName} poderá acessar pelo período escolhido. Nenhum pagamento será criado e a
            situação financeira continuará visível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>Duração da liberação</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["24h", "24 horas"],
                ["3d", "3 dias"],
                ["7d", "7 dias"],
              ] as const).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={releaseOption === value ? "default" : "outline"}
                  onClick={() => setReleaseOption(value)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <Button
              type="button"
              variant={releaseOption === "custom" ? "default" : "outline"}
              className="w-full justify-start gap-2"
              onClick={() => setReleaseOption("custom")}
            >
              <CalendarClock className="h-4 w-4" />
              Data específica
            </Button>

            {releaseOption === "custom" && (
              <Input
                type="datetime-local"
                value={customUntil}
                min={formatDateTimeForInput(new Date())}
                onChange={(event) => setCustomUntil(event.target.value)}
              />
            )}

            <Button
              type="button"
              variant={releaseOption === "indefinite" ? "default" : "outline"}
              className="w-full justify-start gap-2"
              onClick={() => setReleaseOption("indefinite")}
            >
              <Unlock className="h-4 w-4" />
              Sem prazo definido
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Motivo da liberação</Label>
            <Select
              value={releaseReason}
              onValueChange={(value) => setReleaseReason(value as ReleaseReason)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RELEASE_REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Liberando..." : "Confirmar liberação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
