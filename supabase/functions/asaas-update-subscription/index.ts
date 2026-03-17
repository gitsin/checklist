import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { asaasRequest } from "../_shared/asaasClient.ts";
import { CORS, validateAuth, validateOrgScoping, jsonResponse, errorResponse } from "../_shared/authGuard.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return errorResponse("Método não permitido", 405);

  try {
    const { callerProfile, adminClient, asaasApiKey, asaasBaseUrl } = await validateAuth(req);

    let body: { subscriptionId: string; addStores: number };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Corpo da requisição inválido", 400);
    }

    const { subscriptionId, addStores } = body;
    if (!subscriptionId || !addStores || addStores < 1) {
      return errorResponse("Campos obrigatórios: subscriptionId, addStores (>= 1)", 400);
    }

    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("id, organization_id, max_stores, price_per_store, asaas_subscription_id, asaas_customer_id, current_period_end")
      .eq("id", subscriptionId)
      .single();

    if (!sub) return errorResponse("Assinatura não encontrada", 404);

    validateOrgScoping(callerProfile, sub.organization_id, "Sem permissão para alterar esta assinatura");

    const newMaxStores = (sub.max_stores || 1) + addStores;
    const pricePerStore = Number(sub.price_per_store || 0);
    const newValue = newMaxStores * pricePerStore;

    if (sub.asaas_subscription_id) {
      const updateResult = await asaasRequest(
        `${asaasBaseUrl}/subscriptions/${sub.asaas_subscription_id}`,
        "PUT",
        asaasApiKey,
        { value: newValue, description: `Niilu - Plano ${newMaxStores} loja(s)` },
      );

      if (!updateResult.ok) {
        console.error("Asaas update error:", JSON.stringify(updateResult.data));
        const errors = updateResult.data?.errors as Array<{ description?: string }> | undefined;
        const msg = errors?.[0]?.description || "Erro ao atualizar assinatura no Asaas";
        return errorResponse(msg, 422);
      }

      // Cobrança pró-rata
      if (sub.current_period_end && sub.asaas_customer_id) {
        const today = new Date();
        const periodEnd = new Date(sub.current_period_end);
        const daysRemaining = Math.max(1, Math.ceil((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        const proRataValue = Math.round((addStores * pricePerStore * daysRemaining / 30) * 100) / 100;

        if (proRataValue > 0) {
          const chargeResult = await asaasRequest(`${asaasBaseUrl}/payments`, "POST", asaasApiKey, {
            customer: sub.asaas_customer_id,
            billingType: "UNDEFINED",
            value: proRataValue,
            dueDate: today.toISOString().split("T")[0],
            description: `Niilu - Pró-rata ${addStores} loja(s) adicional(is)`,
            externalReference: subscriptionId,
          });

          if (!chargeResult.ok) {
            console.error("Asaas pro-rata charge error:", JSON.stringify(chargeResult.data));
          }
        }
      }
    }

    const { error: dbError } = await adminClient
      .from("subscriptions")
      .update({ max_stores: newMaxStores, updated_at: new Date().toISOString() })
      .eq("id", subscriptionId);

    if (dbError) console.error("DB update error:", dbError);

    return jsonResponse({ newMaxStores, newValue, message: `Plano atualizado para ${newMaxStores} lojas` });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Unexpected error:", err);
    return errorResponse(String((err as Error)?.message || err), 500);
  }
});
