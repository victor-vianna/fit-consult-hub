import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  BookOpen,
  Trophy,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react";

interface LojaPlaceholderProps {
  isPersonal?: boolean;
  themeColor?: string;
}

export function LojaPlaceholder({ isPersonal = false, themeColor }: LojaPlaceholderProps) {
  const produtos = [
    {
      id: 1,
      nome: "E-book Nutrição Fitness",
      tipo: "ebook",
      icon: BookOpen,
      cor: "bg-blue-500/10 text-blue-500",
    },
    {
      id: 2,
      nome: "Programa 30 Dias",
      tipo: "programa",
      icon: Trophy,
      cor: "bg-green-500/10 text-green-500",
    },
    {
      id: 3,
      nome: "Desafio Verão",
      tipo: "desafio",
      icon: Sparkles,
      cor: "bg-orange-500/10 text-orange-500",
    },
  ];

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" style={{ color: themeColor }} />
            {isPersonal ? "Loja do Personal" : "Produtos Exclusivos"}
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Em Breve
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <p className="text-sm text-muted-foreground">
          {isPersonal
            ? "Em breve você poderá vender produtos digitais diretamente para seus alunos."
            : "Em breve você terá acesso a produtos exclusivos do seu personal."}
        </p>

        {/* Preview de Produtos */}
        <div className="grid gap-3">
          {produtos.map((produto) => (
            <div
              key={produto.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-60"
            >
              <div className={`p-2 rounded-lg ${produto.cor}`}>
                <produto.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{produto.nome}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {produto.tipo}
                </p>
              </div>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>

        {isPersonal && (
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled
            >
              Configurar Loja
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Overlay de "Em Breve" */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity cursor-not-allowed">
          <Badge variant="secondary" className="text-lg py-2 px-4 gap-2">
            <Lock className="h-4 w-4" />
            Disponível em breve
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
