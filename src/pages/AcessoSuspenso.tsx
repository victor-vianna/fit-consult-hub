import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Pause, ShieldAlert, LogOut, MessageCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlunoCheckoutPlanos } from "@/components/AlunoCheckoutPlanos";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import type { StudentAccessState } from "@/hooks/useStudentAccess";
import { getAccessReasonLabel } from "@/hooks/useStudentAccess";
import { formatDisplayDate } from "@/utils/dateFormat";

export default function AcessoSuspenso() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [personalPhone, setPersonalPhone] = useState<string | null>(null);
  const [personalName, setPersonalName] = useState<string>("seu personal trainer");
  const [personalId, setPersonalId] = useState<string | null>(null);
  const [state, setState] = useState<StudentAccessState | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (role === "aluno" && state?.allowed === true) {
      navigate("/aluno", { replace: true });
    }
  }, [navigate, role, state?.allowed]);

  useEffect(() => {
    if (!studentId || role !== "aluno") return;

    const channel = supabase
      .channel(`blocked-page-access-state:${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_access_state",
          filter: `student_id=eq.${studentId}`,
        },
        (payload: any) => {
          const nextState = payload.new as StudentAccessState | undefined;
          if (!nextState) return;

          setState(nextState);
          if (nextState.allowed === true) {
            navigate("/aluno", { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, role, studentId]);

  async function fetchData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setStudentId(user.id);

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      setRole(roleRow?.role ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("personal_id")
        .eq("id", user.id)
        .single();

      if (roleRow?.role === "aluno") {
        const { data: accessState, error } = await (supabase as any).rpc(
          "get_student_access_state",
          { _student_id: user.id }
        );
        if (error) throw error;
        const nextState = accessState as StudentAccessState;
        setState(nextState);

        if (nextState?.allowed === true) {
          navigate("/aluno", { replace: true });
          return;
        }
      }

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
      }
    } catch (error) {
      console.error("Erro ao buscar contexto de acesso:", error);
    }
  }

  if (role === "aluno" && state?.allowed === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
        <p className="text-muted-foreground">Acesso liberado. Redirecionando...</p>
      </div>
    );
  }

  const isPaymentBlock =
    state?.source === "payment" ||
    state?.reason_code === "payment_required" ||
    state?.reason_code === "payment_expired" ||
    state?.reason_code === "payment_pending";

  if (role === "aluno" && isPaymentBlock) {
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
            <p className="text-muted-foreground mb-2">
              Para acessar seus treinos, escolha um dos planos oferecidos por {personalName}.
            </p>
            {state?.reason && (
              <p className="text-sm text-muted-foreground mb-6">{state.reason}</p>
            )}
            <Button onClick={signOut} variant="ghost" className="gap-2">
              <LogOut size={16} /> Sair da conta
            </Button>
          </div>

          {personalId && <AlunoCheckoutPlanos personalId={personalId} />}
        </div>
      </div>
    );
  }

  const isPausa = state?.status === "pausado";
  const motivoLabel = getAccessReasonLabel(state?.reason_code);
  const titulo = isPausa
    ? "Acesso temporariamente pausado"
    : "Acesso temporariamente suspenso";
  const Icone = isPausa ? Pause : ShieldAlert;
  const iconColor = isPausa ? "text-amber-600" : "text-destructive";
  const iconBg = isPausa ? "bg-amber-100" : "bg-destructive/10";
  const mensagemPersonalizada =
    state?.message_aluno?.trim() ||
    state?.reason ||
    (isPausa
      ? `${personalName} pausou temporariamente seu acesso a plataforma.`
      : `${personalName} suspendeu temporariamente seu acesso a plataforma.`);

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
          {state?.updated_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Desde {formatDisplayDate(state.updated_at)}
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
            Contato indisponivel
          </Button>
        )}

        <Button
          onClick={signOut}
          variant="ghost"
          className="w-full flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
