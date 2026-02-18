
CREATE TABLE public.alertas_descartados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL,
  tipo_alerta TEXT NOT NULL,
  referencia_id UUID NOT NULL,
  descartado_em TIMESTAMPTZ DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.alertas_descartados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal gerencia seus descartes"
  ON public.alertas_descartados
  FOR ALL
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

CREATE INDEX idx_alertas_descartados_personal 
  ON public.alertas_descartados(personal_id, tipo_alerta, referencia_id);
