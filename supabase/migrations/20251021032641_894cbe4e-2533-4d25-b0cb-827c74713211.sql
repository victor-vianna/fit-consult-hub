-- Corrigir search_path da função update_updated_at_column com CASCADE
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER update_treinos_semanais_updated_at
BEFORE UPDATE ON public.treinos_semanais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();