-- ═══════════════════════════════════════════════════════════════════════════
-- 006: Tabela contact_submissions — mensagens do formulário de contato
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  attachment_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode inserir (formulário público)
CREATE POLICY "public_insert" ON contact_submissions
  FOR INSERT WITH CHECK (true);

-- Apenas super_admin pode ler
CREATE POLICY "super_admin_read" ON contact_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid()
        AND user_type = 'super_admin'
        AND active = true
    )
  );
