# IskoAI App

IskoAI is a JavaScript monorepo with a Vite React frontend and Supabase-backed services.

## Requirements

- Node.js and npm
- Git
- Supabase project credentials for local development

## Setup After Cloning

Clone the repository and install dependencies from the repo root:

```bash
git clone https://github.com/sadlybeleaguer/IskoAI-app.git
cd IskoAI-app
npm ci
```

`npm ci` is the recommended install command for cloned repos because it uses the committed lockfile exactly. Use `npm install` only when intentionally adding or updating packages.

Create the local frontend environment file:

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local` with the Supabase values for your project:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Start the frontend development server from the repo root:

```bash
npm run dev
```

The root `npm run dev` command starts the frontend app. You can also run the frontend directly:

```bash
cd frontend
npm ci
npm run dev
```

## Environment Variables

Use committed `.env.example` files as templates only. Local secrets belong in ignored env files such as:

- `frontend/.env.local`
- `.env`
- `.env.local`
- `backend/.env`
- `backend/.env.local`
- `database/.env`

Server-only AI provider tokens belong in the backend or Supabase functions environment. Do not expose private tokens with a `VITE_` prefix because `VITE_` variables are included in frontend builds.

## Development Commands

Run these commands from the repo root:

```bash
npm run dev               # Start the frontend dev server
npm run frontend:dev      # Start the Vite frontend dev server
npm run frontend:build    # Build the frontend
npm run frontend:preview  # Preview the frontend build
npm run frontend:lint     # Lint the frontend
```

Supabase-related commands:

```bash
npm run backend:serve     # Serve Supabase functions locally
npm run db:push           # Push database migrations
```

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
- `database/.env`

Safe files to commit include placeholder templates such as `.env.example`, `frontend/.env.example`, and `backend/functions/.env.example`.
