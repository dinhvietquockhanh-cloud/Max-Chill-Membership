# Max Chill Membership

A staff-facing membership register for Max Chill Garden: find guests by phone, maintain profiles and visit history, and review member activity.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/max-chill-membership` — staff web app
- `artifacts/api-server/src/routes` — membership and dashboard endpoints
- `lib/api-spec/openapi.yaml` — API contract; regenerate clients with the command above
- `lib/db/src/schema/membership.ts` — member and visit tables
- `artifacts/max-chill-membership/src/index.css` — app theme

## Architecture decisions

- Visit records are the source of truth for visit counts, spend, average party size, and tier; aggregates are recalculated from visits.
- Tier thresholds and benefits are a draft for the 100-member pilot and remain subject to the owner's approval. Benefits are not automatically granted.

## Product

- Staff can register members, look up profiles by phone, record visits, and view visit history and lifetime spend.
- The overview reports new and returning members, Silver/Gold counts, pilot capacity, and top members by visits and spend.

## Access and pilot safety

- Staff sign-in and access restrictions are not implemented yet. Do not enter real guest contact data or publish this app until staff-only access is added.
- Silver and Gold profile labels preview the proposed thresholds; no proposed benefit is granted automatically.

## User preferences

- Keep staff workflows simple and usable on phones, tablets, and desktop computers.

## Gotchas

- The API is served under `/api`; frontend calls must use the generated API client.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
