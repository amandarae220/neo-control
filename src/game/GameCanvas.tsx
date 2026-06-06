import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── canvas dimensions ───────────────────────────────────────────────── */
const W = 420;
const H = 560;
const PX = 3; // one game pixel = 3 canvas pixels

/* ── gameplay constants ──────────────────────────────────────────────── */
const PY = H - 52;       // player y center
const P_SPD = 170;       // player move speed px/s
const B_SPD = -300;      // player bullet speed px/s (up)
const EB_SPD = 150;      // enemy bullet speed px/s (down)
const MAX_BULLETS = 3;

const F_COLS = 10;
const F_ROWS = 4;
const F_GAPX = 36;
const F_GAPY = 28;
const F_TOP  = 70;
const F_LEFT = (W - (F_COLS - 1) * F_GAPX) / 2; // ≈ 48

/* ── palette ─────────────────────────────────────────────────────────── */
const C = {
  bg:    '#07060e',
  cyan:  '#00e5ff',
  green: '#66f2a5',
  red:   '#ff5a5a',
  amber: '#f7c76a',
  pink:  '#ff4fd8',
  white: '#eee8ff',
  muted: '#7a7088',
};

/* ── physics profiles ────────────────────────────────────────────────── */
interface PhysicsProfile {
  gravMass:  number; // rock mass multiplier (bullet gravity bend)
  rockSpeed: number; // rock spawn speed multiplier
  diveFreq:  number; // dive interval multiplier (>1 = fewer dives)
  ufoFreq:   number; // UFO interval multiplier (>1 = fewer UFOs)
  bonusMult: number; // score multiplier
}
const DEFAULT_PROFILE: PhysicsProfile = {
  gravMass: 1, rockSpeed: 1, diveFreq: 1, ufoFreq: 1, bonusMult: 1,
};

/* ── story transmissions ─────────────────────────────────────────────── */
interface WaveBrief {
  lines:     string[];
  profiles?: [PhysicsProfile, PhysicsProfile];
}

const INTRO_TRANSMISSION: string[] = [
  '>>> EARTH NEO CONTROL  //  EYES ONLY',
  '',
  'ATTENTION: PILOT VECTOR-7.',
  '',
  'ZORGON FLEET DETECTED IN HIGH ORBIT.',
  'ASTEROID FIELD IS NOT NATURAL —',
  'CONFIRMED HOSTILE FORMATION.',
  '',
  'MISSION: BREAK THROUGH AND DOCK AT',
  'STATION NEO-7. RETRIEVE THE INTEL.',
  'DO NOT LET THEM DESTROY THE STATION.',
  '',
  'GOOD LUCK. YOU\'LL NEED IT.',
  '                    — GEN. TORRES',
];

const TRANSMISSIONS: WaveBrief[] = [
  { // wave 1 → wave 2: route choice
    lines: [
      '>>> EARTH NEO CONTROL  //  PRIORITY 1',
      '',
      'DOCK CONFIRMED. INTEL RECEIVED.',
      'ZORGON FLEET IS REFORMING.',
      '',
      'TWO APPROACH VECTORS AVAILABLE.',
      'CHOOSE YOUR ROUTE, PILOT:',
      '',
      '[1] GRAVITY FIELD SECTOR',
      '    DENSE ROCKS. STRONG PULL.',
      '    HEAVY ENEMY DIVES.',
      '',
      '[2] HIGH-VELOCITY SECTOR',
      '    FAST ROCKS. LIGHTER GRAVITY.',
      '    FEWER DIVES.  +30% BONUS.',
    ],
    profiles: [
      { gravMass: 2.2, rockSpeed: 0.7,  diveFreq: 0.5, ufoFreq: 1,   bonusMult: 1   },
      { gravMass: 0.5, rockSpeed: 1.6,  diveFreq: 1.8, ufoFreq: 1,   bonusMult: 1.3 },
    ],
  },
  { // wave 2 → wave 3
    lines: [
      '>>> [INTERCEPTED]  ZORGON FLEET CMD',
      '',
      'VRAX TO DIVISION II:',
      '',
      'THE EARTH PILOT DESTROYED OUR',
      'FORWARD UNITS. UNACCEPTABLE.',
      'ACCELERATE THE EXTRACTION.',
      'THE NEUTRONIUM MUST NOT REACH THEM.',
      '',
      '>>> [HQ ANNOTATION]  THEY\'RE MINING.',
    ],
  },
  { // wave 3 → wave 4: tactical choice
    lines: [
      '>>> [INTERCEPTED]  ADMIRAL KETH',
      '',
      'VRAX HAS FAILED. I AM ASSUMING',
      'DIRECT COMMAND OF THE OPERATION.',
      '',
      'TWO TACTICAL OPTIONS AVAILABLE.',
      'CHOOSE YOUR ENGAGEMENT, PILOT:',
      '',
      '[1] ENGAGE VRAX DIRECTLY',
      '    HIGH UFO PRESENCE. MORE RISK.',
      '    DOUBLE FLEET KILLS.  +50% BONUS.',
      '',
      '[2] ACCEPT COVERT INTEL',
      '    REDUCED DIVE PRESSURE.',
      '    STEALTH APPROACH. RECON DATA.',
    ],
    profiles: [
      { gravMass: 1,   rockSpeed: 1,    diveFreq: 0.5, ufoFreq: 2.5, bonusMult: 1.5 },
      { gravMass: 1,   rockSpeed: 0.85, diveFreq: 1.8, ufoFreq: 1,   bonusMult: 1   },
    ],
  },
  { // wave 4 → wave 5
    lines: [
      '>>> EARTH NEO CONTROL  //  URGENT',
      '',
      'DEEP SCANS SHOW A CORE VESSEL IN',
      'THE FIELD. KETH\'S FLAGSHIP.',
      'IF IT ESCAPES WITH THE NEUTRONIUM,',
      'EARTH IS FINISHED.',
      '',
      'BACKUP CANNOT REACH YOU IN TIME.',
      'IT\'S YOU, PILOT. ONLY YOU.',
      '                    — TORRES',
    ],
  },
  { // wave 5 → wave 6: final choice
    lines: [
      '>>> [INTERCEPTED]  KETH PERSONAL LOG',
      '',
      'THIS HUMAN PILOT IS... REMARKABLE.',
      'THEY FIGHT LIKE NOTHING LEFT TO LOSE.',
      '',
      'THEIR WEAPON LOCKS ON THE CANNON.',
      'CHOOSE YOUR FINAL APPROACH:',
      '',
      '[1] DESTROY THE GRAVITY CANNON',
      '    EXTREME ROCK DENSITY.',
      '    HIGH RISK.  +100% BONUS SCORE.',
      '',
      '[2] HACK THE CANNON SYSTEMS',
      '    NEAR-ZERO GRAVITY. PRECISION.',
      '    SAFER. SURGICAL. STANDARD REWARD.',
    ],
    profiles: [
      { gravMass: 3.5,  rockSpeed: 1,  diveFreq: 1, ufoFreq: 1, bonusMult: 2.0 },
      { gravMass: 0.25, rockSpeed: 1,  diveFreq: 1, ufoFreq: 1, bonusMult: 1   },
    ],
  },
  { // wave 6+
    lines: [
      '>>> [INTERCEPTED]  UNKNOWN ORIGIN',
      '',
      'TO THE EARTH PILOT:',
      '',
      'YOU CANNOT STOP THE TIDE.',
      'WE HAVE WATCHED YOUR WORLD',
      'FOR CENTURIES. YOU ARE ONLY',
      'NOW NOTICING US.',
      '',
      '>>> [HQ]  KEEP FIGHTING. WE SEE YOU.',
    ],
  },
];

/* ── types ───────────────────────────────────────────────────────────── */
type Phase = 'play' | 'die' | 'over' | 'brief';
type EK    = 0 | 1 | 2;          // 0 = rock · 1 = alien · 2 = boss
type ES    = 'form' | 'dive';

interface Enemy {
  id: number; kind: EK; row: number; col: number;
  x: number;  y: number;
  bx: number; by: number;
  state: ES;
  vx: number; vy: number;
  sp: number;
  pts: number; dpts: number;
}

interface Bullet {
  id: number; x: number; y: number; vx: number; vy: number; player: boolean;
}

interface UFO {
  id: number; x: number; y: number; vx: number; pts: number; shootT: number;
}

interface GravRock {
  id: number; x: number; y: number; vx: number; vy: number;
  mass: number; radius: number;
  deflected: boolean; deflectT: number;
}

interface Planet {
  id: number; x: number; y: number; vx: number;
  radius: number; mass: number;
  color: string; ringColor: string;
  hasRing: boolean; ringTilt: number;
}

interface Spark {
  x: number; y: number; vx: number; vy: number; life: number; color: string;
}

interface GS {
  phase:   Phase;
  score:   number; hi: number; lives: number; wave: number;
  px:      number;
  invT:    number;
  shootT:  number;
  eShootT: number;
  diveT:   number;
  waveT:   number;
  dieT:    number;
  fmOff:   number;
  fmDir:   number;
  fmSpd:   number;
  bullets:   Bullet[];
  enemies:   Enemy[];
  sparks:    Spark[];
  stars:     { x: number; y: number; s: number }[];
  keys:      Set<string>;
  seq:       number;
  ufo:        UFO | null;
  ufoT:       number;
  gravRocks:    GravRock[];
  spawnRockT:   number;
  planets:      Planet[];
  spawnPlanetT: number;
  deflectMsg: number;
  shieldT:    number;
  shieldCD:   number;
  blastCD:    number;
  blastRing:  number;
  txLines:    string[];
  txLine:     number;
  txCh:       number;
  txDone:     boolean;
  txWait:     number;
  txIsIntro:  boolean;
  txHasChoice:   boolean;
  txProfiles:    [PhysicsProfile, PhysicsProfile] | null;
  txChoiceTimer: number;
  missionKind:     'approach' | 'eliminate';
  stationProgress: number; // 0-1, wave 1 approach only
  activeProfile:   PhysicsProfile;
}

/* ── pixel-art sprites ───────────────────────────────────────────────── */
const SPR = {
  player:   ['  #  ', ' ### ', '#####', '# # #'],
  thruster: [' # ', '###', ' # '],
  rock:     [' ## ', '####', '####', ' ## '],
  alien:    [' ### ', '#####', '# . #', '#####'],
  boss:     ['  .  ', ' ### ', '#####', '## ##', ' ### '],
  station:  [
    '   .   ',
    '  [#]  ',
    '#######',
    '  [#]  ',
    '   .   ',
  ],
};

const UFO_SPR  = [' ##### ', '#######', '#.#.#.#', '#######', ' ##### '];
const GRAV_SPR = ['  ###  ', ' ##### ', '#######', '#######', ' ##### ', '  ###  '];

function drawSpr(
  ctx: CanvasRenderingContext2D,
  spr: string[], color: string,
  cx: number, cy: number, ps = PX,
) {
  const maxC = Math.max(...spr.map(r => r.length));
  const ox   = Math.floor(cx - (maxC * ps) / 2);
  const oy   = Math.floor(cy - (spr.length * ps) / 2);
  spr.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === ' ') continue;
      ctx.fillStyle = ch === '.' ? C.white : color;
      ctx.fillRect(ox + rx * ps, oy + ry * ps, ps, ps);
    }
  });
}

const sprW = (spr: string[], ps = PX) => Math.max(...spr.map(r => r.length)) * ps;
const sprH = (spr: string[], ps = PX) => spr.length * ps;

/* ── helpers ─────────────────────────────────────────────────────────── */
function eColor(kind: EK, row: number) {
  if (kind === 2) return C.amber;
  if (kind === 1) return row === 1 ? C.pink : C.red;
  return row === 2 ? C.cyan : C.green;
}

function eSpr(kind: EK) {
  return kind === 2 ? SPR.boss : kind === 1 ? SPR.alien : SPR.rock;
}

function hit(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) {
  return ax - aw / 2 < bx + bw / 2 && ax + aw / 2 > bx - bw / 2
      && ay - ah / 2 < by + bh / 2 && ay + ah / 2 > by - bh / 2;
}

function burst(gs: GS, x: number, y: number, color: string, n = 8) {
  for (let i = 0; i < n; i++) {
    const a   = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const spd = 45 + Math.random() * 85;
    gs.sparks.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 0.55 + Math.random() * 0.4, color });
  }
}

/* ── wave builder ────────────────────────────────────────────────────── */
function buildWave(wave: number): Enemy[] {
  const arr: Enemy[] = [];
  let id = 0;
  for (let row = 0; row < F_ROWS; row++) {
    const kind: EK = row === 0 ? 2 : row === 1 ? 1 : 0;
    for (let col = 0; col < F_COLS; col++) {
      const bx = F_LEFT + col * F_GAPX;
      const by = F_TOP  + row * F_GAPY;
      arr.push({
        id: id++, kind, row, col,
        x: bx, y: -55 - row * 28,
        bx, by,
        state: 'form',
        vx: 0, vy: 110 + wave * 5,
        sp: Math.random() * Math.PI * 2,
        pts:  kind === 2 ? 50  : kind === 1 ? 20 : 10,
        dpts: kind === 2 ? 150 : kind === 1 ? 60 : 30,
      });
    }
  }
  return arr;
}

function mkStars(): GS['stars'] {
  return Array.from({ length: 64 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    s: Math.random() > 0.72 ? 2 : 1,
  }));
}

function mkRock(id: number, profile: PhysicsProfile = DEFAULT_PROFILE): GravRock {
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0, tx = 0, ty = 0;
  switch (edge) {
    case 0: x = Math.random() * W; y = -18;    tx = Math.random() * W; ty = H + 18;  break;
    case 1: x = W + 18; y = Math.random() * H; tx = -18;               ty = Math.random() * H; break;
    case 2: x = Math.random() * W; y = H + 18; tx = Math.random() * W; ty = -18;     break;
    default: x = -18; y = Math.random() * H;   tx = W + 18;            ty = Math.random() * H;
  }
  const dx = tx - x, dy = ty - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
  const spd = (100 + Math.random() * 90) * profile.rockSpeed;
  return {
    id, x, y,
    vx: (dx / d) * spd, vy: (dy / d) * spd,
    mass: 120 * profile.gravMass, radius: 75,
    deflected: false, deflectT: 0,
  };
}

function newGame(
  wave    = 1,
  score   = 0,
  hi      = 0,
  lives   = 3,
  profile: PhysicsProfile = DEFAULT_PROFILE,
): GS {
  return {
    phase: 'play', score, hi, lives, wave,
    px: W / 2, invT: 2, shootT: 0, eShootT: 2,
    diveT: 3.5 * profile.diveFreq,
    waveT: 0, dieT: 0,
    fmOff: 0, fmDir: 1, fmSpd: 18 + wave * 2,
    bullets: [], enemies: buildWave(wave), sparks: [],
    stars: mkStars(), keys: new Set(), seq: 1000,
    ufo: null, ufoT: (15 + Math.random() * 8) * profile.ufoFreq,
    gravRocks: [mkRock(0, profile), mkRock(1, profile)],
    spawnRockT: 5 + Math.random() * 3,
    planets: [], spawnPlanetT: 6,
    deflectMsg: 0,
    shieldT: 0, shieldCD: 0, blastCD: 0, blastRing: 0,
    txLines: [], txLine: 0, txCh: 0, txDone: false, txWait: 0,
    txIsIntro: false, txHasChoice: false, txProfiles: null, txChoiceTimer: 0,
    missionKind:     wave === 1 ? 'approach' : 'eliminate',
    stationProgress: 0,
    activeProfile:   profile,
  };
}

function introGame(): GS {
  const gs     = newGame();
  gs.phase     = 'brief';
  gs.txLines   = INTRO_TRANSMISSION;
  gs.txLine    = 0; gs.txCh = 0; gs.txDone = false; gs.txWait = 0;
  gs.txIsIntro = true;
  return gs;
}

/* ── UFO ─────────────────────────────────────────────────────────────── */
function tickUFO(gs: GS, dt: number) {
  if (!gs.ufo) {
    gs.ufoT -= dt;
    if (gs.ufoT <= 0) {
      const left = Math.random() > 0.5;
      gs.ufo = {
        id: gs.seq++,
        x:   left ? -32 : W + 32,
        y:   50,
        vx:  left ? 80 : -80,
        pts: 200 + Math.floor(Math.random() * 3) * 100,
        shootT: 1.6,
      };
    }
    return;
  }
  const u = gs.ufo;
  u.x += u.vx * dt;
  u.shootT -= dt;
  if (u.shootT <= 0 && gs.invT <= 0) {
    const dx = gs.px - u.x, dy = PY - u.y;
    const d  = Math.sqrt(dx * dx + dy * dy) || 1;
    gs.bullets.push({ id: gs.seq++, x: u.x, y: u.y + 8, vx: (dx/d)*115, vy: (dy/d)*115, player: false });
    u.shootT = 2.2 + Math.random() * 0.8;
  }
  if (u.x < -70 || u.x > W + 70) {
    gs.ufo = null;
    gs.ufoT = (18 + Math.random() * 7) * gs.activeProfile.ufoFreq;
    return;
  }
  const uW = sprW(UFO_SPR), uH = sprH(UFO_SPR);
  const used = new Set<number>();
  for (const b of gs.bullets) {
    if (!b.player) continue;
    if (hit(b.x, b.y, PX, PX * 3, u.x, u.y, uW, uH)) {
      gs.score += Math.round(u.pts * gs.activeProfile.bonusMult);
      gs.hi    = Math.max(gs.hi, gs.score);
      burst(gs, u.x, u.y, C.pink, 14);
      gs.ufo = null;
      gs.ufoT = (18 + Math.random() * 7) * gs.activeProfile.ufoFreq;
      used.add(b.id); break;
    }
  }
  gs.bullets = gs.bullets.filter(b => !used.has(b.id));
}

/* ── gravity rocks ───────────────────────────────────────────────────── */
const MAX_ROCKS = 4;

function tickGravRocks(gs: GS, dt: number) {
  gs.spawnRockT -= dt;
  if (gs.spawnRockT <= 0 && gs.gravRocks.length < MAX_ROCKS) {
    gs.gravRocks.push(mkRock(gs.seq++, gs.activeProfile));
    gs.spawnRockT = 4 + Math.random() * 4;
  }

  const usedB = new Set<number>();
  const rW = sprW(GRAV_SPR, PX + 1), rH = sprH(GRAV_SPR, PX + 1);
  gs.gravRocks.forEach(rock => {
    for (const b of gs.bullets) {
      if (!b.player || usedB.has(b.id)) continue;
      if (hit(b.x, b.y, PX, PX * 3, rock.x, rock.y, rW, rH)) {
        const bd = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
        rock.vx += (b.vx / bd) * 190;
        rock.vy += (b.vy / bd) * 190;
        const spd = Math.sqrt(rock.vx * rock.vx + rock.vy * rock.vy);
        if (spd > 270) { rock.vx = (rock.vx / spd) * 270; rock.vy = (rock.vy / spd) * 270; }
        rock.deflected = true; rock.deflectT = 2.5;
        gs.deflectMsg  = 2.0;
        usedB.add(b.id);
        burst(gs, rock.x, rock.y, C.cyan, 10);
        break;
      }
    }
  });
  gs.bullets = gs.bullets.filter(b => !usedB.has(b.id));

  gs.gravRocks = gs.gravRocks.filter(rock => {
    if (rock.deflectT > 0) rock.deflectT -= dt; else rock.deflected = false;

    rock.x += rock.vx * dt; rock.y += rock.vy * dt;
    if (rock.x < -80 || rock.x > W + 80 || rock.y < -80 || rock.y > H + 80) return false;

    if (rock.deflected) {
      const toKill = new Set<number>();
      gs.enemies.forEach(e => {
        const sp = eSpr(e.kind);
        if (hit(rock.x, rock.y, rW, rH, e.x, e.y, sprW(sp), sprH(sp))) {
          burst(gs, e.x, e.y, eColor(e.kind, e.row), 10);
          gs.score += Math.round(e.pts * 1.5 * gs.activeProfile.bonusMult);
          gs.hi    = Math.max(gs.hi, gs.score);
          toKill.add(e.id);
        }
      });
      gs.enemies = gs.enemies.filter(e => !toKill.has(e.id));
    }

    if (!rock.deflected && gs.invT <= 0) {
      const pw = sprW(SPR.player), ph = sprH(SPR.player);
      if (hit(rock.x, rock.y, rW, rH, gs.px, PY, pw, ph)) killPlayer(gs);
    }

    gs.bullets.forEach(b => {
      const dx = rock.x - b.x, dy = rock.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < rock.radius) {
        const f = rock.mass * (1 - dist / rock.radius) / dist;
        b.vx += dx * f * dt; b.vy += dy * f * dt;
      }
    });

    const pdx = rock.x - gs.px, pdy = rock.y - PY;
    const pd  = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
    if (pd < rock.radius) {
      const f = rock.mass * 0.15 * (1 - pd / rock.radius) / pd;
      gs.px += pdx * f * dt;
      gs.px  = Math.max(14, Math.min(W - 14, gs.px));
    }
    return true;
  });
}

/* ── planet mechanics ────────────────────────────────────────────────── */
const PLANET_PALETTES = [
  { body: '#c87941', ring: '#8a4e1e' },
  { body: '#5a9fd4', ring: '#2e6a9a' },
  { body: '#d4c46f', ring: '#a89035' },
  { body: '#9e6ec0', ring: '#6b3d90' },
  { body: '#6dbb7a', ring: '#3d8a4a' },
  { body: '#d45a5a', ring: '#a02828' },
];

function mkPlanet(id: number): Planet {
  const fromLeft = Math.random() > 0.5;
  const radius   = 18 + Math.floor(Math.random() * 46);
  const palette  = PLANET_PALETTES[Math.floor(Math.random() * PLANET_PALETTES.length)];
  return {
    id,
    x:        fromLeft ? -(radius + 10) : W + radius + 10,
    y:        35 + Math.random() * (H * 0.6),
    vx:       fromLeft ? 18 + Math.random() * 36 : -(18 + Math.random() * 36),
    radius,
    mass:     radius * 80,
    color:    palette.body,
    ringColor: palette.ring,
    hasRing:  Math.random() > 0.45,
    ringTilt: 0.18 + Math.random() * 0.32,
  };
}

const MAX_PLANETS = 3;

function tickPlanets(gs: GS, dt: number) {
  gs.spawnPlanetT -= dt;
  if (gs.spawnPlanetT <= 0 && gs.planets.length < MAX_PLANETS) {
    gs.planets.push(mkPlanet(gs.seq++));
    gs.spawnPlanetT = 36 + Math.random() * 28;
  }

  gs.planets = gs.planets.filter(planet => {
    planet.x += planet.vx * dt;
    if (planet.x < -(planet.radius + 20) || planet.x > W + planet.radius + 20) return false;

    if (gs.phase !== 'play') return true;

    const infR = planet.radius * 3.5;

    for (const b of gs.bullets) {
      const dx = planet.x - b.x, dy = planet.y - b.y;
      const dist = Math.max(planet.radius * 0.4, Math.sqrt(dx * dx + dy * dy));
      if (dist < infR) {
        const f = planet.mass * (infR - dist) / (infR * dist);
        b.vx += dx * f * dt;
        b.vy += dy * f * dt;
      }
    }

    {
      const dx = planet.x - gs.px, dy = planet.y - PY;
      const dist = Math.max(planet.radius * 0.4, Math.sqrt(dx * dx + dy * dy));
      if (dist < infR) {
        const f = planet.mass * 0.18 * (infR - dist) / (infR * dist);
        gs.px = Math.max(14, Math.min(W - 14, gs.px + dx * f * dt));
      }
    }

    for (const rock of gs.gravRocks) {
      const dx = planet.x - rock.x, dy = planet.y - rock.y;
      const dist = Math.max(planet.radius * 0.4, Math.sqrt(dx * dx + dy * dy));
      if (dist < infR) {
        const f = planet.mass * 0.55 * (infR - dist) / (infR * dist);
        rock.vx += dx * f * dt;
        rock.vy += dy * f * dt;
      }
    }

    for (const e of gs.enemies) {
      if (e.state === 'form' && e.y >= e.by) {
        // pull the formation's home position so the whole grid drifts
        const dx = planet.x - e.bx, dy = planet.y - e.by;
        const dist = Math.max(planet.radius * 0.4, Math.sqrt(dx * dx + dy * dy));
        if (dist < infR) {
          const f = planet.mass * 0.04 * (infR - dist) / (infR * dist);
          e.bx = Math.max(12, Math.min(W - 12, e.bx + dx * f * dt));
          e.by = Math.max(F_TOP, Math.min(H * 0.55, e.by + dy * f * dt));
        }
      } else if (e.state === 'dive') {
        // pull dive trajectory directly (velocity is reset each frame so position is the lever)
        const dx = planet.x - e.x, dy = planet.y - e.y;
        const dist = Math.max(planet.radius * 0.4, Math.sqrt(dx * dx + dy * dy));
        if (dist < infR) {
          const f = planet.mass * 0.12 * (infR - dist) / (infR * dist);
          e.x += dx * f * dt;
          e.y += dy * f * dt;
        }
      }
    }

    gs.bullets = gs.bullets.filter(b => {
      const dx = planet.x - b.x, dy = planet.y - b.y;
      return dx * dx + dy * dy > planet.radius * planet.radius;
    });

    return true;
  });
}

/* ── player abilities ────────────────────────────────────────────────── */
function tryShield(gs: GS) {
  if (gs.phase !== 'play' || gs.shieldCD > 0) return;
  gs.shieldT  = 0.55;
  gs.shieldCD = 5.0;
}

function tryBlast(gs: GS) {
  if (gs.phase !== 'play' || gs.blastCD > 0) return;
  const BLAST_R = 130;
  let didHit = false;
  gs.gravRocks.forEach(rock => {
    const dx = rock.x - gs.px, dy = rock.y - PY;
    if (Math.sqrt(dx * dx + dy * dy) < BLAST_R) {
      const lateral = rock.x < gs.px ? -75 : 75;
      rock.vx = lateral; rock.vy = -230;
      const spd = Math.sqrt(rock.vx * rock.vx + rock.vy * rock.vy);
      if (spd > 270) { rock.vx = (rock.vx / spd) * 270; rock.vy = (rock.vy / spd) * 270; }
      rock.deflected = true; rock.deflectT = 2.5;
      didHit = true;
    }
  });
  if (didHit) gs.deflectMsg = 2.0;
  burst(gs, gs.px, PY, C.green, 14);
  gs.blastCD   = 7.0;
  gs.blastRing = 1;
}

/* ── update ──────────────────────────────────────────────────────────── */
function tickStars(gs: GS, dt: number) {
  gs.stars.forEach(s => {
    s.y += (0.5 + s.s * 0.25) * dt * 30;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  });
}

function tickSparks(gs: GS, dt: number) {
  gs.sparks = gs.sparks.filter(s => {
    s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 55 * dt; s.life -= dt;
    return s.life > 0;
  });
}

function killPlayer(gs: GS) {
  burst(gs, gs.px, PY, C.cyan, 12);
  gs.bullets = gs.bullets.filter(b => b.player);
  gs.lives--;
  gs.phase = 'die';
  gs.dieT  = 1.8;
}

function launchDive(gs: GS) {
  const fm     = gs.enemies.filter(e => e.state === 'form');
  if (!fm.length) return;
  const bosses = fm.filter(e => e.kind === 2);
  const aliens = fm.filter(e => e.kind === 1);
  const pool   = bosses.length ? bosses : aliens.length ? aliens : fm;
  const leader = pool[Math.floor(Math.random() * pool.length)];
  leader.state = 'dive'; leader.vx = 0; leader.vy = 0;
  fm
    .filter(e => e.id !== leader.id && e.row > leader.row && Math.abs(e.col - leader.col) <= 1)
    .slice(0, 2)
    .forEach(e => { e.state = 'dive'; e.vx = 0; e.vy = 0; e.sp = leader.sp + 1.2; });
}

function update(gs: GS, dt: number) {
  /* ── death pause ── */
  if (gs.phase === 'die') {
    gs.dieT -= dt;
    if (gs.dieT <= 0) {
      gs.phase = gs.lives > 0 ? 'play' : 'over';
      if (gs.phase === 'play') gs.invT = 2.5;
    }
    tickSparks(gs, dt); tickStars(gs, dt); tickPlanets(gs, dt);
    return;
  }

  /* ── wave clear pause → brief ── */
  if (gs.waveT > 0) {
    gs.waveT -= dt;
    if (gs.waveT <= 0) {
      gs.phase = 'brief';
      const idx   = Math.min(gs.wave - 1, TRANSMISSIONS.length - 1);
      const brief = TRANSMISSIONS[idx];
      gs.txLines      = brief.lines;
      gs.txHasChoice  = !!brief.profiles;
      gs.txProfiles   = brief.profiles ?? null;
      gs.txChoiceTimer = 0;
      gs.txLine = 0; gs.txCh = 0; gs.txDone = false; gs.txWait = 0;
    }
    tickStars(gs, dt); tickSparks(gs, dt); tickPlanets(gs, dt);
    return;
  }

  /* ── brief: teletype transmission ── */
  if (gs.phase === 'brief') {
    if (!gs.txDone) {
      gs.txCh += 44 * dt;
      const line = gs.txLines[gs.txLine];
      if (gs.txCh >= Math.max(line.length, 6)) {
        gs.txLine++; gs.txCh = 0;
        if (gs.txLine >= gs.txLines.length) {
          gs.txDone = true;
          gs.txLine = gs.txLines.length - 1;
          gs.txCh   = gs.txLines[gs.txLine].length;
        }
      }
    } else {
      if (gs.txHasChoice) {
        gs.txChoiceTimer += dt;
        if (gs.txChoiceTimer >= 12) {
          // auto-select option 1 after 12 seconds
          Object.assign(gs, newGame(gs.wave + 1, gs.score, gs.hi, gs.lives, gs.txProfiles![0]));
        }
      } else {
        gs.txWait += dt;
        if (gs.txWait >= 4) {
          if (gs.txIsIntro) gs.phase = 'play';
          else Object.assign(gs, newGame(gs.wave + 1, gs.score, gs.hi, gs.lives, gs.activeProfile));
        }
      }
    }
    tickStars(gs, dt); tickPlanets(gs, dt);
    return;
  }

  /* ── fly-in ── */
  let allIn = true;
  gs.enemies.forEach(e => {
    if (e.state === 'form' && e.y < e.by) {
      e.y = Math.min(e.by, e.y + e.vy * dt);
      if (e.y < e.by) allIn = false;
    }
  });

  /* ── formation oscillation ── */
  if (allIn) {
    gs.fmOff += gs.fmDir * gs.fmSpd * dt;
    if (Math.abs(gs.fmOff) >= 32) { gs.fmDir *= -1; gs.fmOff = Math.sign(gs.fmOff) * 32; }
    gs.enemies.forEach(e => {
      if (e.state === 'form') { e.x = e.bx + gs.fmOff; e.y = e.by; }
    });
  }

  /* ── player move ── */
  gs.invT = Math.max(0, gs.invT - dt);
  if (gs.keys.has('ArrowLeft')  || gs.keys.has('a')) gs.px = Math.max(14, gs.px - P_SPD * dt);
  if (gs.keys.has('ArrowRight') || gs.keys.has('d')) gs.px = Math.min(W - 14, gs.px + P_SPD * dt);

  /* ── player shoot ── */
  gs.shootT = Math.max(0, gs.shootT - dt);
  const canShoot = gs.keys.has(' ') || gs.keys.has('z');
  if (canShoot && gs.shootT <= 0 && gs.bullets.filter(b => b.player).length < MAX_BULLETS) {
    gs.bullets.push({ id: gs.seq++, x: gs.px, y: PY - 12, vx: 0, vy: B_SPD, player: true });
    gs.shootT = 0.18;
  }

  /* ── move bullets ── */
  gs.bullets = gs.bullets.filter(b => {
    b.x += b.vx * dt; b.y += b.vy * dt;
    return b.y > -12 && b.y < H + 12 && b.x > -12 && b.x < W + 12;
  });

  /* ── player bullets → enemies ── */
  const killedEnemies = new Set<number>();
  const usedBullets   = new Set<number>();
  for (const b of gs.bullets) {
    if (!b.player) continue;
    for (const e of gs.enemies) {
      if (killedEnemies.has(e.id)) continue;
      const sp = eSpr(e.kind);
      if (hit(b.x, b.y, PX, PX * 3, e.x, e.y, sprW(sp), sprH(sp))) {
        burst(gs, e.x, e.y, eColor(e.kind, e.row));
        gs.score += Math.round((e.state === 'dive' ? e.dpts : e.pts) * gs.activeProfile.bonusMult);
        gs.hi = Math.max(gs.hi, gs.score);
        killedEnemies.add(e.id);
        usedBullets.add(b.id);
      }
    }
  }
  gs.enemies = gs.enemies.filter(e => !killedEnemies.has(e.id));
  gs.bullets = gs.bullets.filter(b => !usedBullets.has(b.id));

  // station approach: each kill advances docking progress
  if (gs.missionKind === 'approach' && killedEnemies.size > 0) {
    gs.stationProgress = Math.min(1, gs.stationProgress + killedEnemies.size * 0.015);
  }

  /* ── enemy bullets → player ── */
  if (gs.invT <= 0) {
    const pw = sprW(SPR.player), ph = sprH(SPR.player);
    for (const b of gs.bullets) {
      if (b.player) continue;
      if (hit(b.x, b.y, PX, PX * 2, gs.px, PY, pw, ph)) { killPlayer(gs); break; }
    }
  }

  /* ── diving enemies → player ── */
  if (gs.invT <= 0) {
    const pw = sprW(SPR.player), ph = sprH(SPR.player);
    for (let i = gs.enemies.length - 1; i >= 0; i--) {
      const e = gs.enemies[i];
      if (e.state !== 'dive') continue;
      const sp = eSpr(e.kind);
      if (hit(e.x, e.y, sprW(sp), sprH(sp), gs.px, PY, pw, ph)) {
        burst(gs, e.x, e.y, eColor(e.kind, e.row));
        gs.enemies.splice(i, 1);
        killPlayer(gs);
        break;
      }
    }
  }

  /* ── dive trigger ── */
  if (allIn) {
    gs.diveT -= dt;
    if (gs.diveT <= 0) {
      launchDive(gs);
      gs.diveT = (2.5 + Math.random() * 2) * gs.activeProfile.diveFreq;
    }
  }

  /* ── update divers ── */
  gs.enemies.forEach(e => {
    if (e.state !== 'dive') return;
    e.sp += dt * 3.4;
    e.vx  = Math.sin(e.sp) * 95;
    e.vy  = 148 + gs.wave * 7;
    e.x  += e.vx * dt;
    e.y  += e.vy * dt;
    if (e.y > H + 24) {
      e.state = 'form'; e.x = e.bx; e.y = -32; e.vx = 0; e.vy = 110;
    }
  });

  /* ── enemy shoot ── */
  gs.eShootT -= dt;
  if (gs.eShootT <= 0) {
    const divers = gs.enemies.filter(e => e.state === 'dive');
    if (divers.length) {
      const sh = divers[Math.floor(Math.random() * divers.length)];
      gs.bullets.push({ id: gs.seq++, x: sh.x, y: sh.y + 8, vx: 0, vy: EB_SPD, player: false });
    }
    gs.eShootT = 0.6 + Math.random() * 0.9;
  }

  /* ── station approach: passive progress fill ── */
  if (gs.missionKind === 'approach') {
    gs.stationProgress = Math.min(1, gs.stationProgress + 0.008 * dt);
  }

  /* ── wave clear ── */
  const waveClear = gs.missionKind === 'approach'
    ? gs.stationProgress >= 1
    : gs.enemies.length === 0;

  if (waveClear && gs.waveT <= 0) {
    gs.score += Math.round(gs.wave * 500 * gs.activeProfile.bonusMult);
    gs.hi     = Math.max(gs.hi, gs.score);
    gs.waveT  = 2.5;
  }

  if (gs.deflectMsg > 0) gs.deflectMsg -= dt;
  gs.shieldCD = Math.max(0, gs.shieldCD - dt);
  gs.blastCD  = Math.max(0, gs.blastCD  - dt);

  if (gs.shieldT > 0) {
    gs.shieldT -= dt;
    const SR = 42;
    gs.gravRocks.forEach(rock => {
      const dx = rock.x - gs.px, dy = rock.y - PY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < SR) {
        const spd = Math.max(Math.sqrt(rock.vx * rock.vx + rock.vy * rock.vy), 165);
        rock.vx = (dx / dist) * spd; rock.vy = (dy / dist) * spd;
        rock.x  = gs.px + (dx / dist) * (SR + 2);
        rock.y  = PY    + (dy / dist) * (SR + 2);
        rock.deflected = true; rock.deflectT = 2.2;
        gs.deflectMsg  = 2.0;
      }
    });
  }

  if (gs.blastRing > 0) {
    gs.blastRing += 260 * dt;
    if (gs.blastRing > 130) gs.blastRing = 0;
  }

  tickUFO(gs, dt);
  tickGravRocks(gs, dt);
  tickPlanets(gs, dt);
  tickSparks(gs, dt); tickStars(gs, dt);
}

/* ── planet draw ─────────────────────────────────────────────────────── */
function drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet) {
  const { x, y, radius, color, ringColor, hasRing, ringTilt } = planet;

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (hasRing) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = Math.max(3, radius * 0.15);
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.75, radius * ringTilt, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.48, 0, Math.PI * 2);
  ctx.fill();

  if (hasRing) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = Math.max(3, radius * 0.15);
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.75, radius * ringTilt, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}

/* ── brief overlay ───────────────────────────────────────────────────── */
const TX_PAD = 14;
const TX_TOP = 56;
const TX_LH  = 20;

function drawBrief(ctx: CanvasRenderingContext2D, gs: GS, t: number) {
  const bw = W - TX_PAD * 2;
  const bh = H - TX_TOP - 36;

  ctx.fillStyle = 'rgba(7,6,14,0.93)';
  ctx.fillRect(TX_PAD, TX_TOP, bw, bh);

  ctx.strokeStyle = gs.txHasChoice ? C.amber : C.green;
  ctx.lineWidth   = 1;
  ctx.strokeRect(TX_PAD, TX_TOP, bw, bh);

  // header
  const header = gs.txIsIntro
    ? '── INCOMING TRANSMISSION ──'
    : gs.txHasChoice
      ? '── COMMAND DECISION REQUIRED ──'
      : '── INTERCEPTED TRANSMISSION ──';

  ctx.font      = "15px 'VT323', monospace";
  ctx.textAlign = 'center';
  ctx.fillStyle = gs.txHasChoice ? C.amber : C.muted;
  ctx.fillText(header, W / 2, TX_TOP + 16);

  ctx.strokeStyle = 'rgba(122,112,136,0.35)';
  ctx.beginPath();
  ctx.moveTo(TX_PAD + 6, TX_TOP + 22);
  ctx.lineTo(TX_PAD + bw - 6, TX_TOP + 22);
  ctx.stroke();

  // content lines
  const lx = TX_PAD + 10;
  const ly = TX_TOP + 40;
  ctx.font      = "15px 'VT323', monospace";
  ctx.textAlign = 'left';

  for (let i = 0; i < gs.txLines.length; i++) {
    if (i > gs.txLine) break;
    const full      = gs.txLines[i];
    const isCurrent = i === gs.txLine;
    const text      = (isCurrent && !gs.txDone) ? full.slice(0, Math.floor(gs.txCh)) : full;

    if (text.length > 0) {
      let color = C.green;
      if      (text.startsWith('>>>'))  color = C.amber;
      else if (text.startsWith('[1]'))  color = C.cyan;
      else if (text.startsWith('[2]'))  color = C.pink;
      ctx.fillStyle = color;
      ctx.fillText(text, lx, ly + i * TX_LH);
    }

    if (isCurrent && !gs.txDone && Math.sin(t * 9) > 0) {
      const tw = text.length > 0 ? ctx.measureText(text).width : 0;
      ctx.fillStyle = C.green;
      ctx.fillRect(lx + tw + 1, ly + i * TX_LH - 13, 7, 14);
    }
  }

  // footer
  ctx.font      = "14px 'VT323', monospace";
  ctx.textAlign = 'center';
  if (gs.txDone && gs.txHasChoice) {
    const remaining = Math.ceil(12 - gs.txChoiceTimer);
    if (Math.sin(t * 3) > 0) {
      ctx.fillStyle = C.amber;
      ctx.fillText(`PRESS 1 OR 2  [ AUTO: ${remaining}s ]`, W / 2, TX_TOP + bh - 10);
    }
  } else if (gs.txDone) {
    if (Math.sin(t * 3) > 0) {
      ctx.fillStyle = C.muted;
      ctx.fillText('[ SPACE TO CONTINUE ]', W / 2, TX_TOP + bh - 10);
    }
  } else {
    ctx.fillStyle = 'rgba(122,112,136,0.5)';
    ctx.fillText('SPACE TO SKIP', W / 2, TX_TOP + bh - 10);
  }
  ctx.textAlign = 'left';
}

/* ── render ──────────────────────────────────────────────────────────── */
function render(ctx: CanvasRenderingContext2D, gs: GS, t: number) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  gs.stars.forEach(({ x, y, s }) => {
    ctx.fillStyle = s === 2 ? 'rgba(200,192,218,0.9)' : 'rgba(200,192,218,0.42)';
    ctx.fillRect(Math.floor(x), Math.floor(y), s, s);
  });

  gs.planets.forEach(planet => drawPlanet(ctx, planet));

  if (gs.phase === 'brief') { drawBrief(ctx, gs, t); return; }

  // gravity rocks
  gs.gravRocks.forEach(rock => {
    const deflFlash = rock.deflected && Math.sin(t * 14) > 0;
    const ringAlpha = rock.deflected ? 0.4 + 0.3 * Math.sin(t * 9) : 0.10 + 0.06 * Math.sin(t * 1.8);
    const ringRGB   = rock.deflected ? '0,229,255' : '247,199,106';
    ctx.strokeStyle = `rgba(${ringRGB},${ringAlpha})`;
    ctx.lineWidth   = rock.deflected ? 1.5 : 1;
    ctx.beginPath(); ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2); ctx.stroke();
    const rockColor = rock.deflected ? (deflFlash ? C.white : C.cyan) : C.amber;
    drawSpr(ctx, GRAV_SPR, rockColor, rock.x, rock.y, PX + 1);
    if (!rock.deflected && rock.x > 0 && rock.x < W && rock.y > 0 && rock.y < H) {
      ctx.fillStyle = `rgba(0,229,255,${0.45 + 0.35 * Math.sin(t * 5)})`;
      ctx.font      = "11px 'VT323', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('[ DEFLECT ]', rock.x, rock.y - (sprH(GRAV_SPR, PX + 1) / 2) - 5);
      ctx.textAlign = 'left';
    }
  });

  // UFO
  if (gs.ufo) {
    const flash = Math.sin(t * 9) > 0.5;
    drawSpr(ctx, UFO_SPR, flash ? C.pink : C.green, gs.ufo.x, gs.ufo.y);
  }

  // enemies
  gs.enemies.forEach(e => {
    const col   = eColor(e.kind, e.row);
    const flash = e.state === 'dive' && Math.sin(t * 13) > 0.55;
    drawSpr(ctx, eSpr(e.kind), flash ? C.white : col, e.x, e.y);
  });

  // station icon (wave 1 approach, top center, fades in when progress > 0.6)
  if (gs.missionKind === 'approach' && gs.stationProgress > 0.6) {
    const stAlpha = Math.min(1, (gs.stationProgress - 0.6) / 0.25);
    ctx.globalAlpha = stAlpha * (0.55 + 0.3 * Math.sin(t * 2.2));
    drawSpr(ctx, SPR.station, C.green, W / 2, 22, 2);
    ctx.globalAlpha = stAlpha;
    ctx.font      = "11px 'VT323', monospace";
    ctx.textAlign = 'center';
    ctx.fillStyle = C.green;
    ctx.fillText('NEO-7', W / 2, 40);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // bullets
  gs.bullets.forEach(b => {
    ctx.fillStyle = b.player ? C.cyan : C.red;
    const bw = PX, bh = b.player ? PX * 4 : PX * 2;
    ctx.fillRect(Math.floor(b.x - bw / 2), Math.floor(b.y - bh / 2), bw, bh);
  });

  // shield bubble
  if (gs.shieldT > 0) {
    ctx.strokeStyle = `rgba(0,229,255,${Math.min(1, gs.shieldT * 2.2)})`;
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.arc(gs.px, PY, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle   = `rgba(0,229,255,${gs.shieldT * 0.12})`;
    ctx.beginPath(); ctx.arc(gs.px, PY, 42, 0, Math.PI * 2); ctx.fill();
  }

  // blast ring
  if (gs.blastRing > 0) {
    ctx.strokeStyle = `rgba(102,242,165,${1 - gs.blastRing / 130})`;
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.arc(gs.px, PY, gs.blastRing, 0, Math.PI * 2); ctx.stroke();
  }

  // player
  if (gs.phase !== 'die' || gs.dieT > 1.2) {
    const blink = gs.invT > 0 && Math.sin(t * 12) > 0;
    if (!blink) {
      drawSpr(ctx, SPR.player, C.cyan, gs.px, PY);
      if (Math.sin(t * 22) > 0)
        drawSpr(ctx, SPR.thruster, C.pink, gs.px, PY + sprH(SPR.player) / 2 + PX, PX);
    }
  }

  // sparks
  gs.sparks.forEach(s => {
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle   = s.color;
    ctx.fillRect(Math.floor(s.x), Math.floor(s.y), PX, PX);
  });
  ctx.globalAlpha = 1;

  drawHUD(ctx, gs, t);
}

function drawHUD(ctx: CanvasRenderingContext2D, gs: GS, t: number) {
  ctx.font      = "16px 'VT323', monospace";
  ctx.textAlign = 'left';

  ctx.fillStyle = C.muted; ctx.fillText('SCORE', 8, 18);
  ctx.fillStyle = C.cyan;  ctx.fillText(String(gs.score), 8, 34);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted; ctx.fillText('HI-SCORE', W / 2, 18);
  ctx.fillStyle = C.amber; ctx.fillText(String(gs.hi), W / 2, 34);

  ctx.textAlign = 'right';
  ctx.fillStyle = C.muted; ctx.fillText(`WAVE ${gs.wave}`, W - 8, 18);

  ctx.font      = "13px 'VT323', monospace";
  ctx.fillStyle = gs.shieldCD <= 0 ? C.cyan  : C.muted;
  ctx.fillText(gs.shieldCD <= 0 ? '[X] SHIELD' : `[X] ${Math.ceil(gs.shieldCD)}s`, W - 8, 34);
  ctx.fillStyle = gs.blastCD  <= 0 ? C.green : C.muted;
  ctx.fillText(gs.blastCD  <= 0 ? '[C] BLAST'  : `[C] ${Math.ceil(gs.blastCD)}s`,  W - 8, 46);

  // wave 1 approach: dock progress in HUD
  if (gs.missionKind === 'approach' && (gs.phase === 'play' || gs.phase === 'die')) {
    const pct = Math.round(gs.stationProgress * 100);
    ctx.fillStyle = C.green;
    ctx.fillText(`DOCK: ${pct}%`, W - 8, 58);
  }

  ctx.font      = "16px 'VT323', monospace";
  ctx.textAlign = 'left';

  // lives
  for (let i = 0; i < gs.lives; i++)
    drawSpr(ctx, SPR.player, C.cyan, 14 + i * 16, H - 14, 2);

  // wave clear / dock complete banner
  if (gs.waveT > 0) {
    ctx.font      = "28px 'VT323', monospace";
    ctx.textAlign = 'center';
    const label = gs.missionKind === 'approach' ? 'DOCK COMPLETE' : 'SECTOR CLEAR';
    ctx.fillStyle = C.green;
    ctx.fillText(label, W / 2, H / 2 - 14);
    ctx.font      = "18px 'VT323', monospace";
    ctx.fillStyle = C.amber;
    ctx.fillText(`BONUS  +${Math.round(gs.wave * 500 * gs.activeProfile.bonusMult)}`, W / 2, H / 2 + 12);
    ctx.textAlign = 'left';
  }

  // deflect banner
  if (gs.deflectMsg > 0) {
    ctx.font      = "26px 'VT323', monospace";
    ctx.textAlign = 'center';
    ctx.fillStyle = C.cyan;
    ctx.globalAlpha = Math.min(1, gs.deflectMsg);
    ctx.fillText('DEFLECT!', W / 2, PY - 55);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // game over
  if (gs.phase === 'over') {
    ctx.font      = "32px 'VT323', monospace";
    ctx.textAlign = 'center';
    ctx.fillStyle = C.red;   ctx.fillText('GAME OVER', W / 2, H / 2 - 24);
    ctx.font      = "18px 'VT323', monospace";
    ctx.fillStyle = C.white; ctx.fillText(`SCORE  ${gs.score}`, W / 2, H / 2 + 8);
    if (Math.sin(t * 3) > 0) {
      ctx.fillStyle = C.muted;
      ctx.fillText('SPACE  TO  RETRY', W / 2, H / 2 + 34);
    }
    ctx.textAlign = 'left';
  }
}

/* ── component ───────────────────────────────────────────────────────── */
export default function GameCanvas() {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const sidebarRef     = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const navigate       = useNavigate();
  const gsRef          = useRef<GS>(introGame());

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const onDown = (e: KeyboardEvent) => {
      e.preventDefault();
      gsRef.current.keys.add(e.key);
      if (e.key === 'Escape') navigate('/');

      if ((e.key === ' ' || e.key === 'Enter') && gsRef.current.phase === 'over')
        gsRef.current = newGame(1, 0, gsRef.current.hi, 3);

      if ((e.key === ' ' || e.key === 'Enter') && gsRef.current.phase === 'brief') {
        const gs = gsRef.current;
        if (!gs.txDone) {
          gs.txLine = gs.txLines.length - 1;
          gs.txCh   = gs.txLines[gs.txLine].length;
          gs.txDone = true;
        } else if (!gs.txHasChoice) {
          if (gs.txIsIntro) gs.phase = 'play';
          else Object.assign(gs, newGame(gs.wave + 1, gs.score, gs.hi, gs.lives, gs.activeProfile));
        }
      }

      if ((e.key === '1' || e.key === '2') && gsRef.current.phase === 'brief') {
        const gs = gsRef.current;
        if (gs.txHasChoice && gs.txDone && gs.txProfiles) {
          const profile = gs.txProfiles[e.key === '1' ? 0 : 1];
          Object.assign(gs, newGame(gs.wave + 1, gs.score, gs.hi, gs.lives, profile));
        }
      }

      if (e.key === 'x' || e.key === 'X') tryShield(gsRef.current);
      if (e.key === 'c' || e.key === 'C') tryBlast(gsRef.current);
    };
    const onUp = (e: KeyboardEvent) => gsRef.current.keys.delete(e.key);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);

    let last = performance.now();
    let raf  = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = gsRef.current;
      if (g.phase === 'play' || g.phase === 'die' || g.phase === 'brief') update(g, dt);
      else { tickStars(g, dt); tickSparks(g, dt); }
      render(ctx, g, now / 1000);

      // sidebar progress bar (DOM, no React re-render)
      if (sidebarRef.current && progressFillRef.current) {
        const show = g.missionKind === 'approach' && (g.phase === 'play' || g.phase === 'die');
        sidebarRef.current.style.display = show ? 'flex' : 'none';
        if (show) {
          progressFillRef.current.style.height = `${Math.round(g.stationProgress * 100)}%`;
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup',   onUp);
    };
  }, [navigate]);

  return (
    <div className="game-wrap">
      <div className="game-row">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          className="game-canvas"
          onTouchEnd={() => {
            const gs = gsRef.current;
            gs.keys.add(' ');
            setTimeout(() => gs.keys.delete(' '), 80);
          }}
        />
        <div ref={sidebarRef} className="station-sidebar">
          <div className="sidebar-title">NEO-7</div>
          <div className="progress-track">
            <div ref={progressFillRef} className="progress-fill" style={{ height: '0%' }} />
          </div>
          <div className="sidebar-sub">DOCK</div>
        </div>
      </div>
      <div className="touch-controls" aria-hidden="true">
        <div className="touch-group">
          <p className="touch-group-label">Move</p>
          <div className="touch-row">
            <button
              className="touch-btn"
              onTouchStart={e => { e.preventDefault(); gsRef.current.keys.add('ArrowLeft'); }}
              onTouchEnd={() => gsRef.current.keys.delete('ArrowLeft')}
              onTouchCancel={() => gsRef.current.keys.delete('ArrowLeft')}
            >←</button>
            <button
              className="touch-btn"
              onTouchStart={e => { e.preventDefault(); gsRef.current.keys.add('ArrowRight'); }}
              onTouchEnd={() => gsRef.current.keys.delete('ArrowRight')}
              onTouchCancel={() => gsRef.current.keys.delete('ArrowRight')}
            >→</button>
          </div>
        </div>
        <div className="touch-group">
          <p className="touch-group-label">Briefing choice</p>
          <div className="touch-row">
            <button
              className="touch-btn touch-btn-choice"
              onTouchEnd={() => { gsRef.current.keys.add('1'); setTimeout(() => gsRef.current.keys.delete('1'), 80); }}
            >1</button>
            <button
              className="touch-btn touch-btn-choice"
              onTouchEnd={() => { gsRef.current.keys.add('2'); setTimeout(() => gsRef.current.keys.delete('2'), 80); }}
            >2</button>
          </div>
        </div>
        <div className="touch-group">
          <p className="touch-group-label">Actions</p>
          <div className="touch-row">
            <button
              className="touch-btn touch-btn-fire"
              onTouchStart={e => { e.preventDefault(); gsRef.current.keys.add('z'); }}
              onTouchEnd={() => gsRef.current.keys.delete('z')}
              onTouchCancel={() => gsRef.current.keys.delete('z')}
            >FIRE</button>
            <button
              className="touch-btn touch-btn-ability"
              onTouchEnd={() => tryShield(gsRef.current)}
            >SHIELD</button>
            <button
              className="touch-btn touch-btn-ability"
              onTouchEnd={() => tryBlast(gsRef.current)}
            >BLAST</button>
          </div>
        </div>
      </div>
      <p className="touch-hint">tap screen to skip · continue briefing</p>
      <p className="game-hint">← → MOVE &nbsp;&nbsp; Z SHOOT &nbsp;&nbsp; X SHIELD &nbsp;&nbsp; C BLAST &nbsp;&nbsp; ESC MENU</p>
    </div>
  );
}
