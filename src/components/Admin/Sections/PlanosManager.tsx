// src/components/admin/sections/PlanosManager.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  DollarSign,
  Users,
  TrendingUp,
  Star,
  Zap,
} from "lucide-react";

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco_mensal: number;
  preco_anual?: number;
  max_alunos: number;
  recursos: string[];
  ativo: boolean;
  created_at: string;
  assinaturas_count: number;
}

export default function PlanosManager() {
  const { toast } = useToast();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);

  useEffect(() => {
    fetchPlanos();
  }, []);

  const fetchPlanos = async () => {
    try {
      setLoading(true);

      const { data: planosData, error: planosError } = await supabase
        .from("planos")
        .select("*")
        .order("preco_mensal", { ascending: true });

      if (planosError) throw planosError;

      // Buscar contagem de assinaturas por plano
      const { data: assinaturasData } = await supabase
        .from("assinaturas")
        .select("plano_id");

      const planosComContagem: Plano[] =
        planosData?.map((plano) => ({
          ...plano,
          recursos: plano.recursos || [],
          assinaturas_count:
            assinaturasData?.filter((a) => a.plano_id === plano.id).length || 0,
        })) || [];

      setPlanos(planosComContagem);
    } catch (error: any) {
      console.error("Erro ao carregar planos:", error);
      toast({
        title: "Erro ao carregar planos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlano = () => {
    setEditingPlano({
      id: "",
      nome: "",
      descricao: "",
      preco_mensal: 0,
      preco_anual: 0,
      max_alunos: 10,
      recursos: [],
      ativo: true,
      created_at: new Date().toISOString(),
      assinaturas_count: 0,
    });
    setIsEditing(true);
  };

  const handleEditPlano = (plano: Plano) => {
    setEditingPlano(plano);
    setIsEditing(true);
  };

  const handleSavePlano = async () => {
    if (!editingPlano) return;

    try {
      if (editingPlano.id) {
        // Update
        const { error } = await supabase
          .from("planos")
          .update({
            nome: editingPlano.nome,
            descricao: editingPlano.descricao,
            preco_mensal: editingPlano.preco_mensal,
            preco_anual: editingPlano.preco_anual,
            max_alunos: editingPlano.max_alunos,
            recursos: editingPlano.recursos,
            ativo: editingPlano.ativo,
          })
          .eq("id", editingPlano.id);

        if (error) throw error;

        toast({
          title: "Plano atualizado",
          description: "O plano foi atualizado com sucesso",
        });
      } else {
        // Create
        const { error } = await supabase.from("planos").insert({
          nome: editingPlano.nome,
          descricao: editingPlano.descricao,
          preco_mensal: editingPlano.preco_mensal,
          preco_anual: editingPlano.preco_anual,
          max_alunos: editingPlano.max_alunos,
          recursos: editingPlano.recursos,
          ativo: editingPlano.ativo,
        });

        if (error) throw error;

        toast({
          title: "Plano criado",
          description: "O plano foi criado com sucesso",
        });
      }

      setIsEditing(false);
      setEditingPlano(null);
      fetchPlanos();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar plano",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePlano = async (id: string, hasAssinaturas: boolean) => {
    if (hasAssinaturas) {
      toast({
        title: "Não é possível excluir",
        description: "Este plano possui assinaturas ativas",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este plano?")) return;

    try {
      const { error } = await supabase.from("planos").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Plano excluído",
        description: "O plano foi excluído com sucesso",
      });

      fetchPlanos();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir plano",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from("planos")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: ativo ? "Plano desativado" : "Plano ativado",
        description: "Status alterado com sucesso",
      });

      fetchPlanos();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPlanoIcon = (index: number) => {
    const icons = [Package, Star, Zap];
    const Icon = icons[index % icons.length];
    return <Icon className="h-6 w-6" />;
  };

  const stats = {
    total: planos.length,
    ativos: planos.filter((p) => p.ativo).length,
    inativos: planos.filter((p) => !p.ativo).length,
    totalAssinaturas: planos.reduce((sum, p) => sum + p.assinaturas_count, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  if (isEditing && editingPlano) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {editingPlano.id ? "Editar Plano" : "Novo Plano"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome do Plano</label>
            <Input
              value={editingPlano.nome}
              onChange={(e) =>
                setEditingPlano({ ...editingPlano, nome: e.target.value })
              }
              placeholder="Ex: Plano Básico"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Input
              value={editingPlano.descricao}
              onChange={(e) =>
                setEditingPlano({ ...editingPlano, descricao: e.target.value })
              }
              placeholder="Descrição do plano"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Preço Mensal (R$)</label>
              <Input
                type="number"
                value={editingPlano.preco_mensal}
                onChange={(e) =>
                  setEditingPlano({
                    ...editingPlano,
                    preco_mensal: parseFloat(e.target.value),
                  })
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Preço Anual (R$)</label>
              <Input
                type="number"
                value={editingPlano.preco_anual || ""}
                onChange={(e) =>
                  setEditingPlano({
                    ...editingPlano,
                    preco_anual: parseFloat(e.target.value),
                  })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Máximo de Alunos</label>
            <Input
              type="number"
              value={editingPlano.max_alunos}
              onChange={(e) =>
                setEditingPlano({
                  ...editingPlano,
                  max_alunos: parseInt(e.target.value),
                })
              }
              placeholder="10"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Recursos (um por linha)
            </label>
            <textarea
              className="w-full min-h-[100px] p-2 border rounded-md"
              value={editingPlano.recursos.join("\n")}
              onChange={(e) =>
                setEditingPlano({
                  ...editingPlano,
                  recursos: e.target.value.split("\n").filter((r) => r.trim()),
                })
              }
              placeholder="Recursos incluídos no plano"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editingPlano.ativo}
              onChange={(e) =>
                setEditingPlano({
                  ...editingPlano,
                  ativo: e.target.checked,
                })
              }
              className="h-4 w-4"
            />
            <label className="text-sm font-medium">Plano Ativo</label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSavePlano}>Salvar Plano</Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditingPlano(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de Planos</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">
              {stats.ativos}
            </div>
            <p className="text-xs text-green-700">Planos Ativos</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-700">
              {stats.inativos}
            </div>
            <p className="text-xs text-gray-700">Planos Inativos</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-700">
              {stats.totalAssinaturas}
            </div>
            <p className="text-xs text-blue-700">Total Assinaturas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Planos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gerenciar Planos</span>
            <Button onClick={handleCreatePlano}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Plano
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planos.map((plano, index) => (
              <Card
                key={plano.id}
                className={`border-2 ${
                  plano.ativo
                    ? "border-primary/20 hover:border-primary/50"
                    : "border-gray-200 opacity-75"
                } transition-all hover:shadow-lg`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getPlanoIcon(index)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{plano.nome}</h3>
                        <p className="text-xs text-muted-foreground">
                          {plano.descricao}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={plano.ativo ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {plano.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4 border-y">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(plano.preco_mensal)}
                    </div>
                    <p className="text-sm text-muted-foreground">por mês</p>
                    {plano.preco_anual && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ou {formatCurrency(plano.preco_anual)}/ano
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Máx. Alunos:
                      </span>
                      <span className="font-semibold">{plano.max_alunos}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Assinaturas:
                      </span>
                      <Badge variant="outline">{plano.assinaturas_count}</Badge>
                    </div>
                  </div>

                  {plano.recursos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Recursos:</p>
                      <ul className="space-y-1">
                        {plano.recursos.slice(0, 3).map((recurso, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              {recurso}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {plano.recursos.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{plano.recursos.length - 3} recursos
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditPlano(plano)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAtivo(plano.id, plano.ativo)}
                    >
                      {plano.ativo ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        handleDeletePlano(plano.id, plano.assinaturas_count > 0)
                      }
                      disabled={plano.assinaturas_count > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {planos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum plano cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
