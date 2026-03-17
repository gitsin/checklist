/**
 * Cliente HTTP para Asaas API.
 *
 * O Deno fetch rejeita o caractere `$` presente na API key do Asaas
 * ($aact_hmlg_...) como "Invalid header value" quando usado no header.
 * Solução: passar access_token como query parameter (suportado pela API Asaas).
 */

export async function asaasRequest(
  url: string,
  method: string,
  apiKey: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  // Passar API key como query parameter para evitar validação de header
  const urlObj = new URL(url);
  urlObj.searchParams.set("access_token", apiKey);

  const fetchOptions: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body && method !== "GET" && method !== "HEAD") {
    fetchOptions.body = JSON.stringify(body);
  }

  const resp = await fetch(urlObj.toString(), fetchOptions);
  const statusCode = resp.status;

  try {
    const data = await resp.json();
    return { ok: statusCode >= 200 && statusCode < 300, status: statusCode, data };
  } catch {
    const text = await resp.text().catch(() => "");
    return { ok: false, status: statusCode, data: { error: text.slice(0, 500) || "Resposta inválida do Asaas" } };
  }
}
