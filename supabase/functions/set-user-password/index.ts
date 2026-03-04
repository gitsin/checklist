import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Validar identidade do caller ──────────────────────────────────────────
  const { data: { user: callerAuthUser }, error: userError } = await callerClient.auth.getUser();
  if (userError || !callerAuthUser) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const { data: callerProfile, error: profileError } = await adminClient
    .from("user_profiles")
    .select("id, user_type, organization_id, restaurant_group_id")
    .eq("auth_user_id", callerAuthUser.id)
    .eq("active", true)
    .single();

  if (profileError || !callerProfile) {
    return new Response(JSON.stringify({ error: "Perfil do solicitante não encontrado" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  // Apenas perfis admin podem trocar senha de outros
  const callerType = callerProfile.user_type as string;
  if (!["super_admin", "holding_owner", "group_director"].includes(callerType)) {
    return new Response(JSON.stringify({ error: "Sem permissão para alterar senhas" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  // ── Validar body ──────────────────────────────────────────────────────────
  let body: { profileId: string; newPassword: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { profileId, newPassword } = body;

  if (!profileId || !newPassword) {
    return new Response(JSON.stringify({ error: "profileId e newPassword são obrigatórios" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  if (newPassword.length < 6) {
    return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // ── Buscar o usuário alvo e validar escopo ────────────────────────────────
  const { data: targetProfile, error: targetError } = await adminClient
    .from("user_profiles")
    .select("id, auth_user_id, user_type, organization_id, restaurant_group_id")
    .eq("id", profileId)
    .single();

  if (targetError || !targetProfile) {
    return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }

  // Não pode trocar senha de super_admin
  if (targetProfile.user_type === "super_admin") {
    return new Response(JSON.stringify({ error: "Sem permissão para alterar este usuário" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  // Validar que o alvo está dentro do escopo do caller
  if (callerType !== "super_admin") {
    if (targetProfile.organization_id !== callerProfile.organization_id) {
      return new Response(JSON.stringify({ error: "Usuário fora do escopo permitido" }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }
    if (callerType === "group_director") {
      if (targetProfile.restaurant_group_id !== callerProfile.restaurant_group_id) {
        return new Response(JSON.stringify({ error: "Usuário fora do escopo permitido" }), {
          status: 403, headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  if (!targetProfile.auth_user_id) {
    return new Response(JSON.stringify({ error: "Este usuário não possui conta de acesso vinculada" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // ── Alterar senha via admin API ───────────────────────────────────────────
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    targetProfile.auth_user_id,
    { password: newPassword },
  );

  if (updateError) {
    console.error("Erro ao alterar senha:", updateError);
    return new Response(JSON.stringify({ error: "Um erro ocorreu, por favor tente novamente" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { "Content-Type": "application/json", ...CORS },
  });
});
