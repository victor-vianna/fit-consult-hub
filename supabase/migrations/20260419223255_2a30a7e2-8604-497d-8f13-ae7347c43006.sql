
-- 1. Add letterhead_url column to personal_settings
ALTER TABLE public.personal_settings
ADD COLUMN IF NOT EXISTS letterhead_url TEXT;

-- 2. Create storage bucket for letterheads (public so it can be embedded in exports)
INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-letterheads', 'personal-letterheads', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: personal can manage own folder, public can read
DROP POLICY IF EXISTS "Letterheads are publicly accessible" ON storage.objects;
CREATE POLICY "Letterheads are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'personal-letterheads');

DROP POLICY IF EXISTS "Personal can upload own letterhead" ON storage.objects;
CREATE POLICY "Personal can upload own letterhead"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'personal-letterheads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Personal can update own letterhead" ON storage.objects;
CREATE POLICY "Personal can update own letterhead"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'personal-letterheads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Personal can delete own letterhead" ON storage.objects;
CREATE POLICY "Personal can delete own letterhead"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'personal-letterheads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
