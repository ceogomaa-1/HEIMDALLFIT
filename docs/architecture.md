# HEIMDALLFIT Architecture Notes

## Monorepo

- `apps/web` contains the coach-first Next.js dashboard
- `apps/mobile` contains the Expo client app
- `packages/types` centralizes shared contracts and helpers
- `packages/config` centralizes theme and deep-link settings
- `supabase` contains SQL and Edge Functions

## Implemented v1 foundation

- Room ID join flow scaffolded on mobile and mirrored on web
- Coach dashboard overview, migration workspace, combat builder, analysis panel, and storefront scaffold
- Supabase schema includes the core coach, client, room, program, photo, and marketplace tables
- Edge Function placeholders define the integration seams for room join, migration, checkout, and image processing
