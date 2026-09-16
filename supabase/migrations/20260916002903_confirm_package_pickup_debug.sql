-- Migration: Nova RPC para validação de código de retirada com logs de debug
-- Substitui confirm_package_pickup_secure com retorno mais detalhado

CREATE OR REPLACE FUNCTION confirm_package_pickup_debug(
  p_package_id uuid,
  p_code text,
  p_picked_up_by uuid,
  p_picked_up_by_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_package packages%ROWTYPE;
  v_result jsonb;
  v_code_normalized text;
  v_stored_code text;
BEGIN
  -- Log do código recebido (primeiros 3 e últimos 3 dígitos, para debug sem expor completo)
  RAISE LOG 'confirm_package_pickup_debug: package_id=%, received_code_len=%, received_by=%, received_by_name=%.',
    p_package_id, length(p_code), p_picked_up_by, p_picked_up_by_name;

  -- Busca o pacote
  SELECT * INTO v_package
  FROM packages
  WHERE id = p_package_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE LOG 'confirm_package_pickup_debug: package not found id=%', p_package_id;
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'not_found',
      'message', 'Encomenda não encontrada.'
    );
  END IF;

  IF v_package.status = 'retirada' THEN
    RAISE LOG 'confirm_package_pickup_debug: package already picked up id=%', p_package_id;
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'already_picked_up',
      'message', 'Esta encomenda já foi retirada.'
    );
  END IF;

  -- Normaliza códigos para comparação (trim + uppercase)
  v_code_normalized := upper(trim(p_code));
  v_stored_code := upper(trim(coalesce(v_package.pickup_code, '')));

  RAISE LOG 'confirm_package_pickup_debug: comparing codes - stored=%, entered=% (len stored=%, len entered=%)',
    substring(v_stored_code, 1, 3) || '***',
    substring(v_code_normalized, 1, 3) || '***',
    length(v_stored_code),
    length(v_code_normalized);

  IF v_code_normalized <> v_stored_code THEN
    RAISE LOG 'confirm_package_pickup_debug: code mismatch for package id=%', p_package_id;
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'invalid_code',
      'message', 'Código de retirada incorreto. Peça ao morador o código recebido por WhatsApp.'
    );
  END IF;

  -- Código válido: atualiza o pacote
  UPDATE packages
  SET
    status = 'retirada',
    picked_up_at = now(),
    picked_up_by = p_picked_up_by,
    picked_up_by_name = p_picked_up_by_name
  WHERE id = p_package_id;

  RAISE LOG 'confirm_package_pickup_debug: pickup confirmed for package id=%', p_package_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Retirada confirmada com sucesso.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'confirm_package_pickup_debug: unexpected error - % %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'error',
      'message', 'Erro interno ao confirmar retirada: ' || SQLERRM
    );
END;
$$;

-- Permissão para porteiros e sindicos chamarem a função
GRANT EXECUTE ON FUNCTION confirm_package_pickup_debug(uuid, text, uuid, text) TO authenticated;
