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
    console.log("=== INÍCIO DA REQUISIÇÃO ===");

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
    const { data: isPersonal, error: personalError } = await supabaseAdmin.rpc(
      "check_user_has_role",
      { _user_id: user.id, required_role: "personal" }
    );

    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc(
      "check_user_has_role",
      { _user_id: user.id, required_role: "admin" }
    );

    console.log("Verificação de roles:", {
      isPersonal,
      isAdmin,
      personalError,
      adminError,
    });

    if (!isPersonal && !isAdmin) {
      console.error("❌ Usuário não tem permissão:", user.id);
      return new Response(
        JSON.stringify({
          error: "Apenas personal trainers ou admins podem criar alunos",
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
    console.log("📦 Body recebido:", { ...body, password: "***" });

    const { email, password, nome, telefone, personal_id } = body;

    // Validação dos campos obrigatórios
    if (!email || !password || !nome) {
      console.error("❌ Campos obrigatórios faltando:", {
        email: !!email,
        password: !!password,
        nome: !!nome,
      });
      return new Response(
        JSON.stringify({
          error: "Campos obrigatórios faltando",
          details: {
            email: !email ? "Email é obrigatório" : null,
            password: !password ? "Senha é obrigatória" : null,
            nome: !nome ? "Nome é obrigatório" : null,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (password.length < 6) {
      console.error("❌ Senha muito curta");
      return new Response(
        JSON.stringify({
          error: "A senha deve ter no mínimo 6 caracteres",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("🔄 Criando usuário no Auth...");

    // Cria o usuário no Auth
    const { data: authData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });

    if (createError) {
      console.error("❌ Erro ao criar usuário no Auth:", createError);

      // Verifica se é email duplicado
      if (
        createError.message?.includes("already been registered") ||
        createError.code === "email_exists"
      ) {
        return new Response(
          JSON.stringify({
            error: "Email já cadastrado",
            details:
              "Este email já está sendo usado por outro usuário. Use um email diferente.",
          }),
          {
            status: 409, // Conflict
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Erro ao criar usuário",
          details: createError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Usuário criado no Auth:", authData.user.id);

    // Aguarda um pouco para o trigger criar o profile
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("🔄 Atualizando profile...");

    // Atualiza o profile com TODOS os dados
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        nome,
        telefone: telefone || null,
        personal_id: personal_id || null,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("❌ Erro ao atualizar profile:", profileError);
      return new Response(
        JSON.stringify({
          error: "Usuário criado mas erro ao atualizar perfil",
          details: profileError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Profile atualizado com sucesso");

    // Verifica se a role de aluno já existe
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("*")
      .eq("user_id", authData.user.id)
      .eq("role", "aluno")
      .single();

    if (!existingRole) {
      console.log("🔄 Criando role de aluno...");
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "aluno",
        });

      if (roleError) {
        console.error(
          "⚠️ Erro ao criar role (pode já existir):",
          roleError.message
        );
      } else {
        console.log("✅ Role criada com sucesso");
      }
    } else {
      console.log("✅ Role já existe");
    }

    console.log("=== SUCESSO ===");

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          nome: nome,
        },
        message: "Aluno criado com sucesso",
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
