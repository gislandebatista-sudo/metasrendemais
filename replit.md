# Rende + — Performance Management System

## Overview
A React/TypeScript single-page application for employee performance management and goal tracking. Built with Vite, shadcn/ui, and Supabase as the backend.

## Architecture
- **Frontend**: Vite + React 18 + TypeScript
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS
- **State**: TanStack Query (React Query)
- **Routing**: React Router DOM v6
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Auth**: Supabase Auth (email/password + Google OAuth)

## Key Features
- Admin dashboard with employee ranking, goal tracking, monthly cycles
- Colaborador (employee) dashboard with personal goal visibility
- Role-based access: `admin`, `viewer`, `colaborador`
- Monthly evaluation cycles with publish/close controls
- Goal attachments (stored in Supabase Storage)
- Excel/PDF export

## Environment Variables
Stored as Replit shared env vars:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID

## Running the App
```
npm run dev
```
Runs on port 5000.

## Supabase Backend
The database, auth, and Edge Functions are hosted on Supabase project `bmfawalempiweyepginl`. All RLS policies and schema migrations are in `supabase/migrations/`. Edge Functions are in `supabase/functions/`.

## Migration Notes (Lovable → Replit)
- Removed `lovable-tagger` from vite config (dev-only Lovable plugin)
- Replaced `@lovable.dev/cloud-auth-js` Google OAuth with direct `supabase.auth.signInWithOAuth()`
- Updated Vite server config: `host: "0.0.0.0"`, `port: 5000`, `allowedHosts: true`
- Env vars moved to Replit shared environment
