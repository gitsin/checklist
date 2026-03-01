-- ============================================================
-- Multi-Tenancy Migration - Fase 1 + 2
-- Execute este script INTEIRO no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- 1. NOVAS TABELAS
-- ============================================================

-- Holding / Empresa
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  active          BOOLEAN DEFAULT true,
  billing_email   TEXT,
  plan            TEXT DEFAULT 'trial',
  max_stores      INT DEFAULT 3,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Grupo de Restaurantes (marca/bandeira dentro da holding)
CREATE TABLE IF NOT EXISTS restaurant_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- Usuarios administrativos (vinculados ao Supabase Auth)
CREATE TABLE IF NOT EXISTS admin_users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id     UUID REFERENCES organizations(id),
  restaurant_group_id UUID REFERENCES restaurant_groups(id),
  email               TEXT NOT NULL,
  full_name           TEXT NOT NULL,
  role                TEXT NOT NULL CHECK (role IN ('super_admin', 'holding_owner', 'group_director')),
  active              BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ALTERAR TABELAS EXISTENTES
-- ============================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS restaurant_group_id UUID REFERENCES restaurant_groups(id);
ALTER TABLE employee ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE routine_templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- ============================================================
-- 3. MIGRACAO: Criar organizacao e grupo padrao + backfill
-- ============================================================

INSERT INTO organizations (id, name, slug, active, plan, max_stores)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Organizacao Padrao',
  'default',
  true,
  'enterprise',
  100
) ON CONFLICT (id) DO NOTHING;

INSERT INTO restaurant_groups (id, organization_id, name, slug, active)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Grupo Padrao',
  'default',
  true
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Backfill: vincula todos os dados existentes a org padrao
UPDATE stores SET
  organization_id = '00000000-0000-0000-0000-000000000001',
  restaurant_group_id = '00000000-0000-0000-0000-000000000002'
WHERE organization_id IS NULL;

UPDATE employee SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE roles SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE task_templates SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE checklist_items SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE routine_templates SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- ============================================================
-- 4. TORNAR COLUNAS NOT NULL (apos backfill garantir que nao ha NULLs)
-- ============================================================

ALTER TABLE stores ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE employee ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE roles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE task_templates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE checklist_items ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE routine_templates ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================
-- 5. INDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_stores_org ON stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_stores_group ON stores(restaurant_group_id);
CREATE INDEX IF NOT EXISTS idx_employee_org ON employee(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_org ON task_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_org ON checklist_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_routine_templates_org ON routine_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_org ON admin_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_auth ON admin_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_groups_org ON restaurant_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ============================================================
-- 6. FUNCOES HELPER PARA RLS (no schema public)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_org_id() RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'org_id')::uuid,
    (current_setting('request.headers', true)::json->>'x-org-id')::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
      AND active = true
    )),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS TEXT AS $$
  SELECT role FROM public.admin_users
  WHERE auth_user_id = auth.uid()
  AND active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 7. RLS NAS NOVAS TABELAS
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ----- ORGANIZATIONS -----
-- SELECT aberto: slug e nome sao publicos (usados na URL do kiosk)
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "org_insert" ON organizations
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "org_delete" ON organizations
  FOR DELETE USING (public.is_super_admin());

-- ----- RESTAURANT GROUPS -----
CREATE POLICY "groups_select" ON restaurant_groups
  FOR SELECT USING (
    public.is_super_admin()
    OR organization_id = public.get_org_id()
  );

CREATE POLICY "groups_insert" ON restaurant_groups
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR organization_id = public.get_org_id()
  );

CREATE POLICY "groups_update" ON restaurant_groups
  FOR UPDATE USING (
    public.is_super_admin()
    OR organization_id = public.get_org_id()
  );

CREATE POLICY "groups_delete" ON restaurant_groups
  FOR DELETE USING (
    public.is_super_admin()
    OR organization_id = public.get_org_id()
  );

-- ----- ADMIN USERS -----
-- SELECT: proprio perfil (auth.uid), super admin, ou mesma org
CREATE POLICY "admin_users_select" ON admin_users
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR public.is_super_admin()
    OR organization_id = public.get_org_id()
  );

CREATE POLICY "admin_users_insert" ON admin_users
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR organization_id = public.get_org_id()
  );

CREATE POLICY "admin_users_update" ON admin_users
  FOR UPDATE USING (
    public.is_super_admin()
    OR organization_id = public.get_org_id()
  );

-- ============================================================
-- NOTA SOBRE TABELAS EXISTENTES
-- ============================================================
-- RLS nas tabelas existentes (stores, employee, roles, task_templates,
-- checklist_items, routine_templates) sera habilitado em etapa separada
-- (Fase 2) apos validar que o fluxo kiosk funciona corretamente.
-- Por enquanto a filtragem por org e feita no frontend via queries.

-- ============================================================
-- INSTRUCOES MANUAIS POS-MIGRACAO
-- ============================================================
-- 1. Habilitar Email Provider em: Authentication > Providers > Email
--
-- 2. Criar primeiro usuario admin:
--    a) Va em Authentication > Users > Add User
--       Email: seu@email.com | Password: uma senha forte
--    b) Copie o UUID do usuario criado (coluna "User UID")
--    c) Execute no SQL Editor:
--
--       INSERT INTO admin_users (auth_user_id, organization_id, email, full_name, role)
--       VALUES (
--         'COLE-O-UUID-AQUI',
--         '00000000-0000-0000-0000-000000000001',
--         'seu@email.com',
--         'Seu Nome',
--         'holding_owner'
--       );
--
-- 3. Atualizar cron job de geracao de tarefas para incluir organization_id
--    nos INSERTs de checklist_items
