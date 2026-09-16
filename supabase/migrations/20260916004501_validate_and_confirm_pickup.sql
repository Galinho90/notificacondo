-- RPC simples: valida se o código está correto
CREATE OR REPLACE FUNCTION validate_pickup_code(
  p_package_id UUID,
  p_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  stored_code TEXT;
  pkg_status TEXT;
BEGIN
  SELECT pickup_code, status INTO stored_code, pkg_status
  FROM packages WHERE id = p_package_id;

  IF pkg_status IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF pkg_status = 'retirada' THEN
    RETURN json_build_object('success', false, 'reason', 'already_picked_up');
  END IF;

  RETURN json_build_object('success', stored_code = p_code);
END;
$$;

-- RPC completa: valida código E dá baixa
CREATE OR REPLACE FUNCTION confirm_pickup_code_with_validation(
  p_package_id UUID,
  p_code TEXT,
  p_picked_up_by UUID,
  p_picked_up_by_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  stored_code TEXT;
  pkg_status TEXT;
BEGIN
  SELECT pickup_code, status INTO stored_code, pkg_status
  FROM packages WHERE id = p_package_id;

  IF pkg_status IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF pkg_status = 'retirada' THEN
    RETURN json_build_object('success', false, 'reason', 'already_picked_up');
  END IF;

  IF stored_code != p_code THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  UPDATE packages
  SET status = 'retirada',
      picked_up_at = now(),
      picked_up_by = p_picked_up_by,
      picked_up_by_name = p_picked_up_by_name
  WHERE id = p_package_id;

  RETURN json_build_object('success', true);
END;
$$;