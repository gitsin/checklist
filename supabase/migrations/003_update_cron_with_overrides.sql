-- ============================================================
-- Migration 003: Atualizar funções RPC para suportar schedule overrides
-- Resolve effective_due_time e skip_day ao gerar checklist_items
-- ============================================================

-- ============================================================
-- 1. Função auxiliar: resolve o due_time efetivo para um template + dia
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_effective_due_time(
  p_template_id UUID,
  p_date DATE
) RETURNS TIME AS $$
DECLARE
  v_iso_dow INT;
  v_override RECORD;
  v_default_time TIME;
BEGIN
  -- ISODOW: 1=Seg..7=Dom (mesma convenção do app)
  v_iso_dow := EXTRACT(ISODOW FROM p_date)::INT;

  -- Busca override para este dia da semana
  SELECT due_time, skip_day INTO v_override
  FROM task_schedule_overrides
  WHERE task_template_id = p_template_id
    AND day_of_week = v_iso_dow;

  -- Se encontrou override com skip_day, retorna NULL (sinal para não gerar)
  IF FOUND AND v_override.skip_day THEN
    RETURN NULL;
  END IF;

  -- Se encontrou override com due_time, usa ele
  IF FOUND AND v_override.due_time IS NOT NULL THEN
    RETURN v_override.due_time;
  END IF;

  -- Fallback: due_time padrão do template
  SELECT due_time INTO v_default_time
  FROM task_templates
  WHERE id = p_template_id;

  RETURN v_default_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 2. Função auxiliar: verifica se um dia deve ser pulado
-- ============================================================
CREATE OR REPLACE FUNCTION public.should_skip_day(
  p_template_id UUID,
  p_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
  v_iso_dow INT;
  v_skip BOOLEAN;
BEGIN
  v_iso_dow := EXTRACT(ISODOW FROM p_date)::INT;

  SELECT skip_day INTO v_skip
  FROM task_schedule_overrides
  WHERE task_template_id = p_template_id
    AND day_of_week = v_iso_dow;

  RETURN COALESCE(v_skip, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 3. Atualizar generate_daily_checklist (cron diário 04:00 AM)
-- ============================================================
DROP FUNCTION IF EXISTS public.generate_daily_checklist();
CREATE OR REPLACE FUNCTION public.generate_daily_checklist()
RETURNS JSONB AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_dow INT := EXTRACT(ISODOW FROM v_today)::INT; -- 1=Seg..7=Dom
  v_dom INT := EXTRACT(DAY FROM v_today)::INT;
  v_last_dom INT := EXTRACT(DAY FROM (DATE_TRUNC('month', v_today) + INTERVAL '1 month - 1 day'))::INT;
  v_count INT := 0;
  v_template RECORD;
  v_effective_time TIME;
BEGIN
  -- Itera sobre todos os templates ativos (exceto spot)
  FOR v_template IN
    SELECT id, store_id, organization_id, frequency_type, due_time,
           specific_day_of_week, specific_day_of_month
    FROM task_templates
    WHERE active = true
      AND frequency_type != 'spot'
  LOOP
    -- Verifica se deve gerar para hoje baseado na frequência
    CONTINUE WHEN v_template.frequency_type = 'weekly'
      AND v_template.specific_day_of_week != v_dow;

    CONTINUE WHEN v_template.frequency_type = 'monthly'
      AND v_template.specific_day_of_month != v_dom
      -- Exceção: se o mês tem menos dias que o configurado, gera no último dia
      AND NOT (v_dom = v_last_dom AND v_template.specific_day_of_month > v_last_dom);

    -- Verifica schedule override: skip_day
    IF public.should_skip_day(v_template.id, v_today) THEN
      CONTINUE;
    END IF;

    -- Resolve effective_due_time
    v_effective_time := public.resolve_effective_due_time(v_template.id, v_today);

    -- Insere checklist_item se não existir para hoje
    INSERT INTO checklist_items (
      template_id, store_id, organization_id, scheduled_date, status, effective_due_time
    )
    SELECT
      v_template.id,
      v_template.store_id,
      v_template.organization_id,
      v_today,
      'PENDING',
      v_effective_time
    WHERE NOT EXISTS (
      SELECT 1 FROM checklist_items
      WHERE template_id = v_template.id
        AND scheduled_date = v_today
    );

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total', v_count,
    'data_referencia', v_today::TEXT,
    'timestamp', NOW()::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Atualizar generate_same_day_tasks (botão UI "Gerar Rotina Hoje")
-- ============================================================
DROP FUNCTION IF EXISTS public.generate_same_day_tasks();
CREATE OR REPLACE FUNCTION public.generate_same_day_tasks()
RETURNS JSONB AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_dow INT := EXTRACT(ISODOW FROM v_today)::INT;
  v_dom INT := EXTRACT(DAY FROM v_today)::INT;
  v_last_dom INT := EXTRACT(DAY FROM (DATE_TRUNC('month', v_today) + INTERVAL '1 month - 1 day'))::INT;
  v_count INT := 0;
  v_items JSONB := '[]'::JSONB;
  v_template RECORD;
  v_effective_time TIME;
BEGIN
  FOR v_template IN
    SELECT id, store_id, organization_id, frequency_type, due_time,
           specific_day_of_week, specific_day_of_month
    FROM task_templates
    WHERE active = true
      AND frequency_type != 'spot'
  LOOP
    CONTINUE WHEN v_template.frequency_type = 'weekly'
      AND v_template.specific_day_of_week != v_dow;

    CONTINUE WHEN v_template.frequency_type = 'monthly'
      AND v_template.specific_day_of_month != v_dom
      AND NOT (v_dom = v_last_dom AND v_template.specific_day_of_month > v_last_dom);

    -- Verifica schedule override: skip_day
    IF public.should_skip_day(v_template.id, v_today) THEN
      CONTINUE;
    END IF;

    -- Resolve effective_due_time
    v_effective_time := public.resolve_effective_due_time(v_template.id, v_today);

    INSERT INTO checklist_items (
      template_id, store_id, organization_id, scheduled_date, status, effective_due_time
    )
    SELECT
      v_template.id,
      v_template.store_id,
      v_template.organization_id,
      v_today,
      'PENDING',
      v_effective_time
    WHERE NOT EXISTS (
      SELECT 1 FROM checklist_items
      WHERE template_id = v_template.id
        AND scheduled_date = v_today
    );

    IF FOUND THEN
      v_count := v_count + 1;
      v_items := v_items || jsonb_build_object('store_id', v_template.store_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'sucesso', true,
    'total', v_count,
    'items', v_items,
    'data_referencia', v_today::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
