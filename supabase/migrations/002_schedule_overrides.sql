-- Migration: Schedule Overrides — Horários diferenciados por dia da semana
-- Convenção: day_of_week 1=Seg..7=Dom (ISO 8601 ISODOW)

-- 1. Nova tabela para overrides esparsos (só exceções)
CREATE TABLE IF NOT EXISTS task_schedule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  due_time TIME,
  skip_day BOOLEAN NOT NULL DEFAULT false,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_template_id, day_of_week)
);

-- Index para busca rápida pelo cron
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_template
  ON task_schedule_overrides(task_template_id);

-- RLS
ALTER TABLE task_schedule_overrides ENABLE ROW LEVEL SECURITY;

-- Política: mesma organização pode ler e escrever
CREATE POLICY "org_access" ON task_schedule_overrides
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- 2. Nova coluna em checklist_items para horário efetivo (stampado pelo cron)
ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS effective_due_time TIME;

-- 3. Backfill: preencher effective_due_time com due_time do template para itens existentes
UPDATE checklist_items ci
SET effective_due_time = tt.due_time
FROM task_templates tt
WHERE ci.template_id = tt.id
  AND ci.effective_due_time IS NULL
  AND tt.due_time IS NOT NULL;
