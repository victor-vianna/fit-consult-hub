-- Criar enum para roles
CREATE TYPE public.user_role AS ENUM ('admin', 'personal', 'aluno');

-- Tabela user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  personal_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela materiais
CREATE TABLE public.materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL CHECK (tipo IN ('treino', 'dieta', 'avaliacao', 'outro')),
  arquivo_url text NOT NULL,
  arquivo_nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materiais', 'materiais', true);

-- Funções SQL Security Definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_personal(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'personal')
$$;

-- Trigger para criar profile e role padrão ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'aluno');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;

-- RLS Policies para user_roles
CREATE POLICY "Usuários podem ver suas próprias roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies para profiles
CREATE POLICY "Admin vê todos os profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Personal vê seus alunos"
  ON public.profiles FOR SELECT
  USING (
    public.is_personal(auth.uid()) AND 
    (personal_id = auth.uid() OR id = auth.uid())
  );

CREATE POLICY "Aluno vê próprio profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admin cria qualquer profile"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Personal cria alunos"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_personal(auth.uid()) AND personal_id = auth.uid());

CREATE POLICY "Usuário cria próprio profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Usuário atualiza próprio profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admin deleta qualquer profile"
  ON public.profiles FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Personal deleta seus alunos"
  ON public.profiles FOR DELETE
  USING (public.is_personal(auth.uid()) AND personal_id = auth.uid());

-- RLS Policies para materiais
CREATE POLICY "Personal vê materiais que criou"
  ON public.materiais FOR SELECT
  USING (personal_id = auth.uid());

CREATE POLICY "Aluno vê materiais dele"
  ON public.materiais FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin cria materiais"
  ON public.materiais FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Personal cria materiais"
  ON public.materiais FOR INSERT
  WITH CHECK (public.is_personal(auth.uid()) AND personal_id = auth.uid());

CREATE POLICY "Admin deleta materiais"
  ON public.materiais FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Personal deleta materiais que criou"
  ON public.materiais FOR DELETE
  USING (personal_id = auth.uid());

-- RLS Policies para storage
CREATE POLICY "Personal vê arquivos que enviou"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'materiais' AND
    auth.uid() IN (
      SELECT personal_id FROM public.materiais 
      WHERE arquivo_url LIKE '%' || name
    )
  );

CREATE POLICY "Aluno vê arquivos dele"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'materiais' AND
    auth.uid() IN (
      SELECT profile_id FROM public.materiais 
      WHERE arquivo_url LIKE '%' || name
    )
  );

CREATE POLICY "Personal faz upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'materiais' AND
    public.is_personal(auth.uid())
  );

CREATE POLICY "Admin faz upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'materiais' AND
    public.is_admin(auth.uid())
  );

CREATE POLICY "Personal deleta arquivos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'materiais' AND
    public.is_personal(auth.uid())
  );

CREATE POLICY "Admin deleta arquivos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'materiais' AND
    public.is_admin(auth.uid())
  );