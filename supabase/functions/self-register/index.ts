import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (action) {
      case "list_unlinked_employees": {
        // Return employees that don't have a user_id linked yet (available for registration)
        const { data, error } = await supabaseAdmin
          .from("employees")
          .select("id, name, sector, role")
          .is("user_id", null)
          .eq("status", "active")
          .order("name");

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ employees: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "register": {
        const { email, password, employee_id } = params;

        if (!email || !password || !employee_id) {
          return new Response(
            JSON.stringify({ error: "email, password e employee_id são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify employee exists and has no user_id
        const { data: emp, error: empError } = await supabaseAdmin
          .from("employees")
          .select("id, name, user_id")
          .eq("id", employee_id)
          .single();

        if (empError || !emp) {
          return new Response(
            JSON.stringify({ error: "Colaborador não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (emp.user_id) {
          return new Response(
            JSON.stringify({ error: "Este colaborador já possui um cadastro. Faça login." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create auth user
        const { data: newUser, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: emp.name },
          });

        if (createError) {
          if (createError.message.includes("already been registered")) {
            return new Response(
              JSON.stringify({ error: "Este e-mail já está cadastrado. Faça login." }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const userId = newUser.user.id;

        // Delete the default 'viewer' role and assign 'colaborador'
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "colaborador" });

        // Link user_id to employee record
        await supabaseAdmin.from("employees").update({ user_id: userId }).eq("id", employee_id);

        return new Response(
          JSON.stringify({ success: true, user_id: userId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "link_google_user": {
        // Called after Google OAuth login to link an existing auth user to an employee
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const supabaseUser = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { employee_id } = params;
        if (!employee_id) {
          return new Response(
            JSON.stringify({ error: "employee_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify employee exists and has no user_id
        const { data: emp } = await supabaseAdmin
          .from("employees")
          .select("id, user_id")
          .eq("id", employee_id)
          .single();

        if (!emp) {
          return new Response(
            JSON.stringify({ error: "Colaborador não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (emp.user_id) {
          return new Response(
            JSON.stringify({ error: "Este colaborador já possui um cadastro." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if user is already linked to another employee
        const { data: existingLink } = await supabaseAdmin
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingLink) {
          return new Response(
            JSON.stringify({ error: "Seu usuário já está vinculado a outro colaborador." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete the default 'viewer' role and assign 'colaborador'
        await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
        await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: "colaborador" });

        // Link
        await supabaseAdmin.from("employees").update({ user_id: user.id }).eq("id", employee_id);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
