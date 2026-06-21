-- Public sales page for each personal.
-- Keeps public reads narrow by exposing only a SECURITY DEFINER RPC.

CREATE OR REPLACE FUNCTION public.normalize_public_slug(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(coalesce(_value, '')), '[^a-z0-9]+', '-', 'g'),
      '-+',
      '-',
      'g'
    )),
    ''
  )
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_public_slug_unique
  ON public.profiles(public_slug)
  WHERE public_slug IS NOT NULL;

UPDATE public.profiles p
SET public_slug = concat(
  coalesce(public.normalize_public_slug(p.nome), 'personal'),
  '-',
  substr(p.id::text, 1, 8)
)
WHERE p.public_slug IS NULL;

UPDATE public.profiles p
SET public_profile_enabled = true
WHERE EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = p.id
    AND ur.role = 'personal'
);

CREATE OR REPLACE FUNCTION public.set_profile_public_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.public_slug IS NULL OR btrim(NEW.public_slug) = '' THEN
    NEW.public_slug := concat(
      coalesce(public.normalize_public_slug(NEW.nome), 'usuario'),
      '-',
      substr(NEW.id::text, 1, 8)
    );
  ELSE
    NEW.public_slug := concat(
      public.normalize_public_slug(NEW.public_slug),
      CASE
        WHEN public.normalize_public_slug(NEW.public_slug) IS NULL THEN substr(NEW.id::text, 1, 8)
        ELSE ''
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_public_slug_before_save ON public.profiles;
CREATE TRIGGER set_profile_public_slug_before_save
BEFORE INSERT OR UPDATE OF nome, public_slug ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_public_slug();

CREATE OR REPLACE FUNCTION public.get_public_personal_sales_page(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'personal', jsonb_build_object(
      'id', p.id,
      'nome', p.nome,
      'slug', p.public_slug
    ),
    'settings', jsonb_build_object(
      'display_name', ps.display_name,
      'logo_url', ps.logo_url,
      'theme_color', coalesce(ps.theme_color, '#2563eb'),
      'welcome_title', ps.welcome_title,
      'welcome_message', ps.welcome_message
    ),
    'stripe_ready', coalesce(psa.charges_enabled, false) AND coalesce(psa.payouts_enabled, false),
    'prices', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'plano', pp.plano,
          'valor', pp.valor,
          'ativo', pp.ativo
        )
        ORDER BY pp.valor
      ) FILTER (WHERE pp.id IS NOT NULL),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM public.profiles p
  JOIN public.user_roles ur
    ON ur.user_id = p.id
   AND ur.role = 'personal'
  LEFT JOIN public.personal_settings ps
    ON ps.personal_id = p.id
  LEFT JOIN public.personal_stripe_accounts psa
    ON psa.personal_id = p.id
  LEFT JOIN public.personal_plan_prices pp
    ON pp.personal_id = p.id
   AND pp.ativo = true
  WHERE p.public_slug = public.normalize_public_slug(_slug)
    AND p.public_profile_enabled = true
    AND p.is_active = true
  GROUP BY
    p.id,
    p.nome,
    p.public_slug,
    ps.display_name,
    ps.logo_url,
    ps.theme_color,
    ps.welcome_title,
    ps.welcome_message,
    psa.charges_enabled,
    psa.payouts_enabled
  LIMIT 1;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_personal_sales_page(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_personal_id uuid;
BEGIN
  BEGIN
    v_personal_id := NULLIF(NEW.raw_user_meta_data ->> 'personal_id', '')::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_personal_id := NULL;
  END;

  IF v_personal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_personal_id
      AND role = 'personal'
  ) THEN
    v_personal_id := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    nome,
    email,
    telefone,
    personal_id
  )
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'telefone', ''),
    v_personal_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    nome = excluded.nome,
    email = excluded.email,
    telefone = coalesce(excluded.telefone, public.profiles.telefone),
    personal_id = coalesce(excluded.personal_id, public.profiles.personal_id),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'aluno')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
