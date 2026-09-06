# Tether — project brief for Claude Code

Tether is a personal safety app: a "Dead Man's Switch" / universal safety layer
for high-risk real-world meetup moments — dating, rideshares, online
marketplace meetups, and student commutes — plus a full B2B side for
companies that send field employees (realtors, etc.) into similar risk.

**This brief was substantially rewritten** after discovering that the rebuild
had been targeting an early, much simpler prototype as its only reference.
There is a second, far more advanced prior build that changes both the
architecture and the feature scope. Read the next section carefully before
touching code.

## Ground truth: two references, not one

### `OLD/` — the real source of truth (architecture + almost all features)

At `C:\Users\donat\OneDrive\Documents\Tether Rebuild\Claude Code\OLD` is a
**complete, working Lovable build** of Tether — real Supabase Auth, a
16-table schema, ~10,350 lines of custom app code across pages and
components, and an entire already-built B2B manager console. This is the
most-advanced version of Tether that has ever existed and **supersedes
`reference/tether-app-demo.html` for architecture and for every feature it
covers.** It was not known to exist when this rebuild started; CLAUDE.md's
original "pixel-accurate source of truth" framing referred only to the demo
file below, which turned out to be an early prototype stage, not the actual
most-recent build.

When building anything, check `OLD/` first:
- `OLD/src/pages/*.tsx` — one file per route (see Architecture below)
- `OLD/src/components/tether/*.tsx` — consumer-side feature components
- `OLD/src/components/tether/overwatch/*.tsx` — manager console (Overwatch)
- `OLD/src/components/tether/pro/*.tsx` — B2B field-employee flow (Pro Guard)
- `OLD/src/contexts/*.tsx` — Auth, Workspace, SafetyTimer
- `OLD/src/hooks/*.ts` — useGeoTracking, useNearbyPlaces, useIncidentNotifications, useTheme
- `OLD/supabase/migrations/*.sql` — the real schema history (now consolidated
  into `supabase/schema.sql` in this repo, see below)

`OLD` is a separate, standalone project directory (its own `package.json`,
its own git-less working copy) — copy logic/markup out of it, don't try to
run it as part of this repo.

### `reference/tether-app-demo.html` — early visual mockup (partially superseded)

The original Gemini/Lovable single-file HTML/Tailwind/vanilla-JS prototype.
Still useful for: the base visual/design-token language (dark slate-900,
brand gradient, mode accent colors — see Design System below) and for the
handful of simple screens that don't have a richer `OLD` equivalent (Vouch
score display, Settings list). **Do not use it as the architecture
reference** — its single-route-per-screen, no-auth model is the earlier
prototype's simplification, not the real design.

Historical note on this file: the original export had a duplicate/mis-nested
copy of 12 screens (a missing `</div>` after `#screen-ride`), which was
fixed before this rebuild started — the file has exactly one copy of each of
its 18 screens and opens correctly in a browser as-is.

## What actually exists in this repo right now

Everything built so far in this rebuild was built against the demo file
only, before `OLD` was discovered. Concretely, that means:

- **Real Supabase Auth does not exist yet** — no `/auth` route, no
  `AuthContext`, no `ProtectedRoute`. Everything is reachable with no login.
- **The route structure is flat** (`/`, `/mode/:mode`, `/circle`, `/vouch`,
  `/settings`, `/premium/:key`, `/ride`, `/b2b`, `/b2b/team`,
  `/b2b/openhouse`, the student trio, etc. — see `src/App.tsx`), not
  `OLD`'s `/consumer/*`, `/business/member`, `/business/admin` split.
- **`WorkspaceContext` here has two modes** (`consumer`/`professional`,
  see `src/components/layout/WorkspaceContext.tsx`), not `OLD`'s three
  (`consumer`/`member`/`admin`, gated by `hasOrganization`/`isManager`).
- The 18 demo screens (Home, ModeMenu, ActiveTimer, DatingMode,
  MarketplaceMode, RideMode, Vault, the Student trio, Circle, Vouch,
  Settings, Premium, Guardian, the B2B trio) are built and are reasonable
  **visual/conceptual starting points** for their `OLD` equivalents, but
  none of them are wired to real data, real sessions, or real auth — treat
  them as skeletons to rebuild against `OLD`, not finished work to extend
  as-is. Two known fidelity bugs from that phase, not yet fixed: `Home.tsx`
  uses the wrong badge icon and is missing a decorative watermark; `Premium.tsx`
  is missing its back-button chrome, background glow, and feature checklist.
- `supabase/schema.sql` **has just been rewritten** to match `OLD`'s real
  16-table schema (see below) — it no longer matches what any currently-built
  screen actually queries, since none of them talk to Supabase yet.

## Architecture (per `OLD` — build toward this)

**Auth-gated, three-workspace SPA**, not a flat single-workspace one:

```
/auth                    — sign up / sign in (AuthRoute: redirects away if already logged in)
/                         — redirects to /consumer
/consumer/*               — ProtectedRoute; consumer dashboard + all consumer safety modes
/business/member          — ProtectedRoute; Pro Guard (field-employee view)
/business/admin           — ProtectedRoute; Overwatch (manager console)
/walk/share/:token         — public, no auth — live Walk Home share link
/invite/:token             — public, no auth — org-invite accept page
*                          — NotFound
```

Three nested providers wrap the router: `AuthProvider` (session/user via
`supabase.auth`), `WorkspaceProvider` (which of the three workspaces is
active, persisted to `localStorage`, gated by whether the user belongs to an
org / holds a manager-or-admin role), `SafetyTimerProvider` (one global
countdown-timer service — start/pause/resume/stop — that any active safety
mode can drive, instead of each screen owning its own `setInterval`).

`ConsumerPage` itself has its own nested `<Routes>` (`walk`, `circle`,
`vouch-score`, `safe-spaces`, and a catch-all that switches on a local
`activeTab` state for `home`/`circle`/`activity`/`profile` — see
`OLD/src/pages/ConsumerPage.tsx`). Business pages are single components
(`MemberPage` → `TeamMemberView`, `AdminPage` → `OverwatchDashboard`).

## Feature inventory (source: `OLD`, cross-referenced against the write-up)

Status is honest, not aspirational: **"not started" is the default** for
everything below unless stated otherwise, since none of this was built
against `OLD` yet.

### Consumer — Dating Mode / Date Guard (`OLD`'s most fleshed-out mode)
- Full-screen stepper setup (`DatingSetupStepper.tsx`, `DatingSetupModal.tsx`) — who you're meeting, location, check-in interval
- Active Date Guard screen (`DateGuardView.tsx`) — live session timer, check-in prompts, safety event log, live GPS map (`GoogleMapEmbed.tsx`/`MapView.tsx`), coordinates upserted every 30s (see `useGeoTracking`)
- Post-date "Getting Home" 30-min countdown, confirm-safe or contacts alerted on expiry
- Date History (`DateHistory.tsx`) — expandable cards, timeline of safety events, static map — backed by `date_sessions`
- **Status here:** `src/pages/DatingMode.tsx` only covers the old demo's fake-call screen (see Fake Call below) — the stepper, active-guard session, GPS map, and history are all not started.

### Fake Call System (`FakeCallSetup.tsx`, `FakeCallScreen.tsx`)
- Setup dialog: caller name (Mom/Boss/Uber Driver/custom) + delay (Now/15s/30s/1m)
- Incoming call screen, active call screen (timer, mute, speaker, end), 4 ringtones with preview, vibration toggle with a real ring-pause-ring pattern + haptics
- Reachable from Quick Actions and from "Bad Date Exit" inside Date Guard
- **Status here:** `src/pages/DatingMode.tsx` has a single hardcoded "Landlord" fake call with no setup dialog, no ringtone/vibration options, no timer/mute/speaker on the active call. Significantly simpler than `OLD`.

### Marketplace Mode (rebuilt in `OLD` — no premium lock)
- Overview hub with Facebook Marketplace link (`MarketplaceSetupStepper.tsx`)
- **MarketGuard** path (`MarketplaceGuardView.tsx`) — sale details → safety settings → review → live GPS map + timer + fake call + SOS
- **Hire a Proxy** path — UberEats-style flow to hire a verified proxy (details → instructions → review, $15 fee estimate)
- Marketplace History (`MarketplaceHistory.tsx`) — backed by `marketplace_sessions`
- **Status here:** `src/pages/MarketplaceMode.tsx` only covers the old demo's evidence-capture camera screen. MarketGuard, Hire-a-Proxy, and history are not started.

### Dashboard (`Dashboard.tsx`, `HoldPanicButton.tsx`)
- Clean profile card (avatar initial, name, email, 3 stat tiles) — no heartbeat animation, no slide-to-distress slider
- Hold-to-activate panic button — 3s hold with filling progress bar, prevents accidental triggers
- Stat tiles, all clickable: **Quick Call/SOS** (bottom sheet of trusted contacts, tap to dial), **Vouch Score** (own page, circular gauge, history), **Active** (reserved for active sessions)
- **Status here:** `src/pages/Home.tsx` is the old demo's static dashboard (hardcoded "Gabe", no real profile data, no hold-to-activate button, stat tiles navigate but aren't wired to real contact/session data).

### Safety Circle (`CirclePage.tsx`, `CircleScreen.tsx`)
- Google Map + member list; **invite-link system** (generate shareable link → recipient signs up → auto-accept via `accept_circle_invite()`, mutual `circle_members` row both directions)
- Live location sharing — circle members appear as real pins (via the `user_locations` RLS policy that lets circle members read each other's location)
- Backed by real `trusted_contacts` (not dummy data) — first contact added is auto-primary, contacts feed the SOS Quick Call sheet
- **Status here:** `src/pages/SafetyCircle.tsx` has a real `GoogleMapView` but hardcoded demo members (Mom/Sister), no invite system, no live sharing, no `trusted_contacts` wiring.

### Safe Spaces (`SafeSpacesPage.tsx`, `useNearbyPlaces.ts`, `SuggestSafeSpaceModal.tsx`)
- Map + searchable/filterable list backed by real Google Places API results (police/fire/library/hospital/post office/bank within 5km of real GPS) plus the seeded `safe_spaces` rows
- "You are here" blue-star marker, map centers on real location
- "Suggest a Space" form → saved unverified for review; schema has business-advertising fields ready (`is_business`/`business_name`/`business_phone`/`business_website`)
- **Status here:** not started — no route, no page, no hook exists in this rebuild.

### Student Mode
- `OLD`'s `BusMode.tsx`/`StudentMode.tsx`/`HangoutMode.tsx`/`WalkHome.tsx`(+`WalkSharePage.tsx` for the public share link) roughly line up with this rebuild's already-built `student/Bus.tsx`/`Hangout.tsx`/`Walk.tsx` conceptually, but `OLD`'s Walk Home has a real shareable `/walk/share/:token` link backed by `walk_sessions` — this rebuild's Walk timer is purely local component state.

### B2B — Pro Guard (`components/tether/pro/*`, field employees, `/business/member`)
- Timed appointment sessions (client name, address, notes, expected end time) with a countdown, backed by `professional_sessions`
- **Silent alarm PIN pad** (`PinPadModal.tsx`) — entering a duress PIN quietly sets `status = 'duress_alert'` while the screen shows a normal "completed" state
- **Geofencing** — session can set a geofence; `check_geofence_breach()` auto-creates a medium-severity incident if the user's `user_locations` leaves the radius
- **Status here:** `src/pages/RideMode.tsx` is the closest analog conceptually (a session + map) but has none of this — no duress PIN, no geofence, no `professional_sessions` wiring. The old demo's B2B trio (`b2b/Home.tsx`/`Team.tsx`/`OpenHouse.tsx`) is a different, simpler concept (a realtor showing-timer dashboard) and doesn't map onto Pro Guard directly.

### B2B — Overwatch manager console (`components/tether/overwatch/*`, `/business/admin`)
- `OverwatchDashboard.tsx` (shell) + `AlertStream.tsx`/`IncidentFeed.tsx` (severity-leveled incident feed), `AlertsMap.tsx` (geographic view), `StatusBoard.tsx`/`TeamTable.tsx` (roster at a glance), `EmployeeDetailView.tsx` (drill-in), `ResolutionModal.tsx` (acknowledge/resolve workflow — outcome: false alarm / user safe / emergency services called / test), `AuditLog.tsx`, `InviteTeamModal.tsx`/`AddEmployeeModal.tsx`/`InvitationsView.tsx` (org invites), `OverwatchAnalytics.tsx`, `OverwatchSidebar.tsx`, `OverwatchLive.tsx`
- Real-time: `useIncidentNotifications.ts` subscribes to `incidents` inserts + `professional_sessions` duress updates via Supabase Realtime, fires toasts + browser Notifications for high/critical severity
- **Status here:** not started at all. `src/pages/b2b/Dashboard.tsx` is an orphaned, unrouted `ScreenStub` describing exactly this feature — it was planned (a plan was given and approved in principle) but never built. This is the single largest gap between this rebuild and `OLD`.

### Org system (backbone for all of B2B)
- `organizations` + `user_roles` (multi-role per user: `user`/`admin`/`security_guard`/`manager`, checked via the security-definer `has_role()` function, never trusted from client-supplied role claims)
- `org_invitations` — invite by email + role, auto-assigned to org/role on that email's signup via `handle_invitation_on_signup()`
- Multi-tenant RLS throughout: every org-scoped table's manager/admin policies join back through `profiles.organization_id = get_user_org_id(auth.uid())`
- B2B is intentionally kept out of the consumer UI (separate workspace, not a menu item)

## Database schema

`supabase/schema.sql` was just rewritten to match `OLD`'s real 16-table
schema (consolidated from its migration history, same table/column names,
same RLS policy shapes — see the file for full detail and comments). Run it
against a fresh Supabase project, then regenerate `src/types/database.ts`:

```
npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
```

**`src/types/database.ts` has not been regenerated yet** — it still reflects
the old 8-table schema and will not match `supabase/schema.sql` until this
is run against a live project.

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`; safe word, duress PIN hash, org, job title/description/phone |
| `organizations` | B2B tenant, subscription tier |
| `user_roles` | Multi-role per user (`user`/`admin`/`security_guard`/`manager`); checked via `has_role()` |
| `trusted_contacts` | SOS quick-call contacts; first one added is auto-primary |
| `check_ins` | Manual/automated safety pings |
| `active_sessions` | Consumer mode sessions (dating/ride/marketplace/student) |
| `professional_sessions` | Pro Guard sessions — client, address, expected end time, geofence, duress status |
| `incidents` | Geofence breaches + duress alerts; new → acknowledged → resolved workflow with outcome |
| `user_locations` | One row per user, upserted ~30s by `useGeoTracking`; also drives Circle live-sharing + geofence checks |
| `org_invitations` | Invite-by-email-and-role, auto-accepted on matching signup |
| `walk_sessions` | Walk Home sessions + public share token |
| `date_sessions` | Date Guard history — meeting details, safety events, location |
| `marketplace_sessions` | MarketGuard + Hire-a-Proxy sessions |
| `safe_spaces` | Safe meetup locations — verified/business fields, seeded with 5 NYC rows |
| `circle_invitations` | Shareable Circle invite tokens |
| `circle_members` | Mutual Circle connections (both directions inserted together) |

## What's already scaffolded here

- Full Vite/TS/Tailwind/shadcn config, carried over from the Lovable export
- `src/index.css` — design tokens (now theme-aware, light default / `.dark`
  override — see Dark/Light Mode below), wired as Tailwind utilities
- `src/lib/env.ts`, `src/lib/supabase.ts`, `src/types/database.ts` — typed
  config + Supabase client (types are stale, see Database schema above)
- `src/lib/modeMenus.ts` — ported `modeMenus`/`premiumFeatures` config
  driving the demo's `/mode/:mode` and `/premium/:key` (these are old-demo
  concepts; may not survive the move to `OLD`'s architecture as-is)
- `src/components/maps/GoogleMapView.tsx` — shared Google Maps wrapper (dark
  style, expected/actual polylines, single/multi marker, used in place of
  every demo screen's original fake SVG map)
- `src/components/layout/AppShell.tsx` — bottom nav + floating shield button
- `src/components/layout/MenuDrawer.tsx` + `MenuDrawerContext.tsx` — hamburger
  drawer (ported from the demo's `#menu-drawer`); links to the not-yet-built
  payment sheet show a placeholder toast
- `src/components/layout/WorkspaceContext.tsx` + `WorkspaceToggle.tsx` — the
  **two-mode** consumer/professional toggle built against the old demo's
  flat architecture; will need reconciling with `OLD`'s three-mode version
  (consumer/member/admin, gated by org membership + role) once real auth
  and roles exist
- `src/components/layout/ThemeToggle.tsx` — dark/light toggle via
  `next-themes`; `active-timer`/`dating`/`market`/`premium`/`vault`/`guardian`
  and the B2B trio stay hardcoded dark regardless of the toggle (deliberate
  safety-session / professional-workspace identity, not an oversight)
- `src/components/layout/ScreenStub.tsx` — placeholder for not-yet-built
  screens
- **Old-demo screens built** (skeletons only — see "What actually exists"
  above for what's missing relative to `OLD`): Home, ModeMenu, ActiveTimer,
  DatingMode, MarketplaceMode, RideMode (partial), Premium, Vault,
  SafetyCircle, Vouch, Settings, Guardian, the Student trio, the B2B trio
- `supabase/schema.sql` — the real 16-table schema (just rewritten, not yet
  applied to a live Supabase project)
- `reference/tether-app-demo.html` — the early prototype (see Ground Truth)
- `OLD/` (outside this repo) — the real prior build; see Ground Truth

## Suggested build order

Given the scope difference, auth and schema come first — almost everything
else depends on them:

1. Push `supabase/schema.sql` to a fresh Supabase project; regenerate
   `src/types/database.ts`; add `.env.local` with the project URL/anon key.
2. Build real Supabase Auth (`AuthContext`, `/auth` page, `ProtectedRoute`/
   `AuthRoute`) — port from `OLD/src/contexts/AuthContext.tsx` and
   `OLD/src/pages/AuthPage.tsx`.
3. Restructure routing to the `/consumer/*` `/business/member`
   `/business/admin` split; reconcile `WorkspaceContext` to `OLD`'s
   three-mode, org/role-gated version; add `SafetyTimerContext`.
4. Rebuild the consumer Dashboard against `OLD`'s `Dashboard.tsx` (hold-to-
   activate panic button, real profile data, clickable stat tiles wired to
   real `trusted_contacts`/Vouch/session data).
5. Trusted Contacts + Safety Circle invite links + live location sharing
   (`useGeoTracking`, `accept_circle_invite`).
6. Dating Mode end-to-end (stepper → Date Guard → GPS map → post-date
   countdown → history) plus the full Fake Call system — this is `OLD`'s
   most fleshed-out mode and a good template for Ride/Marketplace/Student.
7. Marketplace rebuild (MarketGuard + Hire-a-Proxy + history).
8. Safe Spaces (Google Places integration via `useNearbyPlaces`).
9. B2B: Pro Guard (duress PIN, geofencing) then Overwatch (the full manager
   console — this supersedes the previously-planned, never-built
   `b2b/Dashboard.tsx` admin panel; delete that stub once Overwatch lands).
10. Org invitations end-to-end (`/invite/:token`), `/walk/share/:token`.
11. Menu drawer's payment sheet + billing (still not started either build).

## Design system

Carry these over exactly — confirmed from `reference/tether-app-demo.html`'s
inline `<style>` block and screen markup, and consistent with `OLD`'s use of
the same shadcn/Tailwind token setup:

| Token | Value | Use |
|---|---|---|
| Dark background | `#0f172a` (Slate 900) | Dark screens: active-timer, dating, market, premium, vault, guardian, B2B |
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
  oversized touch targets — this app gets used one-handed, often under stress.
- **Animation**: `OLD` uses `framer-motion` extensively for page-level
  enter/exit transitions (`AnimatePresence` + `motion.div` with a simple
  opacity fade, `duration: 0.2`) — this rebuild has the dependency but
  doesn't use it yet.
- **Layout**: single responsive web app, no phone-frame chrome — the
  original demo's status-bar/notch/phone-simulator wrapper is deliberately
  not ported; `OLD` also centers its content in a phone-shell (`PhoneShell.tsx`)
  for its own demo purposes, which likewise shouldn't be ported literally.

## Tech stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, shadcn/ui
  (`components.json` already configured — `npx shadcn@latest add <component>`
  as needed)
- **Routing**: react-router-dom
- **Animation**: framer-motion (dependency present, not yet used — see
  Design System above)
- **Backend/Auth**: Supabase (Postgres + RLS + Auth) — see `supabase/schema.sql`.
  Real auth does not exist in this rebuild yet (see Suggested build order).
- **Maps**: Google Maps (`@react-google-maps/api`) via
  `src/components/maps/GoogleMapView.tsx` — reuses the same Google Cloud API
  key from the original Lovable build, in `.env.local` as
  `VITE_GOOGLE_MAPS_API_KEY`. See `src/lib/env.ts` for which Cloud APIs need
  enabling (Maps JavaScript, **Places** — required for Safe Spaces'
  `useNearbyPlaces`, Geocoding, Directions).
- **Icons**: lucide-react
- **State/data fetching**: @tanstack/react-query
- **Toasts**: sonner
- **Themes**: next-themes (wired up — see Dark/Light Mode section above)

## Known gaps / cleanup still needed (from the earlier fidelity audit)

- `Home.tsx` — badge icon should be a checkmark, not a star; missing the
  decorative watermark icon behind "You are Safe"
- `Premium.tsx` — missing the circular back button + "PREMIUM" label, the
  background glow, and the feature checklist
- `RideMode.tsx` — missing the rideshare-sync chrome, Simulate Safe/Deviate
  buttons + car animation, and the deviation-alert bottom sheet (all present
  in the old demo's markup, never ported — separate from the much larger
  gap vs. `OLD`'s actual Ride Mode concept)
- Payment sheet (`#pay-sheet` in the old demo) never built; the menu
  drawer's Billing/Upgrade buttons show a placeholder toast
- `src/pages/StudentMode.tsx` — orphaned, unrouted duplicate stub, safe to
  delete (superseded by the already-built `student/Bus.tsx`/`Walk.tsx`/`Hangout.tsx`)
- `src/pages/b2b/Dashboard.tsx` — orphaned, unrouted `ScreenStub`; delete
  once real Overwatch (item 9 in the build order) replaces it
