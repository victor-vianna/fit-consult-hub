import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ VALIDAÇÃO DE AUTH
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authCheckError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authCheckError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ SÓ ADMIN PODE CRIAR PERSONAL
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc(
      "check_user_has_role",
      {
        _user_id: user.id,
        required_role: "admin",
      }
    );

    if (adminCheckError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Apenas admins podem criar personals" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, password, nome, telefone } = await req.json();

    console.log("Criando personal:", { email, nome });

    // Criar usuário no auth
    const { data: authData, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });

    if (createAuthError || !authData.user) {
      console.error("Erro ao criar usuário:", createAuthError);
      throw createAuthError || new Error("Usuário não criado");
    }

    console.log("Usuário criado:", authData.user.id);

    // Atualizar profile com telefone
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ telefone })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Erro ao atualizar profile:", profileError);
      throw profileError;
    }

    // Remover role default 'aluno'
    const { error: deleteRoleError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", authData.user.id)
      .eq("role", "aluno");

    if (deleteRoleError) {
      console.error("Erro ao remover role aluno:", deleteRoleError);
      throw deleteRoleError;
    }

    // Adicionar role 'personal'
    const { error: createRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: authData.user.id, role: "personal" });

    if (createRoleError) {
      console.error("Erro ao adicionar role personal:", createRoleError);
      throw createRoleError;
    }

    console.log("Personal criado com sucesso");

    return new Response(
      JSON.stringify({ success: true, user: authData.user }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro geral:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
