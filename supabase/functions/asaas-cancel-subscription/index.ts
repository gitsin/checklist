import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { asaasRequest } from "../_shared/asaasClient.ts";
import { CORS, validateAuth, validateOrgScoping, jsonResponse, errorResponse } from "../_shared/authGuard.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return errorResponse("Método não permitido", 405);

  try {
    const { callerProfile, adminClient, asaasApiKey, asaasBaseUrl } = await validateAuth(req);

    let body: { subscriptionId: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Corpo da requisição inválido", 400);
    }

    if (!body.subscriptionId) {
      return errorResponse("Campo obrigatório: subscriptionId", 400);
    }

    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("id, organization_id, asaas_subscription_id, status")
      .eq("id", body.subscriptionId)
      .single();

    if (!sub) return errorResponse("Assinatura não encontrada", 404);

    validateOrgScoping(callerProfile, sub.organization_id, "Sem permissão para cancelar esta assinatura");

    if (sub.status === "canceled") {
      return jsonResponse({ message: "Assinatura já está cancelada" });
    }

    if (sub.asaas_subscription_id) {
      const cancelResult = await asaasRequest(
        `${asaasBaseUrl}/subscriptions/${sub.asaas_subscription_id}`,
        "DELETE",
        asaasApiKey,
      );

      if (!cancelResult.ok) {
        console.error("Asaas cancel error:", JSON.stringify(cancelResult.data));
        const errors = cancelResult.data?.errors as Array<{ description?: string }> | undefined;
        const msg = errors?.[0]?.description || "Erro ao cancelar assinatura no Asaas";
        return errorResponse(msg, 422);
      }
    }

    const { error: dbError } = await adminClient
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", body.subscriptionId);

    if (dbError) console.error("DB update error:", dbError);

    return jsonResponse({ message: "Assinatura cancelada com sucesso" });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Unexpected error:", err);
    return errorResponse("Um erro ocorreu, por favor tente novamente", 500);
  }
});
