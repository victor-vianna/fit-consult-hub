import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Planilha {
  id: string;
  profile_id: string;
  personal_id: string;
  nome: string;
  data_prevista_fim: string;
  lembrete_enviado_7dias: boolean;
  lembrete_enviado_3dias: boolean;
  lembrete_enviado_expirou: boolean;
}

interface Profile {
  id: string;
  nome: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const hoje = new Date();
    const em7dias = new Date(hoje);
    em7dias.setDate(em7dias.getDate() + 7);
    const em3dias = new Date(hoje);
    em3dias.setDate(em3dias.getDate() + 3);

    const hojeStr = hoje.toISOString().split("T")[0];
    const em7diasStr = em7dias.toISOString().split("T")[0];
    const em3diasStr = em3dias.toISOString().split("T")[0];

    console.log(`[verificar-planilhas] Executando verificação: ${hojeStr}`);
    console.log(`[verificar-planilhas] Verificando expiração em 7 dias: ${em7diasStr}`);
    console.log(`[verificar-planilhas] Verificando expiração em 3 dias: ${em3diasStr}`);

    // Buscar planilhas ativas
    const { data: planilhas, error: errorPlanilhas } = await supabase
      .from("planilhas_treino")
      .select("*")
      .eq("status", "ativa");

    if (errorPlanilhas) {
      throw new Error(`Erro ao buscar planilhas: ${errorPlanilhas.message}`);
    }

    console.log(`[verificar-planilhas] Encontradas ${planilhas?.length || 0} planilhas ativas`);

    const notificacoesParaCriar: any[] = [];
    const planilhasParaAtualizar: { id: string; updates: any }[] = [];

    for (const planilha of planilhas || []) {
      const dataFim = planilha.data_prevista_fim;

      // Buscar nome do aluno
      const { data: aluno } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", planilha.profile_id)
        .single();

      const nomeAluno = aluno?.nome || "Aluno";

      // Verificar se expirou (hoje ou antes)
      if (dataFim <= hojeStr && !planilha.lembrete_enviado_expirou) {
        console.log(`[verificar-planilhas] Planilha ${planilha.id} EXPIROU`);
        
        // Notificação para o personal
        notificacoesParaCriar.push({
          destinatario_id: planilha.personal_id,
          tipo: "planilha_expirou",
          titulo: "Planilha expirada",
          mensagem: `A planilha de ${nomeAluno} expirou. Hora de criar uma nova!`,
          dados: { planilha_id: planilha.id, aluno_id: planilha.profile_id },
        });

        // Notificação para o aluno
        notificacoesParaCriar.push({
          destinatario_id: planilha.profile_id,
          tipo: "planilha_aluno_fim",
          titulo: "Sua planilha chegou ao fim!",
          mensagem: `A planilha "${planilha.nome}" finalizou. Em breve você receberá uma nova!`,
          dados: { planilha_id: planilha.id },
        });

        planilhasParaAtualizar.push({
          id: planilha.id,
          updates: { lembrete_enviado_expirou: true },
        });
      }
      // Verificar 3 dias antes
      else if (dataFim === em3diasStr && !planilha.lembrete_enviado_3dias) {
        console.log(`[verificar-planilhas] Planilha ${planilha.id} expira em 3 dias`);
        
        notificacoesParaCriar.push({
          destinatario_id: planilha.personal_id,
          tipo: "planilha_expira_3dias",
          titulo: "Planilha expira em 3 dias!",
          mensagem: `A planilha de ${nomeAluno} expira em 3 dias. Prepare a próxima fase!`,
          dados: { planilha_id: planilha.id, aluno_id: planilha.profile_id },
        });

        planilhasParaAtualizar.push({
          id: planilha.id,
          updates: { lembrete_enviado_3dias: true },
        });
      }
      // Verificar 7 dias antes
      else if (dataFim === em7diasStr && !planilha.lembrete_enviado_7dias) {
        console.log(`[verificar-planilhas] Planilha ${planilha.id} expira em 7 dias`);
        
        // Notificação para o personal
        notificacoesParaCriar.push({
          destinatario_id: planilha.personal_id,
          tipo: "planilha_expira_7dias",
          titulo: "Planilha expira em 1 semana",
          mensagem: `A planilha de ${nomeAluno} expira em 7 dias. Comece a planejar a próxima!`,
          dados: { planilha_id: planilha.id, aluno_id: planilha.profile_id },
        });

        // Notificação para o aluno
        notificacoesParaCriar.push({
          destinatario_id: planilha.profile_id,
          tipo: "planilha_aluno_lembrete",
          titulo: "Sua planilha está terminando",
          mensagem: `Faltam 7 dias para o fim da planilha "${planilha.nome}". Aproveite ao máximo!`,
          dados: { planilha_id: planilha.id },
        });

        planilhasParaAtualizar.push({
          id: planilha.id,
          updates: { lembrete_enviado_7dias: true },
        });
      }
    }

    // Criar notificações
    if (notificacoesParaCriar.length > 0) {
      console.log(`[verificar-planilhas] Criando ${notificacoesParaCriar.length} notificações`);
      
      const { error: errorNotificacoes } = await supabase
        .from("notificacoes")
        .insert(notificacoesParaCriar);

      if (errorNotificacoes) {
        console.error(`[verificar-planilhas] Erro ao criar notificações:`, errorNotificacoes);
      }
    }

    // Atualizar flags das planilhas
    for (const { id, updates } of planilhasParaAtualizar) {
      const { error } = await supabase
        .from("planilhas_treino")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error(`[verificar-planilhas] Erro ao atualizar planilha ${id}:`, error);
      }
    }

    console.log(`[verificar-planilhas] Concluído. Notificações: ${notificacoesParaCriar.length}, Atualizações: ${planilhasParaAtualizar.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        notificacoes_criadas: notificacoesParaCriar.length,
        planilhas_atualizadas: planilhasParaAtualizar.length,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[verificar-planilhas] Erro:", error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
