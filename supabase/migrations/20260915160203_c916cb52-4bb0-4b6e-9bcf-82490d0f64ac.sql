CREATE OR REPLACE FUNCTION public.confirm_package_pickup_secure(
  p_package_id uuid,
  p_code text,
  p_picked_up_by uuid,
  p_picked_up_by_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg public.packages%ROWTYPE;
BEGIN
  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  SELECT * INTO v_pkg FROM public.packages WHERE id = p_package_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_pkg.status = 'retirada' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_picked_up');
  END IF;

  IF upper(btrim(v_pkg.pickup_code)) <> upper(btrim(p_code)) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  UPDATE public.packages
  SET status = 'retirada',
      picked_up_at = now(),
      picked_up_by = p_picked_up_by,
      picked_up_by_name = NULLIF(btrim(p_picked_up_by_name), '')
  WHERE id = p_package_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_package_pickup_secure(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_package_pickup_secure(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_package_pickup_secure(uuid, text, uuid, text) TO service_role;