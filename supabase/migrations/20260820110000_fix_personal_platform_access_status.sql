CREATE OR REPLACE FUNCTION public.pode_acessar_plataforma(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_admin_flag boolean;
  v_has_pago boolean;
  v_state jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  IF v_role = 'personal' THEN
    SELECT controle_acesso_personal_por_pagamento INTO v_admin_flag
    FROM public.admin_settings
    LIMIT 1;

    IF coalesce(v_admin_flag, false) = false THEN
      RETURN true;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.assinaturas
      WHERE personal_id = _user_id
        AND (
          (
            status IN ('ativo', 'ativa')
            AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
          )
          OR (
            status = 'trial'
            AND coalesce(trial, true) = true
            AND (trial_fim IS NULL OR trial_fim >= CURRENT_DATE)
          )
        )
    ) INTO v_has_pago;

    RETURN v_has_pago;
  END IF;

  IF v_role = 'aluno' THEN
    v_state := public.recalculate_student_access(_user_id);
    RETURN coalesce((v_state ->> 'allowed')::boolean, false);
  END IF;

  RETURN true;
END;
$$;
