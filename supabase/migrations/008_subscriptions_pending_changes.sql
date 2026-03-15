-- Add pending_changes column for scheduled slot reductions and cancellations
ALTER TABLE subscriptions ADD COLUMN pending_changes JSONB DEFAULT NULL;

-- RLS: holding_owner can update their own subscription
CREATE POLICY "org_owner_update_own" ON subscriptions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE auth_user_id = auth.uid() AND user_type IN ('holding_owner','super_admin')
    )
  );
