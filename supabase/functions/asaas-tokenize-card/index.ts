import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { asaasRequest } from "../_shared/asaasClient.ts";
import { CORS, validateAuth, jsonResponse, errorResponse } from "../_shared/authGuard.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return errorResponse("Método não permitido", 405);

  try {
    const { asaasApiKey, asaasBaseUrl } = await validateAuth(req);

    let body: {
      asaasCustomerId: string;
      creditCard: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
      };
      creditCardHolderInfo: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        phone: string;
      };
    };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Corpo da requisição inválido", 400);
    }

    const { asaasCustomerId, creditCard, creditCardHolderInfo } = body;
    if (!asaasCustomerId || !creditCard || !creditCardHolderInfo) {
      return errorResponse("Campos obrigatórios: asaasCustomerId, creditCard, creditCardHolderInfo", 400);
    }

    if (!creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
      return errorResponse("Dados do cartão incompletos", 400);
    }

    if (!creditCardHolderInfo.name || !creditCardHolderInfo.cpfCnpj || !creditCardHolderInfo.postalCode || !creditCardHolderInfo.addressNumber || !creditCardHolderInfo.phone) {
      return errorResponse("Dados do titular incompletos", 400);
    }

    const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") || "0.0.0.0";

    const asaasPayload = {
      customer: asaasCustomerId,
      creditCard: {
        holderName: creditCard.holderName,
        number: creditCard.number.replace(/\D/g, ""),
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: creditCardHolderInfo.name,
        email: creditCardHolderInfo.email || "",
        cpfCnpj: creditCardHolderInfo.cpfCnpj.replace(/[^a-zA-Z0-9]/g, ""),
        postalCode: creditCardHolderInfo.postalCode.replace(/\D/g, ""),
        addressNumber: creditCardHolderInfo.addressNumber,
        phone: creditCardHolderInfo.phone.replace(/\D/g, ""),
      },
      remoteIp,
    };

    const asaasResult = await asaasRequest(
      `${asaasBaseUrl}/creditCard/tokenizeCreditCard`,
      "POST",
      asaasApiKey,
      asaasPayload,
    );

    if (!asaasResult.ok) {
      console.error("Asaas tokenize error:", JSON.stringify(asaasResult.data));
      const errors = asaasResult.data?.errors as Array<{ description?: string }> | undefined;
      const msg = errors?.[0]?.description || "Erro ao tokenizar cartão";
      return errorResponse(msg, 422);
    }

    const asaasData = asaasResult.data;
    return jsonResponse({
      creditCardToken: asaasData.creditCardToken,
      creditCardBrand: asaasData.creditCardBrand,
      creditCardNumber: asaasData.creditCardNumber,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Unexpected error:", err);
    return errorResponse("Um erro ocorreu, por favor tente novamente", 500);
  }
});
