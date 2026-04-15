# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS

## Commands

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint

# Type-check
npx tsc --noEmit

# Prisma: generate client after schema changes
npx prisma generate

# Prisma: create and apply a migration
npx prisma migrate dev --name <migration-name>

# Prisma: push schema changes without a migration (dev only)
npx prisma db push

# Prisma: open database browser
npx prisma studio
```

## Architecture

### Directory layout

```
src/
  app/                  # Next.js App Router — each folder is a route segment
    api/                # Route handlers (server-side API endpoints)
      auth/[...nextauth]/  # NextAuth catch-all handler
    (auth)/             # Route group for auth pages (sign-in, sign-up)
    (dashboard)/        # Route group for protected pages
    layout.tsx          # Root layout — wraps every page
    page.tsx            # Home page
  components/           # Shared React components
  lib/
    prisma.ts           # Singleton Prisma client (import from here everywhere)
    auth.ts             # NextAuth config and helpers
  types/                # Shared TypeScript types / interfaces
prisma/
  schema.prisma         # Database schema — source of truth for models
  migrations/           # Auto-generated migration files (commit these)
```

### Key patterns

**Prisma client** — always import the singleton from `src/lib/prisma.ts` to avoid exhausting connections in dev (Next.js hot-reload creates new module instances).

**NextAuth session** — the session is available server-side via `getServerSession(authOptions)` and client-side via the `useSession()` hook. `authOptions` is defined in `src/lib/auth.ts` and re-used by both the API route handler and server components.

**Route protection** — protect server components by calling `getServerSession` at the top and redirecting if null. Protect API routes the same way or use NextAuth's built-in middleware (`middleware.ts` at the project root with a `matcher` config).

**Server vs. client components** — components are server components by default in the App Router. Add `"use client"` only when you need browser APIs, event handlers, or React hooks. Keep data fetching in server components and pass data down as props.

**Environment variables** — Next.js exposes only `NEXT_PUBLIC_*` vars to the browser. Database URLs, auth secrets, and API keys must not have that prefix.

### Required environment variables

```
DATABASE_URL=           # PostgreSQL connection string
NEXTAUTH_SECRET=        # Random secret for NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_URL=           # Full URL of the app (e.g. http://localhost:3000)
```
