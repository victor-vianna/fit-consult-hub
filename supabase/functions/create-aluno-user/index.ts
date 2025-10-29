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
    // ✅ ADICIONE ESTA VALIDAÇÃO DE AUTH
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

    // Valida o token e pega o usuário
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ USA A FUNÇÃO RPC PARA VERIFICAR SE É PERSONAL OU ADMIN
    const { data: isPersonal, error: roleError1 } = await supabaseAdmin.rpc(
      "check_user_has_role",
      {
        _user_id: user.id,
        required_role: "personal",
      }
    );

    const { data: isAdmin, error: roleError2 } = await supabaseAdmin.rpc(
      "check_user_has_role",
      {
        _user_id: user.id,
        required_role: "admin",
      }
    );

    if (roleError1 || roleError2 || (!isPersonal && !isAdmin)) {
      return new Response(
        JSON.stringify({
          error: "Apenas personals ou admins podem criar alunos",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, password, nome, telefone, personal_id } = await req.json();

    console.log("Criando aluno:", { email, nome, personal_id });

    // Criar usuário no auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });

    if (authError) {
      console.error("Erro ao criar usuário:", authError);
      throw authError;
    }

    console.log("Usuário criado:", authData.user.id);

    // Atualizar profile com telefone e personal_id
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        telefone,
        personal_id,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Erro ao atualizar profile:", profileError);
      throw profileError;
    }

    console.log("Aluno criado com sucesso");

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
