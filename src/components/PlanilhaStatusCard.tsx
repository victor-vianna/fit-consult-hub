import { useState } from "react";
import {
  ClipboardList,
  Calendar,
  Clock,
  RefreshCw,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Copy,
  History,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { usePlanilhaAtiva } from "@/hooks/usePlanilhaAtiva";
import { CicloTreinoFields } from "@/components/CicloTreinoFields";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/utils/dateFormat";

interface PlanilhaStatusCardProps {
  profileId: string;
  personalId: string;
  variant?: "aluno" | "personal";
  compact?: boolean;
}

export function PlanilhaStatusCard({
  profileId,
  personalId,
  variant = "aluno",
  compact = false,
}: PlanilhaStatusCardProps) {
  const {
    planilha,
    historico,
    loading,
    diasRestantes,
    diasTotais,
    percentualConcluido,
    status,
    criarPlanilha,
    renovarPlanilha,
    encerrarPlanilha,
    sincronizarTreinos,
    importarTreinosUltimaSemana,
    isCriando,
    isRenovando,
    isEncerrando,
    isSincronizando,
    isImportandoUltimaSemana,
  } = usePlanilhaAtiva({ profileId, personalId });

  const [showNovaDialog, setShowNovaDialog] = useState(false);
  const [showRenovarDialog, setShowRenovarDialog] = useState(false);
  const [showHistoricoDialog, setShowHistoricoDialog] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    duracaoSemanas: "4",
    observacoes: "",
  });

  const handleCriar = () => {
    criarPlanilha({
      profileId,
      personalId,
      nome: formData.nome || undefined,
      duracaoSemanas: parseInt(formData.duracaoSemanas),
      observacoes: formData.observacoes || undefined,
    });
    setShowNovaDialog(false);
    setFormData({ nome: "", duracaoSemanas: "4", observacoes: "" });
  };

  const handleRenovar = () => {
    renovarPlanilha({
      nome: formData.nome || undefined,
      duracaoSemanas: parseInt(formData.duracaoSemanas),
      observacoes: formData.observacoes || undefined,
    });
    setShowRenovarDialog(false);
    setFormData({ nome: "", duracaoSemanas: "4", observacoes: "" });
  };

  const getStatusConfig = () => {
    switch (status) {
      case "expirada":
        return {
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/30",
          icon: AlertTriangle,
          label: "Expirada",
          badgeVariant: "destructive" as const,
        };
      case "critica":
        return {
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/30",
          icon: AlertTriangle,
          label: `${diasRestantes} dias`,
          badgeVariant: "destructive" as const,
        };
      case "expirando":
        return {
          color: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          icon: Clock,
          label: `${diasRestantes} dias`,
          badgeVariant: "secondary" as const,
        };
      case "ativa":
        return {
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950/30",
          borderColor: "border-green-200 dark:border-green-800",
          icon: CheckCircle2,
          label: `${diasRestantes} dias`,
          badgeVariant: "secondary" as const,
        };
      default:
        return {
          color: "text-muted-foreground",
          bgColor: "bg-muted/30",
          borderColor: "border-border",
          icon: ClipboardList,
          label: "Sem planilha",
          badgeVariant: "outline" as const,
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;
  const cicloAtualLabel = getCicloLabel(planilha);
  const cicloExpirado = status === "expirada";
  const cicloCritico = status === "critica";
  const precisaAcao = cicloExpirado || cicloCritico;

  const openRenovacaoDialog = () => {
    if (!planilha) return;

    setFormData({
      nome: planilha.nome,
      duracaoSemanas: planilha.duracao_semanas.toString(),
      observacoes: planilha.observacoes || "",
    });
    setShowRenovarDialog(true);
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Sem planilha ativa
  if (!planilha) {
    if (variant === "aluno") {
      return (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma planilha ativa</p>
            <p className="text-xs">Aguarde seu personal criar uma planilha</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-5 w-5" />
              <span className="text-sm">Sem planilha ativa</span>
            </div>
            <div className="flex gap-2">
              {historico.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowHistoricoDialog(true)}
                >
                  <History className="h-4 w-4 mr-1" />
                  Historico
                </Button>
              )}
              <Button size="sm" onClick={() => setShowNovaDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Planilha
              </Button>
            </div>
          </div>
        </CardContent>

        <NovaPlanilhaDialog
          open={showNovaDialog}
          onOpenChange={setShowNovaDialog}
          formData={formData}
          setFormData={setFormData}
          onConfirm={handleCriar}
          isLoading={isCriando}
        />
        <HistoricoCiclosDialog
          open={showHistoricoDialog}
          onOpenChange={setShowHistoricoDialog}
          historico={historico}
        />
      </Card>
      </>
    );
  }

  // Com planilha ativa
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          config.bgColor,
          config.borderColor
        )}
      >
        <StatusIcon className={cn("h-5 w-5", config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{planilha.nome}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{diasRestantes} dias restantes</span>
            <span>•</span>
            <span>{percentualConcluido}%</span>
          </div>
        </div>
        <Progress value={percentualConcluido} className="w-16 h-1.5" />
      </div>
    );
  }

  if (variant === "personal") {
    return (
      <>
        <div className="space-y-4">
          {precisaAcao && (
            <div className="flex flex-col gap-3 rounded-lg border border-red-400/70 bg-red-950/80 p-4 text-red-50 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-200" />
                <div>
                  <p className="font-semibold">
                    {cicloExpirado
                      ? "Ciclo expirado - renovacao pendente"
                      : "Ciclo perto do fim - prepare a renovacao"}
                  </p>
                  <p className="text-sm font-medium text-red-100">
                    Progresso {percentualConcluido}% concluido, {diasRestantes} dias restantes desde{" "}
                    {formatDisplayDate(planilha.data_prevista_fim)}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-red-100 text-red-950 hover:bg-white"
                onClick={openRenovacaoDialog}
              >
                Renovar agora
              </Button>
            </div>
          )}

          <Card
            className={cn(
              "border bg-card",
              precisaAcao ? "border-destructive/40" : config.borderColor
            )}
          >
            <CardContent className="space-y-5 p-4">
              <CicloTreinoFields
                planilhaId={planilha.id}
                personalId={personalId}
                initialValues={{
                  ciclo_genero: (planilha as any).ciclo_genero,
                  ciclo_modalidade: (planilha as any).ciclo_modalidade,
                  ciclo_nivel: (planilha as any).ciclo_nivel,
                  ciclo_numero: (planilha as any).ciclo_numero,
                }}
              />

              <CycleProgressPanel
                planilha={planilha}
                percentualConcluido={percentualConcluido}
                diasRestantes={diasRestantes}
                status={status}
              />
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/75">
              Acoes de rotina
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <ActionCard
                icon={RotateCcw}
                title={isSincronizando ? "Sincronizando..." : "Sincronizar treinos"}
                description="Replica semana atual"
                onClick={() => sincronizarTreinos()}
                disabled={isSincronizando}
              />
              <ActionCard
                icon={Copy}
                title={isImportandoUltimaSemana ? "Importando..." : "Importar ultima semana"}
                description="Copia treino anterior"
                onClick={() => importarTreinosUltimaSemana()}
                disabled={isImportandoUltimaSemana}
              />
              <ActionCard
                icon={History}
                title="Historico de ciclos"
                description="Vigencias aplicadas"
                onClick={() => setShowHistoricoDialog(true)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
              Acoes criticas
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <ActionCard
                icon={RefreshCw}
                title="Marcar renovacao"
                description="Cria nova vigencia sem alterar treinos"
                onClick={openRenovacaoDialog}
                tone="danger"
              />
              <ActionCard
                icon={X}
                title={isEncerrando ? "Encerrando..." : "Encerrar ciclo"}
                description="Finaliza a planilha ativa"
                onClick={() => encerrarPlanilha()}
                disabled={isEncerrando}
                tone="danger"
              />
            </div>
          </div>
        </div>

        <NovaPlanilhaDialog
          open={showRenovarDialog}
          onOpenChange={setShowRenovarDialog}
          formData={formData}
          setFormData={setFormData}
          onConfirm={handleRenovar}
          isLoading={isRenovando}
          isRenovacao
        />

        <NovaPlanilhaDialog
          open={showNovaDialog}
          onOpenChange={setShowNovaDialog}
          formData={formData}
          setFormData={setFormData}
          onConfirm={handleCriar}
          isLoading={isCriando}
        />

        <HistoricoCiclosDialog
          open={showHistoricoDialog}
          onOpenChange={setShowHistoricoDialog}
          historico={historico}
          activeId={planilha.id}
        />
      </>
    );
  }

  return (
    <>
      <Card className={cn("border", config.borderColor)}>
        <CardHeader className={cn("pb-2", config.bgColor)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className={cn("h-5 w-5", config.color)} />
              <div>
                <CardTitle className="text-base">{planilha.nome}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cicloAtualLabel}
                </p>
              </div>
            </div>
            <Badge variant={config.badgeVariant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{percentualConcluido}%</span>
            </div>
            <Progress value={percentualConcluido} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {formatDisplayDate(planilha.data_inicio)}
              </span>
              <span>
                {formatDisplayDate(planilha.data_prevista_fim)}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{diasRestantes} dias restantes</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{planilha.duracao_semanas} semanas</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span className="truncate">{cicloAtualLabel}</span>
            </div>
          </div>

          {/* Ciclo de Treino (somente personal) */}
          {variant === "personal" && (
            <CicloTreinoFields
              planilhaId={planilha.id}
              personalId={personalId}
              initialValues={{
                ciclo_genero: (planilha as any).ciclo_genero,
                ciclo_modalidade: (planilha as any).ciclo_modalidade,
                ciclo_nivel: (planilha as any).ciclo_nivel,
                ciclo_numero: (planilha as any).ciclo_numero,
              }}
            />
          )}

          {/* Ações (somente personal) */}
          {variant === "personal" && (
            <div className="space-y-2 pt-2 border-t">
              {/* Botão de sincronização */}
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => sincronizarTreinos()}
                disabled={isSincronizando}
              >
                <RotateCcw className={cn("h-4 w-4 mr-1", isSincronizando && "animate-spin")} />
                {isSincronizando ? "Sincronizando..." : "Sincronizar Treinos"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Replica a semana atual para as demais semanas
              </p>

              {/* Botão de importar última semana */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => importarTreinosUltimaSemana()}
                disabled={isImportandoUltimaSemana}
              >
                <Copy className={cn("h-4 w-4 mr-1", isImportandoUltimaSemana && "animate-pulse")} />
                {isImportandoUltimaSemana
                  ? "Importando..."
                  : "Importar treino da última semana"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Copia o treino completo da semana anterior para a semana atual
              </p>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowHistoricoDialog(true)}
              >
                <History className="h-4 w-4 mr-1" />
                Historico de ciclos
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Veja as vigencias e ciclos ja aplicados para este aluno
              </p>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setFormData({
                      nome: planilha.nome,
                      duracaoSemanas: planilha.duracao_semanas.toString(),
                      observacoes: planilha.observacoes || "",
                    });
                    setShowRenovarDialog(true);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Marcar renovacao
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => encerrarPlanilha()}
                  disabled={isEncerrando}
                >
                  <X className="h-4 w-4 mr-1" />
                  Encerrar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Marcar renovacao registra uma nova vigencia mantendo o ciclo e sem alterar treinos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Renovar */}
      <NovaPlanilhaDialog
        open={showRenovarDialog}
        onOpenChange={setShowRenovarDialog}
        formData={formData}
        setFormData={setFormData}
        onConfirm={handleRenovar}
        isLoading={isRenovando}
        isRenovacao
      />

      {/* Dialog Nova (para criar após encerrar) */}
      <NovaPlanilhaDialog
        open={showNovaDialog}
        onOpenChange={setShowNovaDialog}
        formData={formData}
        setFormData={setFormData}
        onConfirm={handleCriar}
        isLoading={isCriando}
      />

      <HistoricoCiclosDialog
        open={showHistoricoDialog}
        onOpenChange={setShowHistoricoDialog}
        historico={historico}
        activeId={planilha.id}
      />
    </>
  );
}

function getCicloLabel(planilha?: any) {
  if (!planilha) return "Ciclo nao definido";

  const label = [
    planilha.ciclo_genero,
    planilha.ciclo_modalidade,
    planilha.ciclo_nivel,
    planilha.ciclo_numero ? `Ciclo ${planilha.ciclo_numero}` : "",
  ]
    .filter(Boolean)
    .join(" > ");

  return label || "Ciclo nao definido";
}

function formatPlanilhaDate(value?: string | null) {
  if (!value) return "--";

  try {
    return formatDisplayDate(value);
  } catch {
    return "--";
  }
}

function getHistoricoStatusLabel(status?: string) {
  if (status === "ativa") return "Ativa";
  if (status === "renovada") return "Renovada";
  if (status === "encerrada") return "Encerrada";
  return "Sem status";
}

function getHistoricoStatusVariant(status?: string) {
  if (status === "ativa") return "secondary" as const;
  if (status === "encerrada") return "outline" as const;
  return "default" as const;
}

function CycleProgressPanel({
  planilha,
  percentualConcluido,
  diasRestantes,
  status,
}: {
  planilha: any;
  percentualConcluido: number;
  diasRestantes: number;
  status: string;
}) {
  const expirado = status === "expirada";
  const critico = status === "critica";

  return (
    <div className="border-t pt-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-foreground/75">
        <span>{formatPlanilhaDate(planilha.data_inicio)}</span>
        <span>
          {formatPlanilhaDate(planilha.data_prevista_fim)} - {planilha.duracao_semanas} semanas
        </span>
      </div>
      <Progress
        value={percentualConcluido}
        className={cn(
          "h-2",
          expirado || critico
            ? "bg-red-950/60 [&>div]:bg-red-300"
            : "[&>div]:bg-primary"
        )}
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-foreground/75">
          Progresso {percentualConcluido}%
        </span>
        <span
          className={cn(
            "font-semibold",
            expirado || critico ? "text-red-300" : "text-foreground/75"
          )}
        >
          {diasRestantes} dias restantes
        </span>
      </div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: typeof RefreshCw;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-auto min-h-24 justify-start rounded-lg border-muted-foreground/35 bg-card/80 p-4 text-left hover:border-muted-foreground/60 hover:bg-muted/50",
        tone === "danger" &&
          "border-red-400/75 bg-red-950/45 text-red-50 hover:border-red-300 hover:bg-red-900/60 hover:text-white"
      )}
    >
      <div className="flex flex-col items-start gap-2">
        <Icon className="h-5 w-5" />
        <div>
          <p className="font-semibold leading-tight">{title}</p>
          <p
            className={cn(
              "mt-1 text-xs font-normal",
              tone === "danger" ? "text-red-100/90" : "text-foreground/70"
            )}
          >
            {description}
          </p>
        </div>
      </div>
    </Button>
  );
}

function HistoricoCiclosDialog({
  open,
  onOpenChange,
  historico,
  activeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historico: any[];
  activeId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historico de ciclos</DialogTitle>
          <DialogDescription>
            Consulte as vigencias de treino aplicadas e o ciclo registrado em cada uma.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {historico.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum ciclo registrado para este aluno.
            </div>
          ) : (
            historico.map((item) => {
              const isActive = item.id === activeId || item.status === "ativa";
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-lg border p-4",
                    isActive && "border-primary/40 bg-primary/5"
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{getCicloLabel(item)}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.nome || "Planilha de treino"}
                      </p>
                    </div>
                    <Badge variant={getHistoricoStatusVariant(item.status)}>
                      {getHistoricoStatusLabel(item.status)}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>Inicio: {formatPlanilhaDate(item.data_inicio)}</span>
                    <span>Fim: {formatPlanilhaDate(item.data_prevista_fim)}</span>
                    <span>{item.duracao_semanas || 0} semanas</span>
                  </div>

                  {item.observacoes && (
                    <p className="mt-3 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                      {item.observacoes}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog reutilizável
function NovaPlanilhaDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onConfirm,
  isLoading,
  isRenovacao = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: { nome: string; duracaoSemanas: string; observacoes: string };
  setFormData: (data: {
    nome: string;
    duracaoSemanas: string;
    observacoes: string;
  }) => void;
  onConfirm: () => void;
  isLoading: boolean;
  isRenovacao?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isRenovacao ? "Marcar renovacao" : "Nova Planilha"}
          </DialogTitle>
          <DialogDescription>
            {isRenovacao
              ? "Registre uma nova vigencia sem alterar treinos ou apagar o ciclo atual."
              : "Crie uma nova planilha de treino para o aluno"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da planilha</Label>
            <Input
              id="nome"
              placeholder="Ex: Hipertrofia - Fase 1"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duracao">Duração</Label>
            <Select
              value={formData.duracaoSemanas}
              onValueChange={(value) =>
                setFormData({ ...formData, duracaoSemanas: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a duração" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 semanas</SelectItem>
                <SelectItem value="4">4 semanas</SelectItem>
                <SelectItem value="6">6 semanas</SelectItem>
                <SelectItem value="8">8 semanas</SelectItem>
                <SelectItem value="12">12 semanas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Notas sobre a planilha..."
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Salvando..." : isRenovacao ? "Marcar renovacao" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
