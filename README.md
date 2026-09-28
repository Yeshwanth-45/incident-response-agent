# Incident Response Agent

An incident-response assistant with persistent memory. Engineers report an incident; the agent recalls similar past incidents from **Hindsight**, analyzes the new one with **xAI Grok**, and after resolution stores the learnings back into Hindsight so the next similar incident is handled faster.

Stack: Next.js 14 (App Router), TypeScript, Tailwind, SQLite (`node:sqlite`, Node 22+), Hindsight, xAI Grok.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in your keys
npm run dev                    # http://localhost:3000
```

Requires **Node 22.5+** (uses the built-in `node:sqlite`; no native build step).

### Configuration (`.env.local`)

| Variable | Purpose |
|---|---|
| `XAI_API_KEY` | xAI Grok API key (https://console.x.ai) |
| `XAI_MODEL` | Grok model id. Model names change; check xAI's docs and set a current one |
| `HINDSIGHT_BASE_URL` | Local Hindsight (e.g. `http://localhost:8888`) or Hindsight Cloud URL |
| `HINDSIGHT_API_KEY` | Needed for Hindsight Cloud; blank for local |
| `HINDSIGHT_BANK_ID` | Memory bank name (default `incident-response-agent`) |

Secrets live only in `.env.local` (git-ignored) and are used server-side only.

## Demo story

1. `npm run seed:memory` retains the seeded resolved incidents (including **INC-1042**, connection pool exhaustion) in Hindsight.
2. Open **INC-1048 - Payment API timeout errors** (or report a new, similar incident) and start the investigation.
3. The agent recalls INC-1042 / INC-1021 from Hindsight, sends them to Grok as context, and suggests the `DB-CONNECTION-POOL-01` runbook.
4. Click **Resolve & Review**, fill in the post-incident review, and save. It is retained in Hindsight.

## Behaviour when services are unavailable

Nothing is faked. Without Hindsight, the UI says memory is unavailable and analysis uses only the current incident. Without Grok, you get a clearly labeled non-AI fallback. The post-mortem is still saved locally, and the UI only says it was stored in Hindsight if the retain call actually succeeded. Check status on the **Settings** page or `GET /api/health`.

## Project layout

- `src/lib/hindsight.ts`: only module that talks to Hindsight (recall / retain)
- `src/lib/grok.ts`: only module that talks to xAI Grok
- `src/lib/agent.ts`: recall, analyze, log pipeline
- `src/lib/db.ts`: SQLite schema, seed data, queries
- `src/app/api/**`: REST routes; `src/app/**`: pages

## Notes and limitations

- Seed incidents, runbooks and the dashboard "System Health" card are synthetic demo data. No live monitoring integration, no authentication (single-user local tool).
- The Hindsight and Grok integrations were written against their public docs but **not tested against live services** (no credentials or network access in the build environment). Verify with your keys via Settings and the demo flow, and adjust `XAI_MODEL` / Hindsight options if their APIs have changed.
- `node:sqlite` is marked experimental by Node and prints a warning at startup.
