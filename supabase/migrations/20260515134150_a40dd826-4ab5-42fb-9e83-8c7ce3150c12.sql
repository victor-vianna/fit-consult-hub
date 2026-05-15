
-- Adiciona controle de acesso por pagamento em personal_settings
ALTER TABLE public.personal_settings
ADD COLUMN IF NOT EXISTS controle_acesso_por_pagamento boolean NOT NULL DEFAULT false;

-- Override por aluno em profiles (nullable: null = herda do personal)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS controle_acesso_por_pagamento boolean;

-- Tabela admin_settings (singleton)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  controle_acesso_personal_por_pagamento boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Garante uma única linha
INSERT INTO public.admin_settings (controle_acesso_personal_por_pagamento)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos autenticados podem ler admin_settings" ON public.admin_settings;
CREATE POLICY "Todos autenticados podem ler admin_settings"
ON public.admin_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Apenas admin atualiza admin_settings" ON public.admin_settings;
CREATE POLICY "Apenas admin atualiza admin_settings"
ON public.admin_settings FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Apenas admin insere admin_settings" ON public.admin_settings;
CREATE POLICY "Apenas admin insere admin_settings"
ON public.admin_settings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Função central de decisão de acesso
CREATE OR REPLACE FUNCTION public.pode_acessar_plataforma(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role user_role;
  v_is_active boolean;
  v_personal_id uuid;
  v_override boolean;
  v_personal_flag boolean;
  v_admin_flag boolean;
  v_has_pago boolean;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;

  -- Admin sempre acessa
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- is_active manual sempre prevalece como bloqueio
  SELECT is_active, personal_id, controle_acesso_por_pagamento
    INTO v_is_active, v_personal_id, v_override
  FROM public.profiles WHERE id = _user_id;

  IF v_is_active = false THEN
    RETURN false;
  END IF;

  IF v_role = 'personal' THEN
    SELECT controle_acesso_personal_por_pagamento INTO v_admin_flag
      FROM public.admin_settings LIMIT 1;
    IF COALESCE(v_admin_flag, false) = false THEN
      RETURN true;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.assinaturas
      WHERE personal_id = _user_id
        AND status = 'ativo'
        AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
    ) INTO v_has_pago;
    RETURN v_has_pago;
  END IF;

  IF v_role = 'aluno' THEN
    -- Determina flag efetiva: override do aluno > setting do personal
    IF v_override IS NOT NULL THEN
      v_personal_flag := v_override;
    ELSE
      SELECT controle_acesso_por_pagamento INTO v_personal_flag
        FROM public.personal_settings WHERE personal_id = v_personal_id LIMIT 1;
      v_personal_flag := COALESCE(v_personal_flag, false);
    END IF;

    IF v_personal_flag = false THEN
      RETURN true;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE student_id = _user_id
        AND status_pagamento = 'pago'
        AND data_expiracao > now()
    ) INTO v_has_pago;
    RETURN v_has_pago;
  END IF;

  RETURN true;
END;
$$;

-- Adiciona campo cancela_no_fim_do_ciclo se ainda não existe
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS cancela_no_fim_do_ciclo boolean NOT NULL DEFAULT false;
