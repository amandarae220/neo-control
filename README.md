# NEO Control

A browser-based planetary defense game in two modes: a pixel-art arcade shooter and a mission-planning strategy console.

Live: https://neo-control.vercel.app

---

## Overview

You're a space cadet who picked up the wrong phone. NEO Control puts you in charge of defending Earth across two modes: an arcade shooter where you blast through six waves of Zorgon fleet formations, and a mission console where you assign defense maneuvers to incoming asteroid threats and watch trajectories update in real time.

---

## Tech Stack

| Technology | Why I chose it |
|---|---|
| React 19 + TypeScript | Component model for overlays and pages; TypeScript catches shape mismatches at the canvas/DOM boundary |
| Vite | Fast HMR during canvas-heavy development; no config overhead |
| React Router v7 | Separates arcade, mission console, and results into discrete routes without a full SPA framework |
| Canvas 2D API (no game lib) | Full control over pixel rendering, custom physics, and RAF loop without bundle weight |
| D3 (orbital viz only) | Geometry math for the orbital simulation — used surgically, not as a rendering layer |
| Supabase | Anonymous insert/select for the arcade leaderboard; zero-auth setup matches the scope |
| Vercel Analytics | Single-line integration for page-level usage data |

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

The app runs at `http://localhost:5173` by default.

---

## Deployment

Deployed via Vercel. Pushes to `main` trigger automatic builds. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel environment variables dashboard.

---

## Latest Updates

- **2026-06** — Arcade leaderboard with Supabase: top-5 display, new-entry detection, callsign input
- **2026-06** — Full accessibility pass: dialog role + focus trap on game over, aria labels, focus-visible rings, semantic landmarks
- **2026-06** — Mobile controls: thumbs-at-corners layout, joystick + FIRE button, HUD inset on touch devices
