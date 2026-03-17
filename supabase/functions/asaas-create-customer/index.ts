import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { asaasRequest } from "../_shared/asaasClient.ts";
import { CORS, validateAuth, validateOrgScoping, jsonResponse, errorResponse } from "../_shared/authGuard.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return errorResponse("Método não permitido", 405);

  try {
    const { callerProfile, adminClient, asaasApiKey, asaasBaseUrl } = await validateAuth(req);

    let body: {
      organizationId: string;
      name: string;
      cpfCnpj: string;
      email?: string;
      mobilePhone?: string;
      postalCode?: string;
      address?: string;
      addressNumber?: string;
      province?: string;
    };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Corpo da requisição inválido", 400);
    }

    const { organizationId, name, cpfCnpj } = body;
    if (!organizationId || !name || !cpfCnpj) {
      return errorResponse("Campos obrigatórios: organizationId, name, cpfCnpj", 400);
    }

    validateOrgScoping(callerProfile, organizationId, "Organização inválida");

    const { data: org } = await adminClient
      .from("organizations")
      .select("id, asaas_customer_id")
      .eq("id", organizationId)
      .single();

    if (!org) return errorResponse("Organização não encontrada", 404);

    if (org.asaas_customer_id) {
      return jsonResponse({
        asaas_customer_id: org.asaas_customer_id,
        message: "Cliente Asaas já existe para esta organização",
      });
    }

    const asaasPayload: Record<string, unknown> = {
      name,
      cpfCnpj: cpfCnpj.replace(/[^a-zA-Z0-9]/g, ""),
      externalReference: organizationId,
      notificationDisabled: false,
    };
    if (body.email) asaasPayload.email = body.email;
    if (body.mobilePhone) asaasPayload.mobilePhone = body.mobilePhone.replace(/\D/g, "");
    if (body.postalCode) asaasPayload.postalCode = body.postalCode.replace(/\D/g, "");
    if (body.address) asaasPayload.address = body.address;
    if (body.addressNumber) asaasPayload.addressNumber = body.addressNumber;
    if (body.province) asaasPayload.province = body.province;

    const asaasResult = await asaasRequest(
      `${asaasBaseUrl}/customers`,
      "POST",
      asaasApiKey,
      asaasPayload,
    );

    if (!asaasResult.ok) {
      console.error("Asaas error:", JSON.stringify(asaasResult.data));
      const errors = asaasResult.data?.errors as Array<{ description?: string }> | undefined;
      const msg = errors?.[0]?.description || "Erro ao criar cliente no Asaas";
      return errorResponse(msg, 422);
    }

    const { error: updateError } = await adminClient
      .from("organizations")
      .update({ asaas_customer_id: asaasResult.data.id })
      .eq("id", organizationId);

    if (updateError) {
      console.error("DB update error:", updateError);
      return errorResponse("Cliente criado no Asaas mas falhou ao salvar no banco", 500);
    }

    return jsonResponse({
      asaas_customer_id: asaasResult.data.id,
      message: "Cliente criado com sucesso",
    }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Unexpected error:", err);
    return errorResponse(String((err as Error)?.message || err), 500);
  }
});
