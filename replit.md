# Rende+ — Sistema de Gestão de Performance

## Overview

A performance management system ("Rende+") built with React + Vite + TypeScript. It uses Supabase for authentication, database (PostgreSQL with RLS), file storage, and Edge Functions. The frontend is a pure SPA (Single Page Application).

## Architecture

- **Frontend**: React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (hosted) — PostgreSQL database, auth, Row Level Security, Edge Functions, Storage
- **State/Data**: TanStack React Query, custom hooks

## Key Features

- Role-based access: `admin`, `viewer`, `colaborador`
- Monthly evaluation cycles with goal tracking
- Performance bonus management
- Employee self-registration (via Supabase Edge Function `self-register`)
- Admin employee auth management (via Supabase Edge Function `manage-employee-auth`)
- File attachments for goals (Supabase Storage bucket: `goal-attachments`)
- Ranking system for colaboradores (published months only)
- PDF export functionality

## Project Structure

```
src/
  pages/         — Top-level route components (Auth, Index, ColaboradorDashboard, NotFound)
  components/    — Reusable UI components (dashboard/, ui/)
  hooks/         — Custom React hooks (useAuth, useEmployees, useEvaluationMonths, useMonthlyEmployees, etc.)
  integrations/
    supabase/    — Supabase client and generated TypeScript types
    lovable/     — Placeholder (Google OAuth handled via Supabase directly)
  types/         — Shared TypeScript types
  lib/           — Utility functions
supabase/
  config.toml          — Supabase project config (project_id: bmfawalempiweyepginl)
  migrations/          — All database migrations in order
  functions/
    manage-employee-auth/ — Admin-only: create/reset/toggle/delete employee auth users
    self-register/        — Public + authenticated: employee self-registration & Google linking
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (safe to expose in client) |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

These are set in `.env` and also in `.replit` `[userenv.shared]`.

## Running the App

```bash
npm install
npm run dev   # starts Vite dev server on port 5000
```

## Database Roles

- `admin` — Full CRUD on all data, can manage employees and goals
- `viewer` — Read-only access to most data
- `colaborador` — Can only see their own employee record, goals, and published month data

## Supabase Edge Functions

Deployed to the hosted Supabase project. Called from the frontend via `supabase.functions.invoke(...)`.

## User Flow

1. Users visit `/auth` and sign in with email/password or Google
2. Admins land on `/` (admin dashboard with full management capabilities)
3. Colaboradores land on `/colaborador` (personal dashboard showing their own goals and ranking)
4. Viewers land on `/` (read-only dashboard)
