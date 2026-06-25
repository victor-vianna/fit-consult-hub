// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Trata preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    console.log("=== DELETE ALUNO - INÍCIO ===");

    // Validação de autenticação
    const authHeader = req.headers.get("authorization");
    console.log("Auth Header presente:", !!authHeader);

    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ Token ausente ou inválido");
      return new Response(
        JSON.stringify({ error: "Não autorizado - Token ausente" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Erro ao validar usuário:", authError);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Usuário autenticado:", user.id);

    // Verifica se é personal ou admin
    const { data: isPersonal } = await supabaseAdmin.rpc(
      "check_user_has_role",
      { _user_id: user.id, required_role: "personal" }
    );

    const { data: isAdmin } = await supabaseAdmin.rpc(
      "check_user_has_role",
      { _user_id: user.id, required_role: "admin" }
    );

    console.log("Verificação de roles:", { isPersonal, isAdmin });

    if (!isPersonal && !isAdmin) {
      console.error("❌ Usuário não tem permissão:", user.id);
      return new Response(
        JSON.stringify({
          error: "Apenas personal trainers ou admins podem deletar alunos",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Permissões validadas");

    // Recebe os dados do request
    const body = await req.json();
    console.log("📦 Body recebido:", body);

    const { aluno_id } = body;

    if (!aluno_id) {
      return new Response(
        JSON.stringify({ error: "ID do aluno é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica se o aluno pertence ao personal (se não for admin)
    if (!isAdmin) {
      const { data: alunoProfile, error: alunoError } = await supabaseAdmin
        .from("profiles")
        .select("personal_id")
        .eq("id", aluno_id)
        .single();

      if (alunoError) {
        console.error("❌ Erro ao buscar aluno:", alunoError);
        return new Response(
          JSON.stringify({ error: "Aluno não encontrado" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (alunoProfile.personal_id !== user.id) {
        console.error("❌ Aluno não pertence ao personal");
        return new Response(
          JSON.stringify({ error: "Você não tem permissão para deletar este aluno" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("🔄 Deletando dados relacionados...");

    // Deletar dados relacionados (em ordem de dependência)
    // 1. Notificações
    await supabaseAdmin
      .from("notificacoes")
      .delete()
      .eq("destinatario_id", aluno_id);

    // 2. Exercícios de treinos semanais
    const { data: treinosSemanais } = await supabaseAdmin
      .from("treinos_semanais")
      .select("id")
      .eq("profile_id", aluno_id);

    if (treinosSemanais && treinosSemanais.length > 0) {
      const treinoIds = treinosSemanais.map(t => t.id);
      
      // Deletar exercícios
      await supabaseAdmin
        .from("exercicios")
        .delete()
        .in("treino_semanal_id", treinoIds);

      // Deletar blocos de treino
      await supabaseAdmin
        .from("blocos_treino")
        .delete()
        .in("treino_semanal_id", treinoIds);
    }

    // 3. Treinos semanais
    await supabaseAdmin
      .from("treinos_semanais")
      .delete()
      .eq("profile_id", aluno_id);

    // 4. Sessões de treino e descansos
    const { data: sessoes } = await supabaseAdmin
      .from("treino_sessoes")
      .select("id")
      .eq("profile_id", aluno_id);

    if (sessoes && sessoes.length > 0) {
      const sessaoIds = sessoes.map(s => s.id);
      await supabaseAdmin
        .from("treino_descansos")
        .delete()
        .in("sessao_id", sessaoIds);
    }

    await supabaseAdmin
      .from("treino_sessoes")
      .delete()
      .eq("profile_id", aluno_id);

    // 5. Check-ins semanais
    await supabaseAdmin
      .from("checkins_semanais")
      .delete()
      .eq("profile_id", aluno_id);

    // 6. Anamnese inicial
    await supabaseAdmin
      .from("anamnese_inicial")
      .delete()
      .eq("profile_id", aluno_id);

    // 7. Avaliações físicas e fotos
    const { data: avaliacoes } = await supabaseAdmin
      .from("avaliacoes_fisicas")
      .select("id")
      .eq("profile_id", aluno_id);

    if (avaliacoes && avaliacoes.length > 0) {
      const avaliacaoIds = avaliacoes.map(a => a.id);
      await supabaseAdmin
        .from("fotos_evolucao")
        .delete()
        .in("avaliacao_id", avaliacaoIds);
    }

    await supabaseAdmin
      .from("avaliacoes_fisicas")
      .delete()
      .eq("profile_id", aluno_id);

    // 8. Fotos de evolução órfãs
    await supabaseAdmin
      .from("fotos_evolucao")
      .delete()
      .eq("profile_id", aluno_id);

    // 9. Materiais
    await supabaseAdmin
      .from("materiais")
      .delete()
      .eq("profile_id", aluno_id);

    // 10. Planilhas de treino
    await supabaseAdmin
      .from("planilhas_treino")
      .delete()
      .eq("profile_id", aluno_id);

    // 11. Subscriptions e payment history
    const { data: subscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("student_id", aluno_id);

    if (subscriptions && subscriptions.length > 0) {
      const subIds = subscriptions.map(s => s.id);
      await supabaseAdmin
        .from("payment_history")
        .delete()
        .in("subscription_id", subIds);
    }

    await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("student_id", aluno_id);

    // 12. Student access logs
    await supabaseAdmin
      .from("student_access_logs")
      .delete()
      .eq("student_id", aluno_id);

    // 13. Activity logs
    await supabaseAdmin
      .from("activity_logs")
      .delete()
      .eq("user_id", aluno_id);

    console.log("🔄 Deletando user_roles...");

    // 14. User roles
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", aluno_id);

    console.log("🔄 Deletando profile...");

    // 15. Profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", aluno_id);

    if (profileError) {
      console.error("❌ Erro ao deletar profile:", profileError);
      return new Response(
        JSON.stringify({
          error: "Erro ao deletar perfil do aluno",
          details: profileError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("🔄 Deletando usuário do Auth...");

    // 16. Auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      aluno_id
    );

    if (authDeleteError) {
      console.error("⚠️ Erro ao deletar usuário do Auth:", authDeleteError);
      // Não retorna erro pois o profile já foi deletado
    } else {
      console.log("✅ Usuário deletado do Auth");
    }

    console.log("=== DELETE ALUNO - SUCESSO ===");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Aluno deletado com sucesso",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ ERRO GERAL:", error);
    console.error("Stack:", error.stack);

    return new Response(
      JSON.stringify({
        error: "Erro ao processar requisição",
        message: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
