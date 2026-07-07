# NEO CONTROL — Claude Instructions

## Start of every session

Read `CONTEXT.md` before touching any code. It has the authoritative architecture, schema, and full commit history. Do not rely on assumptions about project structure — verify against the file.

---

## After every commit

Add an entry to the commit log at the bottom of `CONTEXT.md`. Format:

```
### `<short-hash>` — <short title>
<1–3 bullet points or sentences describing what changed and why>
```

Get the hash from `git log --oneline -1`. This is non-negotiable — the log is the project memory.

---

## Game loop rules — never break these

- **All mutable game state lives in `gsRef.current` (type `GS`).** Never put game state in React `useState`. The RAF loop reads and writes `gsRef.current` directly; React state would cause stale closure bugs and unnecessary re-renders.
- **`newGame()` must initialize every field on `GS`.** If you add a field to the `GS` interface, add it to `newGame()`'s return object in the same commit or TypeScript will catch it immediately.
- **`imageSmoothingEnabled = false` is reset at the top of every `render()` call.** Canvas `save()`/`restore()` can drift this value. Do not remove the reset.
- **Canvas logical size is 420×560.** The DPR and desktop `dispScale` live in the `useEffect` setup — do not hardcode pixel values that assume a different resolution.
- **`killPlayer()` checks `activePowerup === 'shield'` first and returns early.** Any new death trigger must call `killPlayer()`, not inline the death logic, so the shield check stays in one place.
- **`submitSession()` fires only on `phase === 'over'` transition.** Do not call it anywhere else.

---

## Canvas rendering gotchas

- **DPR scaling:** `canvas.width/height` = `Math.round(displayCSS * dpr)`. Buffer must exactly match physical pixels — non-integer scaling blurs text.
- **Desktop scale:** `dispScale = 480/420` applied via `ctx.scale(dpr * dispScale, dpr * dispScale)`. The canvas logical coordinate space stays 420×560; dispScale only lives in the setup.
- **Pixel coordinates in draw calls:** Use `Math.round()` on any coordinate derived from `sin`/`cos` or float arithmetic to prevent sub-pixel blur.
- **Font sizes:** All canvas fonts use VT323. When bumping font sizes, bump all of them proportionally — they were last calibrated together.

---

## Admin dashboard

- **Auth is Supabase email login** — `supabase.auth.signInWithPassword()`. Do not re-introduce a client-side string compare or a `VITE_ADMIN_PASS` env var. The password gate is cosmetic; RLS is the actual guard.
- **`VITE_ADMIN_PASS` has been permanently removed.** If it reappears anywhere (code, CONTEXT.md, env examples), remove it.
- **Sessions are submitted with the anon key (INSERT); read with an authenticated session (SELECT).** RLS enforces this boundary. Do not bypass it.
- **Admin charts use `filteredSessions`, not raw `sessions`.** All new chart components should accept `sessions: SessionRow[]` and filter at the call site.

---

## CSS

- Single file: `src/index.css`. No CSS modules, no inline style objects for values that belong in the stylesheet.
- Desktop game layout breakpoint: `(pointer: fine) and (min-width: 900px)`.
- `overflow-x: clip` (not `hidden`) on both `html` and `body` — changing this breaks mouse-wheel scrolling on the admin page.
- Canvas `width`/`height` must never be set via CSS `!important` — it decouples the buffer from the display size and causes blur.

---

## Security

- Never commit values to `CONTEXT.md`, README, or any tracked file. Variable names only.
- The Supabase anon key is intentionally public — Supabase is designed for this; RLS is the guard.
- Any new Supabase table that stores player data needs RLS from day one: anon INSERT, authenticated SELECT.
