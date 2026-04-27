
# Criar instância separada da aplicação para nova empresa

## Resumo

A melhor forma de atender duas empresas distintas SEM risco de mistura de dados é **duplicar este projeto** via **Remix do Lovable**. Cada empresa fica com:

- Sua própria URL (ex.: `metasrendemais.lovable.app` continua para a empresa atual; a nova ganha um domínio próprio)
- Seu próprio banco de dados (Lovable Cloud independente)
- Seu próprio admin, colaboradores, metas e histórico
- O mesmo código-fonte e os mesmos parâmetros estruturais (papéis, RLS, funções, schema)

Isso elimina o risco de um admin de uma empresa enxergar/editar dados da outra — coisa que só seria possível, com segurança, com uma reescrita multi-tenant grande e arriscada na base atual.

## Como funciona o Remix

1. Você (no editor Lovable) clica nos três pontos do projeto → **Remix**
2. O Lovable cria um **novo projeto** com cópia completa do código
3. O novo projeto recebe um **novo Lovable Cloud** vazio (banco zerado)
4. As migrações já existentes recriam automaticamente toda a estrutura: tabelas, RLS, funções (`is_admin`, `has_role`, `initialize_month`, etc.), enum `app_role`, bucket `goal-attachments`

Resultado: nova empresa começa com a estrutura idêntica, mas sem nenhum colaborador, meta, bônus ou histórico.

## O que vou preparar nesta etapa

Para que o Remix funcione limpo, preciso fazer alguns ajustes no projeto atual antes de você duplicar:

### 1. Garantir que toda a estrutura está em migrações

Verificar que o schema atual (tabelas, RLS, funções, triggers `assign_default_role`/`handle_new_user`, bucket de storage) está totalmente representado em arquivos de migração em `supabase/migrations/`. Se algo foi criado direto no banco e não está em migração, criar a migração correspondente para que o clone recrie tudo.

### 2. Branding configurável

Hoje o nome "Rende +" e cores estão hardcoded em vários lugares (Auth, Header, etc.). Vou centralizar em um arquivo único (`src/config/brand.ts`) com:

```ts
export const brand = {
  name: "Rende +",
  tagline: "Sistema de Gestão de Performance",
  primaryColor: "...",
};
```

Assim, na nova empresa basta editar UM arquivo para trocar nome/identidade, sem caçar strings.

### 3. Script de "primeiro admin" (bootstrap)

A política `First user can be admin` em `user_roles` permite o primeiro usuário se autoatribuir admin, mas o trigger `assign_default_role` já cria todo mundo como `viewer`. Vou criar uma página/rota oculta `/setup` (ou uma edge function `bootstrap-admin`) que:

- Só funciona se ainda **não existe nenhum admin** no banco
- Permite o primeiro usuário cadastrado virar admin com 1 clique
- Depois disso, a rota fica desativada automaticamente

Isso evita você ter que rodar SQL manual no Lovable Cloud da nova empresa.

### 4. Documentar parâmetros opcionais a recriar

Listar em um `SETUP.md` o que o novo admin precisa cadastrar manualmente após o clone:
- Setores (tabela usada por `useSectors`)
- Critérios de pontuação padrão (se houver)
- Mês de avaliação inicial (via `initialize_month`)

## Passo a passo que VOCÊ executa depois

1. Eu termino os ajustes acima e te aviso
2. No editor Lovable: três pontos no projeto → **Remix** → dar nome (ex.: "Metas Empresa X")
3. Abrir o novo projeto → Lovable Cloud é provisionado automaticamente e roda as migrações
4. Acessar a URL preview do novo projeto → ir em `/setup` → criar conta com email da nova empresa → virar admin
5. Editar `src/config/brand.ts` no novo projeto (nome/cor da nova empresa)
6. Cadastrar setores, colaboradores e metas pelo painel admin normalmente
7. Publicar com domínio próprio

## O que NÃO será feito (para evitar confusão)

- Nada será alterado no banco da empresa atual
- Não haverá `company_id` nem multi-tenant — cada empresa fica isolada em projetos diferentes
- Não vou copiar nenhum colaborador, meta, bônus ou histórico para o novo projeto

## Arquivos a modificar / criar nesta etapa

- `src/config/brand.ts` — novo, centraliza branding
- `src/pages/Auth.tsx`, `src/components/dashboard/Header.tsx` — passam a ler de `brand.ts`
- `src/pages/Setup.tsx` — nova rota oculta para bootstrap do primeiro admin
- `src/App.tsx` — registra a rota `/setup`
- `supabase/migrations/<timestamp>_ensure_full_schema.sql` — só se faltar algo nas migrações existentes
- `SETUP.md` — instruções pós-clone para o novo admin

## Observação importante sobre custos

Cada projeto Lovable consome plano/créditos próprios e cada Lovable Cloud é uma instância separada (com seu próprio limite gratuito). Confira o plano antes de remixar se for usar em produção.
