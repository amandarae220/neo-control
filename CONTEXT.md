# NEO CONTROL — Project Context

Persistent reference document for the project. Survives chat resets.
A commit log section at the bottom tracks every meaningful change going forward.

---

## What This Is

**NEO CONTROL** is a browser-based pixel-art arcade shooter built as a portfolio project.
The player pilots a ship through 6 waves, each with escalating enemies. Waves 2, 4, and 6
present a binary path choice (branching briefing) that changes the mission profile.

Live URL: Deployed on Vercel (see `.vercel/project.json` for project/org IDs).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite |
| Styling | Single global `src/index.css` (CSS custom properties, no framework) |
| Game loop | Canvas RAF loop — all game state in `gsRef.current` (imperative) |
| Font | VT323 (Google Fonts) — monospace pixel aesthetic |
| Analytics / DB | Supabase (`src/lib/supabase.ts`, `src/lib/sessions.ts`) |
| Deployment | Vercel |
| Analytics | Vercel Analytics (`@vercel/analytics`) |

---

## Routes

| Path | Component | Notes |
|---|---|---|
| `/` | `LandingPage` | Intro / start screen |
| `/game` | `GameCanvas` | Full game |
| `/admin` | `AdminPage` | Analytics dashboard — password-gated (`VITE_ADMIN_PASS`) |

---

## Key Architecture

### Game Loop (`src/game/GameCanvas.tsx`)
- Canvas draws at **420×560** logical pixels, CSS-scaled to fill `canvas-wrap`.
- All mutable game state lives in `gsRef.current` (type `GS`). Never stored in React state.
- `newGame(wave, score, hi, lives, profile, buckshotUsed, pathChoices, activePowerup)` creates fresh GS.
- RAF tick drives physics, drawing, and DOM ref updates (score, wave, lives counters).
- `isTouch` is derived from `window.matchMedia('(pointer: coarse)')` once on mount.

### Briefing Modal (canvas-drawn)
Canvas constants that control the briefing frame:
```
TX_PAD    = 8     // horizontal inset
TX_TOP    = 56    // top of modal frame
TX_LH     = 20    // line height for text
TX_FOOTER = 44    // footer zone height (desktop)
TX_FOOTER_TOUCH = 150  // footer zone height on touch when choice is present
```
`briefScrollBounds(gs, isTouch)` — computes clip region and scroll metrics.
On touch with a binary choice, the footer zone expands to `TX_FOOTER_TOUCH` to make
room for the DOM choice overlay buttons.

### Touch Controls (DOM overlays inside `canvas-wrap`)
- **Joystick** — `joystickBaseRef` / `joystickKnobRef`, touch drag, `MAX_TRAVEL = 38`
- **Fire / Auto** — `autoFireRef` (boolean), `autoFireBtnRef` toggled with `.is-active`
- **Choice overlay** — `choiceOverlayRef` (`position: absolute; bottom: 7.86%`) shown during
  `phase === 'brief' && txDone && txHasChoice && atBottom` (path choice) **or**
  `phase === 'powerup' && powerupOffer !== null` (powerup pick); `ctaLabelRef` updates the label
- **Haptics** — `navigator.vibrate?.()` called on life loss (55ms) and game over (80,30,80ms)

### Admin Dashboard (`src/pages/AdminPage.tsx`)
Analytics cards rendered from Supabase `sessions` table:
- Funnel (unique players → replays → waves reached)
- Cohort Retention (D1/D7/D30 by weekly cohort)
- 30-day play volume (bar chart)
- Device / Browser breakdown
- Path Comparison Cards (waves 2, 4, 6 — path 1 vs path 2 outcomes)
- Player Progression Curve (avg score by replay attempt number)
- Recent Sessions table (sortable, filterable)

### Supabase Schema (`sessions` table)
```
id               uuid PK
player_id        text
score            int
wave             int
device           'touch' | 'keyboard'
browser          text
replay_number    int
duration_seconds int
path_choices     jsonb   -- { "2": 1|2, "4": 1|2, "6": 1|2 }
created_at       timestamptz
```

### Environment Variables (never commit)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ADMIN_PASS       # currently: checkadmininsights
```

---

## CSS Notes

- Single file: `src/index.css`. No CSS modules.
- Scroll fix: `html` and `body` both use `overflow-x: clip` (not `hidden`) to avoid
  making `body` a scroll container, which blocks mouse-wheel scrolling on the admin page.
- Touch layout: `game-wrap` height = `calc(100dvh - 144px - env(safe-area-inset-bottom))`
  leaving room for the fixed HUD bar at the bottom.
- Canvas fills `canvas-wrap` with `width: 100%; height: 100%` on touch — note this means
  the canvas stretches non-uniformly (scale-x ≠ scale-y) on devices where the wrap
  aspect ratio doesn't match 420:560.

---

## Commit Log

> One entry per commit going forward. Newest at the bottom.

---

### `321e5e7` — initial commit
Project scaffolded. Basic game loop, canvas renderer, landing page.

### `2c9d968` — scope changes for video game angle
Reframed project narrative toward arcade/portfolio angle.

### `e9a1b2b` — integrating gravitational pull for planets
Gravity field mechanic added for asteroid belt waves.

### `13212f4` / `edd212a` / `d42f05e` / `cf4aa4d` — mobile optimization (multiple passes)
Touch joystick, fire button, basic HUD controls for mobile.

### `284e3c2` — randomizing target rows
Removed static formation rows; randomized enemy spawning.

### `6ed820c` — progress bar for subsequent waves
Mission progress bar added to HUD for waves 2+.

### `e0c1529` — score history log (desktop left panel)
Score feed log added to desktop sidebar.

### `b0b5ee4` — username input + fallback names
Name entry on leaderboard; random callsign fallback.

### `b456498` / `85e53ed` — storyline and intro verbiage
Narrative copy updates.

### `2ac6b16` / `8122d4f` — docking animation
Wave-entry docking sequence added.

### `c27e944` — modal CTA buttons
Path choice buttons styled as real buttons; typewriter timeout removed.

### `7f595e7` — game over display
Game over screen layout polish.

### `ecbdee4` — Vercel analytics
`@vercel/analytics` integrated.

### `d0035db` / `c59ad7b` / `5a615ad` — mobile tune-up passes
Text area widening, layout fixes after device testing.

### `159a0ff` / `e253ed1` — wave 2 modal styling
Modal button color cleanup; removed blue/pink theming from pre-wave modals.

### `42236d3` — cheat codes
Hidden cheat code system added (SIDI confirm flow).

### `0ba78f8` — elimination wave end animation
End-of-wave animation for elimination rounds.

### `4600643` — gravity surge drone effects (wave 2 path 1)
Visual and mechanical effects for the Gravity Field Approach path.

### `dde4062` — pause + settings button (mobile top bar)
Pause and settings controls added to mobile HUD top bar.

### `2083d6e` — leaderboard + Supabase integration
Global leaderboard screen, score submission, Supabase wired up.

### `0da83b7` — leaderboard screen updates
Leaderboard UI polish.

### `9899471` / `0da83b7` / `fc27cd9` — accessibility + code quality pass
WAVE audit fixes, WCAG 2.1 AA compliance pass, skills adherence updates.

### `2614dc5` — SIDI cheat code
Dedicated SIDI unlock flow with confirmation overlay.

### `ff77862` — admin/insights page
Initial admin dashboard: auth gate, session table, Supabase integration, Vercel deploy.

### `e47e46e` — admin insights expansion
Path comparison, additional KPI cards, bar charts added to admin.

### `0545e45` — player progression curve
LineChart component; avg score by replay attempt number card.

### `5a51fa4` — cohort retention table
D1/D7/D30 weekly cohort table with color-coded retention cells.

### `7263aca` — mobile gameplay controls and feedback
- Joystick size increased (90→120px base, 40→52px knob)
- Fire button enlarged
- AUTO-fire toggle button added
- Haptic feedback on life loss / game over (`navigator.vibrate`)
- `user-scalable=no` in viewport meta
- Score feed + mission progress bar drawn on canvas for mobile
- Choice button labels populated from briefing text lines

### `7d93ec9` — modal button size adjustment (mobile)
`TX_FOOTER_TOUCH` tuned; choice buttons height/width reduced for mobile.

### `6b2b272` — duration formatting (admin)
Recent sessions table `duration_seconds` column now uses `fmtDur()` (e.g. `1m 30s`).

### `28125d1` — admin page scroll fix
`overflow-x: hidden` → `overflow-x: clip` on both `html` and `body` so the viewport
remains the scroll root and mouse-wheel scrolling works on the admin page.

### `0870f3f` — admin ET timestamps + CONTEXT.md + GAME_TEXT.txt
- Added Time (ET) column to Recent Sessions table (right of Date), formatted with `Intl` in `America/New_York`
- Date column confirmed as ET as well; both use `toLocaleString` with `timeZone` option
- Created `CONTEXT.md` (this file) as persistent project context surviving chat resets
- Created `GAME_TEXT.txt` at repo root — plain-text export of all in-game copy (transmissions, HUD labels, leaderboard strings) for external editing

### `90b224a` — wave 3 difficulty reduction + no bottom-spawning hazards
- Aggressive movement patterns (`chase`, `swoop`) delayed from wave 3 → wave 4 to smooth the wave-3 difficulty cliff that was causing ~44% player dropout
- Gravity rocks and enemies can no longer spawn from the bottom edge — `mkRock` now uses 3 edges (top/left/right) instead of 4, eliminating surprise hits from below
- Mobile choice buttons: added "— CHOOSE YOUR PATH —" CTA label above touch choice overlay; tuned button height (`34px`) and width (`78%`) to fit cleanly inside the modal bounds at `TX_FOOTER_TOUCH = 150`

### `98f24cf` — pause/settings buttons resized and repositioned
- Pause and settings buttons moved to consistent position on desktop and mobile: `top: 6px` (right and left respectively)
- Both buttons enlarged to `46×46px`, `font-size: 1.2rem`, with a subtle border for visibility
- Canvas HUD score/wave text `edge` offset increased to `110px` (desktop) / `80px` (touch) so HUD text clears the larger buttons
- Settings panel `top` adjusted from `94px` → `48px` to track the moved button

### `c6ced6f` — wave-completion powerup system
Full pick-one-of-two powerup system added after every wave clear:
- **5 powerup types**: shield (absorb one hit), rapid fire (2× fire rate), spread shot (3-way fire, no bullet cap), score surge (1.5× kill points), extra life (+1 life, capped at 5)
- **Fixed pairings per wave**: wave 1 → [shield/rapid], wave 2 → [spread/surge], wave 3 → [life/shield], wave 4 → [rapid/spread], wave 5 → [surge/life], wave 6+ → [shield/spread]
- **New `'powerup'` phase** in the game state machine — appears after the wave-clear banner, before the jump/brief sequence
- Canvas draws a "── POWER UP ──" modal with two labeled options; desktop uses `1`/`2` keys, touch uses the existing DOM choice overlay (buttons repopulated with powerup names via `ctaLabelRef`)
- Effects applied immediately to the next wave via `newGame(…, activePowerup)` — expire after that wave (extra life is permanent)
- `killPlayer` checks `activePowerup === 'shield'` first and consumes it; `pickPowerup` helper handles the transition to jump/brief after selection
- HUD shows `★ [POWERUP NAME]` badge in top-left while a powerup is active
- `startBrief` helper extracted to deduplicate brief-setup code shared between the wave-clear and jump paths

### `4f1b97a` — Vercel build fix (TypeScript strict compliance)
- Fixed TS2322/TS2677 errors in `AdminPage.tsx`: annotated the `Array.from` mapper callback in `PlayerProgressionCard` as `(_, i): LinePt | null => …` so the inferred array type is `(LinePt | null)[]` rather than `({ count: number } | null)[]`, making the `d is LinePt` predicate valid under strict mode
