# Tether

A personal safety app spanning dating, rideshare, marketplace, and student
scenarios, plus a B2B workplace-safety dashboard. See **`CLAUDE.md`** for the
full product brief, screen-by-screen inventory, design system, and build
order -- read that first if you're picking this project up in Claude Code.

**`reference/tether-app-demo.html`** is the original prototype (cleaned up --
see CLAUDE.md for what was fixed) and the pixel-accurate source of truth for
anything this rebuild only approximates. Open it directly in a browser to
click through the original design.

This project was originally prototyped in [Lovable](https://lovable.dev) and
migrated here for continued development. The build tooling (Vite, TypeScript,
React, Tailwind, shadcn/ui) is unchanged from that export.

## Setup

```sh
npm install
cp .env.example .env.local
```

Then fill in `.env.local`:

- `VITE_GOOGLE_MAPS_API_KEY` -- reuse the same Google Cloud API key from the
  original Lovable build. Confirm it has **Maps JavaScript API**, **Places
  API**, **Geocoding API**, and **Directions API** enabled (Google Cloud
  Console -> APIs & Services -> Library).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` -- from your Supabase
  project's Settings -> API page. If you don't have a project yet, create one
  and run `supabase/schema.sql` against it in the SQL editor.

```sh
npm run dev
```

App runs at `http://localhost:8080`.

## Project layout

```
reference/
  tether-app-demo.html   The original prototype -- pixel-accurate source of truth
src/
  components/
    layout/      AppShell (nav), ScreenStub (placeholder screens)
    maps/        GoogleMapView (shared Google Maps wrapper)
  lib/           env.ts, supabase.ts, utils.ts, modeMenus.ts
  pages/         Home, ModeMenu, ActiveTimer, DatingMode, RideMode,
                 MarketplaceMode, Vault, student/*, SafetyCircle, Vouch,
                 Settings, Premium, Guardian, b2b/*
  types/         database.ts (Supabase row types -- regenerate once schema is live)
supabase/
  schema.sql     Full table + RLS definitions
```

See CLAUDE.md's **Screen inventory** table for which pages are fully built
vs. still stubs, and exactly which line of `reference/tether-app-demo.html`
each stub should be built from.

## Scripts

```sh
npm run dev        # start dev server
npm run build       # production build
npm run lint         # eslint
npm run test         # vitest
```
