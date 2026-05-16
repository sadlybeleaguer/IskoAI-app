# IskoAI App

IskoAI is a JavaScript monorepo with a Vite React frontend and Supabase-backed services.

## Requirements

- Node.js and npm
- Git
- Docker Desktop for Windows when running the local Supabase stack
- Supabase CLI, installed by the app workspace dev dependencies
- Supabase project credentials when connecting to a hosted Supabase project

## Setup After Cloning

Clone the repository, enter the app workspace, and install dependencies:

```bash
git clone https://github.com/sadlybeleaguer/IskoAI-app.git
cd IskoAI-app
cd isko-app
npm ci
```

`npm ci` is the recommended install command for cloned repos because it uses the committed lockfile exactly. Use `npm install` only when intentionally adding or updating packages.

## Hosted Supabase Development

Create the local frontend environment file:

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local` with the Supabase values for your hosted project:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Start the frontend development server from the app workspace:

```bash
npm run dev
```

The app workspace `npm run dev` command starts the frontend app. You can also run the frontend directly:

```bash
cd frontend
npm ci
npm run dev
```

## Full Local Supabase Development

The app can run against a fully local Supabase stack with placeholder AI responses, so no external AI provider token is required for basic chat testing.

Install and start Docker Desktop first, then start the local Supabase stack from the `isko-app` workspace:

```bash
npm run supabase:start
```

Copy the local anon key printed by Supabase into `frontend/.env.local`. You can use the localhost template:

```bash
cp frontend/.env.localhost.example frontend/.env.local
```

Use these values as the base and replace the anon key:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

Create the local Edge Functions environment file:

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

The default local function template uses `AI_PROVIDER=placeholder`, which returns deterministic placeholder chat responses instead of calling Hugging Face or OpenRouter.

Run the frontend and local Edge Functions together:

```bash
npm run local:dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Supabase API and Functions: `http://localhost:54321`
- Supabase Studio: `http://localhost:54323`

Stop the local Supabase stack when finished:

```bash
npm run supabase:stop
```

## Environment Variables

Use committed `.env.example` files as templates only. Local secrets belong in ignored env files such as:

- `frontend/.env.local`
- `supabase/functions/.env`
- `.env`
- `.env.local`
- `backend/.env`
- `backend/.env.local`
- `database/.env`

Server-only AI provider tokens belong in the Supabase functions environment. Do not expose private tokens with a `VITE_` prefix because `VITE_` variables are included in frontend builds.

## Development Commands

Run these commands from the `isko-app` workspace:

```bash
npm run dev                 # Start the frontend dev server
npm run frontend:dev        # Start the Vite frontend dev server
npm run frontend:build      # Build the frontend
npm run frontend:preview    # Preview the frontend build
npm run frontend:lint       # Lint the frontend
npm run supabase:start      # Start the local Supabase stack
npm run supabase:stop       # Stop the local Supabase stack
npm run supabase:functions  # Serve local Supabase Edge Functions
npm run local:dev           # Serve Edge Functions and frontend together
npm run db:push             # Push database migrations to the linked Supabase project
```

## Supabase Project Layout

The Supabase CLI uses the standard `isko-app/supabase` directory:

- `supabase/config.toml`
- `supabase/migrations`
- `supabase/functions`
- `supabase/functions/_shared`

The legacy `backend` and `database` directories remain in the repo, but local Supabase CLI workflows should use the standard `supabase` directory.

## Git Ignore And Private Files

Do not commit generated dependencies or private credentials.

Ignored local files include:

- `node_modules`
- `dist`
- `dist-ssr`
- `.env`
- `.env.*`
- `frontend/.env*`
- `backend/.env*`
- `supabase/functions/.env*`
- `database/.env`

Safe files to commit include placeholder templates such as `.env.example`, `frontend/.env.example`, `frontend/.env.localhost.example`, and `supabase/functions/.env.example`.