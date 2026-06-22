# NEO CONTROL — Design Decisions

Key decisions made during development, with the reasoning behind each one.

---

## Game state lives in a ref, not React state

React's rendering model is the wrong fit for a 60fps game loop. Storing `GS` in `useRef` means the RAF tick can read and mutate state without triggering re-renders on every frame. DOM elements that need live updates (score, wave counter, mission progress) are wired to their own refs and updated imperatively. This keeps React responsible for layout and structure, and the canvas responsible for everything that moves.

---

## Fuel drains on thrust, not on time

An early implementation drained fuel at a constant rate regardless of player input. That made the gauge a countdown timer — it punished the player for existing, not for decisions they made. Tying drain to lateral movement (keys held or joystick deflected) means fuel becomes a reflection of playstyle. Aggressive dodging costs more than patient positioning. On touch, drain scales proportionally to stick deflection so a gentle nudge costs less than a full throw.

---

## Debris spawns from kills, not from ambient pickups

The first pass used pickup items that drifted down the screen on a timer. The problem: players had no way to tell which floating things were safe to collect versus deadly to touch, and the items felt disconnected from the rest of play. Spawning debris from destroyed enemies creates a direct loop — shoot things, clouds appear at the kill site, fly through them to refuel. The mechanic teaches itself without explanation.

---

## Analog dial instead of a flat bar for the fuel gauge

A horizontal bar is abstract — players have to learn what it represents. A semicircular dial with an E/F needle maps to something every driver already understands. Recognition is instant, and the needle position communicates urgency more intuitively than a depleting rectangle. The color shift (green → amber → red) reinforces it without adding new vocabulary.

---

## Path choices change physics, not just flavor text

Waves 2, 4, and 6 present a binary choice framed as a navigation decision. Each option maps to a distinct `PhysicsProfile` — different gravity mass, rock speed, dive frequency, UFO density, and score multiplier. The higher-risk path always offers a bonus multiplier. Players who want score have to accept harder conditions; players who want survival trade the bonus away. The narrative and the mechanic say the same thing.

---

## Buckshot capped at six bullets with a cooldown

A playtester scored 100k+ largely by holding the fire button with the spread shot active, saturating the screen with bullets. The spread shot's value is area coverage and crowd control — not sustained DPS. Adding a six-bullet cap and a 0.24s cooldown (vs 0.18s for standard fire) preserves the tactical appeal while making it a tool rather than a dominant strategy.

---

## Admin dashboard built alongside the game

Most solo game projects have no analytics at all. Building a password-gated admin page from the start meant every design question — does the wave 3 difficulty spike cause dropout? do players prefer path 1 or path 2? how many come back for a second run? — could be answered with real data rather than guesswork. The path score flowchart (SVG tree showing average score by path + powerup combination) exists because that data was already being captured.

---

## Leaderboard uses a locally generated UUID, not an account

Requiring signup to submit a score creates friction that kills conversion on a casual browser game. Instead, a UUID is generated once and stored in `localStorage` under `neo_player_id`. Players can submit any display name they like. The ID is stable across sessions on the same device without any auth layer. The tradeoff — players can't access their score from a different device — is acceptable given the audience.
