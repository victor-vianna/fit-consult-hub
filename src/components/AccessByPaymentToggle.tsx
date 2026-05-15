import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function AccessByPaymentToggle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("personal_settings")
        .select("controle_acesso_por_pagamento")
        .eq("personal_id", user.id)
        .maybeSingle();
      setEnabled(!!data?.controle_acesso_por_pagamento);
      setLoading(false);
    })();
  }, [user?.id]);

  const handleToggle = async (value: boolean) => {
    if (!user?.id) return;
    setSaving(true);
    setEnabled(value);
    const { error } = await supabase
      .from("personal_settings")
      .upsert(
        { personal_id: user.id, controle_acesso_por_pagamento: value },
        { onConflict: "personal_id" }
      );
    setSaving(false);
    if (error) {
      setEnabled(!value);
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: value ? "Bloqueio por pagamento ativado" : "Bloqueio por pagamento desativado",
      description: value
        ? "Alunos sem assinatura paga serão bloqueados automaticamente."
        : "Os alunos podem acessar normalmente, mesmo sem assinatura.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Controle de acesso por pagamento
        </CardTitle>
        <CardDescription>
          Quando ativado, apenas alunos com assinatura paga e dentro da validade conseguem entrar.
          Alunos sem pagamento veem a tela com os planos disponíveis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div>
              <Label className="text-base">Bloquear alunos sem pagamento ativo</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Vale para todos os alunos. Você pode definir exceções individualmente em cada aluno.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
