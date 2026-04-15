# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM v7 (adapter pattern — `@prisma/adapter-pg`)
- **Auth**: NextAuth.js v5 (beta) — JWT strategy, Credentials + Google OAuth
- **Styling**: Tailwind CSS v4 + shadcn/ui v4 (uses `@base-ui/react` primitives, NOT Radix UI, except `@radix-ui/react-slot` for `asChild` on Button)
- **Payments**: Stripe subscriptions (FREE / PRO / ENTERPRISE)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod v4

## Commands

```bash
npm install           # Install dependencies
npm run dev           # Dev server (http://localhost:3000)
npm run build         # Production build
npm run lint          # ESLint
npx tsc --noEmit      # Type-check only

npx prisma generate              # Regenerate client after schema changes
npx prisma migrate dev --name X  # Create and apply a migration
npx prisma db push               # Push schema without migration (dev only)
npx prisma db seed               # Seed reference data + admin user
npx prisma studio                # Database browser GUI
```

## Architecture

### Route groups

```
(public)/           → /login, /register, /pricing
(app)/              → /dashboard, /calculadora-rural, /calculadora-rh, /historico, /configuracoes
(admin)/admin/      → /admin, /admin/usuarios, /admin/produtos, /admin/aliquotas-icms, /admin/planos
src/app/page.tsx    → Landing page (NOT inside a group — avoids route conflict)
```

### Key patterns

**Prisma v7 adapter** — `src/lib/prisma.ts` creates `PrismaClient` with `PrismaPg` adapter. The schema's datasource block has NO `url` field; connection string comes from `DATABASE_URL` env at runtime via the adapter. Always import the singleton from `src/lib/prisma.ts`.

**Prisma v7 enum types** — Enums are NOT exported from `@prisma/client` before `prisma generate` runs. Shared type aliases live in `src/types/prisma.ts` (string unions). Seed.ts imports enums directly from `@prisma/client` after generate.

**NextAuth JWT** — Token embeds `role`, `isBlocked`, `planTier`, `subStatus` (see `src/lib/auth.ts`). This avoids a DB query on every request. Augmented types in `src/types/next-auth.d.ts`.

**shadcn/ui + Base UI** — Components use `@base-ui/react/*` primitives (Dialog, Select, Menu, etc.). These do NOT support the `asChild` prop. Use `render` prop or avoid `asChild` entirely. The only `asChild`-capable component is `Button` (uses `@radix-ui/react-slot`).

**Plan-gating** — `src/components/shared/SubscriptionGate.tsx` wraps features requiring PRO/ENTERPRISE. Always check `session.user.planTier` server-side in API routes too.

**Calculation functions** — Pure functions in `src/lib/tax/ruralTax.ts` and `src/lib/tax/rhClt.ts`. No React, fully testable.

**Stripe lazy init** — `src/lib/stripe.ts` uses a Proxy to lazily initialize the Stripe client, avoiding build-time failures when `STRIPE_SECRET_KEY` is absent.

### Brazilian tax rules implemented

- **ICMS inter-state**: 7% from developed states (SP/RJ/MG/RS/PR/SC/GO/DF/ES/MT/MS/RO/TO/AM) to SP/RJ; 12% otherwise. Seeded as 702 pairs (27×26).
- **PIS/COFINS**: 0% for primary rural products (Lei 10.925/2004); exceptions for processed products.
- **FUNRURAL**: 1.2% for Pessoa Física, 1.5% for Pessoa Jurídica.
- **CLT payroll costs**: INSS 20%, FGTS 8%, 13° salary 8.33%/mo, Férias+1/3 11.11%/mo, RAT/FAP variable, Sistema S 3.3%.

### Required environment variables

```
DATABASE_URL=           # PostgreSQL connection string (e.g. postgresql://user:pass@host:5432/db)
NEXTAUTH_SECRET=        # Random secret (openssl rand -base64 32)
NEXTAUTH_URL=           # Full app URL (e.g. http://localhost:3000)
GOOGLE_CLIENT_ID=       # Optional — Google OAuth
GOOGLE_CLIENT_SECRET=   # Optional — Google OAuth
STRIPE_SECRET_KEY=      # Stripe secret key (sk_test_... for dev)
STRIPE_PUBLISHABLE_KEY= # Stripe publishable key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # Same key, exposed to browser
STRIPE_WEBHOOK_SECRET=  # Stripe webhook signing secret (whsec_...)
```
