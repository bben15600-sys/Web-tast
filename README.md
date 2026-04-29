# Aurora Dashboard — Template

A production-ready Hebrew RTL Life OS dashboard template. Vite + React + TypeScript + Tailwind + shadcn/ui, deployed to Vercel as a PWA, backed by Notion + Anthropic Claude.

## What you get out of the box

- **Daily Briefing** — AI-generated Hebrew morning summary with smart alerts and 7-day lookahead
- **Schedule** — weekly events from Notion
- **Budget** — Money Master integration (3 Notion DBs) with categories, expenses, income
- **Investments** — Yahoo Finance + Twelve Data + Finnhub fallback chain, sparklines, charts
- **Net Worth** — investment + holdings + savings summary
- **Kitchen** — 8 tabs: recipes (Notion-backed), meal planner, auto-generated grocery list, pantry, recipe URL importer (AI-powered), AI chef chat, multi-timer, unit converter
- **Health** — activity log, sleep tracking, weight trend with ETA projection, Strava OAuth integration, AI weekly insight
- **Chat** — streaming Claude conversations with multiple system-prompt modes
- **PWA** — installs to iPhone home screen with proper RTL Hebrew icon
- **44 unit tests** for critical aggregators (Daily Briefing, grocery list, health stats)
- **Aurora design system** — dark theme, glass cards, Heebo + Frank Ruhl Libre + JetBrains Mono fonts
- **PIN gate** (optional) — lock screen before site access

## Quick start

### 1. Use this template

Click **"Use this template"** at the top of this repo on GitHub → Create a new repository.

### 2. Clone and install

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
npm install
```

### 3. Run Claude Code with the build skill

In your new repo, run Claude Code and invoke:

```
/build-aurora
```

The skill walks you through 16 customization phases interactively — naming, branding, feature selection, every external service setup (Notion, Anthropic, Vercel, Strava, Twelve Data), and final deployment.

If you prefer to set up manually, follow `docs/AURORA_BUILD_SKILL.md` (the deep architecture reference).

### 4. Deploy

Push to GitHub → import to [Vercel](https://vercel.com/new) → add env vars (see `.env.example`) → done.

## What the build skill handles

- Full phase-by-phase walkthrough (16 stages)
- Notion DB schema generation for all 11 backing databases
- Vercel function consolidation (Hobby tier 12-function limit handled via dynamic routes + rewrites)
- Strava OAuth flow with the `envTrim` gotcha (Vercel's mobile editor sometimes appends newlines)
- Investment chart provider chain (Yahoo's IP block on Vercel addressed via Twelve Data fallback)
- Hebrew/English Notion property fallbacks for every hook
- Sample data fallbacks so the UI never breaks on missing config

See `.claude/commands/build-aurora.md` for the full skill.

## Tech stack

| Layer | Tech |
|---|---|
| Build | Vite 5 |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS + Aurora theme (CSS variables) |
| UI primitives | shadcn/ui (Radix-based) |
| Routing | React Router v6 |
| Data | TanStack Query v5 |
| Forms | react-hook-form + zod |
| Backend | Vercel Serverless Functions |
| Database | Notion API |
| AI | Anthropic SDK (Claude Haiku 4.5 with prompt caching) |
| OAuth | Strava |
| Stocks | Yahoo Finance → Twelve Data → Finnhub |
| Tests | Vitest |
| Deploy | Vercel |

## External accounts you'll need

- **Required:** GitHub, Vercel, Notion, Anthropic Console
- **Recommended:** Twelve Data (free 800/day), Strava developer app
- **Optional:** OpenRouter (chat fallbacks), custom domain

## Documentation

- `docs/AURORA_BUILD_SKILL.md` — Complete architecture reference (1,700+ lines covering every design decision, integration pattern, and gotcha)
- `.claude/commands/build-aurora.md` — The orchestration skill itself
- `.env.example` — Every environment variable documented

## License

MIT (or your preferred license — update before publishing).
