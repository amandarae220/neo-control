# NEO CONTROL

A browser-based pixel-art arcade shooter. You're a space cadet on a supply run to NEO-7. Mission Control is betting against you.

Live: https://neo-control.vercel.app

---

## Overview

Six waves of escalating enemies stand between you and the station. Thrust burns fuel — collect debris to refuel. After waves 1, 3, and 5 you pick up a powerup; after waves 2 and 4 you choose a branch that changes your mission profile for the next leg. Run out of lives and it's game over; run out of fuel and you can't move.

Desktop shows side panels with live mission telemetry. Mobile uses a touch joystick and auto-fire toggle. Both layouts share the same 420×560 canvas game loop.

---

## Tech Stack

| Technology | Why |
|---|---|
| React 19 + TypeScript | Component model for overlays, leaderboard, and admin pages; TypeScript catches shape mismatches at the canvas/DOM boundary |
| Vite | Fast HMR during canvas-heavy development |
| React Router v7 | Discrete routes for landing, game, admin, and privacy without a full SPA framework |
| Canvas 2D API (no game lib) | Full control over pixel rendering, sprite system, and RAF loop without bundle weight |
| Supabase | Session analytics on game over (anon insert); admin dashboard reads via authenticated role with RLS |
| Vercel Analytics | Single-line integration for page-level usage data |

---

## Routes

| Path | Notes |
|---|---|
| `/` | Landing / start screen |
| `/game` | Full game |
| `/admin` | Analytics dashboard — Supabase auth required |
| `/privacy` | Privacy policy |

---

## Getting Started

**Prerequisites:** Node 18+, npm

```bash
git clone https://github.com/amandarae220/neo-control
cd neo-control
npm install

# Copy env template and fill in your Supabase credentials
cp .env.example .env.local

npm run dev
```

Runs at `http://localhost:5173`.

---

## Environment Variables

```
VITE_SUPABASE_URL        # your Supabase project URL
VITE_SUPABASE_ANON_KEY   # public anon key (safe to expose — RLS is the guard)
```

Never commit values. Admin access uses Supabase email auth — create your admin account directly in the Supabase dashboard under Authentication → Users.

---

## Deployment

Deployed via Vercel. Pushes to `main` trigger automatic builds. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel environment variables dashboard.

The `sessions` table requires RLS policies:
```sql
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- game can submit sessions anonymously
CREATE POLICY "anon_insert" ON sessions
  FOR INSERT TO anon WITH CHECK (true);

-- only authenticated admin can read
CREATE POLICY "auth_select" ON sessions
  FOR SELECT TO authenticated USING (true);
```

---

## Latest Updates

- **2026-07** — Admin auth migrated to Supabase email login; client-side password gate removed; RLS added to block anon reads
- **2026-07** — Death heatmap on admin dashboard (wave × X position density grid, game-over sessions only)
- **2026-06** — Fuel system: thrust drains fuel, debris collection refuels, no fuel = thrust disabled
- **2026-06** — Wave 3 freighter arrival scene; 6-wave branching narrative with per-path physics profiles
- **2026-06** — Desktop sidebar panels (mission telemetry, score log, key bindings)
- **2026-06** — Full accessibility pass: WCAG 2.1 AA, dialog roles, focus traps, aria labels
- **2026-06** — Mobile controls: joystick + auto-fire, haptics on hit and game over
