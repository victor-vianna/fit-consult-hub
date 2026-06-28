import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Pause, ShieldAlert, LogOut, MessageCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccessMotivo, MOTIVO_LABELS, deriveStatus } from "@/hooks/useStudentAccess";
import { AlunoCheckoutPlanos } from "@/components/AlunoCheckoutPlanos";
import { useAuth } from "@/hooks/useAuth";
import { formatDisplayDate } from "@/utils/dateFormat";

interface LastLog {
  motivo: string | null;
  mensagem_aluno: string | null;
  to_active: boolean | null;
  created_at: string;
}

export default function AcessoSuspenso() {
  const { signOut } = useAuth();
  const [personalPhone, setPersonalPhone] = useState<string | null>(null);
  const [personalName, setPersonalName] = useState<string>("seu personal trainer");
  const [personalId, setPersonalId] = useState<string | null>(null);
  const [lastLog, setLastLog] = useState<LastLog | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [bloqueioPorPagamento, setBloqueioPorPagamento] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      setRole(roleRow?.role ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("personal_id, is_active")
        .eq("id", user.id)
        .single();

      if (profile) setIsActive(!!profile.is_active);

      if (profile?.personal_id) {
        setPersonalId(profile.personal_id);
        const { data: personal } = await supabase
          .from("profiles")
          .select("telefone, nome")
          .eq("id", profile.personal_id)
          .single();
        if (personal) {
          setPersonalPhone(personal.telefone || null);
          setPersonalName(personal.nome || "seu personal trainer");
        }

        // Verifica se o bloqueio é por pagamento
        if (profile.is_active && roleRow?.role === "aluno") {
          const { data: subs } = await supabase
            .from("subscriptions")
            .select("status_pagamento, data_expiracao")
            .eq("student_id", user.id);
          const pagoAtivo = (subs ?? []).some(
            (s) => s.status_pagamento === "pago" && new Date(s.data_expiracao) > new Date()
          );
          if (!pagoAtivo) setBloqueioPorPagamento(true);
        }
      }

      if (roleRow?.role === "personal" && profile?.is_active) {
        const { data: ass } = await supabase
          .from("assinaturas")
          .select("status, data_fim")
          .eq("personal_id", user.id);
        const ativa = (ass ?? []).some(
          (a) => a.status === "ativo" && (!a.data_fim || new Date(a.data_fim) >= new Date())
        );
        if (!ativa) setBloqueioPorPagamento(true);
      }

      const { data: logs } = await supabase
        .from("student_access_logs")
        .select("motivo, mensagem_aluno, to_active, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (logs && logs.length > 0) setLastLog(logs[0] as LastLog);
    } catch (error) {
      console.error("Erro ao buscar contexto de acesso:", error);
    }
  }

  // Caso seja bloqueio por pagamento, renderiza fluxo dedicado
  if (bloqueioPorPagamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="bg-card shadow-xl rounded-lg p-6 md:p-8 border mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="bg-amber-100 dark:bg-amber-500/10 p-4 rounded-full">
                <CreditCard size={40} className="text-amber-600" />
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Regularize sua assinatura
            </h1>
            <p className="text-muted-foreground mb-6">
              {role === "personal"
                ? "Para continuar usando a plataforma, ative ou renove sua assinatura."
                : `Para acessar seus treinos, escolha um dos planos oferecidos por ${personalName}.`}
            </p>
            <Button onClick={signOut} variant="ghost" className="gap-2">
              <LogOut size={16} /> Sair da conta
            </Button>
          </div>

          {role === "aluno" && personalId && (
            <AlunoCheckoutPlanos personalId={personalId} />
          )}
        </div>
      </div>
    );
  }

  const status = deriveStatus(isActive, lastLog as any);
  const isPausa = status === "pausado";
  const motivoLabel = lastLog?.motivo
    ? MOTIVO_LABELS[lastLog.motivo as AccessMotivo] ?? lastLog.motivo
    : null;
  const titulo = isPausa
    ? "Acesso temporariamente pausado"
    : "Acesso temporariamente suspenso";
  const Icone = isPausa ? Pause : ShieldAlert;
  const iconColor = isPausa ? "text-amber-600" : "text-destructive";
  const iconBg = isPausa ? "bg-amber-100" : "bg-destructive/10";
  const mensagemPersonalizada =
    lastLog?.mensagem_aluno?.trim() ||
    (isPausa
      ? `${personalName} pausou temporariamente seu acesso à plataforma.`
      : `${personalName} suspendeu temporariamente seu acesso à plataforma.`);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-md w-full bg-card shadow-xl rounded-lg p-8 text-center border">
        <div className="mb-6 flex justify-center">
          <div className={`${iconBg} p-4 rounded-full`}>
            <Icone size={48} className={iconColor} />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{titulo}</h1>

        {motivoLabel && (
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Motivo: {motivoLabel}
          </p>
        )}

        <div className="bg-muted/50 border-l-4 border-primary p-4 mb-6 text-left rounded-r">
          <p className="text-sm text-foreground whitespace-pre-wrap">{mensagemPersonalizada}</p>
          {lastLog?.created_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Desde {formatDisplayDate(lastLog.created_at)}
            </p>
          )}
        </div>

        {personalPhone ? (
          <div className="mb-3">
            <WhatsAppButton telefone={personalPhone} nome={personalName} />
          </div>
        ) : (
          <Button variant="outline" className="w-full mb-3" disabled>
            <MessageCircle size={16} className="mr-2" />
            Contato indisponível
          </Button>
        )}

        <Button onClick={signOut} variant="ghost" className="w-full flex items-center justify-center gap-2">
          <LogOut size={16} />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
