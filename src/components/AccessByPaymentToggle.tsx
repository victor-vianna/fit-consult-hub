import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  embedded?: boolean;
}

export function AccessByPaymentToggle({ embedded = false }: Props) {
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
      title: value ? "Controle por pagamento ativado" : "Controle por pagamento desativado",
      description: value
        ? "Alunos sem pagamento ativo poderao entrar e serao direcionados aos planos."
        : "Os alunos podem acessar normalmente, mesmo sem assinatura.",
    });
  };

  const control = (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.035] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <Label className="text-sm font-semibold">Exigir pagamento ativo para acessar</Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {enabled
                ? "Ativado agora: os pagamentos controlam o acesso dos alunos."
                : "Desativado agora: os pagamentos não restringem o acesso dos alunos."}
            </p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={saving}
            aria-label="Exigir pagamento ativo para acessar"
          />
        )}
      </div>
      <div className="mt-3 grid gap-2 border-t pt-3 text-xs sm:grid-cols-2">
        <div className="rounded-md bg-background/70 p-2.5">
          <p className="font-semibold text-foreground">Ao ativar</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            Após a carência de 24 horas, alunos sem pagamento entram e são direcionados aos planos.
            O acesso volta automaticamente após a confirmação.
          </p>
        </div>
        <div className="rounded-md bg-background/70 p-2.5">
          <p className="font-semibold text-foreground">Ao desativar</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            A situação financeira continua registrada, mas não impede o acesso à plataforma.
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Liberações manuais continuam disponíveis para parcerias, cortesias e acordos.
      </p>
    </div>
  );

  if (embedded) return control;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5" />
          Controle de acesso por pagamento
        </CardTitle>
        <CardDescription>
          Defina se os pagamentos devem controlar o acesso dos seus alunos.
        </CardDescription>
      </CardHeader>
      <CardContent>{control}</CardContent>
    </Card>
  );
}
