# NEO Control

A browser-based planetary defense game in two modes: a pixel-art arcade shooter and a mission-planning strategy console.

## Modes

### Arcade — NEO Control
Classic space invaders reimagined with a narrative. Shoot through six waves of Zorgon fleet formations, deflect gravity rocks with physics-accurate bullet bending, and make tactical route choices that alter the next wave's difficulty and score multipliers.

- Pixel-art canvas renderer (no libraries — raw `CanvasRenderingContext2D`)
- Gravity field: rocks exert real pull on your bullets and player ship
- Shield + blast abilities with cooldowns
- Intercepted-transmission briefings with branching route choices (e.g., gravity sector vs. high-velocity sector)
- Persistent hi-score across retries

Controls: `← →` move · `Z` or `SPACE` shoot · `X` shield · `C` blast · `ESC` menu

### Mission Console — Planetary Defense
Turn-based asteroid threat management with a live orbital simulation.

- Assign one of four defense maneuvers (Kinetic Nudge, Fragment, Gravity Tug, Observe) to each incoming threat
- Orbital viz updates in real time as sim-days advance; Moon moves and affects trajectories
- Lunar assist mechanic: a deflected path that clips the Moon's gravity window gets a free bonus deflection — but moon-impact risk rises
- Random alien transmission events shift threat positions mid-mission
- Score formula weighs deflection quality, resource cost, debris risk, and moon damage

Three scenarios included: Training Run (one low-risk rock), Big Rock Bad Timing (high-risk, short window), Twin Threat (two rocks, one plan each).

## Stack

- React 19 + TypeScript
- Vite 8
- React Router v7
- D3 (orbital viz geometry)

## Run locally

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

Covers `predictThreat` and `calculateMissionScore` — the core scoring and deflection logic.
