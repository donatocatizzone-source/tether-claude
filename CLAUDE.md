# Tether — project brief for Claude Code

Tether is a personal safety app: a "Dead Man's Switch" / universal safety layer
for high-risk real-world meetup moments — dating, rideshares, online
marketplace meetups, and student commutes. The problem it solves is the
**Safety Gap**: the vulnerable window between a digital connection (a match,
a booked ride, a buyer's message) and the real-world interaction that follows.

This repo is a fresh rebuild of a prototype originally built in **Lovable**
(React + Tailwind + shadcn/ui + Supabase + Google Maps), migrated here for
continued development in Claude Code.

## Ground truth: `reference/tether-app-demo.html`

**This file is the pixel-accurate source of truth.** It's the original
Gemini/Lovable single-file HTML/Tailwind/vanilla-JS prototype, with one fix
applied: the original export had a duplicate/mis-nested copy of 12 screens
(a missing `</div>` after `#screen-ride` caused everything after it to nest
inside it instead of sitting as a sibling). That's been corrected — the file
now has exactly one copy of each of the 18 screens, is fully balanced, and
opens correctly in a browser as-is (open it directly to click through the
whole prototype).

Whenever this brief describes a screen only at a high level, **read the
actual markup at the line number given below** rather than guessing —
exact copy, spacing, icon choices, and color are all in there.

## Screen inventory

Original screen id -> route in this app -> what it is -> build status.

| Screen id | Route | What it is | Status |
|---|---|---|---|
| `screen-home` | `/` | Light-theme dashboard: greeting, "You are Safe" card with Safety Circle/Vouch shortcuts, "Arm Safety Tether" CTA, 2x2 Quick Modes grid | Built (`src/pages/Home.tsx`) |
| `screen-mode-menu` | `/mode/:mode` | Shared, data-driven screen populated per mode (dating/ride/market/student) -- connected-app icons + a feature list | Built (`src/pages/ModeMenu.tsx`, config in `src/lib/modeMenus.ts`) |
| `screen-active-timer` | `/active-timer` | Dark full-screen countdown ring (30 min), "I'M SAFE" / "TRIGGER SOS" buttons | Built (`src/pages/ActiveTimer.tsx`) |
| `screen-dating` | `/dating` | Fake-call escape: "PROTECTION ACTIVE" card, "Get Out" button (3s delay), full-screen incoming-call overlay ("Landlord") | Built (`src/pages/DatingMode.tsx`) |
| `screen-ride` | `/ride` | Map + trip card (Uber/Lyft sync chip), Simulate Safe / Simulate Deviate, red bottom-sheet deviation alert | Partially built -- real Google Maps (`GoogleMapView`) used intentionally instead of the demo's fake SVG map. The rideshare-sync UI chrome + deviation alert sheet from `#screen-ride` (~line 1267) not yet ported. |
| `screen-market` | `/market` | Camera-viewfinder evidence capture, "Evidence Secured" success overlay | Built (`src/pages/MarketplaceMode.tsx`) |
| `screen-vault` | `/vault` | Grid of encrypted evidence thumbnails (photos + text logs) | Stub -- spec at `#screen-vault` (~line 881) |
| `screen-student-bus` | `/student/bus` | Bus-route map, bus icon animates along path, Simulate Route / Simulate Deviation | Stub -- spec at `#screen-student-bus` (~line 661), JS at `runBusSim`/`runBusDeviation`/`resetBusSim` (~line 1712) |
| `screen-student-walk` | `/student/walk` | Shrinking countdown ring + progress bar for walk-home distance | Stub -- spec at `#screen-student-walk` (~line 697), JS at `startWalkSim`/`runWalkDeviation` (~line 1777) |
| `screen-student-hangout` | `/student/hangout` | Pick friends (toggle grid) + location pin + Guardian-notification preview | Stub -- spec at `#screen-student-hangout` (~line 736), JS at `toggleFriend` (~line 1829) |
| `screen-circle` | `/circle` | Map with member pins + trusted-contact list ("Ping" button) + activity feed | Stub -- spec at `#screen-circle` (~line 795) |
| `screen-vouch` | `/vouch` | Circular 98/100 trust-score ring + recent-badges list | Stub -- spec at `#screen-vouch` (~line 596) |
| `screen-settings` | `/settings` | Grouped settings list (Account / Safety / Support) + Log Out | Stub -- spec at `#screen-settings` (~line 920) |
| `screen-premium` | `/premium/:key` | Shared, data-driven detail screen for a premium feature (dispatch/guardian/badge) | Built (`src/pages/Premium.tsx`, config in `src/lib/modeMenus.ts`) |
| `screen-guardian` | `/guardian` | Parent/guardian live-view: map pin with battery %, bottom sheet with ETA/speed/emergency-audio row | Stub -- spec at `#screen-guardian` (~line 1061) |
| `screen-b2b-home` | `/b2b` | Realtor/agent dashboard: showing-timer CTA, Open House / Verify Client / Team Status tool grid | Stub -- spec at `#screen-b2b-home` (~line 410) |
| `screen-b2b-team` | `/b2b/team` | Agent roster with live status + message shortcut | Stub -- spec at `#screen-b2b-team` (~line 472) |
| `screen-b2b-openhouse` | `/b2b/openhouse` | Radar-ping geofence monitor, auto-check-in toggle, silent-alarm button | Stub -- spec at `#screen-b2b-openhouse` (~line 545) |

Plus **app chrome** (not routed -- lives in the shell):
- **Toast system** (`showToast()`, ~line 1367) -> use `sonner`'s `toast()` (already wired as `<Toaster>` in `App.tsx`, used in `DatingMode`/`MarketplaceMode`/`ActiveTimer`/`ModeMenu`)
- **Hamburger menu drawer** (`#menu-drawer`, ~line 204) -> not yet ported; contains the "Switch to Professional" link into the B2B side, plus links to Premium features and Billing
- **Payment sheet** (`#pay-sheet`, ~line 146) -> not yet ported; Apple-Pay-style plan picker (Monthly $9.99 / Single Mission $0.99), `selectPlan()`/`processPayment()` (~line 1410)
- **Bottom nav + floating shield button** (`#bottom-nav`, ~line 279) -> ported (`src/components/layout/AppShell.tsx`)
- **Status bar / notch / phone-frame chrome** -> deliberately **not** ported. The original was a phone-simulator wrapper for a demo; this rebuild is a real responsive web app, so the phone frame goes away and screens fill the viewport. (Per the earlier brainstorm: "single responsive web app... no separate mobile/desktop builds.")

## Navigation model

The original is a single-page app with one router function:

```js
function switchScreen(screenId, toastMsg = null) { ... }
```

It hides all `.screen` elements and shows `#screen-${screenId}`, updates which
bottom-nav icon is highlighted, flips the status-bar text color for dark
screens, and resets a few bits of per-screen state (closes the fake-call
overlay, hides the marketplace success overlay, resets the bus-sim position).

This rebuild replaces that with React Router (`src/App.tsx`) -- one route per
screen id, `useNavigate()` instead of `switchScreen()`. Two screens are
**data-driven** in the original (`openModeMenu(mode)` and `openPremium(key)`
inject content into a single shared screen rather than having one screen per
variant) -- those are ported the same way here as `/mode/:mode` and
`/premium/:key`, reading from `src/lib/modeMenus.ts`.

## Design system

Carry these over exactly -- don't reinterpret them. Confirmed directly from
`reference/tether-app-demo.html`'s inline `<style>` block and screen markup:

| Token | Value | Use |
|---|---|---|
| Dark background | `#0f172a` (Slate 900) | Dark screens: active-timer, dating, market, premium, vault, guardian |
| Light background | `#f8fafc`-ish (Slate 50) | Light screens: home, circle, vouch, settings, mode-menu, ride |
| Brand gradient | `linear-gradient(135deg, #4292c6, #2dd4bf)` | "Arm Safety Tether" CTA, hero moments |
| Safe / Teal-green | emerald-500 `#10b981` | Status = safe, countdown ring fill, "I'm Safe" button |
| Active / Amber-yellow | amber/yellow-500 | B2B "showing active" states, bus mode |
| Danger / Red | red-500 `#ef4444` | SOS, duress, deviation alerts |
| Dating accent | rose/pink-500, warm | Dating Mode icon + fake-call button |
| Ride / Pro accent | indigo/sky + amber-500 for B2B | Ride Mode, B2B/realtor screens |

- **Typography**: Inter for UI text, JetBrains Mono for timers/coordinates/log
  readouts (`.font-mono-data` utility in `src/index.css`).
- **Components**: glassmorphism overlays (`.glass-panel`), thumb-friendly
  oversized touch targets -- this app gets used one-handed, often under stress.
- **Layout**: single responsive web app, no phone-frame chrome (see above).

These tokens are wired up in `src/index.css` and `tailwind.config.ts` as
`bg-mode-safe`, `text-mode-dating`, `.bg-brand-gradient`, etc. Note some actual
screens (home, circle, vouch, settings) use plain Tailwind slate/pink/indigo/
emerald classes directly rather than the `mode-*` tokens, matching the
reference file's own class names. Prefer matching the reference's literal
classes when porting a specific screen; use the `mode-*` tokens for new UI
that doesn't have a reference screen to copy from.

## Tech stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, shadcn/ui (`components.json`
  is already configured -- run `npx shadcn@latest add <component>` as needed)
- **Routing**: react-router-dom
- **Backend/Auth**: Supabase (Postgres + RLS) -- see `supabase/schema.sql`
- **Maps**: Google Maps (`@react-google-maps/api`) -- **reuses the same Google
  Cloud API key from the original Lovable build.** Put it in `.env.local` as
  `VITE_GOOGLE_MAPS_API_KEY`. See `src/lib/env.ts` for which Cloud APIs need to
  be enabled (Maps JavaScript, Places, Geocoding, Directions). The original
  demo's map screens (`ride`, `student-bus`, `circle`, `guardian`,
  `b2b-openhouse`) all used a fake SVG grid + hardcoded pixel coordinates --
  this rebuild intentionally upgrades those to real Google Maps via
  `src/components/maps/GoogleMapView.tsx`.
- **Icons**: lucide-react (the original used the separate `lucide` CDN
  package with `data-lucide="..."` attributes + `lucide.createIcons()`; this
  rebuild uses `lucide-react` components directly -- same icon names apply)
- **State/data fetching**: @tanstack/react-query
- **Toasts**: sonner (replaces the original's hand-rolled `showToast()`)

## Database schema

Implemented in `supabase/schema.sql` -- run it against a fresh Supabase
project, then regenerate `src/types/database.ts` with:

```
npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
```

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`; safe word, duress PIN hash, role, org |
| `trusted_contacts` | A user's Safety Circle (`screen-circle` member list) |
| `check_ins` | Manual/automated "I'm safe" pings (`screen-active-timer`) |
| `active_sessions` | Consumer mode sessions (dating/ride/marketplace/student) |
| `professional_sessions` | B2B sessions (client, address, expected end time) -- `screen-b2b-home`'s "Next Showing" |
| `organizations` | B2B tenant, subscription tier |
| `user_locations` | One row per user, upserted ~every 30s -- powers `screen-circle`/`screen-guardian`/`screen-b2b-team` live pins |
| `incidents` | SOS/duress events, severity, resolution workflow |

## What's already scaffolded here

- Full Vite/TS/Tailwind/shadcn config, carried over unchanged from the
  Lovable export
- `src/index.css` -- design tokens above, wired as Tailwind utilities
- `src/lib/env.ts`, `src/lib/supabase.ts`, `src/types/database.ts` -- typed
  config + Supabase client
- `src/lib/modeMenus.ts` -- the ported `modeMenus`/`premiumFeatures` config
  objects that drive `/mode/:mode` and `/premium/:key`
- `src/components/maps/GoogleMapView.tsx` -- shared Google Maps wrapper (dark
  style, expected/actual polylines, marker)
- `src/components/layout/AppShell.tsx` -- bottom nav + floating shield button,
  matching `#bottom-nav` exactly
- `src/components/layout/ScreenStub.tsx` -- placeholder used by not-yet-built
  screens, each annotated with its exact reference line number
- **Built screens**: Home, ModeMenu, ActiveTimer, DatingMode, MarketplaceMode,
  RideMode (partial), Premium
- **Stub screens** (placeholder only, spec pointer in comments): Vault,
  StudentBus, StudentWalk, StudentHangout, SafetyCircle, Vouch, Settings,
  Guardian, B2BHome, B2BTeam, B2BOpenHouse
- `supabase/schema.sql` -- full schema + starter RLS policies (not yet applied
  to a live Supabase project)
- `reference/tether-app-demo.html` -- the cleaned, de-duplicated original demo

## Suggested build order

Roughly in order of value/dependency:

1. Google Maps key in `.env.local`; confirm Ride Mode's map renders.
2. Push `supabase/schema.sql` to a Supabase project; wire `.env.local`; add
   Supabase Auth (sign-up/sign-in) before building screens that assume a
   logged-in user.
3. `screen-circle` and `screen-vouch` (both light, both fairly self-contained,
   both linked from Home's "You are Safe" card).
4. `screen-settings` (simple grouped list, no special interaction).
5. The three Student Mode screens (bus/walk/hangout) -- each has a real
   animation/timer to port (see JS line refs in the table above).
6. `screen-vault` and `screen-guardian` (both fairly visual, no complex logic).
7. The B2B trio (`b2b-home`, `b2b-team`, `b2b-openhouse`) -- save for last,
   it's the least connected to the consumer flows.
8. Menu drawer + payment sheet app chrome, once enough screens exist to link
   to from them.
9. Wire everything to Supabase (replace hardcoded demo data with real
   queries/subscriptions) and replace demo placeholder data (hardcoded "Gabe",
   "98/100" score, etc.) with real user data.
