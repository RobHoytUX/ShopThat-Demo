# shopTHAT Demo

This repository contains several historical prototypes, but the active static demo is `WebDemo`.

## Active Paths

- `WebDemo/` - current browser demo and static assets.
- `WebDemo/scripts/` - single source of truth for frontend JavaScript.
- `api/` - serverless API boundary used by the static demo for auth, AI proxying, and graph proxying.
- `shopTHAT_V1/graph_rag_backend/` - FastAPI graph/RAG backend prototype.
- `Shopthat_FastAPI/` - OpenSearch/Groq FastAPI prototype.
- `Archive/` - legacy work from the previous team; do not treat as active app code.

## Deploy

- Netlify publishes `WebDemo` via `netlify.toml`.
- Vercel serves `WebDemo` and same-origin API routes via `vercel.json`.
- Pushes to `main` run `.github/workflows/vercel-production.yml`, which deploys with
  `vercel deploy --prod` and then re-applies any custom domain aliases listed in the
  `VERCEL_DOMAINS` GitHub secret.

Required GitHub Actions secrets for Vercel production deploys:

- `VERCEL_TOKEN`

The workflow pins the Vercel org/project IDs from `.vercel/project.json` and
promotes each production deploy to:

- `agallery.ai`
- `www.agallery.ai`
- `shop-that-demo.vercel.app`

Required runtime environment variables:

- `SHOPTHAT_AUTH_SECRET`
- `SHOPTHAT_AUTH_USERS`
- `LUXURY_INTELLIGENCE_ASK_URL`
- `LUXURY_INTELLIGENCE_API_KEY`
- `KEYWORDS_GRAPH_API_URL`
- Backend-specific keys documented in the relevant `.env.example` files.

## Local Demo

Run the dev server from the repo root. It serves `WebDemo` and runs the `api/`
functions on the same origin, so the AI chat works locally exactly as deployed:

```sh
cp .env.example .env   # then fill in LUXURY_INTELLIGENCE_API_KEY
node dev-server.js     # http://localhost:8080
```

A plain static server (`python3 -m http.server 8080 --directory WebDemo`) still
serves the pages, but `/api/*` will 404 and the chat will fail.

## Security Notes

Live credentials must not be committed. Use `.env.example` files as templates and keep local `.env` files untracked. See `docs/secret-rotation.md` for the rotation runbook.
