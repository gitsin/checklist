import { createClient } from "jsr:@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export function errorResponse(error: string, status: number) {
  return jsonResponse({ error }, status);
}

interface AuthResult {
  callerProfile: { id: string; user_type: string; organization_id: string };
  adminClient: ReturnType<typeof createClient>;
  asaasApiKey: string;
  asaasBaseUrl: string;
}

/**
 * Validates auth and returns caller profile + admin client.
 * Throws a Response if auth fails.
 */
export async function validateAuth(req: Request): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const asaasApiKey = (Deno.env.get("ASAAS_API_KEY") || "").trim();
  const asaasBaseUrl = (Deno.env.get("ASAAS_BASE_URL") || "https://api-sandbox.asaas.com/v3").trim();

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw errorResponse("Não autorizado", 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user: callerAuthUser }, error: userError } =
    await callerClient.auth.getUser();
  if (userError || !callerAuthUser) throw errorResponse("Não autorizado", 401);

  const { data: callerProfile } = await adminClient
    .from("user_profiles")
    .select("id, user_type, organization_id")
    .eq("auth_user_id", callerAuthUser.id)
    .eq("active", true)
    .single();

  if (!callerProfile || !["super_admin", "holding_owner"].includes(callerProfile.user_type)) {
    throw errorResponse("Sem permissão para esta operação", 403);
  }

  return { callerProfile, adminClient, asaasApiKey, asaasBaseUrl };
}

export function validateOrgScoping(
  callerProfile: { user_type: string; organization_id: string },
  resourceOrgId: string,
  errorMsg = "Sem permissão para esta operação",
): void {
  if (callerProfile.user_type !== "super_admin" && resourceOrgId !== callerProfile.organization_id) {
    throw errorResponse(errorMsg, 403);
  }
}
