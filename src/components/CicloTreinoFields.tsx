import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layers, Save } from "lucide-react";
import { useModeloPastas } from "@/hooks/useModeloPastas";

interface CicloTreinoFieldsProps {
  planilhaId: string;
  personalId: string;
  initialValues?: {
    ciclo_genero?: string | null;
    ciclo_modalidade?: string | null;
    ciclo_nivel?: string | null;
    ciclo_numero?: number | null;
  };
  themeColor?: string;
  onSaved?: () => void;
}

const GENEROS = ["Masculino", "Feminino", "Unissex"];
const NIVEIS = ["Iniciante", "Intermediário", "Avançado"];

export function CicloTreinoFields({
  planilhaId,
  personalId,
  initialValues,
  themeColor,
  onSaved,
}: CicloTreinoFieldsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [genero, setGenero] = useState(initialValues?.ciclo_genero || "");
  const [modalidade, setModalidade] = useState(initialValues?.ciclo_modalidade || "");
  const [nivel, setNivel] = useState(initialValues?.ciclo_nivel || "");
  const [numero, setNumero] = useState(initialValues?.ciclo_numero?.toString() || "");

  // 🔧 FIX: Sincronizar estado com initialValues quando dados chegam do banco assincronamente
  // ou quando muda de planilha. Sem isso, o ciclo salvo não aparece ao retornar à tela.
  useEffect(() => {
    setGenero(initialValues?.ciclo_genero || "");
    setModalidade(initialValues?.ciclo_modalidade || "");
    setNivel(initialValues?.ciclo_nivel || "");
    setNumero(initialValues?.ciclo_numero?.toString() || "");
  }, [
    planilhaId,
    initialValues?.ciclo_genero,
    initialValues?.ciclo_modalidade,
    initialValues?.ciclo_nivel,
    initialValues?.ciclo_numero,
  ]);

  const { pastas, loading: loadingPastas } = useModeloPastas({
    personalId,
    enabled: !!personalId,
  });

  // Get only root-level folders as workout type options
  const pastaRaiz = pastas.filter((p) => !p.parent_id);

  const cicloLabel = [genero, modalidade, nivel, numero ? `Ciclo ${numero}` : ""]
    .filter(Boolean)
    .join(" > ");
  const numeroAtual = Number.parseInt(numero, 10);
  const proximoCicloLabel = Number.isFinite(numeroAtual)
    ? `Proximo: Ciclo ${numeroAtual + 1}`
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("planilhas_treino")
        .update({
          ciclo_genero: genero || null,
          ciclo_modalidade: modalidade || null,
          ciclo_nivel: nivel || null,
          ciclo_numero: numero ? parseInt(numero) : null,
        })
        .eq("id", planilhaId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["planilha-ativa"] });
      queryClient.invalidateQueries({ queryKey: ["planilhas-historico"] });
      toast({ title: "Ciclo salvo com sucesso!" });
      onSaved?.();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar ciclo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-muted-foreground/30 bg-muted/25 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4" style={{ color: themeColor }} />
            Ciclo de treino
          </h3>
          <p className="mt-1 text-xs text-foreground/70">
            Identifique genero, tipo, nivel e numero para saber em qual fase o aluno esta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cicloLabel && (
            <Badge
              variant="outline"
              className="w-fit max-w-full whitespace-normal border-blue-300 bg-blue-50 text-left text-xs font-semibold text-blue-900 shadow-sm dark:border-blue-400/50 dark:bg-blue-500/15 dark:text-blue-100"
            >
              Atual: {cicloLabel}
            </Badge>
          )}
          {proximoCicloLabel && (
            <Badge
              variant="outline"
              className="w-fit border-muted-foreground/45 bg-background/70 text-xs font-medium text-foreground/80"
            >
              {proximoCicloLabel}
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-2 rounded-lg border border-muted-foreground/30 bg-background/80 p-3">
            <Label className="text-xs text-foreground/80">Gênero</Label>
            <Select value={genero} onValueChange={setGenero}>
              <SelectTrigger className="h-9 border-muted-foreground/55 bg-background text-foreground hover:border-muted-foreground/80">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {GENEROS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 rounded-lg border border-muted-foreground/30 bg-background/80 p-3">
            <Label className="text-xs text-foreground/80">Tipo de Treino</Label>
            <Select value={modalidade} onValueChange={setModalidade}>
              <SelectTrigger className="h-9 border-muted-foreground/55 bg-background text-foreground hover:border-muted-foreground/80">
                <SelectValue placeholder={loadingPastas ? "Carregando..." : "Selecionar"} />
              </SelectTrigger>
              <SelectContent>
                {pastaRaiz.map((p) => (
                  <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                ))}
                {pastaRaiz.length === 0 && !loadingPastas && (
                  <SelectItem value="_empty" disabled>Nenhuma pasta criada</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 rounded-lg border border-muted-foreground/30 bg-background/80 p-3">
            <Label className="text-xs text-foreground/80">Nível</Label>
            <Select value={nivel} onValueChange={setNivel}>
              <SelectTrigger className="h-9 border-muted-foreground/55 bg-background text-foreground hover:border-muted-foreground/80">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 rounded-lg border border-muted-foreground/30 bg-background/80 p-3">
            <Label className="text-xs text-foreground/80">Nº do Ciclo</Label>
            <Input
              type="number"
              min={1}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="1"
              className="h-9 border-muted-foreground/55 bg-background text-foreground hover:border-muted-foreground/80"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: themeColor || undefined }}
            className="gap-2"
          >
            <Save className="h-3 w-3" />
            {saving ? "Salvando..." : "Salvar ciclo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
