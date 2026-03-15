-- ═══════════════════════════════════════════════════════════════════════════
-- 007: RLS policies para super_admin gerenciar subscriptions
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "super_admin_read_all" ON subscriptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND user_type = 'super_admin'
  ));

CREATE POLICY "super_admin_update_all" ON subscriptions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND user_type = 'super_admin'
  ));
