# Guia de configuração inicial (após clonar o projeto)

Este guia é para quando você duplica este projeto via **Remix** do Lovable
para uma nova empresa. O Remix cria um banco vazio com toda a estrutura
(tabelas, políticas, funções) já provisionada pelas migrações.

## Passo a passo

### 1. Personalize a marca

Edite **`src/config/brand.ts`** com o nome e slogan da nova empresa:

```ts
export const brand = {
  name: "Nome da Empresa",
  tagline: "Sua frase aqui",
  dashboardTitle: "Gerenciamento de metas",
  dashboardYear: "2026",
};
```

Para trocar o logo, substitua **`src/assets/logo-rende-new.png`** pelo
novo logo (mesmo nome de arquivo).

Para trocar as cores principais, edite os tokens HSL em
**`src/index.css`** e **`tailwind.config.ts`**.

### 2. Crie o primeiro administrador

1. Acesse a URL preview do projeto e vá em **`/auth`**
2. Crie uma conta normal (email + senha) com o email do admin da nova empresa
3. Após cadastrar, acesse **`/setup`**
4. Clique em **"Tornar-me Administrador"**
5. Faça login novamente — agora você é admin

> A rota `/setup` se desativa automaticamente assim que existir 1 admin.

### 3. Cadastre dados iniciais (pelo painel admin)

Faça login como admin e cadastre:

- **Setores** da empresa (em "Cadastros" → Setores)
- **Colaboradores** (Nome, função, setor, foto)
- **Metas** de cada colaborador
- **Mês de avaliação inicial** (ao abrir o dashboard, use o seletor de mês)

### 4. Compartilhe o cadastro com colaboradores

Depois de cadastrar os colaboradores, eles podem se cadastrar sozinhos:

1. O colaborador acessa `/auth` → aba **Cadastrar**
2. Seleciona o próprio nome na lista
3. Define email/senha
4. Pronto — fica vinculado ao seu cadastro e vê apenas seus dados

## O que NÃO é copiado no Remix

- Colaboradores, metas, bônus e histórico (banco vem vazio)
- Usuários e contas de autenticação
- Arquivos no bucket de anexos

## O que É copiado no Remix

- Todo o código-fonte
- Estrutura completa do banco (via migrações em `supabase/migrations/`)
- Funções e políticas RLS (`is_admin`, `has_role`, `initialize_month`, etc.)
- Triggers (`assign_default_role`, `handle_new_user`)
- Bucket de storage `goal-attachments`
