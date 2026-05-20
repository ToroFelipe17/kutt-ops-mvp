# KUTT OPS

KUTT OPS is the MVP foundation for KUTT, a minimal operations app for barber shops and service-based businesses.

The current product focuses on daily operations: appointments, payments, cash register, clients, staff setup, business hours and daily closing reports.

## Tech Stack

- React
- TypeScript
- TanStack Start and TanStack Router
- Tailwind CSS
- Supabase Auth and database
- Radix UI / shadcn-style components
- Vite
- Cloudflare Workers configuration

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Then fill in the Supabase values in `.env`.

Client-side variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Server-side variables:

```bash
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not commit `.env` or real secret values.

## Development

Run the local dev server:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Preview a production build:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

## Notes

This project still includes some Lovable-generated technical scaffolding, including `@lovable.dev/vite-tanstack-config`. It should not be removed until the Vite, TanStack Start, Tailwind and Cloudflare build setup has been replaced and validated safely.

Phase 1 keeps the current app behavior and visual style intact while moving public-facing branding to KUTT.
