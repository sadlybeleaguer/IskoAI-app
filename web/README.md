# Supabase Auth Starter

React + Vite starter with Tailwind CSS v4, shadcn/ui, React Router, and a browser-ready Supabase auth flow.

## Stack

- React 19 + Vite
- React Router
- Tailwind CSS v4
- shadcn/ui
- Supabase JavaScript client

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Add your Supabase project values to `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Supported fallback key names:

- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `VITE_SUPABASE_ANON_KEY`

4. Start the app:

```bash
npm run dev
```

## Included routes

- `/sign-in`
- `/sign-up`
- `/dashboard`

Unauthenticated users are redirected to `/sign-in`. Authenticated users are redirected away from the public auth pages.

## Supabase setup notes

- Enable Email auth in your Supabase project.
- If email confirmation is enabled, the sign-up flow will prompt the user to check their inbox before signing in.
- The client is configured to persist sessions and detect auth redirects in the browser.

## Verification

After adding your Supabase credentials:

1. Open `/sign-up` and create a user.
2. Sign in with that user.
3. Refresh `/dashboard` to confirm the session persists.
4. Sign out and verify you return to `/sign-in`.
