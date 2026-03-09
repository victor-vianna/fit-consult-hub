import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [saving, setSaving] = useState(false);
  const [genero, setGenero] = useState(initialValues?.ciclo_genero || "");
  const [modalidade, setModalidade] = useState(initialValues?.ciclo_modalidade || "");
  const [nivel, setNivel] = useState(initialValues?.ciclo_nivel || "");
  const [numero, setNumero] = useState(initialValues?.ciclo_numero?.toString() || "");

  const { pastas, loading: loadingPastas } = useModeloPastas({
    personalId,
    enabled: !!personalId,
  });

  // Get only root-level folders as workout type options
  const pastaRaiz = pastas.filter((p) => !p.parent_id);

  const cicloLabel = [genero, modalidade, nivel, numero ? `Ciclo ${numero}` : ""]
    .filter(Boolean)
    .join(" > ");

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
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" style={{ color: themeColor }} />
          Ciclo de Treino
        </CardTitle>
        {cicloLabel && (
          <Badge variant="outline" className="w-fit text-xs mt-1">
            {cicloLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Gênero</Label>
            <Select value={genero} onValueChange={setGenero}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {GENEROS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Modalidade</Label>
            <Select value={modalidade} onValueChange={setModalidade}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {MODALIDADES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nível</Label>
            <Select value={nivel} onValueChange={setNivel}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nº do Ciclo</Label>
            <Input
              type="number"
              min={1}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="1"
              className="h-9"
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
            {saving ? "Salvando..." : "Salvar Ciclo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
