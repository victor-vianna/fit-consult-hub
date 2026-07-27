import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CreditCard, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ManualPaymentMethod,
  PaymentOrigin,
  useSubscriptions,
} from "@/hooks/useSubscriptions";
import { Plano, usePersonalPlanPrices } from "@/hooks/usePersonalPlanPrices";
import { cn } from "@/lib/utils";
import {
  formatDateForInput,
  formatDisplayDateOnly,
  parseDateInputValue,
} from "@/utils/dateFormat";

const PLANOS: Array<{ value: Plano; label: string; meses: number }> = [
  { value: "mensal", label: "Mensal", meses: 1 },
  { value: "trimestral", label: "Trimestral", meses: 3 },
  { value: "semestral", label: "Semestral", meses: 6 },
  { value: "anual", label: "Anual", meses: 12 },
];

const MANUAL_METHODS: Array<{ value: ManualPaymentMethod; label: string }> = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferencia" },
  { value: "outro", label: "Outro" },
];

function calculateExpirationDate(plano: Plano, paymentDate: string) {
  const baseDate = parseDateInputValue(paymentDate);
  if (!baseDate) return null;

  const expiration = new Date(baseDate);
  const months = PLANOS.find((item) => item.value === plano)?.meses ?? 1;
  expiration.setMonth(expiration.getMonth() + months);
  return expiration;
}

function formatMoneyInput(value: number) {
  return Number.isFinite(value) && value > 0 ? value.toFixed(2) : "";
}

interface RegisterPaymentFormProps {
  studentId: string;
  personalId: string;
  studentName: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function RegisterPaymentForm({
  studentId,
  personalId,
  studentName,
  onCancel,
  onSuccess,
}: RegisterPaymentFormProps) {
  const { createPaidSubscription } = useSubscriptions(studentId, personalId);
  const { data: planPrices } = usePersonalPlanPrices(personalId);
  const [plano, setPlano] = useState<Plano>("mensal");
  const [valor, setValor] = useState("");
  const [dataPagamento, setDataPagamento] = useState(formatDateForInput(new Date()));
  const [origemPagamento, setOrigemPagamento] = useState<PaymentOrigin>("manual");
  const [metodoManual, setMetodoManual] = useState<ManualPaymentMethod>("pix");
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getPlanValue = (targetPlan: Plano) =>
    Number(planPrices?.find((price) => price.plano === targetPlan)?.valor ?? 0);

  useEffect(() => {
    if (!valor) {
      setValor(formatMoneyInput(getPlanValue(plano)));
    }
  }, [planPrices, plano, valor]);

  const expirationDate = useMemo(
    () => calculateExpirationDate(plano, dataPagamento),
    [plano, dataPagamento],
  );

  const handlePlanChange = (value: Plano) => {
    setPlano(value);
    setValor(formatMoneyInput(getPlanValue(value)));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const numericValue = Number(valor);
    if (!Number.isFinite(numericValue) || numericValue <= 0 || !expirationDate) return;

    setSubmitting(true);
    try {
      await createPaidSubscription({
        plano,
        valor: numericValue,
        data_pagamento: dataPagamento,
        origem_pagamento: origemPagamento,
        metodo_pagamento: origemPagamento === "manual" ? metodoManual : "stripe",
        observacoes: observacoes || undefined,
      });
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled =
    submitting ||
    !studentId ||
    !valor ||
    !expirationDate ||
    (origemPagamento === "manual" && !metodoManual);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="register-payment-plan">Plano</Label>
          <Select value={plano} onValueChange={(value) => handlePlanChange(value as Plano)}>
            <SelectTrigger id="register-payment-plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANOS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-payment-value">Valor (R$)</Label>
          <Input
            id="register-payment-value"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-payment-date">Data do pagamento</Label>
          <Input
            id="register-payment-date"
            type="date"
            value={dataPagamento}
            onChange={(event) => setDataPagamento(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Data de vencimento</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">
            {expirationDate ? formatDisplayDateOnly(expirationDate) : "-"}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Origem do pagamento</Label>
        <RadioGroup
          value={origemPagamento}
          onValueChange={(value) => setOrigemPagamento(value as PaymentOrigin)}
          className="grid gap-3 md:grid-cols-2"
        >
          <Label
            htmlFor="payment-origin-stripe"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
              origemPagamento === "stripe"
                ? "border-primary bg-primary/10"
                : "hover:bg-muted/60",
            )}
          >
            <RadioGroupItem id="payment-origin-stripe" value="stripe" className="mt-1" />
            <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
            <span className="min-w-0">
              <span className="block font-semibold">Pago pela plataforma (Stripe)</span>
              <span className="block text-xs font-normal text-muted-foreground">
                PIX, cartao ou boleto processado pela Stripe.
              </span>
            </span>
          </Label>

          <Label
            htmlFor="payment-origin-manual"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
              origemPagamento === "manual"
                ? "border-primary bg-primary/10"
                : "hover:bg-muted/60",
            )}
          >
            <RadioGroupItem id="payment-origin-manual" value="manual" className="mt-1" />
            <FileText className="mt-0.5 h-5 w-5 text-primary" />
            <span className="min-w-0">
              <span className="block font-semibold">Registrado manualmente</span>
              <span className="block text-xs font-normal text-muted-foreground">
                PIX direto, dinheiro, transferencia ou outro meio externo.
              </span>
            </span>
          </Label>
        </RadioGroup>
      </div>

      {origemPagamento === "manual" && (
        <div className="space-y-2">
          <Label>Metodo de pagamento manual</Label>
          <Select
            value={metodoManual}
            onValueChange={(value) => setMetodoManual(value as ManualPaymentMethod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_METHODS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="register-payment-notes">Observacao opcional</Label>
        <Textarea
          id="register-payment-notes"
          value={observacoes}
          onChange={(event) => setObservacoes(event.target.value)}
          placeholder="Observacoes sobre este recebimento"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={submitDisabled}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar pagamento
        </Button>
      </div>
    </div>
  );
}

interface RegisterPaymentDialogProps extends RegisterPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
}

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  trigger,
  onSuccess,
  ...formProps
}: RegisterPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            Registre um pagamento ja recebido para {formProps.studentName}.
          </DialogDescription>
        </DialogHeader>
        <RegisterPaymentForm
          {...formProps}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => {
            onSuccess?.();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
