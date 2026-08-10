# NEO CONTROL — Storyline Verbiage

> Extracted for review. This is the exact in-game copy as it currently exists on
> `feature/updated-storyline`. Source locations are linked per section so edits can
> be traced back to code.
>
> **Premise:** You're an unqualified rookie ("SPACE CADET") flying a broken-autopilot
> ship on a supply run. You accidentally shoot down five Galactic Transit Authority
> drones, become a wanted fugitive, and the tone escalates from bureaucratic
> indifference to the whole galaxy rooting for you.

---

## 1. Landing Page

*Source: [LandingPage.tsx](src/pages/LandingPage.tsx)*

- **Eyebrow:** `NEO Control · Incident Report Vol. I`
- **Title:** `Space Cadet`
- **Body:** `The autopilot is broken. You are not qualified for this..` / `You were the only one who picked up the phone.`
- **Controls line:** `← → move   Z shoot   ESC bail out`
- **Button:** `Accept Mission`
- **Link:** `Privacy Policy`

---

## 2. Intro Transmission

*Shown at game start. Source: [GameCanvas.tsx:74-94](src/game/GameCanvas.tsx#L74-L94)*

```
>>> NEO CONTROL  //  INCOMING TRANSMISSION

SPACE CADET,

MISSION ASSIGNMENT: SUPPLY RUN TO NEO-7.

OUR DELIVERY FLEET HAS BEEN COMPROMISEDAUTOPILOT IS DISABLED
WE CALLED TEN QUALIFIED PILOTS. NONE ANSWERED. 
YOU WERE CALL NUMBER ELEVEN.

NEO-7 IS DIRECTLY AHEAD.
DOCK YOUR SHIP. DELIVER SUPPLIES.
DAMAGE TO YOUR SHIP OR NEO-7 WILL BE DEDUCTED FROM YOUR PAY.

TRAINING REFRESHER: FUEL DRAINS ON THRUST.
DEBRIS REFUELS. GAUGE IS BOTTOM LEFT.

MISSION CONTROL OUT.
```

---

## 3. Wave Transmissions

Briefings play between waves. The index-to-wave mapping follows the code comments.

### After Wave 1 → Wave 2 · route choice
*Source: [GameCanvas.tsx:97-123](src/game/GameCanvas.tsx#L97-L123)*

```
>>> NEO CONTROL  //  INCOMING TRANSMISSION

SPACE CADET,

THE GOOD: DOCKED WITH NEO-7 SUCCESSFULLY.

THE BAD: THE DRONES YOU SHOT DOWN ON APPROACH WERE
GALACTIC TRANSIT AUTHORITY (GTA). FIVE TO BE EXACT.
THERE IS A WARRANT OUT FOR YOUR CAPTURE…

PICK AN ESCAPE ROUTE. CHECK YOUR FUEL GAUGE BEFORE YOU CHOOSE.

[1] DEBRIS FIELD
    DEBRIS-RICH. GOOD FOR REFUELING.
    SLOWER SPEED. SCENIC ROUTE.
    

[2] HIGH-VELOCITY CORRIDOR
  BURNS MORE FUEL. +30% BONUS. 
  FASTER SPEED. FASTER EXIT.
```

**Path mechanics:**
- **[1] Debris Field** — This option should contain a higher density of rocks from which the user can shoot and refuel. It should also just have randomly occurring debris in the form of fuel. It should also have more large, high-density masses to introduce some fun gravitational effects to the debris. There should still be enemies shooting at me but fewer than in the second option.
- **[2] High-Velocity Corridor** — This option should contain faster moving objects, including debris and enemies. Very few randomly occurring fuel objects to gather here. +30% bonus to points for shot objects. 

### After Wave 2 → Wave 3 · transit to Velon-4 (no choice)
*Source: [GameCanvas.tsx:124-152](src/game/GameCanvas.tsx#L124-L152)*

```
>>> NEO CONTROL  //  INCOMING TRANSMISSION

SPACE CADET,

NEO-7 DEPARTURE: CONFIRMED.
STANDARD RETURN ROUTE: CLOSED.
REASON: YOU.

REROUTING THROUGH THE
VELON-4 LAGRANGE POINT.
THERE IS A FREIGHTER THERE IN HOLDING ORBIT.
IT IS NOT OURS. IT BELONGS TO XYLONS. 

DOCK WITH IT. COMMANDEER IT.
THE XYLON CREW IS ALSO WANTED.
THEY WILL UNDERSTAND.

THE TEXTBOOK ROUTE FOR YOUR GETAWAY 
REQUIRES A HOHMANN TRANSFER ORBIT. 
YOU FAILED THAT EXAM.
JUST FLY THROUGH WHAT'S IN YOUR WAY…

P.S. YOUR GALACTIC TRANSIT AUTHORITY FILE HAS BEEN
UPGRADED TO "ACTIVE PURSUIT."
```

### After Wave 3 → Wave 4 · tactical choice
*Source: [GameCanvas.tsx:153-183](src/game/GameCanvas.tsx#L153-L183)*

```
>>> NEO CONTROL  //  SITUATION UPDATE

SPACE CADET.

DELTA-9 TRANSIT: CONFIRMED.

THE FREIGHTER IS NOW A LIABILITY.
IT HAS THE STEALTH PROFILE OF
A BUILDING. 
THE GTA, TWO GUILDS, AND THE 
VELON COALITION HAVE TRIANGULATED 
YOUR POSITION. GOOD LUCK. 

FYI, SOMEONE HERE IS RUNNING A BETTING
POOL ON YOUR SURVIVAL. NOT SAYING
WHO. CURRENT ODDS: 3 TO 1. AGAINST.

[1] FORCE THROUGH
    THEY KNOW YOU'RE COMING.
    MEET THEM HEAD ON.  +50%.

[2] DARK CORRIDOR
    KILL THE TRANSPONDER.
    FEWER CONTACTS. YOU'RE A GHOST.
```

**Path mechanics:**
- **[1] Force Through** — high UFO frequency, +50% bonus.
- **[2] Dark Corridor** — fewer contacts, higher dive frequency, no bonus.

### After Wave 4 → Wave 5 · media alert (no choice)
*Source: [GameCanvas.tsx:184-201](src/game/GameCanvas.tsx#L184-L201)*

```
>>> NEO CONTROL  //  MEDIA ALERT

SPACE CADET. YOU'RE ON THE NEWS!

HEADLINE: "UNIDENTIFIED SHIP
TERRORIZES OUTER SECTORS —
AUTOPILOT BELIEVED TO BE MALFUNCTIONING."

THEY DON'T KNOW A PILOT IS ON BOARD.
I HAVE CHOSEN NOT TO CORRECT THEM.

BACKUP CANNOT REACH YOU IN TIME.
PLEASE CONTINUE MALFUNCTIONING.
              — MISSION CONTROL
```

> ⚠️ Note: `SPACECADET.` (no space) here, inconsistent with `SPACE CADET.` everywhere else. Flag for review.

### After Wave 5 → Wave 6 · final choice
*Source: [GameCanvas.tsx:202-229](src/game/GameCanvas.tsx#L202-L229)*

```
>>> [OPEN CHANNEL]  NEO CONTROL

SPACE CADET.

YOU KNOW WHAT YOU'RE DOING BY NOW.
OR YOU DON'T AND IT'S WORKING.
SAME THING.

THE GUILDS ARE ROUTING FOR YOU.
BUT SOMEHOW THE BETTING POOL IS 
NOW IN YOUR FAVOR.
DON’T LET THAT GO TO YOUR HEAD.

FINAL APPROACH. YOUR CALL:

[1] FORCE THROUGH 
    EXTREME CONDITIONS.
    MAXIMUM RISK.  +100% BONUS.

[2] WORK THE ANGLES
    NEAR-ZERO GRAVITY. PRECISION.
    STILL INSANE. STANDARD REWARD.
```

**Path mechanics:**
- **[1] Force Through** — extreme gravity mass (3.5×), +100% bonus.
- **[2] Work the Angles** — near-zero gravity (0.25×), standard reward.

> ⚠️ Note: "ROUTING FOR YOU" appears here and in the Wave 6+ message. If the intended word is "ROOTING FOR YOU," flag for review (appears twice).

### After Wave 6+ · endgame (no choice)
*Source: [GameCanvas.tsx:230-243](src/game/GameCanvas.tsx#L230-L243)*

```
>>> [OPEN CHANNEL]  UNKNOWN ORIGIN

TO THE SPACE CADET:

WE FILED THE COMPLAINT.
WE WITHDREW THE COMPLAINT.
WE ARE NOW ROUTING FOR YOU.

>>> [NEO CONTROL]
SAME. KEEP GOING.
```

---

## 4. In-Mission Flavor Text

*Source: [GameCanvas.tsx](src/game/GameCanvas.tsx) render section*

- **Sector names** (per wave 1–6): `7-G`, `VELON-4`, `DELTA-9`, `KIRA BELT`, `VOID OUTPOST`, `DEEP SPACE`
- **Wave-entry banner:** `ENTERING SECTOR <name>` / `WAVE <n>`
- **Briefing header:** `── INCOMING TRANSMISSION ──`
- **Docking sequence:** `ALIGN FOR DOCK` → `HOLDING ALIGNMENT` → `DOCK LOCK` → `DOCKING…`
- **Dock complete (wave 1 / approach):** `DOCK COMPLETE` / `NEO-7`
- **Arrival (transit waves):** `ARRIVED` / `<sector name>`
- **Wave bonus:** `BONUS  +<amount>` / `WAVE BONUS`
- **Hazard warning:** `⚠ GTA DRONE DETECTED` (labelled `GTA DRONE`)
- **Powerup pick:** `── POWER UP ──` / `CHOOSE YOUR ADVANTAGE` — options include `SCORE SURGE`, `2× FIRE RATE THIS WAVE`, `3-WAY FIRE THIS WAVE`, `1.5× POINTS THIS WAVE`
- **Prompts:** `SPACE TO CONTINUE` / `TAP TO CONTINUE`, `TAP TO SKIP`, `PRESS 1 OR 2 TO SELECT`
- **HUD labels:** `SCORE`, `HI-SCORE`, `WAVE`, `FUEL`, `+FUEL`, `DOCK`, `DIST`

---

## 5. Game Over Screen

*Source: [LeaderboardOverlay.tsx](src/game/LeaderboardOverlay.tsx)*

- **Header:** `GAME OVER`
- **Score label:** `FINAL SCORE`
- **Loading:** `CHECKING LEADERBOARD…`
- **New entry alert:** `▲ NEW LEADERBOARD ENTRY`
- **Callsign input placeholder:** `NOVA WOLF`
- **Callsign buttons:** `↻ Generate callsign`, `SUBMIT SCORE`
- **Board heading:** `TOP PILOTS`
- **Retry button:** `► INSERT COIN TO CONTINUE`
- **Submit states:** `SUBMITTING…`, `SUBMIT FAILED — TRY AGAIN`, `SCORE SAVED — LEADERBOARD UNAVAILABLE`

---

## Open Questions / Flags for Review

1. **`SPACECADET.`** (Wave 4→5) — missing space vs. `SPACE CADET.` used everywhere else.
2. **`ROUTING FOR YOU`** (Waves 5→6 and 6+) — likely intended as `ROOTING FOR YOU`.
3. Wave 2→3 and 4→5 briefings have **no path choice**; only waves 1, 3, 5 branch. Confirm this is intended.
