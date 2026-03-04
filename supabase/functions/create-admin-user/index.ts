import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const TIPOS_PERMITIDOS: Record<string, string[]> = {
  super_admin:    ["holding_owner", "group_director", "store_manager", "colaborador", "disp_compartilhado"],
  holding_owner:  ["group_director", "store_manager", "colaborador", "disp_compartilhado"],
  group_director: ["store_manager", "colaborador", "disp_compartilhado"],
  store_manager:  ["colaborador"],
};

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

  // ── Validar body ──────────────────────────────────────────────────────────
  let body: {
    email: string;
    fullName: string;
    userType: string;
    organizationId: string;
    restaurantGroupId?: string | null;
    storeId?: string | null;
    phone?: string | null;
    password?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { email, fullName, userType, organizationId, restaurantGroupId, storeId, phone, password } = body;

  if (!email || !fullName || !userType || !organizationId) {
    return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  if (password && password.length < 6) {
    return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // ── Validar escopo ────────────────────────────────────────────────────────
  const callerType = callerProfile.user_type as string;
  const tiposPermitidos = TIPOS_PERMITIDOS[callerType];

  if (!tiposPermitidos || !tiposPermitidos.includes(userType)) {
    return new Response(JSON.stringify({ error: "Sem permissão para criar este tipo de usuário" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  if (callerType !== "super_admin" && organizationId !== callerProfile.organization_id) {
    return new Response(JSON.stringify({ error: "Organização inválida" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  if (callerType === "group_director" && restaurantGroupId && restaurantGroupId !== callerProfile.restaurant_group_id) {
    return new Response(JSON.stringify({ error: "Grupo inválido" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  // ── Criar auth user ───────────────────────────────────────────────────────
  // Com senha: cria direto (usuário já pode logar imediatamente)
  // Sem senha: envia convite por e-mail
  let newAuthUserId: string;

  if (password) {
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      if (createError.message?.includes("already registered") || createError.status === 422) {
        return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado no sistema" }), {
          status: 409, headers: { "Content-Type": "application/json" },
        });
      }
      console.error("Erro ao criar usuário:", createError);
      return new Response(JSON.stringify({ error: "Um erro ocorreu, por favor tente novamente" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }
    newAuthUserId = createData.user.id;
  } else {
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      { data: { full_name: fullName } },
    );

    if (inviteError) {
      if (inviteError.message?.includes("already been registered") || inviteError.status === 422) {
        return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado no sistema" }), {
          status: 409, headers: { "Content-Type": "application/json" },
        });
      }
      console.error("Erro ao convidar usuário:", inviteError);
      return new Response(JSON.stringify({ error: "Um erro ocorreu, por favor tente novamente" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }
    newAuthUserId = inviteData.user.id;
  }

  // ── Inserir perfil em user_profiles ──────────────────────────────────────
  const { data: newProfile, error: insertError } = await adminClient
    .from("user_profiles")
    .insert({
      auth_user_id: newAuthUserId,
      organization_id: organizationId,
      restaurant_group_id: restaurantGroupId || null,
      store_id: storeId || null,
      user_type: userType,
      full_name: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      active: true,
    })
    .select("id, email")
    .single();

  if (insertError) {
    await adminClient.auth.admin.deleteUser(newAuthUserId);
    console.error("Erro ao inserir perfil:", insertError);
    return new Response(JSON.stringify({ error: "Um erro ocorreu ao criar o perfil do usuário" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ id: newProfile.id, email: newProfile.email, withPassword: !!password }),
    { status: 201, headers: { "Content-Type": "application/json", ...CORS } },
  );
});
