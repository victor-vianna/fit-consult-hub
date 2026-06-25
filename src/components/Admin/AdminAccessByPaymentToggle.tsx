import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function AdminAccessByPaymentToggle() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("id, controle_acesso_personal_por_pagamento")
        .limit(1)
        .maybeSingle();
      if (data) {
        setRowId(data.id);
        setEnabled(!!data.controle_acesso_personal_por_pagamento);
      }
      setLoading(false);
    })();
  }, []);

  const handleToggle = async (value: boolean) => {
    setSaving(true);
    setEnabled(value);
    let error;
    if (rowId) {
      ({ error } = await supabase
        .from("admin_settings")
        .update({ controle_acesso_personal_por_pagamento: value, updated_at: new Date().toISOString() })
        .eq("id", rowId));
    } else {
      const res = await supabase
        .from("admin_settings")
        .insert({ controle_acesso_personal_por_pagamento: value })
        .select()
        .single();
      error = res.error;
      if (res.data) setRowId(res.data.id);
    }
    setSaving(false);
    if (error) {
      setEnabled(!value);
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: value ? "Bloqueio de personal trainers ativado" : "Bloqueio desativado",
      description: value
        ? "Personal trainers sem assinatura ativa serão bloqueados."
        : "Personal trainers podem acessar mesmo sem assinatura.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Controle de acesso dos personal trainers
        </CardTitle>
        <CardDescription>
          Quando ativo, apenas personal trainers com assinatura ativa em "assinaturas" conseguem entrar na plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <Label className="text-base">Bloquear personal trainers sem assinatura ativa</Label>
            <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
