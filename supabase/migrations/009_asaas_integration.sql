-- ═══════════════════════════════════════════════════════════════════════════
-- 009: Integração Asaas — colunas de vínculo + tabela payment_events
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Organizations: vínculo com cliente Asaas ─────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- ── Subscriptions: vínculo com assinatura Asaas ─────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_type TEXT CHECK (billing_type IN ('CREDIT_CARD','PIX','BOLETO','UNDEFINED')),
  ADD COLUMN IF NOT EXISTS card_last_four TEXT,
  ADD COLUMN IF NOT EXISTS card_brand TEXT;

-- ── Tabela payment_events: log de webhooks (idempotência) ───────────────
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_event_id TEXT UNIQUE NOT NULL,
  asaas_payment_id TEXT NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  organization_id UUID REFERENCES organizations(id),
  event_type TEXT NOT NULL,
  status TEXT,
  value NUMERIC(10,2),
  billing_type TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin vê payment_events
CREATE POLICY "super_admin_read_payment_events" ON payment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid()
        AND user_type = 'super_admin'
    )
  );

-- Holding owner vê eventos da própria org
CREATE POLICY "org_owner_read_payment_events" ON payment_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_events_org ON payment_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_sub ON payment_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_asaas_payment ON payment_events(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_sub ON subscriptions(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_organizations_asaas_cust ON organizations(asaas_customer_id);
