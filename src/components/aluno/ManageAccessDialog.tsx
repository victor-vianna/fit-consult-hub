import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pause, ShieldAlert, Unlock, AlertCircle } from "lucide-react";
import {
  AccessMotivo,
  AccessStatus,
  MENSAGENS_PADRAO,
  MOTIVO_LABELS,
} from "@/hooks/useStudentAccess";

type Acao = "pausar" | "suspender" | "reativar";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentName: string;
  status: AccessStatus;
  isMutating: boolean;
  onConfirm: (params: {
    acao: Acao;
    motivo?: AccessMotivo;
    mensagemAluno?: string;
    observacao?: string;
  }) => Promise<void> | void;
}

const PAUSAR_MOTIVOS: AccessMotivo[] = ["ferias", "lesao", "viagem", "outro"];
const SUSPENDER_MOTIVOS: AccessMotivo[] = [
  "inadimplencia",
  "violacao",
  "outro",
];

export function ManageAccessDialog({
  open,
  onOpenChange,
  studentName,
  status,
  isMutating,
  onConfirm,
}: Props) {
  const [acao, setAcao] = useState<Acao | null>(null);
  const [motivo, setMotivo] = useState<AccessMotivo | "">("");
  const [mensagem, setMensagem] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (open) {
      setAcao(status === "ativo" ? null : "reativar");
      setMotivo("");
      setMensagem("");
      setObservacao("");
    }
  }, [open, status]);

  // Pré-preenche mensagem ao trocar motivo
  useEffect(() => {
    if (motivo && (acao === "pausar" || acao === "suspender")) {
      setMensagem(MENSAGENS_PADRAO[motivo] ?? "");
    }
  }, [motivo, acao]);

  const motivosDisponiveis =
    acao === "pausar" ? PAUSAR_MOTIVOS : acao === "suspender" ? SUSPENDER_MOTIVOS : [];

  const podeConfirmar =
    acao === "reativar" ||
    ((acao === "pausar" || acao === "suspender") && motivo !== "");

  async function handleConfirm() {
    if (!acao || !podeConfirmar) return;
    await onConfirm({
      acao,
      motivo: motivo || undefined,
      mensagemAluno: mensagem,
      observacao,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar acesso · {studentName}</DialogTitle>
          <DialogDescription>
            {status === "ativo"
              ? "Escolha a ação. O aluno verá a mensagem que você escrever na tela de bloqueio."
              : "Reative o acesso do aluno à plataforma."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seleção de ação (apenas se ativo) */}
          {status === "ativo" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAcao("pausar")}
                className={`p-4 rounded-lg border-2 text-left transition-all min-h-[44px] ${
                  acao === "pausar"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border hover:border-amber-500/50"
                }`}
              >
                <Pause className="h-5 w-5 mb-2 text-amber-600" />
                <div className="font-semibold text-sm">Pausar acesso</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pausa amigável (férias, lesão, viagem)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAcao("suspender")}
                className={`p-4 rounded-lg border-2 text-left transition-all min-h-[44px] ${
                  acao === "suspender"
                    ? "border-destructive bg-destructive/10"
                    : "border-border hover:border-destructive/50"
                }`}
              >
                <ShieldAlert className="h-5 w-5 mb-2 text-destructive" />
                <div className="font-semibold text-sm">Suspender acesso</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Inadimplência ou violação
                </div>
              </button>
            </div>
          )}

          {(acao === "pausar" || acao === "suspender") && (
            <>
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select
                  value={motivo}
                  onValueChange={(v) => setMotivo(v as AccessMotivo)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {motivosDisponiveis.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MOTIVO_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mensagem para o aluno</Label>
                <Textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Mensagem que o aluno verá na tela de bloqueio…"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Aparece na tela de acesso bloqueado do aluno.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Observação interna (opcional)</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Anotação visível só para você…"
                  rows={2}
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  O aluno será deslogado nas próximas tentativas e verá a tela de
                  acesso bloqueado com a mensagem acima.
                </span>
              </div>
            </>
          )}

          {acao === "reativar" && (
            <>
              <div className="p-4 rounded-lg border-2 border-green-500/50 bg-green-500/10">
                <Unlock className="h-5 w-5 mb-2 text-green-600" />
                <div className="font-semibold">Reativar acesso</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {studentName} voltará a acessar a plataforma normalmente.
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observação interna (opcional)</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex.: pagamento regularizado em 01/05"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMutating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!podeConfirmar || isMutating}
            variant={acao === "suspender" ? "destructive" : "default"}
          >
            {isMutating
              ? "Salvando…"
              : acao === "reativar"
              ? "Reativar acesso"
              : acao === "pausar"
              ? "Pausar acesso"
              : acao === "suspender"
              ? "Suspender acesso"
              : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
