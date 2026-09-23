import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { getNameInitials } from "@/utils/nameInitial";
import { useToast } from "@/hooks/use-toast";
import type { StudentAccessState } from "@/hooks/useStudentAccess";

type PublicPlan = {
  id: string;
  plano: string;
  valor: number | string;
  ativo: boolean;
};

type PublicSalesPage = {
  personal: {
    id: string;
    nome: string;
    slug: string;
  };
  settings: {
    display_name: string | null;
    logo_url: string | null;
    theme_color: string | null;
    welcome_title: string | null;
    welcome_message: string | null;
  };
  stripe_ready: boolean;
  prices: PublicPlan[];
};

type ViewerContext = {
  userId: string;
  role: string | null;
  personalId: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function PublicPersonal() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [page, setPage] = useState<PublicSalesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerContext | null>(null);
  const [viewerLoading, setViewerLoading] = useState(true);
  const [accessState, setAccessState] = useState<StudentAccessState | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const checkoutSucceeded = searchParams.get("checkout") === "success";
  const selectedPlan = searchParams.get("plan");

  useEffect(() => {
    let mounted = true;

    async function fetchPage() {
      if (!slug) return;
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await (supabase as any).rpc(
        "get_public_personal_sales_page",
        { _slug: slug }
      );

      if (!mounted) return;
      if (rpcError) {
        setError("Nao foi possivel carregar esta pagina.");
        setPage(null);
      } else if (!data) {
        setError("Pagina nao encontrada ou ainda nao publicada.");
        setPage(null);
      } else {
        setPage(data as PublicSalesPage);
      }
      setLoading(false);
    }

    fetchPage();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    let mounted = true;

    async function loadViewer() {
      setViewerLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!mounted || !user) {
        if (mounted) {
          setViewer(null);
          setViewerLoading(false);
        }
        return;
      }

      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("personal_id")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      setViewer({
        userId: user.id,
        role: roleResult.data?.role ?? null,
        personalId: profileResult.data?.personal_id ?? null,
      });
      setViewerLoading(false);
    }

    void loadViewer();
    return () => {
      mounted = false;
    };
  }, [page?.personal.id]);

  useEffect(() => {
    if (
      !viewer?.userId ||
      viewer.role !== "aluno" ||
      !page?.personal.id ||
      viewer.personalId !== page.personal.id
    ) {
      setAccessState(null);
      return;
    }

    let mounted = true;
    const refresh = async () => {
      const { data, error: accessError } = await (supabase as any).rpc(
        "get_student_access_state",
        { _student_id: viewer.userId }
      );
      if (!mounted || accessError || !data) return;

      const nextState = data as StudentAccessState;
      setAccessState(nextState);
      if (nextState.allowed !== true && nextState.source === "manual") {
        navigate("/acesso-suspenso", { replace: true });
      } else if (nextState.allowed === true && checkoutSucceeded) {
        navigate("/aluno?section=plano&checkout=success", { replace: true });
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 3_000);
    const channel = supabase
      .channel(`public-plans-access:${viewer.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_access_state",
          filter: `student_id=eq.${viewer.userId}`,
        },
        () => void refresh()
      )
      .subscribe();

    return () => {
      mounted = false;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [checkoutSucceeded, navigate, page?.personal.id, viewer]);

  const handleCheckout = async (plan: PublicPlan) => {
    if (!page || !slug || viewerLoading) return;

    if (!viewer) {
      navigate(`/auth?personal=${page.personal.slug}&plan=${plan.plano}`);
      return;
    }

    if (viewer.role !== "aluno") {
      toast({
        title: "Use uma conta de aluno",
        description: "Somente alunos podem contratar um plano nesta pagina.",
        variant: "destructive",
      });
      return;
    }

    if (viewer.personalId && viewer.personalId !== page.personal.id) {
      toast({
        title: "Conta vinculada a outro personal",
        description: "Entre em contato antes de trocar o personal da sua conta.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingPlan(plan.plano);

      if (!viewer.personalId) {
        const { error: linkError } = await (supabase as any).rpc(
          "link_current_student_to_public_personal",
          { _slug: slug }
        );
        if (linkError) throw linkError;
        setViewer((current) =>
          current ? { ...current, personalId: page.personal.id } : current
        );
      }

      const returnPath = `${window.location.origin}/planos/${page.personal.slug}`;
      const { data, error: checkoutError } = await supabase.functions.invoke(
        "stripe-create-checkout",
        {
          body: {
            plano: plan.plano,
            success_url: `${returnPath}?checkout=success`,
            cancel_url: `${returnPath}?checkout=cancel`,
          },
        }
      );

      if (checkoutError) throw checkoutError;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (!(data as any)?.url) throw new Error("URL de checkout nao recebida");
      window.location.assign((data as any).url);
    } catch (checkoutError: any) {
      console.error("Erro ao iniciar checkout:", checkoutError);
      toast({
        title: "Erro ao iniciar pagamento",
        description: checkoutError?.message ?? "Tente novamente.",
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  const displayName = page?.settings.display_name || page?.personal.nome || "Personal Trainer";
  const themeColor = page?.settings.theme_color || "#2563eb";
  const title = page?.settings.welcome_title || `Treine com ${displayName}`;
  const message =
    page?.settings.welcome_message ||
    "Escolha um plano, crie sua conta e acesse seus treinos assim que o pagamento for confirmado.";
  const plans = useMemo(() => {
    const prices = [...(page?.prices ?? [])];
    if (!selectedPlan) return prices;
    return prices.sort((a, b) =>
      a.plano === selectedPlan ? -1 : b.plano === selectedPlan ? 1 : 0
    );
  }, [page?.prices, selectedPlan]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando planos...
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 p-6 text-center">
            <h1 className="text-xl font-semibold">{error}</h1>
            <p className="text-sm text-muted-foreground">
              Confirme o link com o personal ou faca login se voce ja tem conta.
            </p>
            <Button asChild>
              <Link to="/auth">Ir para login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="pt-6">
            <div
              className="mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg text-xl font-bold text-white"
              style={{ backgroundColor: themeColor }}
            >
              {page.settings.logo_url ? (
                <img
                  src={page.settings.logo_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                getNameInitials(displayName, "P")
              )}
            </div>
            <Badge variant="secondary" className="mb-4">
              Consultoria fitness online
            </Badge>
            <h1 className="max-w-2xl text-4xl font-bold tracking-normal text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{message}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Pagamento seguro via Stripe
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Acesso liberado automaticamente
              </span>
            </div>
          </div>

          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Escolha seu plano</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!page.stripe_ready && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                  Os pagamentos deste personal ainda estao em configuracao.
                </div>
              )}

              {checkoutSucceeded && accessState?.allowed !== true && (
                <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Pagamento recebido. Aguardando a confirmacao para liberar seu acesso...
                </div>
              )}

              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum plano publico ativo no momento.
                </p>
              ) : (
                plans.map((plan) => (
                  <div key={plan.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">
                          {PLAN_LABELS[plan.plano] ?? plan.plano}
                        </h2>
                        <p className="mt-1 text-2xl font-bold">
                          {formatCurrency(plan.valor)}
                        </p>
                      </div>
                    </div>
                    {page.stripe_ready ? (
                      <Button
                        className="mt-4 w-full"
                        style={{ backgroundColor: themeColor }}
                        onClick={() => void handleCheckout(plan)}
                        disabled={loadingPlan !== null || viewerLoading}
                      >
                        {(loadingPlan === plan.plano || viewerLoading) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {plan.plano === selectedPlan
                          ? "Assinar plano selecionado"
                          : viewer?.role === "aluno"
                            ? "Assinar plano"
                            : "Comecar agora"}
                      </Button>
                    ) : (
                      <Button className="mt-4 w-full" disabled>
                        Pagamento em configuracao
                      </Button>
                    )}
                  </div>
                ))
              )}

              <p className="pt-2 text-center text-xs text-muted-foreground">
                {viewer ? (
                  <Link to={viewer.role === "aluno" ? "/aluno" : "/"} className="underline">
                    Voltar para minha conta
                  </Link>
                ) : (
                  <>Ja tem conta? <Link to="/auth" className="underline">Entrar</Link></>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
