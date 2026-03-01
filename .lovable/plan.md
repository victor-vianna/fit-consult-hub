

# Plano: Login Creation, Role-Based Signup, and Password Reset

## Resumo

Tres funcionalidades principais:
1. **Pagina Auth**: Adicionar checkbox no cadastro para alternar entre criar Aluno ou Personal (Personal so visivel/permitido para admins logados)
2. **Admin UsuariosManager**: Dialog funcional para criar usuarios (aluno ou personal) com chamada as edge functions existentes
3. **Reset de senha**: Link "Esqueci minha senha" no login + pagina `/reset-password` para definir nova senha

---

## 1. Pagina Auth (`src/pages/Auth.tsx`)

### Cadastro com selecao de tipo
- Adicionar estado `tipoUsuario` ("aluno" | "personal") com default "aluno"
- Adicionar checkbox/switch visivel apenas se o usuario logado for admin
- Problema: a pagina Auth normalmente e acessada por usuarios nao logados. Portanto:
  - Verificar se ha sessao ativa ao carregar a pagina
  - Se sessao ativa com role "admin", mostrar opcao de criar Personal
  - Se sessao ativa com role "personal", cadastro cria aluno vinculado ao personal
  - Se nao logado, cadastro publico cria aluno (sem personal_id -- cadastro autonomo via `supabase.auth.signUp`)

### Fluxo de cadastro
- **Aluno (sem login)**: `supabase.auth.signUp()` -- trigger `handle_new_user` cria profile + role aluno
- **Aluno (personal logado)**: Chama edge function `create-aluno-user` passando `personal_id` do personal logado
- **Personal (admin logado)**: Chama edge function `create-personal-user`

### Link "Esqueci minha senha"
- Abaixo do botao de login, adicionar link que chama `supabase.auth.resetPasswordForEmail(email, { redirectTo })`

---

## 2. Pagina Reset Password (`src/pages/ResetPassword.tsx`) -- NOVO

- Rota publica `/reset-password`
- Detecta `type=recovery` no URL hash (Supabase redireciona com esse parametro)
- Formulario com "Nova senha" + "Confirmar senha"
- Chama `supabase.auth.updateUser({ password })`
- Apos sucesso, redireciona para `/auth`

---

## 3. Admin UsuariosManager (`src/components/Admin/Sections/UsuariosManager.tsx`)

### Dialog "Novo Usuario"
- Formulario com: Nome, Email, Telefone, Senha, Tipo (aluno/personal)
- Se tipo "aluno": campo adicional para selecionar o personal_id (dropdown dos personals existentes)
- Se tipo "personal": sem campo extra
- Chama a edge function correspondente (`create-aluno-user` ou `create-personal-user`)
- Recarrega lista apos sucesso

---

## 4. Rota no App.tsx

Adicionar:
```
<Route path="/reset-password" element={<ResetPassword />} />
```

---

## Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/ResetPassword.tsx` | Pagina para definir nova senha apos link de recuperacao |

## Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Auth.tsx` | Checkbox tipo usuario, logica condicional de cadastro, link esqueci senha |
| `src/components/Admin/Sections/UsuariosManager.tsx` | Dialog funcional para criar aluno/personal |
| `src/App.tsx` | Rota `/reset-password` |

## Ordem de implementacao

1. Criar `ResetPassword.tsx` + rota no App
2. Atualizar `Auth.tsx` (link esqueci senha + cadastro com tipo)
3. Atualizar `UsuariosManager.tsx` (dialog criar usuario)

