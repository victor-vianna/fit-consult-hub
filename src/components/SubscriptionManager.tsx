import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CreditCard,
  Plus,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  DollarSign,
} from "lucide-react";

interface SubscriptionManagerProps {
  studentId: string;
  personalId: string;
  studentName: string;
}

const PLANOS = [
  { value: "mensal", label: "Mensal", meses: 1 },
  { value: "trimestral", label: "Trimestral", meses: 3 },
  { value: "semestral", label: "Semestral", meses: 6 },
  { value: "anual", label: "Anual", meses: 12 },
];

export function SubscriptionManager({
  studentId,
  personalId,
  studentName,
}: SubscriptionManagerProps) {
  const {
    subscriptions,
    loading,
    createSubscription,
    registerPayment,
    deleteSubscription,
    getActiveSubscription,
  } = useSubscriptions(studentId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<string>("");

  // Form states
  const [plano, setPlano] = useState<string>("mensal");
  const [valor, setValor] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [observacoes, setObservacoes] = useState<string>("");

  // Payment form states
  const [valorPagamento, setValorPagamento] = useState<string>("");
  const [dataPagamento, setDataPagamento] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [metodoPagamento, setMetodoPagamento] = useState<string>("");
  const [observacoesPagamento, setObservacoesPagamento] = useState<string>("");

  const handleCreateSubscription = async () => {
    if (!valor || !plano) return;

    const dataExpiracao = new Date(dataInicio);
    const meses = PLANOS.find((p) => p.value === plano)?.meses || 1;
    dataExpiracao.setMonth(dataExpiracao.getMonth() + meses);

    await createSubscription({
      student_id: studentId,
      personal_id: personalId,
      plano: plano as any,
      valor: parseFloat(valor),
      data_pagamento: null,
      data_expiracao: dataExpiracao.toISOString(),
      observacoes: observacoes || null,
    });

    // Reset form
    setPlano("mensal");
    setValor("");
    setObservacoes("");
    setDialogOpen(false);
  };

  const handleRegisterPayment = async () => {
    if (!selectedSubscription || !valorPagamento) return;

    await registerPayment(selectedSubscription, {
      valor: parseFloat(valorPagamento),
      data_pagamento: dataPagamento,
      metodo_pagamento: metodoPagamento || undefined,
      observacoes: observacoesPagamento || undefined,
    });

    // Reset form
    setValorPagamento("");
    setMetodoPagamento("");
    setObservacoesPagamento("");
    setPaymentDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pago
          </Badge>
        );
      case "pendente":
        return (
          <Badge className="bg-yellow-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "atrasado":
        return (
          <Badge className="bg-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            Atrasado
          </Badge>
        );
      default:
        return null;
    }
  };

  const activeSubscription = getActiveSubscription();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Status Atual */}
      {activeSubscription && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Plano Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plano:</span>
              <span className="font-semibold capitalize">
                {activeSubscription.plano}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-semibold">
                R$ {activeSubscription.valor.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expira em:</span>
              <span className="font-semibold">
                {format(
                  new Date(activeSubscription.data_expiracao),
                  "dd/MM/yyyy",
                  { locale: ptBR }
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Nova Assinatura */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Nova Assinatura
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Assinatura</DialogTitle>
            <DialogDescription>
              Criar assinatura para {studentName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="plano">Plano</Label>
              <Select value={plano} onValueChange={setPlano}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANOS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="dataInicio">Data de Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubscription}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de Assinaturas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Assinaturas</CardTitle>
          <CardDescription>
            Todas as assinaturas de {studentName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold capitalize">
                          {sub.plano}
                        </span>
                        {getStatusBadge(sub.status_pagamento)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        R$ {sub.valor.toFixed(2)}
                      </p>
                    </div>
                    {sub.status_pagamento !== "pago" && (
                      <Dialog
                        open={
                          paymentDialogOpen && selectedSubscription === sub.id
                        }
                        onOpenChange={(open) => {
                          setPaymentDialogOpen(open);
                          if (open) {
                            setSelectedSubscription(sub.id);
                            setValorPagamento(sub.valor.toString());
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Registrar Pagamento
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Registrar Pagamento</DialogTitle>
                            <DialogDescription>
                              Registrar pagamento da assinatura {sub.plano}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="valorPagamento">Valor (R$)</Label>
                              <Input
                                id="valorPagamento"
                                type="number"
                                step="0.01"
                                value={valorPagamento}
                                onChange={(e) =>
                                  setValorPagamento(e.target.value)
                                }
                              />
                            </div>

                            <div>
                              <Label htmlFor="dataPagamento">
                                Data do Pagamento
                              </Label>
                              <Input
                                id="dataPagamento"
                                type="date"
                                value={dataPagamento}
                                onChange={(e) =>
                                  setDataPagamento(e.target.value)
                                }
                              />
                            </div>

                            <div>
                              <Label htmlFor="metodoPagamento">
                                Método de Pagamento
                              </Label>
                              <Select
                                value={metodoPagamento}
                                onValueChange={setMetodoPagamento}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="cartao">
                                    Cartão de Crédito
                                  </SelectItem>
                                  <SelectItem value="boleto">Boleto</SelectItem>
                                  <SelectItem value="dinheiro">
                                    Dinheiro
                                  </SelectItem>
                                  <SelectItem value="transferencia">
                                    Transferência
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="observacoesPagamento">
                                Observações
                              </Label>
                              <Textarea
                                id="observacoesPagamento"
                                value={observacoesPagamento}
                                onChange={(e) =>
                                  setObservacoesPagamento(e.target.value)
                                }
                                placeholder="Observações sobre o pagamento..."
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setPaymentDialogOpen(false)}
                            >
                              Cancelar
                            </Button>
                            <Button onClick={handleRegisterPayment}>
                              Confirmar Pagamento
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  <div className="space-y-1 text-sm">
                    {sub.data_pagamento && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Pago em:{" "}
                        {format(new Date(sub.data_pagamento), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Expira em:{" "}
                      {format(new Date(sub.data_expiracao), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </div>
                    {sub.observacoes && (
                      <p className="text-muted-foreground italic">
                        {sub.observacoes}
                      </p>
                    )}
                  </div>

                  {sub.status_pagamento === "pendente" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-red-500"
                      onClick={() => deleteSubscription(sub.id)}
                    >
                      Remover
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {subscriptions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma assinatura registrada
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
