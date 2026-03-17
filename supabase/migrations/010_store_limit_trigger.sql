-- Trigger para impedir criação de lojas além do limite da assinatura
CREATE OR REPLACE FUNCTION check_store_limit()
RETURNS TRIGGER AS $$
DECLARE
  max_allowed INTEGER;
  current_count INTEGER;
BEGIN
  -- Buscar max_stores da assinatura da organização
  SELECT s.max_stores INTO max_allowed
  FROM subscriptions s
  WHERE s.organization_id = NEW.organization_id
    AND s.status IN ('active', 'trial')
  LIMIT 1;

  -- Se não há assinatura ou max_stores é NULL, permitir (trial sem limite definido)
  IF max_allowed IS NULL THEN
    RETURN NEW;
  END IF;

  -- Contar lojas ativas da organização
  SELECT COUNT(*) INTO current_count
  FROM stores
  WHERE organization_id = NEW.organization_id
    AND active = true;

  -- Bloquear se atingiu o limite
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Limite de lojas atingido (% de %). Aumente seu plano para adicionar mais lojas.', current_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger apenas em INSERT (criação de nova loja)
DROP TRIGGER IF EXISTS enforce_store_limit ON stores;
CREATE TRIGGER enforce_store_limit
  BEFORE INSERT ON stores
  FOR EACH ROW
  EXECUTE FUNCTION check_store_limit();
