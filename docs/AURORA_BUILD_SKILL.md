# 🌅 Aurora Build Skill — מ-0 ל-100

> מסמך מקיף לבניית אתר Hebrew RTL Life OS Dashboard זהה ל-`oslife.app` מאפס לחלוטין.
> כל ההחלטות הטכניות, האינטגרציות, העיצוב, וה-gotchas שגילינו לאורך הדרך.

**גרסה:** 1.0
**תאריך:** 27 אפריל 2026
**Source of truth:** הריפו `bben15600-sys/aurora-dashboard`

---

# 📋 תוכן עניינים

1. [סקירה כללית](#1-סקירה-כללית)
2. [Prerequisites — מה צריך לפני שמתחילים](#2-prerequisites)
3. [שלב 0 — Bootstrap הפרויקט](#3-שלב-0--bootstrap)
4. [שלב 1 — Aurora Design System](#4-שלב-1--aurora-design-system)
5. [שלב 2 — ניווט ו-Layout](#5-שלב-2--ניווט-ו-layout)
6. [שלב 3 — אינטגרציית Notion](#6-שלב-3--אינטגרציית-notion)
7. [שלב 4 — אינטגרציית Anthropic / Claude](#7-שלב-4--אינטגרציית-anthropic)
8. [שלב 5 — עמודי הליבה](#8-שלב-5--עמודי-הליבה)
9. [שלב 6 — Daily Briefing](#9-שלב-6--daily-briefing)
10. [שלב 7 — מטבח (Kitchen)](#10-שלב-7--מטבח)
11. [שלב 8 — בריאות + Strava](#11-שלב-8--בריאות--strava)
12. [שלב 9 — השקעות (Investments)](#12-שלב-9--השקעות)
13. [שלב 10 — Vercel Deploy](#13-שלב-10--vercel-deploy)
14. [שלב 11 — PWA](#14-שלב-11--pwa)
15. [שלב 12 — Tests](#15-שלב-12--tests)
16. [Reference: סכמות Notion DBs](#16-reference-סכמות-notion-dbs)
17. [Reference: Environment Variables](#17-reference-environment-variables)
18. [Reference: מבנה תיקיות](#18-reference-מבנה-תיקיות)
19. [Gotchas & Lessons Learned](#19-gotchas--lessons-learned)
20. [Future Work — גלים שלא נבנו עדיין](#20-future-work)

---

# 1. סקירה כללית

## מה זה Aurora?

דשבורד אישי בעברית RTL לניהול חיים שלמים. עמוד הבית מציג סיכום יומי עם תובנת AI, התראות חכמות, ולוקאהד 7 ימים. עמודים ייעודיים לניהול לוז (Notion), תקציב (Money Master), השקעות (Yahoo + Twelve Data), שווי נטו, מטבח (מתכונים + תכנון + מלאי), בריאות (פעילות + שינה + משקל + Strava), ושיחה חופשית עם Claude.

## עקרונות עיצוב

1. **אסתטיקה מינימלית-פרימיום** — Aurora theme: רקע כהה (#0B0D24), glass cards שקופים עם blur, accent בצבעים סגול/כחול/ירוק/אדום שמורים לתפקידים ספציפיים.
2. **טייפוגרפיה היררכית** — Heebo ל-UI, Frank Ruhl Libre לכותרות וטקסט AI, JetBrains Mono למספרים.
3. **RTL native** — הכל בעברית, אבל מספרים וסמלי מטבע ב-LTR (כמו `$656.42` ו-`12:30`).
4. **Mobile-first** — האתר נצרך ב-95% מהזמן בנייד.
5. **PWA** — מותקן כאפליקציה במסך הבית של iPhone.

## Stack טכני

| שכבה | טכנולוגיה |
|---|---|
| Build tool | Vite 5 |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS + CSS variables (Aurora theme) |
| UI primitives | shadcn/ui (Radix-based) |
| Routing | React Router v6 |
| State / data | TanStack Query (react-query) v5 |
| Forms | react-hook-form + zod |
| Charts | SVG ידני (לא recharts/d3) |
| Backend | Vercel Serverless Functions |
| DB | Notion (multi-integration: default + Money Master) |
| AI | Anthropic SDK (Claude Haiku 4.5 + caching) |
| OAuth | Strava |
| Stocks | Yahoo Finance → Twelve Data → Finnhub fallback chain |
| Tests | Vitest |
| Deploy | Vercel (Hobby tier — 12 function limit!) |
| Domain | oslife.app (custom) |

## הפיצ'רים שכבר נבנו (גרסה נוכחית)

- ✅ עמוד בית עם Daily Briefing (hero, AI insight, alerts, lookahead)
- ✅ לוז שבועי (Schedule)
- ✅ תקציב (Budget) עם Money Master
- ✅ השקעות (Investments) עם quotes + charts
- ✅ שווי נטו (NetWorth)
- ✅ מטבח (Kitchen) עם 8 לשוניות: מתכונים, תכנון, קניות, מלאי, ייבוא URL, שף AI, טיימרים, ממיר יחידות
- ✅ בריאות (Health) עם פעילות, שינה, משקל, Strava
- ✅ צ'אט עם Claude (Chat)
- ✅ PWA + הצמדה למסך הבית

---

# 2. Prerequisites

## חשבונות שצריך

| שירות | למה | מחיר |
|---|---|---|
| GitHub | קוד | חינם |
| Vercel | hosting + serverless | חינם (Hobby) |
| Notion | DB backend | חינם |
| Anthropic Console | API key ל-Claude | משלמים לפי שימוש |
| Strava (אופציונלי) | OAuth לפעילויות | חינם |
| Twelve Data (אופציונלי) | גרפי השקעות | חינם (800/יום) |
| Finnhub (אופציונלי) | quotes כ-fallback | חינם (60/דקה) |
| OpenRouter (אופציונלי) | chat fallbacks | משלמים לפי שימוש |

## כלים מקומיים

```bash
node --version  # >= 20
git --version
```

## מפתחות ש-Anthropic מקבל

המערכת תומכת בכל אחד מאלה (תמיכה גמישה בשמות):
`ANTHROPIC_API_KEY`, `ANTHROPIC_KEY`, `ANTHROPIC_TOKEN`, `CLAUDE_API_KEY`, `CLAUDE_KEY`, `CLAUDE_TOKEN`

---

# 3. שלב 0 — Bootstrap

## 3.1 — Vite + React + TS

```bash
npm create vite@latest aurora-dashboard -- --template react-ts
cd aurora-dashboard
npm install
```

## 3.2 — Tailwind + PostCSS

```bash
npm install -D tailwindcss@latest postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
```

## 3.3 — shadcn/ui

```bash
npx shadcn@latest init
```

Configuration: defaults, אבל יש לוודא:
- `tsconfig` paths: `"@/*": ["./src/*"]`
- Tailwind CSS variables: כן

הוסף קומפוננטות לפי הצורך:
```bash
npx shadcn@latest add button toast tooltip
```

## 3.4 — חבילות נוספות

```bash
npm install \
  react-router-dom \
  @tanstack/react-query \
  @anthropic-ai/sdk \
  vite-plugin-pwa \
  workbox-window
npm install -D vitest @testing-library/react @vitejs/plugin-react
```

## 3.5 — RTL הגדרה גלובלית

`index.html`:
```html
<html lang="he" dir="rtl">
```

## 3.6 — Vite config (port 8080 + PWA)

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-icon.svg'],
      manifest: {
        name: 'Aurora — Life OS',
        short_name: 'Aurora',
        theme_color: '#0B0D24',
        background_color: '#0B0D24',
        display: 'standalone',
        dir: 'rtl',
        lang: 'he',
        start_url: '/',
        icons: [
          { src: 'pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'] },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 8080, host: '::' },
});
```

⚠️ **חשוב:** Port 8080, לא 5173. (זה איך שה-app מוגדר — אם משנים, לעדכן הכל בהתאם.)

---

# 4. שלב 1 — Aurora Design System

## 4.1 — צבעי הליבה (CSS variables)

ב-`src/index.css`, הגדר את ה-tokens. אלה הצבעים המדויקים של Aurora:

```css
:root {
  /* Backgrounds */
  --oslife-bg: #0B0D24;
  --oslife-surface: rgba(255,255,255,0.035);
  --oslife-chip: rgba(255,255,255,0.04);
  --oslife-chip-border: rgba(255,255,255,0.07);
  --oslife-border: rgba(255,255,255,0.07);

  /* Text hierarchy */
  --oslife-text-strong: #F5F6FF;
  --oslife-text-mid: #B4B8D4;
  --oslife-text-mute: #6B7094;
  --oslife-text-faint: #424766;

  /* Accent palette (use sparingly, semantic) */
  --oslife-purple: #A78BFA;
  --oslife-blue: #60A5FA;
  --oslife-green: #34D399;
  --oslife-yellow: #FBBF24;
  --oslife-orange: #FB923C;
  --oslife-red: #FB7185;

  /* Kitchen accent (warm terracotta) */
  --oslife-kitchen: #E89A7D;

  /* Strava brand */
  --strava: #FC4C02;
}
```

## 4.2 — Glass cards

הקומפוננטה הויזואלית הכי שימושית. כל הקלפים באתר משתמשים ב-`.glass`:

```css
.glass {
  background: var(--oslife-surface);
  border: 1px solid var(--oslife-border);
  border-radius: 20px;
  backdrop-filter: blur(24px) saturate(160%);
  padding: 20px 24px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.06),
    0 20px 40px -24px rgba(0,0,0,0.65);
}
```

## 4.3 — Typography

```html
<!-- index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
body {
  font-family: 'Heebo', -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.mono { font-family: 'JetBrains Mono', monospace; }
.serif { font-family: 'Frank Ruhl Libre', 'Fraunces', Georgia, serif; }
.currency { font-family: 'JetBrains Mono', monospace; direction: ltr; unicode-bidi: embed; }
```

## 4.4 — Helper classes משתמשות חוזרות

```css
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.card-title { font-size: 15px; font-weight: 700; color: var(--oslife-text-strong); }
.label-cap {
  font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
  color: var(--oslife-text-mute); text-transform: uppercase;
}
```

## 4.5 — Background gradient עדין (body)

```css
body {
  background:
    radial-gradient(1200px 700px at 80% -10%, rgba(167,139,250,0.10), transparent 70%),
    radial-gradient(900px 600px at 10% 90%, rgba(96,165,250,0.08), transparent 70%),
    var(--oslife-bg);
  color: var(--oslife-text-strong);
  min-height: 100vh;
}
```

---

# 5. שלב 2 — ניווט ו-Layout

## 5.1 — App.tsx

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PinGate } from "@/components/PinGate";
import Index from "./pages/Index.tsx";
import Schedule from "./pages/Schedule.tsx";
import Budget from "./pages/Budget.tsx";
import Investments from "./pages/Investments.tsx";
import NetWorth from "./pages/NetWorth.tsx";
import Kitchen from "./pages/Kitchen.tsx";
import Health from "./pages/Health.tsx";
import Chat from "./pages/Chat.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <PinGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/net-worth" element={<NetWorth />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="/health" element={<Health />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PinGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

## 5.2 — AppShell

`src/components/dashboard/AppShell.tsx`. כל עמוד מוקף בו: TopBar למעלה, MobileNav למטה (במובייל), תוכן באמצע.

עיצוב מינימלי, padding מותאם למסך:

```tsx
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 px-4 md:px-8 pb-24 md:pb-8 max-w-[1200px] w-full mx-auto">
        <div className="flex flex-col gap-5 stage" style={{ marginTop: 20 }}>
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
```

## 5.3 — TopBar (desktop)

תפריט עליון אופקי עם 8 קישורים. ראה `src/components/dashboard/TopBar.tsx` בריפו לפרטים מלאים. עקרון: `useLocation` ל-active state, סגמנטים מעוגלים, `aria-selected`.

## 5.4 — MobileNav (bottom bar במובייל)

ניווט תחתון עם 6 אייקונים + כפתור AI במרכז:
- בית, לוז, מטבח, [AI], בריאות, תקציב, השקעות

ראה `src/components/dashboard/MobileNav.tsx`.

## 5.5 — PinGate (אופציונלי)

מסך נעילה עם PIN לפני שניתן לראות את האתר. מאחסן את ה-PIN ב-localStorage לאחר הקלדה ראשונה. קוד מקור: `src/components/PinGate.tsx`.

---

# 6. שלב 3 — אינטגרציית Notion

## 6.1 — Concept

אינטגרציה עם Notion עובדת כ-**proxy שרת-צד** ב-`/api/notion`. הסיבה: ה-API token של Notion לא יכול להיות בקוד הלקוח (זה סוד).

ה-proxy תומך בריבוי integrations — כי ה-Money Master נמצא תחת אינטגרציה אחרת מהשאר. הקוד בוחר את הטוקן הנכון לפי שדה `integration` ב-request body.

## 6.2 — `api/notion.ts`

מטפל בקריאות (queries) ל-DBs:

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

const TOKENS = {
  default: process.env.NOTION_API_TOKEN,
  mm: process.env.NOTION_MM_API_TOKEN || process.env.NOTION_API_TOKEN,
};

const ENDPOINTS = {
  default: (id: string) => `https://api.notion.com/v1/databases/${id}/query`,
  mm: (id: string) => `https://api.notion.com/v1/data_sources/${id}/query`,
};

const VERSIONS = { default: "2022-06-28", mm: "2025-09-03" };

function isUuidish(s: string): boolean {
  return /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { databaseId, integration = "default", filter, sorts, page_size = 100, start_cursor } = req.body ?? {};
  if (!isUuidish(databaseId)) return res.status(400).json({ error: "Invalid databaseId" });

  const token = TOKENS[integration as keyof typeof TOKENS];
  if (!token) return res.status(500).json({ error: `No Notion token for integration "${integration}"` });

  const allowList = process.env.NOTION_ALLOWED_DATABASES?.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowList && allowList.length > 0 && !allowList.includes(databaseId)) {
    return res.status(403).json({ error: "Database not in allowlist" });
  }

  const upstream = await fetch(ENDPOINTS[integration as keyof typeof ENDPOINTS](databaseId), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Notion-Version": VERSIONS[integration as keyof typeof VERSIONS],
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filter, sorts, page_size: Math.min(page_size, 100), start_cursor }),
  });
  const data = await upstream.json();
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  return res.status(upstream.ok ? 200 : upstream.status).json(data);
}
```

## 6.3 — `api/notion/pages.ts`

מטפל ביצירה/עדכון/ארכוב של עמודים. שלוש פעולות תחת אותו endpoint:

```typescript
type Action = "create" | "update" | "archive";
// בקשה: { action, integration, databaseId | pageId, properties }
```

## 6.4 — `src/lib/notion.ts` (client helper)

קובץ סינגל עם helpers לקרוא/לכתוב, וטיפוסים שמכסים את כל תוצאות ה-Notion API:

```typescript
export async function queryNotionDatabase(req: NotionQueryRequest, signal?: AbortSignal) {
  const response = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  return response.json();
}

export function extractTitle(prop: NotionProperty | undefined): string { /* ... */ }
export function extractRichText(prop: NotionProperty | undefined): string { /* ... */ }
export function extractNumber(prop: NotionProperty | undefined): number | null { /* ... */ }
export function extractSelect(prop: NotionProperty | undefined): string | null { /* ... */ }
export function extractDate(prop: NotionProperty | undefined): { start: string; end: string | null } | null { /* ... */ }
export function extractRelation(prop: NotionProperty | undefined): string[] { /* ... */ }
// ועוד extractCheckbox, extractMultiSelect, extractFormulaNumber, extractRollupNumber...

export async function createNotionPage(params: { databaseId: string; properties: Record<string, unknown>; integration?: NotionIntegration }) { /* ... */ }
export async function updateNotionPage(params: { pageId: string; properties: Record<string, unknown>; integration?: NotionIntegration }) { /* ... */ }
export async function archiveNotionPage(params: { pageId: string; integration?: NotionIntegration }) { /* ... */ }
```

## 6.5 — דפוס Hook ל-Notion DB

תבנית שחוזרת בכל hook (useGoals, useRecipes, useActivities, וכו'):

```typescript
export function useThings() {
  const databaseId = import.meta.env.VITE_NOTION_THINGS_DB_ID as string | undefined;

  const query = useQuery<Thing[]>({
    queryKey: ["notion", "things", databaseId ?? "sample"],
    enabled: Boolean(databaseId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      if (!databaseId) return SAMPLE_THINGS;
      const response = await queryNotionDatabase({ databaseId, page_size: 100 }, signal);
      return response.results.map(pageToThing).filter((t): t is Thing => t != null);
    },
  });

  // Sample fallback when DB is unconfigured — UI never breaks
  if (!databaseId) return { things: SAMPLE_THINGS, isConfigMissing: true, isSample: true, ... };

  return {
    things: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    isConfigMissing: false,
    isSample: false,
    databaseId,
  };
}
```

**הכלל הזהב:** כל hook חייב להחזיר נתוני sample כשה-DB לא מוגדר. ה-UI חייב להישאר תקין.

## 6.6 — Mapping של properties בעברית/אנגלית

ה-DBs ב-Notion יכולים להיות עם property names באנגלית או בעברית. ה-hooks תומכים בשניהם:

```typescript
const name = extractTitle(page.properties["שם"]) || extractTitle(page.properties["Name"]);
const date = extractDate(page.properties["תאריך"]) || extractDate(page.properties["Date"]);
```

---

# 7. שלב 4 — אינטגרציית Anthropic

## 7.1 — `api/ai.ts` (router)

קובץ אחד שמטפל ב-3 endpoints של AI דרך query parameter `?type=...`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const ACCEPTED_KEYS = [
  "ANTHROPIC_API_KEY", "ANTHROPIC_KEY", "ANTHROPIC_TOKEN",
  "CLAUDE_API_KEY", "CLAUDE_KEY", "CLAUDE_TOKEN",
] as const;

function pickApiKey(): string | undefined {
  const acceptedUpper = new Set(ACCEPTED_KEYS.map((k) => k.toUpperCase()));
  for (const [name, value] of Object.entries(process.env)) {
    if (acceptedUpper.has(name.toUpperCase()) && typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = pickApiKey();
  if (!apiKey) return res.status(500).json({ error: "No Anthropic API key" });

  const type = typeof req.query.type === "string" ? req.query.type : "";
  const client = new Anthropic({ apiKey });

  if (type === "daily-insight") return runDailyInsight(client, req, res);
  if (type === "health-insight") return runHealthInsight(client, req, res);
  if (type === "parse-recipe-url") return runRecipeParser(client, req, res);
  return res.status(404).json({ error: `Unknown AI type: ${type}` });
}
```

## 7.2 — Prompt caching (חיסכון בעלות)

ה-system prompt הוא הזהה בכל קריאה. עוטפים אותו ב-`cache_control: ephemeral`:

```typescript
const response = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 240,
  system: [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
  ],
  messages: [{ role: "user", content: userPayload }],
});
```

הפעם הראשונה משלמת לאחסון, אחר כך עד 5 דקות הקריאות הבאות זולות פי 10.

## 7.3 — Streaming chat (`api/chat.ts`)

לצ'אט החופשי, משתמשים ב-OpenRouter (לא Anthropic ישירות) כדי לקבל גמישות במודלים. ה-endpoint זורם SSE בפורמט תואם OpenAI:

```typescript
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");
res.setHeader("Connection", "keep-alive");

// loop on chunks from upstream
res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
res.write(`data: [DONE]\n\n`);
```

## 7.4 — Response shape משותף לכל insight endpoint

```json
{
  "insight": "פסקה בעברית...",
  "usage": {
    "input_tokens": 800,
    "output_tokens": 80,
    "cache_read_tokens": 750,
    "cache_creation_tokens": 0
  }
}
```

## 7.5 — Error handling

```typescript
const status =
  err instanceof Anthropic.RateLimitError ? 429
  : err instanceof Anthropic.AuthenticationError ? 401
  : err instanceof Anthropic.BadRequestError ? 400
  : err instanceof Anthropic.APIError ? err.status ?? 502
  : 502;
```

---

# 8. שלב 5 — עמודי הליבה

כל עמוד ב-`src/pages/`. דפוס משותף:
1. עוטף ב-`<AppShell>`
2. שולף נתונים מ-hooks
3. מציג sample data כשאין DB מוגדר
4. כל קלף ב-`.glass`

## 8.1 — Schedule (`/schedule`)

לוז שבועי בעברית RTL. עמודה לכל יום, אירועים מסודרים לפי שעה. נתונים מ-`useScheduleEvents`.

**קובץ:** `src/pages/Schedule.tsx`
**Hook:** `src/hooks/useScheduleEvents.ts`
**DB:** `VITE_NOTION_SCHEDULE_DB_ID` — title, date, time, location

## 8.2 — Budget (`/budget`)

תקציב לפי קטגוריות. שלושה DBs ב-Money Master integration:
- Categories (תקציב לכל קטגוריה)
- Expenses (כל הוצאה)
- Income (הכנסות)

ה-hook `useBudgetData` מסכם בצד הלקוח (rollups של Notion לא אמינים תמיד). מציג:
- ring של אחוז שימוש
- רשימת קטגוריות עם bar למילוי
- 5 הוצאות אחרונות

**Hook:** `src/hooks/useBudgetData.ts` (~395 שורות, הכי מורכב באתר)

## 8.3 — Investments (`/investments`)

תיק ההשקעות. מציג רשימת חזקות + ערכים חיים מ-Yahoo. כל hold בלחיצה פותח גרף 3 חודשים.

**Hooks:** `useInvestments`, `useYahooQuotes`, `useYahooChart`

## 8.4 — NetWorth (`/net-worth`)

סיכום שווי נטו: השקעות + נדל"ן + חיסכון - חובות. גרף קו של מגמה לאורך זמן.

## 8.5 — Kitchen (`/kitchen`)

8 לשוניות עם ניווט בראש. ראה שלב 7 לפרטים.

## 8.6 — Health (`/health`)

4 לשוניות: סקירה / פעילות / שינה / משקל. ראה שלב 8 לפרטים.

## 8.7 — Chat (`/chat`)

צ'אט עם Claude (דרך OpenRouter), עם streaming SSE. תומך בריבוי מודלים, אדפטיב thinking, ושמירת היסטוריה ב-localStorage.

## 8.8 — Index (`/`)

עמוד הבית. מציג Daily Briefing + 3 קלפי bento (לוז היום, השוק היום, יעדי השבוע). ראה שלב 6 לפרטים מלאים על Daily Briefing.

---

# 9. שלב 6 — Daily Briefing

הפיצ'ר המרכזי בעמוד הבית. מורכב מ-3 שכבות.

## 9.1 — שכבה 1: Pure aggregator (`src/lib/dailyBriefing.ts`)

פונקציה טהורה ללא תלות ב-React. מקבלת את כל הנתונים ומחזירה `BriefingSummary`:

```typescript
export type BriefingSummary = {
  alerts: BriefingAlert[];
  hero: { todayEventCount, goalsDone, goalsTotal, budgetPercent };
  lookahead: LookaheadDay[];
  insightContext: InsightContext;
  weekStats: { eventsTotal, estimatedHours, recurringBillsTotal, portfolioChangeIls };
};

export function computeBriefing(inputs: BriefingInputs): BriefingSummary {
  // 1. Alerts: budget overshoots, upcoming bills, market moves, at-risk goals
  // 2. Hero stats: counts and aggregates
  // 3. Lookahead: 7 days with events + bills
  // 4. Week stats: totals
  // 5. Insight context: structured input for the AI prompt
}
```

**מסונן עם 19 unit tests** (ראה `dailyBriefing.test.ts`). הקוד הזה חייב להיות 100% deterministic.

### חוקי alerts:
- **Budget over 100%** = `critical`
- **Budget 90-99%** = `warning`
- **Budget < 90%** = אין alert
- **Bill in 0-3 days** = `warning` (או `critical` אם זה היום עצמו)
- **Stock move ≥ 3%** + holding owned = alert
- **Weekly goal at risk** רק כשנשארו ≤ 2 ימים בשבוע ויעד לא הושלם
- **Sort:** critical first, ואז overshoot percent (גבוה→נמוך)

## 9.2 — שכבה 2: React hooks

**`useDailyBriefing`** — מאחד את כל ה-hooks הקטנים, קורא לאגרגטור:

```typescript
export function useDailyBriefing() {
  const today = useTodayEvents();
  const week = useScheduleEvents();
  const budget = useBudgetData();
  const goals = useGoals();
  const investments = useInvestments();
  const symbols = investments.data?.holdings.map((h) => h.symbol) ?? [];
  const { quotes } = useYahooQuotes(symbols);

  const briefing = useMemo(() =>
    computeBriefing({
      now: new Date(),
      goals: goals.goals,
      todayEvents: today.events,
      weekEvents: week.data?.events,
      weekStart: startOfWeekSunday(new Date()),
      budget: budget.data,
      holdings: investments.data?.holdings ?? [],
      quotes,
      monthlyDeposit: readMonthlyDeposit(),
    }),
    [goals.goals, today.events, week.data, budget.data, investments.data, quotes],
  );

  return { briefing, isLoading, hasAnyData };
}
```

**`useDailyInsight`** — קורא ל-`/api/ai?type=daily-insight` עם signature-based caching ב-react-query:

```typescript
function contextSignature(ctx: InsightContext): string {
  // רק שדות שמשפיעים על הפלט. לא כולל כותרות אירועים זהים.
  return JSON.stringify({ date, todayCount, budgetPercent, marketChange });
}
```

`staleTime: 30 * 60_000` — תוצאת AI נשמרת 30 דקות לפני קריאה חדשה.

## 9.3 — שכבה 3: UI (`src/components/dashboard/DailyBriefing.tsx`)

3 חלקים:

### BriefingHero
- ברכה ("בוקר טוב, בן" / "צהריים טובים" / "ערב טוב") לפי שעה
- 4 מטריקות: אירועים היום, יעדים, אחוז תקציב, ימים נותרו
- פסקת תובנת AI (rendered בעברית, font 'Frank Ruhl Libre' בסגנון מאמר)
- אם AI עוד נטען — placeholder skeleton

### AlertsList
- Cards עם icon (budget/market/deposit/goal), severity color, title + detail
- כל alert clickable → ניווט לעמוד הרלוונטי

### LookaheadCard
- 7 cells אופקיים, אחד ליום
- כל cell: יום בעברית (א'/ב'/...), מספר ביום, 2 אירועים בולטים, סכום חיובים
- היום הנוכחי מודגש בסגול
- ימים heavy (4+ אירועים) עם border ורוד
- **קליק על cell** → modal עם פרטי היום, קישורים ל-/schedule ו-/budget

## 9.4 — System prompt ל-Daily Insight

```
אתה כותב סיכום יומי קצר לדשבורד אישי בעברית.

המטרה: פסקה אחת קצרה (2-4 משפטים) שמסכמת את היום.

כללים:
1. תמיד בעברית. ללא Markdown, ללא רשימות.
2. דבר ישירות אל המשתמש בגוף שני.
3. אל תמציא מספרים — רק מה שמופיע בנתונים.
4. אורך: 30-60 מילים.
5. סדר עדיפויות: חריגות תקציב → חיובים בקרוב → תנועות שוק → לוז → יעדים.
6. אל תפתח ב"בוקר טוב" — זה כבר מופיע מעל.
7. אל תסיים בסיסמאות מוטיבציה.
```

---

# 10. שלב 7 — מטבח (Kitchen)

## 10.1 — מבנה לשוניות

ה-`/kitchen` הוא single-page application בתוך עצמו. למעלה ניווט בין 8 לשוניות:

```typescript
type KitchenTab = "recipes" | "mealplan" | "grocery" | "pantry" | "import" | "chef" | "timers" | "converter";
```

## 10.2 — Recipes (לשונית 1)

ספריית מתכונים מ-Notion. חיפוש, סינון, ולחיצה פותחת `RecipeDetail` עם רשימת מצרכים, צעדי הכנה (כל אחד עם כפתור טיימר אופציונלי), ו-scaling.

**Hook:** `useRecipes` (sample fallback של 3 מתכונים אמיתיים).
**Type:** `Recipe = { id, name, servings, category, totalMin, difficulty, description, ingredients, steps, tags, source }`
**DB:** `VITE_NOTION_RECIPES_DB_ID` עם properties: שם / Name (title), מנות / Servings (number), זמן (דקות) / Time, רמת קושי / Difficulty (select), תיאור / Description (rich_text), קטגוריה / Category (select), מצרכים / Ingredients (rich_text), הוראות / Steps (rich_text).

ה-rich_text של מצרכים והוראות מנותחים על-ידי parsers פשוטים שמטפלים בכמה פורמטים: "500 גרם קמח", "2 כוסות סוכר", "ביצים - 3".

## 10.3 — Meal Planner (לשונית 2)

לוח שבועי 7×3. כל cell פותח modal לבחור מתכון. ניווט קדימה/אחורה בין שבועות.

**Hook:** `useMealPlan(weekStart)`
**DB:** `VITE_NOTION_MEALPLAN_DB_ID` — תאריך (date), ארוחה (select: בוקר/צהריים/ערב/נשנוש), מתכון (relation→Recipes), הערות (rich_text)

## 10.4 — Grocery List (לשונית 3)

**אגרגטור טהור** ב-`src/lib/groceryList.ts`. מקבל את ה-MealPlan + Recipes + Pantry, מחזיר רשימה מקובצת לפי קטגוריה.

```typescript
export function generateGroceryList(inputs: { mealPlan, recipes, pantry }): GroceryItem[] {
  // 1. Loop over meal plan entries
  // 2. For each, find recipe → ingredients
  // 3. Aggregate by name+unit (don't merge different units!)
  // 4. Cross-check pantry (fuzzy match) — flag items already in stock
  // 5. Categorize by Hebrew category dictionaries
  // 6. Sort by category then name
}
```

**12 unit tests** מכסים: aggregation, units, pantry matching, categorization, rounding.

UI: רשימה עם checkboxes, כפתור שיתוף ב-WhatsApp (פותח wa.me עם הטקסט), פילטר "רק חסרים".

## 10.5 — Pantry (לשונית 4)

מלאי המטבח. כל פריט: שם, אימוג'י, כמות, יחידה, קטגוריה, סף הזמנה. סטטוס מחושב: `ok` / `low` / `empty`.

**Hook:** `usePantry` עם 3 mutations: `addItem`, `updateQty`, `removeItem`.
**DB:** `VITE_NOTION_PANTRY_DB_ID`

UI: grid responsive, כל card עם כפתורי `+`/`-`/🗑.

## 10.6 — Recipe Importer (לשונית 5)

הדבק URL → Claude מחלץ JSON → שמירה ל-Notion.

**Endpoint:** `/api/ai?type=parse-recipe-url`
ה-server fetcheר את הדף, מסיר scripts/styles/HTML, שולח עד 24KB ל-Claude עם system prompt מחמיר שדורש פלט JSON. תומך גם בעברית (אתרי בישול ישראליים) וגם באנגלית (תרגום אוטומטי).

## 10.7 — Chef AI Chat (לשונית 6)

צ'אט עם Claude מותאם להקשר בישול. system prompt מיוחד שמעודד תשובות קצרות ומעשיות.

## 10.8 — Timers (לשונית 7)

טיימרים מקבילים. כל אחד: שם, משך, סטטוס (ready/running/paused/done). שמירה ב-localStorage כדי שיישרדו refresh.

**Hook:** `useKitchenTimers`

## 10.9 — Unit Converter (לשונית 8)

ממיר יחידות מטבח: כפיות→מ"ל, אונקיות→גרם וכו'. סטטי, ללא DB.

---

# 11. שלב 8 — בריאות + Strava

## 11.1 — מבנה הלשוניות

4 לשוניות: סקירה / פעילות / שינה / משקל.

## 11.2 — Activity (`useActivities`)

לוג פעילויות גופניות. כל פעילות: תאריך, סוג (כדורסל/טניס/ריצה/כושר/אופניים/שחייה/אחר), משך, קלוריות, הערות, source.

**DB:** `VITE_NOTION_ACTIVITY_DB_ID`

## 11.3 — Sleep (`useSleep`)

רישום שינה יומי. שעות + איכות (מצוין/טוב/בינוני/גרוע). UI מציג גרף שבועי, קליק על יום פותח מודל עריכה.

**DB:** `VITE_NOTION_SLEEP_DB_ID`

## 11.4 — Weight (`useWeight`)

מעקב משקל יומי. UI: SVG sparkline + קלפי "עכשיו / יעד / נותר". יעד נשמר ב-localStorage (לא ב-Notion).

**DB:** `VITE_NOTION_WEIGHT_DB_ID`
**localStorage key:** `oslife.health.weightGoal.v1`

## 11.5 — `src/lib/healthStats.ts` (pure aggregator)

חישובים סטטיסטיים על הנתונים:
- `computeWeekStats(activities, referenceDate)` — אימונים/דקות/קלוריות לשבוע
- `compareWeeks(activities)` — current vs previous + delta
- `averageSleepLastWeek(entries)` — ממוצע + worst day
- `computeWeightTrend(entries, goal)` — current/goal/remaining/direction
- `projectGoalEta(trend, daysSpan)` — חיזוי "עוד X שבועות ליעד"

**13 unit tests.**

## 11.6 — Strava OAuth — מהלך מלא

הפיצ'ר הכי מורכב מבחינת flow.

### Endpoints (כולם תחת `api/strava/[action].ts` יחיד)

**1. `/api/strava/auth`** (GET):
- מייצר state אקראי לCSRF protection
- שומר state ב-cookie HttpOnly (Max-Age 600)
- redirect ל-Strava authorize URL עם `client_id`, `redirect_uri`, `scope: read,activity:read`, `state`

**2. `/api/strava/callback`** (GET):
- מקבל `?code=xxx&state=yyy`
- בודק שה-state תואם ל-cookie (CSRF check)
- POST ל-`https://www.strava.com/oauth/token` עם code → מקבל access + refresh + expires_at
- שומר 3 cookies HttpOnly: access (6h), refresh (30d), expires_at (30d)
- redirect ל-`/health?strava_connected=1`

**3. `/api/strava/activities`** (GET):
- קורא ה-cookies
- אם access expired → POST refresh → מעדכן cookies
- GET `https://www.strava.com/api/v3/athlete/activities?per_page=20`
- ממפה ל-format פנימי + ממיר types לעברית (Run→ריצה וכו')

**4. `/api/strava/disconnect`** (POST):
- מנקה את כל 3 ה-cookies (Max-Age 0)

### Hook `useStrava`

```typescript
export function useStrava(perPage = 20) {
  const query = useQuery({
    queryKey: ["strava", "activities", perPage],
    queryFn: async () => {
      const r = await fetch(`/api/strava/activities?per_page=${perPage}`);
      if (r.status === 401) return { connected: false, activities: [] };
      return r.json();
    },
  });
  return { connected, activities, isLoading, error, connectUrl: "/api/strava/auth", disconnect, refetch };
}
```

### `envTrim` — gotcha חשוב

```typescript
function envTrim(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : undefined;
}
```

הסיבה: ה-editor הסלולרי של Vercel מוסיף `\n` בסוף הערך של `STRAVA_REDIRECT_URI` כשמדביקים URL. לא קוטעים → URL פגום עם `%0A` בסוף → Strava דוחה.

---

# 12. שלב 9 — השקעות

## 12.1 — Yahoo Finance + Twelve Data + Finnhub fallback chain

הסיבה למורכבות: Yahoo חוסמת את ה-IPs של Vercel באקראי, ו-Finnhub free tier הוריד את `/stock/candle` מ-2024.

### Provider chain ב-`api/yahoo/chart.ts`:

```typescript
// 1. Yahoo query1 → query2 internal retry
async function fetchChartFromYahoo(symbol, range) {
  try { return await fetchChartFromYahooHost("query1", symbol, range); }
  catch { return await fetchChartFromYahooHost("query2", symbol, range); }
}

// 2. Twelve Data (free tier 800/day)
async function fetchChartFromTwelveData(symbol, range, apiKey) {
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=${size}&apikey=${apiKey}`;
  // ...
}

// 3. Finnhub (paid only — free tier doesn't have candles)
async function fetchChartFromFinnhub(symbol, range, apiKey) {
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=...&to=...&token=${apiKey}`;
}

// Main handler:
const errors = [];
let points = null;
try { points = await fetchChartFromYahoo(symbol, range); } catch (e) { errors.push(`Yahoo: ${e.message}`); }
if (!points && process.env.TWELVE_DATA_API_KEY) {
  try { points = await fetchChartFromTwelveData(symbol, range, process.env.TWELVE_DATA_API_KEY); }
  catch (e) { errors.push(`TwelveData: ${e.message}`); }
}
if (!points && process.env.FINNHUB_API_KEY) {
  try { points = await fetchChartFromFinnhub(symbol, range, process.env.FINNHUB_API_KEY); }
  catch (e) { errors.push(`Finnhub: ${e.message}`); }
}
```

## 12.2 — Aggressive caching

```typescript
res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=7200");
```

30 דקות edge cache + 2 שעות stale-while-revalidate. מצמצם דרמטית את התלות בעקיפה של חוסם IP.

## 12.3 — UI: clean error message

ב-`HoldingDetailView.tsx`, אם `chartError` — להציג רק:

```jsx
<span style={{ fontSize: 10, color: "#FB7185" }}>גרף לא זמין כרגע</span>
```

לא להציג את ה-JSON גולמי של השגיאה — זה מבריח משתמשים.

## 12.4 — Quotes (`api/yahoo/quote.ts`)

לציטוטים החיים עצמם (price + changePct), Yahoo בדרך כלל עובד. אם נכשל — fallback ל-Finnhub `/quote` (שכן עובד ב-free tier).

---

# 13. שלב 10 — Vercel Deploy

## 13.1 — gotcha קריטי: 12 function limit

תכנית Hobby של Vercel מאפשרת **12 serverless functions** בלבד. כל קובץ `.ts` ב-`/api/` נחשב כפונקציה.

### הפתרון: Dynamic routes + rewrites

**Pattern 1: Dynamic `[action].ts`**
```
api/strava/[action].ts  ← תופס את /api/strava/auth, /api/strava/callback, וכו'
```

ה-handler מנתב פנימית לפי `req.query.action`. URL ציבורי לא משתנה.

**Pattern 2: Single file + vercel.json rewrites**

`api/ai.ts` מטפל בכל ה-AI:
```typescript
if (type === "daily-insight") return runDailyInsight(...);
if (type === "health-insight") return runHealthInsight(...);
if (type === "parse-recipe-url") return runRecipeParser(...);
```

`vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/daily-insight", "destination": "/api/ai?type=daily-insight" },
    { "source": "/api/health-insight", "destination": "/api/ai?type=health-insight" },
    { "source": "/api/parse-recipe-url", "destination": "/api/ai?type=parse-recipe-url" },
    { "source": "/api/chat-env-check", "destination": "/api/chat-diag?check=env" },
    { "source": "/api/chat-models-check", "destination": "/api/chat-diag?check=models" },
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

## 13.2 — מבנה הפונקציות הסופי (12)

```
api/
├── ai.ts                  (router: daily-insight | health-insight | parse-recipe-url)
├── chat.ts                (OpenRouter streaming)
├── chat-diag.ts           (router: env | models)
├── claude.ts              (Anthropic streaming, alternative to OpenRouter)
├── extract-receipt.ts     (Claude Vision)
├── fx.ts                  (forex rates)
├── notion.ts              (queries)
├── notion/pages.ts        (writes)
├── parse-expense-voice.ts (Whisper + Claude)
├── strava/[action].ts     (router: auth | callback | activities | disconnect)
├── yahoo/chart.ts         (chart with provider chain)
└── yahoo/quote.ts         (quotes with provider chain)
```

## 13.3 — Deploy flow

1. Push to GitHub
2. Vercel auto-builds preview deployment עבור כל branch
3. Merge ל-`main` → production deploy
4. אם הוספת env var חדש — חובה לעשות **Redeploy** (Deployments → ⋯ → Redeploy → uncheck "Use existing Build Cache"), אחרת המשתנה לא נכנס.

## 13.4 — Domain setup

ב-Vercel → Settings → Domains → Add `oslife.app`. יש לעדכן את ה-DNS records (CNAME ל-Vercel) אצל ה-registrar.

לאחר ש-Strava מתחבר — לעדכן את `STRAVA_REDIRECT_URI` ב-Vercel ואת `Authorization Callback Domain` ב-Strava settings ל-`oslife.app` (בלי `https://`).

---

# 14. שלב 11 — PWA

`vite-plugin-pwa` כבר מוגדר ב-`vite.config.ts` (ראה שלב 0).

## 14.1 — Icon

`public/pwa-icon.svg` — SVG מקור אחד שמתורגם ל-192x192 ו-512x512 בזמן build.

## 14.2 — Service Worker

`autoUpdate` → SW בודק עדכונים אוטומטית. החיסרון: גרסה ישנה יכולה להישאר במשך session אחד אחרי deploy. הפתרון: לחץ "Reload" בדפדפן או לסגור הטאב לגמרי.

## 14.3 — Apple iOS

המשתמש: Safari → שתף → "הוסף למסך הבית". האפליקציה מותקנת כ-PWA.

⚠️ ב-iOS PWA, ה-cache של Service Worker אגרסיבי במיוחד. לאחר deploy חדש לפעמים צריך לסגור את ה-app מ-app switcher לפני שהגרסה החדשה נטענת.

---

# 15. שלב 12 — Tests

## 15.1 — Vitest setup

`package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`src/test/setup.ts`:
```typescript
import "@testing-library/jest-dom";
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

## 15.2 — מה לבדוק

הכלל: כל ספרייה טהורה (`src/lib/*.ts`) חייבת להיות מכוסה. קומפוננטות React לא חייבות (אבל אפשר).

קבצי בדיקה קיימים:
- `dailyBriefing.test.ts` — 19 בדיקות לחישוב Daily Briefing
- `groceryList.test.ts` — 12 בדיקות לאגרגציה של רשימת קניות
- `healthStats.test.ts` — 13 בדיקות לסטטיסטיקות בריאות

**סך הכל:** 44 בדיקות, כולן עוברות.

## 15.3 — Pattern לבדיקה של pure aggregator

```typescript
import { describe, it, expect } from 'vitest';
import { computeBriefing } from './dailyBriefing';

describe('computeBriefing', () => {
  it('handles empty input without crashing', () => {
    const result = computeBriefing({
      now: new Date('2026-04-25T10:00:00'),
      goals: [], todayEvents: [], budget: null, holdings: [], quotes: {},
    });
    expect(result.alerts).toEqual([]);
    expect(result.lookahead).toHaveLength(7);
  });
});
```

---

# 16. Reference: סכמות Notion DBs

## 16.1 — Schedule (לוז)

**Env:** `VITE_NOTION_SCHEDULE_DB_ID`
| Property | Type | תיאור |
|---|---|---|
| Title / שם | Title | שם האירוע |
| Date / תאריך | Date | התאריך והשעה |
| Time / שעה | Rich text (אופציונלי) | פורמט HH:MM אם לא בתוך Date |
| Location / מיקום | Rich text | מיקום אופציונלי |

## 16.2 — Goals (יעדי שבוע)

**Env:** `VITE_NOTION_GOALS_DB_ID`
| Property | Type | תיאור |
|---|---|---|
| Name / שם / יעד | Title | שם היעד |
| Done / בוצע | Number | כמה ביצעתי |
| Target / יעד | Number | היעד |
| Color / צבע | Select | צבע ברירת-מחדל (אופציונלי) |

תומך גם בצורה חלופית: Checkbox "Completed / הושלם" → done=1, target=1.

## 16.3 — Money Master (תקציב — 3 DBs)

נמצא תחת אינטגרציה נפרדת (`NOTION_MM_API_TOKEN`).

**Categories DB:** `VITE_NOTION_BUDGET_DB_ID`
| Property | Type |
|---|---|
| Name | Title |
| Emoji | Rich text |
| Group | Select |
| Type | Select |
| Fixed/Variable | Select |
| Budget | Number |
| Sort | Number |

**Expenses DB:** `VITE_NOTION_EXPENSES_DB_ID`
| Property | Type |
|---|---|
| Name | Title |
| Amount | Number |
| Date | Date |
| Category | Relation → Categories |
| PaymentMethod | Select |
| Frequency | Select |
| Notes | Rich text |

**Income DB:** `VITE_NOTION_INCOME_DB_ID` — דומה ל-Expenses.

## 16.4 — Recipes (מתכונים)

**Env:** `VITE_NOTION_RECIPES_DB_ID`
| Property | Type |
|---|---|
| Name / שם | Title |
| Servings / מנות | Number |
| Time / זמן (דקות) | Number |
| Difficulty / רמת קושי | Select (קל/בינוני/מתקדם) |
| Description / תיאור | Rich text |
| Category / קטגוריה | Select |
| Ingredients / מצרכים | Rich text (multi-line) |
| Steps / הוראות | Rich text (multi-line) |

## 16.5 — Meal Plan

**Env:** `VITE_NOTION_MEALPLAN_DB_ID`
| Property | Type |
|---|---|
| תאריך | Date |
| ארוחה | Select (בוקר/צהריים/ערב/נשנוש) |
| מתכון | Relation → Recipes |
| הערות | Rich text |

## 16.6 — Pantry (מלאי)

**Env:** `VITE_NOTION_PANTRY_DB_ID`
| Property | Type |
|---|---|
| שם | Title |
| כמות | Number |
| יחידה | Rich text |
| קטגוריה | Select |
| סף הזמנה | Number |
| אימוג׳י | Rich text |

## 16.7 — Activity (פעילות)

**Env:** `VITE_NOTION_ACTIVITY_DB_ID`
| Property | Type |
|---|---|
| שם | Title |
| תאריך | Date |
| סוג | Select (כדורסל/טניס/ריצה/כושר/אופניים/שחייה/אחר) |
| משך (דקות) | Number |
| קלוריות | Number |
| הערות | Rich text |

## 16.8 — Sleep (שינה)

**Env:** `VITE_NOTION_SLEEP_DB_ID`
| Property | Type |
|---|---|
| תאריך | Date |
| שעות | Number |
| איכות | Select (מצוין/טוב/בינוני/גרוע) |

## 16.9 — Weight (משקל)

**Env:** `VITE_NOTION_WEIGHT_DB_ID`
| Property | Type |
|---|---|
| תאריך | Date |
| משקל | Number (kg) |

## 16.10 — Investments

**Env:** `VITE_NOTION_INVESTMENTS_DB_ID`
| Property | Type |
|---|---|
| שם | Title |
| סמל | Rich text (NVDA, VOO וכו') |
| כמות יחידות | Number |
| מחיר ממוצע | Number |
| סוג | Select |

## 16.11 — Sharing the DBs with the integration

לכל DB חדש:
1. פתח אותו ב-Notion
2. ⋯ → Add connections
3. בחר את האינטגרציה (לדוגמה "Aurora Dashboard")
4. אשר

ללא זה, ה-API לא יראה את ה-DB.

---

# 17. Reference: Environment Variables

## חובה (האתר לא יעבוד בלעדיהם)

| משתנה | מטרה |
|---|---|
| `NOTION_API_TOKEN` | גישה ל-Notion (server-side) |

## חובה לחלקים מסוימים

| משתנה | מפעיל את |
|---|---|
| `ANTHROPIC_API_KEY` | תובנות AI + ייבוא מתכון + צ'אט |
| `OPENROUTER_API_KEY` (אופציונלי) | צ'אט עם מודלים נוספים |

## אופציונלי — מפעיל פיצ'רים

| משתנה | פיצ'ר |
|---|---|
| `NOTION_MM_API_TOKEN` | Money Master (אם DB אחר) |
| `NOTION_ALLOWED_DATABASES` | allowlist of DB IDs (security) |
| `TWELVE_DATA_API_KEY` | גרפי השקעות (free 800/day) |
| `FINNHUB_API_KEY` | quotes fallback |
| `STRAVA_CLIENT_ID` | OAuth Strava |
| `STRAVA_CLIENT_SECRET` | OAuth Strava |
| `STRAVA_REDIRECT_URI` | https://your-domain.com/api/strava/callback |

## DB IDs (חשופים ללקוח עם prefix `VITE_`)

```
VITE_NOTION_SCHEDULE_DB_ID
VITE_NOTION_GOALS_DB_ID
VITE_NOTION_BUDGET_DB_ID
VITE_NOTION_EXPENSES_DB_ID
VITE_NOTION_INCOME_DB_ID
VITE_NOTION_INVESTMENTS_DB_ID
VITE_NOTION_RECIPES_DB_ID
VITE_NOTION_MEALPLAN_DB_ID
VITE_NOTION_PANTRY_DB_ID
VITE_NOTION_ACTIVITY_DB_ID
VITE_NOTION_SLEEP_DB_ID
VITE_NOTION_WEIGHT_DB_ID
```

⚠️ Database IDs אינם סודיים (אי אפשר לקרוא ללא ה-token), אבל לא להוסיף את ה-tokens עצמם עם prefix `VITE_` — זה חושף אותם ללקוח!

---

# 18. Reference: מבנה תיקיות

```
aurora-dashboard/
├── api/                              # Vercel Serverless Functions
│   ├── ai.ts                         # Anthropic router (3 types)
│   ├── chat.ts                       # OpenRouter streaming
│   ├── chat-diag.ts                  # Diagnostic endpoints (env/models)
│   ├── claude.ts                     # Anthropic streaming alternative
│   ├── extract-receipt.ts            # Vision: receipt OCR + categorize
│   ├── fx.ts                         # Forex rates
│   ├── notion.ts                     # Notion query proxy
│   ├── notion/pages.ts               # Notion writes
│   ├── parse-expense-voice.ts        # Whisper + Claude
│   ├── strava/[action].ts            # Strava OAuth + API router
│   ├── yahoo/chart.ts                # Charts (Yahoo→TwelveData→Finnhub)
│   └── yahoo/quote.ts                # Quotes (Yahoo→Finnhub)
│
├── docs/                             # Documentation
│   ├── AURORA_BUILD_SKILL.md         # ← זה הקובץ הזה
│   ├── IDF_KITCHEN_PLAN.md           # IDF kitchen wave plan
│   └── SESSION_MASTER_PLAN.md        # Session reference
│
├── public/
│   ├── favicon.ico
│   ├── pwa-icon.svg
│   ├── manifest.webmanifest
│   └── preview/                      # Static design previews
│       ├── daily-briefing.html
│       ├── kitchen-expansion.html
│       ├── health.html
│       ├── idf-kitchen-overview.html
│       └── idf-kitchen-cookmode.html
│
├── src/
│   ├── App.tsx                       # Root + routing
│   ├── main.tsx                      # React entry
│   ├── index.css                     # Aurora theme + utilities
│   │
│   ├── pages/
│   │   ├── Index.tsx                 # / (Daily Briefing + bento)
│   │   ├── Schedule.tsx              # /schedule
│   │   ├── Budget.tsx                # /budget
│   │   ├── Investments.tsx           # /investments
│   │   ├── NetWorth.tsx              # /net-worth
│   │   ├── Kitchen.tsx               # /kitchen (8 tabs)
│   │   ├── Health.tsx                # /health (4 tabs)
│   │   ├── Chat.tsx                  # /chat
│   │   └── NotFound.tsx              # *
│   │
│   ├── components/
│   │   ├── PinGate.tsx               # Lock screen
│   │   ├── ThemeToggle.tsx
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── dashboard/
│   │   │   ├── AppShell.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   ├── DailyBriefing.tsx     # ← פיצ'ר חתימה
│   │   │   ├── BudgetLarge.tsx
│   │   │   ├── BudgetSmall.tsx
│   │   │   ├── CentralMetrics.tsx
│   │   │   ├── Donut.tsx
│   │   │   ├── InvestmentPortfolio.tsx
│   │   │   └── WeeklySchedule.tsx
│   │   ├── kitchen/
│   │   │   ├── ChefChat.tsx
│   │   │   ├── RecipeDetail.tsx
│   │   │   ├── TimersPanel.tsx
│   │   │   ├── UnitConverter.tsx
│   │   │   ├── MealPlannerTab.tsx
│   │   │   ├── GroceryListTab.tsx
│   │   │   ├── PantryTab.tsx
│   │   │   └── RecipeImporter.tsx
│   │   ├── health/
│   │   │   ├── ActivityList.tsx
│   │   │   ├── SleepChart.tsx
│   │   │   ├── WeightTrend.tsx
│   │   │   ├── HealthInsight.tsx
│   │   │   └── StravaConnect.tsx
│   │   └── investments/
│   │       └── HoldingDetailView.tsx
│   │
│   ├── hooks/
│   │   ├── useTodayEvents.ts
│   │   ├── useScheduleEvents.ts
│   │   ├── useBudgetData.ts          # ← הכי מורכב (~395 שורות)
│   │   ├── useGoals.ts
│   │   ├── useInvestments.ts
│   │   ├── useYahooQuotes.ts
│   │   ├── useYahooChart.ts
│   │   ├── useRecipes.ts
│   │   ├── useKitchenTimers.ts
│   │   ├── useMealPlan.ts
│   │   ├── usePantry.ts
│   │   ├── useActivities.ts
│   │   ├── useSleep.ts
│   │   ├── useWeight.ts
│   │   ├── useStrava.ts
│   │   ├── useDailyBriefing.ts
│   │   ├── useDailyInsight.ts
│   │   ├── useHealthInsight.ts
│   │   └── useTheme.ts
│   │
│   └── lib/
│       ├── notion.ts                 # Notion client + helpers
│       ├── dailyBriefing.ts          # ← Pure aggregator + 19 tests
│       ├── dailyBriefing.test.ts
│       ├── groceryList.ts            # ← Pure aggregator + 12 tests
│       ├── groceryList.test.ts
│       ├── healthStats.ts            # ← Pure aggregator + 13 tests
│       └── healthStats.test.ts
│
├── .env.example                      # מתעד את כל ה-env vars
├── vercel.json                       # Routes + rewrites
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── CLAUDE.md                         # § Session Handoff
```

---

# 19. Gotchas & Lessons Learned

## 19.1 — Vercel Hobby = 12 functions max

**ה-gotcha הכי כואב.** הפרויקט התפוצץ פתאום עם error "Too many functions" אחרי שהוספנו את Strava (4 endpoints) ו-AI endpoints (3) — הגענו ל-18.

**הפתרון:** ראה שלב 10. דוחף הכל ל-`[action].ts` או `?type=...` עם rewrites ב-`vercel.json`.

## 19.2 — Yahoo Finance חוסמת Vercel

מתחילת 2024 Yahoo חוסמת חלק גדול מ-IP ranges של AWS/Vercel באקראי. גרפי השקעות פשוט הפסיקו לעבוד באמצע יום.

**הפתרון:** Provider chain עם Twelve Data כ-fallback (free 800/day). ראה שלב 9.

## 19.3 — Finnhub free תיק

עד 2024, Finnhub free tier כלל את `/stock/candle` להיסטוריית מניות. מאז הם הזיזו את זה ל-paid. אם יש לך מפתח Finnhub חינמי הוא יחזיר 403.

**הפתרון:** השתמש ב-Twelve Data לצ'ארטים, שמור את Finnhub רק ל-quotes.

## 19.4 — Vercel mobile editor מוסיף `\n`

עורך ה-Environment Variables בעמוד Vercel הסלולרי לפעמים מוסיף newline בסוף הערך כשמדביקים URL ארוך. ה-`STRAVA_REDIRECT_URI` הופך ל-`https://oslife.app/api/strava/callback\n` → Strava רואה `%0A` ב-URL → דוחה.

**הפתרון:** `envTrim()` צד שרת ב-`api/strava/[action].ts`. תמיד עוטף `process.env.X` ב-`.trim()` כשמשתמשים בו.

## 19.5 — Notion property names: עברית או אנגלית

ה-DB יכול להיווצר עם שמות באנגלית או בעברית. ה-hooks חייבים לתמוך בשניהם. דפוס:

```typescript
const name = extractTitle(page.properties["שם"]) || extractTitle(page.properties["Name"]);
```

## 19.6 — Notion rollups מטעים

אל תסמכו על Notion rollups לחישובים פיננסיים מורכבים — לפעמים הם עובדים נכון בעמוד הראשון אבל לא בעמודים הבאים. תאספו ב-client side.

## 19.7 — react-query staleTime ארוך לתוצאות AI

קריאות ל-Claude יקרות. תגדירו `staleTime: 30 * 60_000` (30 דקות) ב-react-query כדי לא לקרוא שוב ושוב לאותו תוצאה. השתמשו ב-context signature כ-query key.

## 19.8 — PWA service worker אגרסיבי ב-iOS

לאחר deploy, iPhone לפעמים מציג גרסה ישנה של האתר. הפתרון: סגור את הטאב ב-Safari לגמרי (swipe up מ-app switcher) → פתח מחדש. ה-SW יבדוק עדכון ויטען חדש.

## 19.9 — RTL + LTR mixed content

מספרים, תאריכים, וסמלי מטבע צריכים להיות LTR גם בתוך טקסט RTL. השתמש ב-CSS:

```css
.currency, .mono {
  direction: ltr;
  unicode-bidi: embed;
}
```

## 19.10 — Hebrew font ל-AI text

טקסט שנוצר על-ידי AI נראה הרבה יותר טוב ב-`Frank Ruhl Libre` (serif) במקום ב-`Heebo` (sans-serif). זה גורם לו להרגיש "כתוב" ולא "מודפס".

## 19.11 — Always provide sample data fallback

כל hook חייב להחזיר נתוני sample כש-`VITE_NOTION_X_DB_ID` לא מוגדר. אחרת המשתמש רואה דף ריק במקום פיצ'ר עובד.

## 19.12 — Design previews לפני קוד

תמיד תכתוב HTML preview סטטי של פיצ'ר חדש ב-`public/preview/` לפני שכותבים את הקוד. זה חוסך X4-5 בזמן עבודה ומונע coding על vision לא מוסכם.

---

# 20. Future Work — גלים שלא נבנו עדיין

## Wave 2 — Tasks + Journal

### `/tasks`
- ניהול משימות בעברית עם עדיפויות, תאריכי יעד, קטגוריות, סטטוס
- DB ב-Notion: Title, Due date, Priority (High/Medium/Low), Category, Status (Todo/In progress/Done)
- UI: lists + Kanban view, filtering, ordering
- AI: "מה דחוף היום?" / "תכנן את היום"

### `/journal`
- יומן יומי + מצב רוח + תיוג נושאים
- DB: Date, Mood (1-5), Tags (multi-select), Content (rich text)
- חיפוש סמנטי דרך Claude (אסוציאציות, חזרות נושאים)
- AI: "מה למדתי מהשבוע?" / "סיכום חודשי"

## Wave 3 — AI Memory + Voice Capture

### AI Memory
- Claude זוכר את ההקשר של חייך לאורך הסשנים
- DB: Memories (extracted facts, preferences, people, goals)
- Background job: לאחר כל insight ל-Claude, להפיק עובדות חדשות ולשמור
- בכל קריאה ל-AI: לטעון את ה-memories הרלוונטיים כ-system prompt addendum

### Voice Capture
- כפתור גלובלי במסך הבית: "הקלט"
- Web Speech API → audio blob
- POST ל-`/api/parse-expense-voice` (כבר קיים) → Whisper → טקסט
- Claude מסווג: הוצאה / משימה / יומן / אירוע
- מתווסף לאוטומטית ל-DB הנכון

## IDF Kitchen Wave (מתועד נפרד)

ראה `docs/IDF_KITCHEN_PLAN.md` למסמך מלא של 11 פיצ'רים מותאמים לטבח יחיד צה"לי.

---

# 🎯 סיכום: סדר הבנייה המומלץ

אם אתה בונה את האתר מאפס, השתמש בסדר הזה:

1. **Bootstrap** (שלב 0): Vite + Tailwind + shadcn — יום אחד
2. **Design system** (שלב 1): Aurora theme, fonts, glass cards — יום
3. **Layout** (שלב 2): App.tsx + AppShell + TopBar + MobileNav — יום
4. **Notion proxy** (שלב 3): api/notion.ts + lib/notion.ts — יום
5. **Anthropic** (שלב 4): api/ai.ts + caching — יום
6. **First page**: Schedule (פשוט, מלמד את ה-pattern) — יום
7. **Second page**: Goals + Index ראשוני — יום
8. **Daily Briefing** (שלב 6): aggregator + tests + UI — 2-3 ימים
9. **Budget** (שלב 5.2): Money Master integration — 2 ימים
10. **Investments** (שלב 9): Yahoo + TwelveData fallback chain — 2 ימים
11. **Kitchen** (שלב 7): all 8 tabs — 5-7 ימים
12. **Health + Strava** (שלב 8): activity/sleep/weight + OAuth — 4-5 ימים
13. **Polish + PWA** (שלבים 11): icons, PWA, mobile fine-tuning — 2 ימים
14. **Tests** (שלב 12): 44+ unit tests — לאורך כל הדרך, לא בסוף
15. **Deploy** (שלב 10): Vercel function consolidation, custom domain — יום

**סך הכל:** ~30-40 ימי עבודה לאתר מלא ופונקציונלי.

---

# 📚 קבצי תיעוד נוספים בריפו

- `HANDOFF.md` — תקציר הסשן הנוכחי (auto-updated)
- `docs/SESSION_MASTER_PLAN.md` — תיעוד מלא של הסשן שבנה את האתר
- `docs/IDF_KITCHEN_PLAN.md` — תוכנית ל-Wave של מטבח צה"לי
- `.env.example` — כל ה-env vars מתועדים
- `public/preview/*.html` — design previews של כל הפיצ'רים

---

**סוף.** המסמך הזה אמור להספיק לאדם (או Claude אחר) שיתחיל מאפס ובונה אתר זהה ל-`oslife.app`.

אם משהו חסר או לא ברור — תמיד אפשר להסתכל בריפו עצמו: https://github.com/bben15600-sys/aurora-dashboard
