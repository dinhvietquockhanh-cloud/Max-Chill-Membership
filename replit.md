# Max Chill Membership

A staff-facing membership register for Max Chill Garden: find guests by phone, maintain profiles and visit history, and review member activity.

## Run & Operate

- Install dependencies with `pnpm install --frozen-lockfile`.
- Run the app using the managed Replit workflows `artifacts/api-server: API Server` and `artifacts/max-chill-membership: web`. They supply the required ports and frontend base path.
- The staff app is available at `/`; the API is available at `/api` (local port 8080).
- The optional Canvas workflow is not needed to run the staff app.
- `pnpm run typecheck` — full typecheck across all packages
- Build through the artifact configuration so `PORT` and `BASE_PATH` are supplied to Vite.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — initialize or update the development database schema; review any destructive change prompts before proceeding.
- Required env: `DATABASE_URL` — provided by the Replit development PostgreSQL database; do not put credentials in source files.
- Health check: `GET /api/healthz`; member and dashboard data are served at `/api/members` and `/api/dashboard`.

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
