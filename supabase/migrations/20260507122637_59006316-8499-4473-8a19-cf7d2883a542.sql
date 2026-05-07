
-- 1) Restrict notificacoes INSERT to legitimate relationships
DROP POLICY IF EXISTS "Usuários autenticados podem criar notificações" ON public.notificacoes;

CREATE POLICY "Notificacoes apenas entre relacoes legitimas"
ON public.notificacoes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- self notifications (system-style by the user)
    destinatario_id = auth.uid()
    -- personal notifying their student
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = destinatario_id AND p.personal_id = auth.uid()
    )
    -- student notifying their personal
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.personal_id = destinatario_id
    )
    -- admins can notify anyone
    OR public.is_admin(auth.uid())
  )
);

-- 2) Allow students to read their personal's check-in configuration
CREATE POLICY "Alunos veem configuracao do seu personal"
ON public.configuracao_checkins
FOR SELECT
TO authenticated
USING (
  personal_id IN (
    SELECT profiles.personal_id FROM public.profiles WHERE profiles.id = auth.uid()
  )
);

-- 3) Tighten fotos-evolucao storage SELECT to require a matching row in fotos_evolucao
DROP POLICY IF EXISTS "Personais e alunos veem fotos evolucao" ON storage.objects;
DROP POLICY IF EXISTS "Personais podem ver fotos de seus alunos storage" ON storage.objects;
DROP POLICY IF EXISTS "Fotos evolucao folder access" ON storage.objects;
DROP POLICY IF EXISTS "Fotos evolucao select por pasta" ON storage.objects;
DROP POLICY IF EXISTS "Fotos evolucao acesso por pasta" ON storage.objects;

CREATE POLICY "Fotos evolucao select via ownership"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fotos-evolucao'
  AND EXISTS (
    SELECT 1 FROM public.fotos_evolucao fe
    WHERE (fe.foto_url LIKE '%' || storage.objects.name OR fe.foto_nome = storage.objects.name)
      AND (fe.profile_id = auth.uid() OR fe.personal_id = auth.uid())
  )
);

-- 4) Require materiais uploads to be inside the personal's own folder
DROP POLICY IF EXISTS "Personal faz upload" ON storage.objects;
DROP POLICY IF EXISTS "Personal faz upload materiais" ON storage.objects;

CREATE POLICY "Personal faz upload materiais em pasta propria"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materiais'
  AND public.is_personal(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);
