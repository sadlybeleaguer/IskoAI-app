# Agents

## Project layout

- `.agents/` contains local agent skills and related automation assets.
- `web/` contains the React, Vite, Tailwind, shadcn/ui, and Supabase frontend app.
- `skills-lock.json` is local machine state and is ignored by Git.

## Frontend app

- App entry: `web/src/main.jsx`
- Router setup: `web/src/App.jsx`
- Supabase client: `web/src/lib/supabase.js`
- Auth/session state: `web/src/contexts/auth-context.jsx`
- Public auth screen: `web/src/pages/auth-page.jsx`
- Protected dashboard shell: `web/src/pages/dashboard-page.jsx`

## Environment

- Local frontend secrets belong in `web/.env.local`.
- Required env keys are documented in `web/.env.example` and `web/README.md`.

## Working notes

- Keep generated or machine-local files out of Git.
- Treat `web/` as the implementation target for product work unless a task explicitly concerns agent tooling under `.agents/`.
