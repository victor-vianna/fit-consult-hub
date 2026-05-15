import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  studentId: string;
}

type OverrideValue = "herdar" | "ativar" | "desativar";

export function StudentAccessByPaymentOverride({ studentId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [override, setOverride] = useState<OverrideValue>("herdar");
  const [hasActivePaid, setHasActivePaid] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("controle_acesso_por_pagamento")
        .eq("id", studentId)
        .maybeSingle();
      const v = (profile as any)?.controle_acesso_por_pagamento;
      setOverride(v === null || v === undefined ? "herdar" : v ? "ativar" : "desativar");

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, status_pagamento, data_expiracao")
        .eq("student_id", studentId);
      const ativo = (subs ?? []).some(
        (s) => s.status_pagamento === "pago" && new Date(s.data_expiracao) > new Date()
      );
      setHasActivePaid(ativo);
      setLoading(false);
    })();
  }, [studentId]);

  const apply = async (next: OverrideValue) => {
    setSaving(true);
    setOverride(next);
    const value = next === "herdar" ? null : next === "ativar";
    const { error } = await supabase
      .from("profiles")
      .update({ controle_acesso_por_pagamento: value, updated_at: new Date().toISOString() } as any)
      .eq("id", studentId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Configuração salva" });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Acesso por pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Status atual da assinatura</span>
              {hasActivePaid ? (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 border">
                  Em dia
                </Badge>
              ) : (
                <Badge variant="outline" className="border-destructive/30 text-destructive">
                  Sem pagamento ativo
                </Badge>
              )}
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs uppercase text-muted-foreground">Regra para este aluno</Label>
              <div className="flex flex-col gap-2">
                {[
                  { v: "herdar" as const, l: "Herdar configuração geral" },
                  { v: "ativar" as const, l: "Sempre exigir pagamento ativo" },
                  { v: "desativar" as const, l: "Liberar acesso mesmo sem pagamento" },
                ].map((opt) => (
                  <label key={opt.v} className="flex items-center justify-between gap-2 text-sm">
                    <span>{opt.l}</span>
                    <Switch
                      checked={override === opt.v}
                      onCheckedChange={(checked) => checked && !saving && apply(opt.v)}
                      disabled={saving}
                    />
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
