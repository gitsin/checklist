import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

// Mapeamento de eventos Asaas → status da subscription no Niilu
const EVENT_STATUS_MAP: Record<string, string | null> = {
  PAYMENT_CONFIRMED: "active",
  PAYMENT_RECEIVED: "active",
  PAYMENT_OVERDUE: "past_due",
  PAYMENT_DELETED: null,
  PAYMENT_REFUNDED: null,
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "past_due",
  PAYMENT_CHARGEBACK_REQUESTED: null,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

  // ── Validar token do webhook ──────────────────────────────────────────
  if (webhookToken) {
    const receivedToken = req.headers.get("asaas-access-token");
    if (receivedToken !== webhookToken) {
      console.error("Webhook token inválido");
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS } },
      );
    }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Parse payload ─────────────────────────────────────────────────────
  let payload: {
    id?: string;
    event: string;
    payment: {
      id: string;
      customer: string;
      subscription?: string;
      value: number;
      status: string;
      billingType: string;
      externalReference?: string;
    };
  };
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Payload inválido" }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }

  const { event, payment } = payload;
  if (!event || !payment?.id) {
    return new Response(
      JSON.stringify({ error: "Payload incompleto" }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }

  // ── Idempotência: verificar se já processamos este evento ─────────────
  const eventId = payload.id || `${event}_${payment.id}_${Date.now()}`;

  const { data: existing } = await adminClient
    .from("payment_events")
    .select("id")
    .eq("asaas_event_id", eventId)
    .maybeSingle();

  if (existing) {
    // Evento já processado — retornar 200 para o Asaas não reenviar
    return new Response(
      JSON.stringify({ message: "Evento já processado" }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }

  // ── Resolver subscription e organization ──────────────────────────────
  let subscriptionId: string | null = null;
  let organizationId: string | null = null;

  // Tentar resolver pela assinatura Asaas
  if (payment.subscription) {
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("id, organization_id")
      .eq("asaas_subscription_id", payment.subscription)
      .maybeSingle();

    if (sub) {
      subscriptionId = sub.id;
      organizationId = sub.organization_id;
    }
  }

  // Fallback: resolver pelo customer Asaas
  if (!organizationId && payment.customer) {
    const { data: org } = await adminClient
      .from("organizations")
      .select("id")
      .eq("asaas_customer_id", payment.customer)
      .maybeSingle();

    if (org) {
      organizationId = org.id;

      // Buscar subscription da org se não encontrou acima
      if (!subscriptionId) {
        const { data: sub } = await adminClient
          .from("subscriptions")
          .select("id")
          .eq("organization_id", org.id)
          .eq("status", "active")
          .maybeSingle();

        if (sub) subscriptionId = sub.id;
      }
    }
  }

  // ── Salvar evento ─────────────────────────────────────────────────────
  const { error: insertError } = await adminClient
    .from("payment_events")
    .insert({
      asaas_event_id: eventId,
      asaas_payment_id: payment.id,
      subscription_id: subscriptionId,
      organization_id: organizationId,
      event_type: event,
      status: payment.status,
      value: payment.value,
      billing_type: payment.billingType,
      raw_payload: payload,
    });

  if (insertError) {
    console.error("Insert payment_event error:", insertError);
    // Não retornar erro — prosseguir com a atualização de status
  }

  // ── Atualizar status da subscription ──────────────────────────────────
  const newStatus = EVENT_STATUS_MAP[event];
  if (newStatus && subscriptionId) {
    const { error: updateError } = await adminClient
      .from("subscriptions")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId);

    if (updateError) {
      console.error("Update subscription status error:", updateError);
    }
  }

  // Log para eventos que precisam de atenção manual
  if (event === "PAYMENT_CHARGEBACK_REQUESTED") {
    console.error(
      `[ALERTA] Chargeback solicitado! Payment: ${payment.id}, Customer: ${payment.customer}, Valor: ${payment.value}`,
    );
  }

  if (event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED") {
    console.error(
      `[AVISO] Captura de cartão recusada. Payment: ${payment.id}, Customer: ${payment.customer}`,
    );
  }

  return new Response(
    JSON.stringify({ message: "Evento processado com sucesso" }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
  );
});
