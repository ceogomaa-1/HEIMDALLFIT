# HEIMDALLFIT

Monorepo foundation for the HEIMDALLFIT coach dashboard, client app, and Supabase backend.

## Apps

- `apps/web`: Next.js 14 coach dashboard
- `apps/mobile`: Expo client application
- `packages/types`: shared domain models and validation helpers
- `packages/config`: shared theme tokens and app constants
- `packages/ui`: shared UI helpers
- `supabase`: SQL migrations and Edge Functions

## Getting Started

1. Copy `.env.example` to `.env.local` in `apps/web` and `.env` in `apps/mobile`.
2. Install dependencies with `pnpm install`.
3. Run `pnpm dev:web` for the coach dashboard.
4. Run `pnpm dev:mobile` for the client app.
5. Apply the SQL migration in `supabase/migrations`.
