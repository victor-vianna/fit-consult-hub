# 🏋️‍♂️ FitConsult

O **FitConsult** é uma plataforma completa para **gestão de treinos personalizados** entre **personais trainers e seus alunos**.  
Com ele, os profissionais podem criar modelos de treino reutilizáveis, aplicar planos semanais, acompanhar a frequência dos alunos e manter toda a comunicação centralizada em um único lugar.

---

## 🚀 Funcionalidades Principais

### 👨‍🏫 Para o Personal Trainer
- Criar e gerenciar **modelos de treino reutilizáveis**.
- Aplicar modelos a alunos de forma rápida e personalizada.
- Acompanhar **frequência semanal e mensal** dos treinos.
- Editar, duplicar ou excluir treinos conforme necessidade.
- Upload de **imagens e GIFs** para cada exercício.

### 💪 Para o Aluno
- Visualizar os treinos do dia e da semana.
- Acessar vídeos e imagens ilustrativas dos exercícios.
- Interface **mobile-first**, fácil de usar com uma mão.
- Atualização automática dos treinos aplicados pelo personal.

---

## 🧠 Como Funciona

1. O **personal trainer** cria um modelo de treino com os exercícios desejados.  
2. Ele aplica esse modelo a um aluno e seleciona os dias da semana em que o treino será repetido.  
3. O sistema replica automaticamente os treinos nos dias selecionados.  
4. O aluno acessa o aplicativo e visualiza seus treinos organizados por data.  
5. Qualquer alteração feita pelo personal é atualizada em tempo real.

---

## 🛠️ Tecnologias Utilizadas

| Stack | Tecnologias |
|-------|--------------|
| **Frontend** | React, Next.js, TypeScript, Tailwind CSS, Shadcn/UI |
| **Backend** | tRPC, Drizzle ORM |
| **Banco de Dados** | Supabase (PostgreSQL) |
| **Autenticação** | Supabase Auth |
| **Gerenciamento de Estado** | React Query |
| **Feedbacks** | Sonner (toasts e alertas) |

---

## 🧩 Estrutura do Projeto
src/
├── components/ # Componentes reutilizáveis (UI)
├── hooks/ # Hooks personalizados (useTreinos, useModelosTreino etc.)
├── pages/ # Rotas principais (Next.js)
├── server/ # Configuração do tRPC + Drizzle ORM
├── styles/ # Estilos globais (Tailwind)
├── utils/ # Funções auxiliares
└── integrations/ # Integração com Supabase

Autor
Victor Vianna
 • 💼 Projeto pessoal de aprimoramento em React, TypeScript e Supabase.

📄 Licença

Este projeto está sob a licença MIT — sinta-se livre para usar e contribuir.
