-- ═══════════════════════════════════════════════════════════════════════════
-- 005: Tabela pricing_plans — preços dinâmicos com vigência
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'standard',
  price_per_store NUMERIC(10,2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

-- Leitura pública (landing page exibe preço sem autenticação)
CREATE POLICY "public_read" ON pricing_plans
  FOR SELECT USING (true);

-- Escrita restrita a super_admin
CREATE POLICY "super_admin_write" ON pricing_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid()
        AND user_type = 'super_admin'
        AND active = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: retorna o preço vigente atual
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_current_pricing()
RETURNS TABLE(price_per_store NUMERIC, plan_name TEXT)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT p.price_per_store, p.name AS plan_name
  FROM pricing_plans p
  WHERE p.active = true
    AND p.valid_from <= CURRENT_DATE
    AND (p.valid_until IS NULL OR p.valid_until >= CURRENT_DATE)
  ORDER BY p.valid_from DESC
  LIMIT 1;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: plano padrão R$ 97 vigente desde 2025-01-01
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO pricing_plans (name, price_per_store, valid_from, valid_until, active)
VALUES ('standard', 97.00, '2025-01-01', NULL, true);
