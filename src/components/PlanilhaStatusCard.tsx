import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { cn } from "@/lib/utils";

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
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-5 w-5" />
              <span className="text-sm">Sem planilha ativa</span>
            </div>
            <Button size="sm" onClick={() => setShowNovaDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Planilha
            </Button>
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
      </Card>
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

  return (
    <>
      <Card className={cn("border", config.borderColor)}>
        <CardHeader className={cn("pb-2", config.bgColor)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className={cn("h-5 w-5", config.color)} />
              <CardTitle className="text-base">{planilha.nome}</CardTitle>
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
                {format(parseISO(planilha.data_inicio), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </span>
              <span>
                {format(parseISO(planilha.data_prevista_fim), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{diasRestantes} dias restantes</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{planilha.duracao_semanas} semanas</span>
            </div>
          </div>

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

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setFormData({
                      nome: planilha.nome,
                      duracaoSemanas: planilha.duracao_semanas.toString(),
                      observacoes: "",
                    });
                    setShowRenovarDialog(true);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Renovar
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
    </>
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
            {isRenovacao ? "Renovar Planilha" : "Nova Planilha"}
          </DialogTitle>
          <DialogDescription>
            {isRenovacao
              ? "Configure a nova fase de treino do aluno"
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
            {isLoading ? "Salvando..." : isRenovacao ? "Renovar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
