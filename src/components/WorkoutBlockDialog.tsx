import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, Sparkles, Info, Clock, Trash2, Edit, BookmarkPlus, User } from "lucide-react";
import {
  TipoBloco,
  PosicaoBloco,
  TipoCardio,
  ModalidadeCardio,
  UnidadeIntensidade,
  BlocoTreino,
  TIPOS_BLOCO,
  TEMPLATES_BLOCOS,
  formatarDuracao,
} from "@/types/workoutBlocks";
import { useBlocoTemplates, BlocoTemplate } from "@/hooks/useBlocoTemplates";

interface WorkoutBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (bloco: Partial<BlocoTreino>) => Promise<void>;
  blocoEditando?: Partial<BlocoTreino> | null;
  diaNome?: string;
  personalId?: string;
}

export function WorkoutBlockDialog({
  open,
  onOpenChange,
  onSave,
  blocoEditando,
  diaNome,
  personalId,
}: WorkoutBlockDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "template">("template");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<BlocoTemplate | null>(null);

  // Hook para templates do BD
  const { templates: meusTemplates, loading: loadingTemplates, deletarTemplate, isDeletando } = useBlocoTemplates({
    personalId: personalId || "",
    enabled: !!personalId,
  });

  // Estados do formulário
  const [tipo, setTipo] = useState<TipoBloco>(blocoEditando?.tipo ?? "cardio");
  const [posicao, setPosicao] = useState<PosicaoBloco>(
    blocoEditando?.posicao ?? "fim"
  );
  const [nome, setNome] = useState(blocoEditando?.nome ?? "");
  const [descricao, setDescricao] = useState(blocoEditando?.descricao ?? "");
  const [duracaoMinutos, setDuracaoMinutos] = useState(
    blocoEditando?.duracao_estimada_minutos ?? 10
  );
  const [obrigatorio, setObrigatorio] = useState(
    blocoEditando?.obrigatorio ?? false
  );

  // Estados específicos para CARDIO
  const [tipoCardio, setTipoCardio] = useState<TipoCardio>(
    blocoEditando?.config_cardio?.tipo ?? "bike"
  );
  const [modalidade, setModalidade] = useState<ModalidadeCardio>(
    blocoEditando?.config_cardio?.modalidade ?? "hiit"
  );
  const [trabalhoSeg, setTrabalhoSeg] = useState(
    blocoEditando?.config_cardio?.trabalho_segundos ?? 30
  );
  const [descansoSeg, setDescansoSeg] = useState(
    blocoEditando?.config_cardio?.descanso_segundos ?? 30
  );
  const [rounds, setRounds] = useState(
    blocoEditando?.config_cardio?.rounds ?? 10
  );
  const [velocidade, setVelocidade] = useState(
    blocoEditando?.config_cardio?.velocidade_kmh ?? 0
  );
  const [inclinacao, setInclinacao] = useState(
    blocoEditando?.config_cardio?.inclinacao_percentual ?? 0
  );
  const [bpmMin, setBpmMin] = useState(
    blocoEditando?.config_cardio?.batimentos_alvo?.minimo ?? 0
  );
  const [bpmMax, setBpmMax] = useState(
    blocoEditando?.config_cardio?.batimentos_alvo?.maximo ?? 0
  );
  const [intensidadeValor, setIntensidadeValor] = useState(
    blocoEditando?.config_cardio?.intensidade?.valor ?? 80
  );
  const [intensidadeUnidade, setIntensidadeUnidade] =
    useState<UnidadeIntensidade>(
      blocoEditando?.config_cardio?.intensidade?.unidade ?? "percentual"
    );

  // Estados para ALONGAMENTO/MOBILIDADE
  const [gruposMusculares, setGruposMusculares] = useState(
    blocoEditando?.config_alongamento?.grupos_musculares?.join(", ") ?? ""
  );
  const [tipoAlongamento, setTipoAlongamento] = useState<
    "estatico" | "dinamico" | "misto"
  >(blocoEditando?.config_alongamento?.tipo ?? "estatico");

  // Estados para AQUECIMENTO
  const [tipoAquecimento, setTipoAquecimento] = useState<
    "geral" | "especifico"
  >(blocoEditando?.config_aquecimento?.tipo ?? "geral");
  const [atividades, setAtividades] = useState(
    blocoEditando?.config_aquecimento?.atividades?.join(", ") ?? ""
  );

  // Carregar template do BD (meu template salvo)
  const handleSelectMeuTemplate = (template: BlocoTemplate) => {
    setTipo(template.tipo as TipoBloco);
    setPosicao(template.posicao as PosicaoBloco);
    setNome(template.nome);
    setDescricao(template.descricao || "");
    setDuracaoMinutos(template.duracao_estimada_minutos || 10);

    if (template.config_cardio) {
      const cc = template.config_cardio as any;
      setTipoCardio(cc.tipo || "bike");
      setModalidade(cc.modalidade || "hiit");
      setTrabalhoSeg(cc.trabalho_segundos ?? 30);
      setDescansoSeg(cc.descanso_segundos ?? 30);
      setRounds(cc.rounds ?? 10);
      setVelocidade(cc.velocidade_kmh ?? 0);
      setInclinacao(cc.inclinacao_percentual ?? 0);
      setBpmMin(cc.batimentos_alvo?.minimo ?? 0);
      setBpmMax(cc.batimentos_alvo?.maximo ?? 0);
      setIntensidadeValor(cc.intensidade?.valor ?? 80);
      setIntensidadeUnidade(cc.intensidade?.unidade ?? "percentual");
    }

    if (template.config_alongamento) {
      const ca = template.config_alongamento as any;
      setGruposMusculares(ca.grupos_musculares?.join(", ") || "");
      setTipoAlongamento(ca.tipo || "estatico");
    }

    if (template.config_aquecimento) {
      const caq = template.config_aquecimento as any;
      setTipoAquecimento(caq.tipo || "geral");
      setAtividades(caq.atividades?.join(", ") || "");
    }

    setActiveTab("manual");
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = TEMPLATES_BLOCOS.find((t) => t.id === templateId);
    if (!template) return;

    const config = template.config;
    setTipo(config.tipo ?? "cardio");
    setNome(config.nome ?? "");
    setDuracaoMinutos(config.duracao_estimada_minutos ?? 10);

    if (config.config_cardio) {
      const cc = config.config_cardio;
      setTipoCardio(cc.tipo);
      setModalidade(cc.modalidade);
      setTrabalhoSeg(cc.trabalho_segundos ?? 30);
      setDescansoSeg(cc.descanso_segundos ?? 30);
      setRounds(cc.rounds ?? 10);
      setVelocidade(cc.velocidade_kmh ?? 0);
      setInclinacao(cc.inclinacao_percentual ?? 0);
      setBpmMin(cc.batimentos_alvo?.minimo ?? 0);
      setBpmMax(cc.batimentos_alvo?.maximo ?? 0);
      setIntensidadeValor(cc.intensidade?.valor ?? 80);
      setIntensidadeUnidade(cc.intensidade?.unidade ?? "percentual");
    }

    if (config.config_alongamento) {
      const ca = config.config_alongamento;
      setGruposMusculares(ca.grupos_musculares.join(", "));
      setTipoAlongamento(ca.tipo);
    }

    if (config.config_aquecimento) {
      const caq = config.config_aquecimento;
      setTipoAquecimento(caq.tipo);
      setAtividades(caq.atividades.join(", "));
    }

    setActiveTab("manual");
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await deletarTemplate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Erro ao deletar template:", error);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      alert("Nome do bloco é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const bloco: Partial<BlocoTreino> = {
        tipo,
        posicao,
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        duracao_estimada_minutos: duracaoMinutos,
        obrigatorio,
      };

      // Configurações específicas por tipo
      if (tipo === "cardio") {
        bloco.config_cardio = {
          tipo: tipoCardio,
          modalidade,
          duracao_minutos: duracaoMinutos,
        };

        if (modalidade === "hiit" || modalidade === "intervalado") {
          bloco.config_cardio.trabalho_segundos = trabalhoSeg;
          bloco.config_cardio.descanso_segundos = descansoSeg;
          bloco.config_cardio.rounds = rounds;
        }

        if (velocidade > 0) bloco.config_cardio.velocidade_kmh = velocidade;
        if (inclinacao > 0)
          bloco.config_cardio.inclinacao_percentual = inclinacao;
        if (bpmMin > 0 && bpmMax > 0) {
          bloco.config_cardio.batimentos_alvo = {
            minimo: bpmMin,
            maximo: bpmMax,
          };
        }
        if (intensidadeValor > 0) {
          bloco.config_cardio.intensidade = {
            valor: intensidadeValor,
            unidade: intensidadeUnidade,
          };
        }
      } else if (tipo === "alongamento" || tipo === "mobilidade") {
        bloco.config_alongamento = {
          grupos_musculares: gruposMusculares
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean),
          duracao_minutos: duracaoMinutos,
          tipo: tipoAlongamento,
          observacoes: descricao || undefined,
        };
      } else if (tipo === "aquecimento") {
        bloco.config_aquecimento = {
          duracao_minutos: duracaoMinutos,
          tipo: tipoAquecimento,
          atividades: atividades
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          observacoes: descricao || undefined,
        };
      }

      await onSave(bloco);
      onOpenChange(false);
    } catch (error) {
      console.error("[WorkoutBlockDialog] Erro ao salvar:", error);
    } finally {
      setLoading(false);
    }
  };

  const tipoConfig = TIPOS_BLOCO[tipo];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{tipoConfig.icon}</span>
            {blocoEditando ? "Editar Bloco" : "Adicionar Bloco de Treino"}
          </DialogTitle>
          <DialogDescription>
            {diaNome && `Para ${diaNome} - `}
            {tipoConfig.descricao}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">
              <Sparkles className="h-4 w-4 mr-2" />
              Templates Prontos
            </TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          {/* TAB: TEMPLATES */}
          <TabsContent value="template" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* MEUS TEMPLATES SALVOS */}
              {personalId && meusTemplates.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Meus Templates
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {meusTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:border-primary transition-colors group relative"
                      >
                        <CardHeader className="p-3">
                          <div className="flex items-center justify-between">
                            <CardTitle 
                              className="text-sm flex items-center gap-2 flex-1"
                              onClick={() => handleSelectMeuTemplate(template)}
                            >
                              {TIPOS_BLOCO[template.tipo as TipoBloco]?.icon || "📦"}
                              {template.nome}
                              <Badge variant="outline" className="text-xs">
                                Salvo
                              </Badge>
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTemplateToDelete(template);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardDescription 
                            className="text-xs"
                            onClick={() => handleSelectMeuTemplate(template)}
                          >
                            {template.descricao || `${template.tipo} - ${template.posicao}`}
                            {template.duracao_estimada_minutos && ` • ${template.duracao_estimada_minutos}min`}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                  <Separator className="my-4" />
                </div>
              )}

              {/* TEMPLATES PRONTOS DO SISTEMA */}
              {Object.entries(
                TEMPLATES_BLOCOS.reduce((acc, t) => {
                  if (!acc[t.categoria]) acc[t.categoria] = [];
                  acc[t.categoria].push(t);
                  return acc;
                }, {} as Record<string, typeof TEMPLATES_BLOCOS>)
              ).map(([categoria, templates]) => (
                <div key={categoria}>
                  <h4 className="text-sm font-semibold mb-2">{categoria}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleSelectTemplate(template.id)}
                      >
                        <CardHeader className="p-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {TIPOS_BLOCO[template.tipo].icon}
                              {template.nome}
                              {template.popular && (
                                <Badge variant="secondary" className="text-xs">
                                  Popular
                                </Badge>
                              )}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-xs">
                            {template.descricao}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB: MANUAL */}
          <TabsContent value="manual" className="space-y-6 mt-4">
            {/* Tipo e Posição */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo do Bloco</Label>
                <Select
                  value={tipo}
                  onValueChange={(v) => setTipo(v as TipoBloco)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS_BLOCO).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Posição no Treino</Label>
                <Select
                  value={posicao}
                  onValueChange={(v) => setPosicao(v as PosicaoBloco)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inicio">🎬 Início</SelectItem>
                    <SelectItem value="meio">
                      💪 Meio (após exercícios)
                    </SelectItem>
                    <SelectItem value="fim">🏁 Fim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duração Estimada</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={duracaoMinutos}
                    onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
            </div>

            {/* Nome e Descrição */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Bloco *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: HIIT Bike 10x30, Mobilidade de Quadril..."
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição / Observações</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Instruções adicionais..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* CONFIGURAÇÕES ESPECÍFICAS POR TIPO */}
            {tipo === "cardio" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Configurações de Cardio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tipo de Cardio e Modalidade */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Equipamento</Label>
                      <Select
                        value={tipoCardio}
                        onValueChange={(v) => setTipoCardio(v as TipoCardio)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="esteira">🏃 Esteira</SelectItem>
                          <SelectItem value="bike">🚴 Bike</SelectItem>
                          <SelectItem value="remo">🚣 Remo</SelectItem>
                          <SelectItem value="airbike">💨 Airbike</SelectItem>
                          <SelectItem value="eliptico">⚙️ Elíptico</SelectItem>
                          <SelectItem value="escada">🪜 Escada</SelectItem>
                          <SelectItem value="pular-corda">
                            🪢 Pular Corda
                          </SelectItem>
                          <SelectItem value="corrida-livre">
                            🏃‍♂️ Corrida Livre
                          </SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Modalidade</Label>
                      <Select
                        value={modalidade}
                        onValueChange={(v) =>
                          setModalidade(v as ModalidadeCardio)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="continuo">
                            📊 Contínuo (Steady State)
                          </SelectItem>
                          <SelectItem value="intervalado">
                            ⚡ Intervalado
                          </SelectItem>
                          <SelectItem value="hiit">
                            🔥 HIIT (Alta Intensidade)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* HIIT/Intervalado */}
                  {(modalidade === "hiit" || modalidade === "intervalado") && (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          Configuração de Intervalos
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Trabalho (seg)</Label>
                          <Input
                            type="number"
                            value={trabalhoSeg}
                            onChange={(e) =>
                              setTrabalhoSeg(Number(e.target.value))
                            }
                            min={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Descanso (seg)</Label>
                          <Input
                            type="number"
                            value={descansoSeg}
                            onChange={(e) =>
                              setDescansoSeg(Number(e.target.value))
                            }
                            min={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rounds</Label>
                          <Input
                            type="number"
                            value={rounds}
                            onChange={(e) => setRounds(Number(e.target.value))}
                            min={1}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total:{" "}
                        {formatarDuracao(
                          ((trabalhoSeg + descansoSeg) * rounds) / 60
                        )}
                      </p>
                    </div>
                  )}

                  {/* Métricas adicionais */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {tipoCardio === "esteira" && (
                      <>
                        <div className="space-y-2">
                          <Label>Velocidade (km/h)</Label>
                          <Input
                            type="number"
                            value={velocidade}
                            onChange={(e) =>
                              setVelocidade(Number(e.target.value))
                            }
                            min={0}
                            step={0.1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Inclinação (%)</Label>
                          <Input
                            type="number"
                            value={inclinacao}
                            onChange={(e) =>
                              setInclinacao(Number(e.target.value))
                            }
                            min={0}
                            max={15}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label>Intensidade</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={intensidadeValor}
                          onChange={(e) =>
                            setIntensidadeValor(Number(e.target.value))
                          }
                          min={0}
                          max={100}
                        />
                        <Select
                          value={intensidadeUnidade}
                          onValueChange={(v) =>
                            setIntensidadeUnidade(v as UnidadeIntensidade)
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentual">%</SelectItem>
                            <SelectItem value="rpm">RPM</SelectItem>
                            <SelectItem value="bpm">BPM</SelectItem>
                            <SelectItem value="watts">W</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Batimentos Cardíacos */}
                  <div className="space-y-2">
                    <Label>Zona de Batimentos (BPM)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        value={bpmMin}
                        onChange={(e) => setBpmMin(Number(e.target.value))}
                        placeholder="Mínimo"
                        min={0}
                      />
                      <Input
                        type="number"
                        value={bpmMax}
                        onChange={(e) => setBpmMax(Number(e.target.value))}
                        placeholder="Máximo"
                        min={0}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(tipo === "alongamento" || tipo === "mobilidade") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Configurações de {TIPOS_BLOCO[tipo].label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Grupos Musculares / Articulações</Label>
                    <Input
                      value={gruposMusculares}
                      onChange={(e) => setGruposMusculares(e.target.value)}
                      placeholder="Ex: Quadríceps, Isquiotibiais, Glúteos (separados por vírgula)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separe por vírgula. Ex: Quadril, Ombros, Tornozelos
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={tipoAlongamento}
                      onValueChange={(v) => setTipoAlongamento(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estatico">Estático</SelectItem>
                        <SelectItem value="dinamico">Dinâmico</SelectItem>
                        <SelectItem value="misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {tipo === "aquecimento" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Configurações de Aquecimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={tipoAquecimento}
                      onValueChange={(v) => setTipoAquecimento(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geral">
                          Geral (corpo todo)
                        </SelectItem>
                        <SelectItem value="especifico">
                          Específico (grupos do treino)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Atividades</Label>
                    <Textarea
                      value={atividades}
                      onChange={(e) => setAtividades(e.target.value)}
                      placeholder="Ex: Esteira 5min, Arm circles, Jumping jacks"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Liste as atividades separadas por vírgula ou quebra de
                      linha
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Opções adicionais */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label>Bloco Obrigatório</Label>
                <p className="text-xs text-muted-foreground">
                  Aluno deve completar este bloco
                </p>
              </div>
              <Switch checked={obrigatorio} onCheckedChange={setObrigatorio} />
            </div>

            {/* Preview da duração */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Duração estimada:{" "}
                <strong>{formatarDuracao(duracaoMinutos)}</strong>
              </span>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !nome.trim()}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {blocoEditando ? "Atualizar" : "Adicionar"} Bloco
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeletando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
