import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, LogIn, UserPlus } from "lucide-react";

export default function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10">
        <div className="max-w-2xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-bold tracking-normal text-foreground sm:text-5xl">
            FitConsult
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Plataforma para personals venderem planos, acompanharem alunos e liberarem acesso automaticamente apos o pagamento.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex h-full flex-col gap-4 p-6">
              <UserPlus className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Sou aluno</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Entre pelo link de venda enviado pelo seu personal para ver os planos corretos e criar sua conta vinculada.
                </p>
              </div>
              <Button asChild className="mt-auto w-fit">
                <Link to="/auth">Entrar na minha conta</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex h-full flex-col gap-4 p-6">
              <LogIn className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Sou personal</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Acesse seu painel para gerenciar alunos, planos, recebimentos e configuracoes da sua pagina publica.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-auto w-fit">
                <Link to="/auth">Acessar painel</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
