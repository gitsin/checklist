import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonClient = createClient(supabaseUrl, anonKey);

  // ── Validar body ────────────────────────────────────────────────────────
  let body: {
    fullName: string;
    email: string;
    password: string;
    businessName: string;
    phone?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const { fullName, email, password, businessName, phone } = body;

  if (!fullName || !email || !password || !businessName) {
    return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  if (password.length < 8) {
    return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 8 caracteres" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const emailNormalized = email.toLowerCase().trim();

  // ── Gerar slug único para organização ───────────────────────────────────
  let slug = slugify(businessName);
  if (!slug) slug = "org";

  const { data: existingSlugs } = await adminClient
    .from("organizations")
    .select("slug")
    .like("slug", `${slug}%`);

  if (existingSlugs && existingSlugs.length > 0) {
    const taken = new Set(existingSlugs.map((r: { slug: string }) => r.slug));
    if (taken.has(slug)) {
      let suffix = 2;
      while (taken.has(`${slug}-${suffix}`)) suffix++;
      slug = `${slug}-${suffix}`;
    }
  }

  // ── 1. Criar organização ────────────────────────────────────────────────
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({ name: businessName.trim(), slug, active: true })
    .select("id")
    .single();

  if (orgError) {
    console.error("Erro ao criar organização:", orgError);
    return new Response(JSON.stringify({ error: "Um erro ocorreu, por favor tente novamente" }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // ── 2. Criar auth user ──────────────────────────────────────────────────
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: emailNormalized,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName.trim() },
  });

  if (authError) {
    // Rollback: deletar organização
    await adminClient.from("organizations").delete().eq("id", org.id);

    if (authError.message?.includes("already registered") || authError.status === 422) {
      return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado no sistema" }), {
        status: 409, headers: { "Content-Type": "application/json", ...CORS },
      });
    }
    console.error("Erro ao criar usuário auth:", authError);
    return new Response(JSON.stringify({ error: "Um erro ocorreu, por favor tente novamente" }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const authUserId = authData.user.id;

  // ── 3. Criar user_profiles ──────────────────────────────────────────────
  const { error: profileError } = await adminClient
    .from("user_profiles")
    .insert({
      auth_user_id: authUserId,
      organization_id: org.id,
      user_type: "holding_owner",
      full_name: fullName.trim(),
      email: emailNormalized,
      phone: phone || null,
      active: true,
    });

  if (profileError) {
    // Rollback: deletar auth user e organização
    await adminClient.auth.admin.deleteUser(authUserId);
    await adminClient.from("organizations").delete().eq("id", org.id);
    console.error("Erro ao criar perfil:", profileError);
    return new Response(JSON.stringify({ error: "Um erro ocorreu, por favor tente novamente" }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // ── 4. Criar subscription (trial 7 dias) ───────────────────────────────
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Buscar preço vigente da tabela pricing_plans
  let currentPrice = 97.0;
  const { data: pricingData } = await adminClient.rpc("get_current_pricing");
  const pricingRow = Array.isArray(pricingData) ? pricingData[0] : pricingData;
  if (pricingRow?.price_per_store) {
    currentPrice = Number(pricingRow.price_per_store);
  }

  const { error: subError } = await adminClient
    .from("subscriptions")
    .insert({
      organization_id: org.id,
      plan: "standard",
      status: "trialing",
      max_stores: 1,
      price_per_store: currentPrice,
      trial_ends_at: trialEnd.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
    });

  if (subError) {
    // Não faz rollback completo por subscription — não é crítico
    console.error("Erro ao criar subscription (não-crítico):", subError);
  }

  // ── 5. Login automático → retornar sessão ───────────────────────────────
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: emailNormalized,
    password,
  });

  if (signInError) {
    // Conta criada mas login falhou — usuário pode logar manualmente
    console.error("Erro no auto-login:", signInError);
    return new Response(
      JSON.stringify({ success: true, session: null, message: "Conta criada. Faça login manualmente." }),
      { status: 201, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, session: signInData.session }),
    { status: 201, headers: { "Content-Type": "application/json", ...CORS } },
  );
});
