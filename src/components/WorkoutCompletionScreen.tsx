// src/components/WorkoutCompletionScreen.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Clock,
  Calendar,
  Coffee,
  Share2,
  Home,
  MessageSquare,
  Star,
  Dumbbell,
  CheckCircle2,
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

const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];

export function WorkoutCompletionScreen({
  data,
  treinoId,
  onClose,
}: WorkoutCompletionScreenProps) {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Dia atual da semana (0 = Domingo)
  const hoje = new Date().getDay();

  const handleSubmitFeedback = async () => {
    if (!rating && !feedback.trim()) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      // Salvar feedback na sessão ou criar notificação para o personal
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

      setSubmitted(true);
      toast.success("Obrigado pelo feedback!");
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Erro ao enviar feedback:", err);
      toast.error("Erro ao enviar feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const shareText = `🏋️ Treino concluído!\n\n⏱️ Tempo: ${data.tempoFormatado}\n📅 Data: ${data.data}\n\n${data.mensagemMotivacional}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Treino Concluído!",
          text: shareText,
        });
      } catch (err) {
        // Usuário cancelou ou erro
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copiar para clipboard
      await navigator.clipboard.writeText(shareText);
      toast.success("Copiado para a área de transferência!");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-primary/20 via-background to-background flex flex-col items-center justify-start overflow-y-auto py-8 px-4"
      >
        {/* Header com mensagem de parabéns */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl sm:text-4xl font-bold italic bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Parabéns!
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mt-2">
            Você concluiu seu treino!
          </p>
        </motion.div>

        {/* Card principal de conclusão */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="w-full max-w-md"
        >
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/95 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Header do card */}
              <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">FitConsult</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{data.data}</span>
                </div>
              </div>

              {/* Conteúdo principal */}
              <div className="p-6 space-y-6">
                {/* Ícone de troféu */}
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", bounce: 0.5 }}
                    className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    <Trophy className="h-10 w-10 text-primary" />
                  </motion.div>
                </div>

                {/* Título */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold">Treino Concluído!</h2>
                </div>

                {/* Tempo principal */}
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Tempo de treino:</p>
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-4xl sm:text-5xl font-bold font-mono tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
                  >
                    {data.tempoFormatado.split(":").slice(1).join(":")}
                  </motion.p>
                </div>

                {/* Horários */}
                <div className="flex justify-center gap-8 text-sm">
                  <div className="text-center">
                    <span className="text-muted-foreground">Início:</span>
                    <p className="font-semibold">{data.horaInicio}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-muted-foreground">Fim:</span>
                    <p className="font-semibold">{data.horaFim}</p>
                  </div>
                </div>

                {/* Estatísticas extras */}
                {(data.tempoDescanso > 0 || data.totalDescansos > 0) && (
                  <div className="flex justify-center gap-4">
                    {data.totalDescansos > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Coffee className="h-3 w-3" />
                        {data.totalDescansos} descansos
                      </Badge>
                    )}
                  </div>
                )}

                {/* Dias da semana com check no dia atual */}
                <div className="flex justify-center gap-2">
                  {diasSemana.map((dia, index) => (
                    <div
                      key={index}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        index === hoje
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-muted text-muted-foreground"
                      }`}
                    >
                      {index === hoje ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        dia
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Seção de feedback */}
        {!submitted && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="w-full max-w-md mt-6 space-y-4"
          >
            {/* Avaliação com estrelas */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                O que você achou do treino?
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        rating && star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de comentário */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Deixe um comentário para seu personal (opcional)
              </p>
              <Textarea
                placeholder="Como foi o treino? Alguma observação?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </motion.div>
        )}

        {/* Mensagem motivacional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="w-full max-w-md mt-6"
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-medium">{data.mensagemMotivacional}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Botões de ação */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="w-full max-w-md mt-6 space-y-3 pb-8"
        >
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full h-12 text-base gap-2"
          >
            <Share2 className="h-5 w-5" />
            Compartilhar
          </Button>

          <Button
            onClick={handleSubmitFeedback}
            className="w-full h-12 text-base gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Clock className="h-5 w-5" />
                </motion.div>
                Enviando...
              </>
            ) : submitted ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Obrigado!
              </>
            ) : (
              <>
                <Home className="h-5 w-5" />
                {rating || feedback.trim() ? "Enviar e Voltar" : "Voltar ao Início"}
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
