# Agents

## Project layout

- `.agents/` contains local agent skills and related automation assets.
- `isko-app/` contains the React, Vite, Tailwind, shadcn/ui, and Supabase frontend app.
- `skills-lock.json` is local machine state and is ignored by Git.

## Frontend app

- App entry: `isko-app/src/main.jsx`
- Router setup: `isko-app/src/App.jsx`
- Supabase client: `isko-app/src/lib/supabase.js`
- Auth/session state: `isko-app/src/contexts/auth-context.jsx`
- Public auth screen: `isko-app/src/pages/auth-page.jsx`
- Protected dashboard shell: `isko-app/src/pages/dashboard-page.jsx`

## Environment

- Local frontend secrets belong in `isko-app/.env.local`.
- Required env keys are documented in `isko-app/.env.example` and `isko-app/README.md`.

## Working notes

- Keep generated or machine-local files out of Git.
- Treat `isko-app/` as the implementation target for product work unless a task explicitly concerns agent tooling under `.agents/`.
