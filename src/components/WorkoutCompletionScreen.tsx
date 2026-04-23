// src/components/WorkoutCompletionScreen.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Trophy,
  Share2,
  Home,
  Star,
  ChevronDown,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkoutCompletionData } from "@/hooks/useWorkoutTimer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkoutCompletionScreenProps {
  data: WorkoutCompletionData;
  treinoId: string;
  onClose: () => void;
}

export function WorkoutCompletionScreen({
  data,
  treinoId,
  onClose,
}: WorkoutCompletionScreenProps) {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const enviarFeedback = async () => {
    if (!rating && !feedback.trim()) return;
    setIsSubmitting(true);
    try {
      const { data: sessaoData } = await supabase
        .from("treino_sessoes")
        .select("personal_id, profile_id")
        .eq("treino_semanal_id", treinoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (sessaoData?.personal_id) {
        await supabase.from("notificacoes").insert({
          destinatario_id: sessaoData.personal_id,
          tipo: "feedback_treino",
          titulo: "📝 Feedback do Treino",
          mensagem: `Avaliação: ${rating ? "⭐".repeat(rating) : "Sem nota"} - ${feedback || "Sem comentário"}`,
          dados: {
            treino_id: treinoId,
            rating,
            comentario: feedback,
            aluno_id: sessaoData.profile_id,
          },
          lida: false,
        });
      }
      toast.success("Feedback enviado!");
    } catch (err) {
      console.error("Erro ao enviar feedback:", err);
      toast.error("Erro ao enviar feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoltar = async () => {
    if (rating || feedback.trim()) {
      await enviarFeedback();
    }
    onClose();
  };

  const handleShare = async () => {
    const shareText = `🏋️ Treino concluído!\n\n⏱️ Tempo: ${data.tempoFormatado}\n💪 Exercícios: ${data.exerciciosConcluidos}/${data.exerciciosTotal}\n📅 ${data.data}\n\n${data.mensagemMotivacional}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Treino Concluído!",
          text: shareText,
        });
      } catch {
        /* cancel */
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copiado para a área de transferência!");
    }
  };

  // Tempo formatado: remove HH se for 00
  const tempoExibido = (() => {
    const parts = data.tempoFormatado.split(":");
    if (parts.length === 3 && parts[0] === "00") {
      return parts.slice(1).join(":");
    }
    return data.tempoFormatado;
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-y-auto p-4"
      >
        {/* Botão Compartilhar discreto no topo */}
        <button
          onClick={handleShare}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Compartilhar"
        >
          <Share2 className="h-5 w-5" />
        </button>

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full max-w-md"
        >
          <Card className="border-2 shadow-xl">
            <CardContent className="p-8 space-y-6">
              {/* Troféu */}
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
                  className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <Trophy className="h-10 w-10 text-primary" />
                </motion.div>
              </div>

              {/* Título */}
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  Treino Concluído
                </h1>
                <p className="text-sm text-muted-foreground">{data.data}</p>
              </div>

              {/* Tempo total destacado */}
              <div className="text-center space-y-1.5 py-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Tempo total
                </p>
                <p className="text-5xl font-bold font-mono tracking-tight text-foreground">
                  {tempoExibido}
                </p>
              </div>

              {/* Início → Fim e exercícios */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border bg-muted/30 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    Início → Fim
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {data.horaInicio} → {data.horaFim}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Exercícios
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {data.exerciciosConcluidos} de {data.exerciciosTotal}
                  </p>
                </div>
              </div>

              {/* Frase motivacional */}
              <p className="text-center text-sm text-muted-foreground italic px-2">
                {data.mensagemMotivacional}
              </p>

              {/* Feedback opcional em collapse */}
              <Collapsible open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                    Deixar feedback para o personal
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        feedbackOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="flex justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-0.5 transition-transform hover:scale-110"
                        aria-label={`${star} estrelas`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            rating && star <= rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Como foi o treino? (opcional)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="resize-none text-sm"
                    rows={3}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Ação primária */}
              <Button
                onClick={handleVoltar}
                className="w-full h-12 text-base gap-2"
                disabled={isSubmitting}
              >
                <Home className="h-5 w-5" />
                {isSubmitting ? "Enviando..." : "Voltar ao Início"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
