import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { supabase } from '../lib/supabase';
import { submitScore, fetchTopScores } from '../lib/scores';

/* ── callsign generator ──────────────────────────────────────────────── */
const CALL_PREFIX = [
  'NOVA', 'STAR', 'DARK', 'VOID', 'IRON', 'NEON', 'FLUX',
  'SOLAR', 'COMET', 'ORBIT', 'LUNAR', 'CYBER', 'ULTRA', 'STORM',
];
const CALL_SUFFIX = [
  'WOLF', 'HAWK', 'ACE', 'FOX', 'REX',
  'VEGA', 'VIPER', 'GHOST', 'BLADE', 'LANCE',
];
function randomCallsign(): string {
  const p = CALL_PREFIX[Math.floor(Math.random() * CALL_PREFIX.length)];
  const s = CALL_SUFFIX[Math.floor(Math.random() * CALL_SUFFIX.length)];
  return `${p} ${s}`;
}

/* ── canvas dimensions ───────────────────────────────────────────────── */
const W = 420;
const H = 560;
const PX = 3; // one game pixel = 3 canvas pixels

/* ── gameplay constants ──────────────────────────────────────────────── */
const PY = H - 52;       // player y center
const P_SPD = 170;       // player move speed px/s
const B_SPD = -300;      // player bullet speed px/s (up)
const EB_SPD = 150;      // enemy bullet speed px/s (down)
const MAX_BULLETS    = 3;
const DOCK_TOL       = 44;   // px from center counted as aligned
const DOCK_HOLD_TIME = 2.2;  // seconds to hold alignment for successful dock
const ASCENT_DURATION = 1.8; // seconds for rocket ascent animation


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
  '>>> NEO CONTROL  //  INCOMING TRANSMISSION',
  '',
  'SPACE CADET. THIS IS NEO CONTROL.',
  '',
  'TODAY\'S OBJECTIVE: ROUTINE SUPPLY RUN TO NEO-7.',
  'THE AUTOPILOT IS BROKEN, WHICH IS',
  'THE ONLY REASON WE CALLED YOU.',
  '',
  'THE STATION IS DIRECTLY AHEAD.',
  'CAN\'T MISS IT. SERIOUSLY THOUGH,',
  'PLEASE DO NOT HIT IT. DAMAGE DONE',
  'TO THE DOCK WILL BE DEDUCTED FROM',
  'YOUR PAY.',
  '',
  'GOOD LUCK. MISSION CONTROL OUT.',
];

const TRANSMISSIONS: WaveBrief[] = [
  { // wave 1 → wave 2: route choice
    lines: [
      '>>> NEO CONTROL  //  PRIORITY ADVISORY',
      '',
      'SPACE CADET.',
      '',
      'YOU\'VE ENTERED SECTOR 7-G WITHOUT',
      'TRANSIT CLEARANCE. THOSE DRONES',
      'WERE TRAFFIC ENFORCEMENT... YOU',
      'DESTROYED ELEVEN... AND IT\'S ALL ON',
      'SECURITY FOOTAGE. THEY\'VE ESCALATED',
      'TO THE GALACTIC TRANSIT AUTHORITY.',
      '',
      'TWO ESCAPE VECTORS. CHOOSE:',
      '',
      '[1] GRAVITY FIELD APPROACH',
      '    DENSE ROCKS. STRONG PULL.',
      '    LOSE THEM IN THE ASTEROID WAKE.',
      '',
      '[2] HIGH-VELOCITY CORRIDOR',
      '    FAST ROCKS. LIGHTER GRAVITY.',
      '    FASTER. ALSO INSANE.  +30% BONUS.',
    ],
    profiles: [
      { gravMass: 2.2, rockSpeed: 0.7,  diveFreq: 0.5, ufoFreq: 1,   bonusMult: 1   },
      { gravMass: 0.5, rockSpeed: 1.6,  diveFreq: 1.8, ufoFreq: 1,   bonusMult: 1.3 },
    ],
  },
  { // wave 2 → wave 3
    lines: [
      '>>> NEO CONTROL  //  REROUTING',
      '',
      'SPACE CADET.',
      '',
      'DUE TO THE SECTOR 7-G INCIDENT,',
      'YOUR STANDARD RETURN PATH IS NOW',
      'A CRIME SCENE.',
      '',
      'WE\'RE ROUTING YOU THROUGH THE',
      'VELON-4 CORRIDOR. VELON-4 IS A',
      'LARGE PLANET. IT HAS SIGNIFICANT',
      'GRAVITY.',
      '',
      'THE TEXTBOOK RESPONSE IS A HOHMANN',
      'TRANSFER ORBIT. YOU DIDN\'T STUDY',
      'FOR THAT EXAM.',
      '',
      'JUST DON\'T FLY INTO IT.',
      'THE ROCKS WILL DO THE REST.',
      '',
      'P.S. YOUR GTA FILE HAS BEEN UPGRADED',
      'FROM "INCIDENT" TO "ONGOING MATTER."',
    ],
  },
  { // wave 3 → wave 4: tactical choice
    lines: [
      '>>> NEO CONTROL  //  INTEL UPDATE',
      '',
      'SPACE CADET.',
      '',
      'FORMAL COMPLAINTS RECEIVED FROM',
      'THE GTA, TWO MERCENARY GUILDS,',
      'AND THE VELON NEIGHBORHOOD COALITION.',
      'THEY\'VE POOLED RESOURCES.',
      '',
      'SOMEONE HERE IS RUNNING A BETTING',
      'POOL ON YOUR SURVIVAL. NOT SAYING',
      'WHO. CURRENT ODDS: 3 TO 1. AGAINST.',
      '',
      '[1] DIRECT INTERCEPT',
      '    HIGH UFO PRESENCE. MORE RISK.',
      '    SHOW THEM YOU MEAN IT.  +50%.',
      '',
      '[2] STEALTH CORRIDOR',
      '    REDUCED ENEMY PRESENCE.',
      '    QUIETER. SUSPICIOUS.',
    ],
    profiles: [
      { gravMass: 1,   rockSpeed: 1,    diveFreq: 0.5, ufoFreq: 2.5, bonusMult: 1.5 },
      { gravMass: 1,   rockSpeed: 0.85, diveFreq: 1.8, ufoFreq: 1,   bonusMult: 1   },
    ],
  },
  { // wave 4 → wave 5
    lines: [
      '>>> NEO CONTROL  //  MEDIA ALERT',
      '',
      'SPACECADET. YOU\'RE ON THE NEWS.',
      '',
      'HEADLINE: "UNIDENTIFIED SHIP',
      'TERRORIZES OUTER SECTORS —',
      'BELIEVED TO BE MALFUNCTIONING."',
      '',
      'THEY DON\'T KNOW YOU\'RE A PERSON.',
      'I HAVE CHOSEN NOT TO CORRECT THEM.',
      '',
      'BACKUP CANNOT REACH YOU IN TIME.',
      'PLEASE CONTINUE MALFUNCTIONING.',
      '              — MISSION CONTROL',
    ],
  },
  { // wave 5 → wave 6: final choice
    lines: [
      '>>> [OPEN CHANNEL]  NEO CONTROL',
      '',
      'SPACE CADET.',
      '',
      'YOU KNOW WHAT YOU\'RE DOING BY NOW.',
      'OR YOU DON\'T AND IT\'S WORKING.',
      'SAME THING.',
      '',
      'THE GUILDS ARE ROUTING FOR YOU.',
      'THE POOL IS IN YOUR FAVOR.',
      '',
      'FINAL APPROACH. YOUR CALL:',
      '',
      '[1] FORCE THROUGH',
      '    EXTREME CONDITIONS.',
      '    MAXIMUM RISK.  +100% BONUS.',
      '',
      '[2] WORK THE ANGLES',
      '    NEAR-ZERO GRAVITY. PRECISION.',
      '    STILL INSANE. STANDARD REWARD.',
    ],
    profiles: [
      { gravMass: 3.5,  rockSpeed: 1,  diveFreq: 1, ufoFreq: 1, bonusMult: 2.0 },
      { gravMass: 0.25, rockSpeed: 1,  diveFreq: 1, ufoFreq: 1, bonusMult: 1   },
    ],
  },
  { // wave 6+
    lines: [
      '>>> [OPEN CHANNEL]  UNKNOWN ORIGIN',
      '',
      'TO THE SPACE CADET:',
      '',
      'WE FILED THE COMPLAINT.',
      'WE WITHDREW THE COMPLAINT.',
      'WE ARE NOW ROUTING FOR YOU.',
      '',
      '>>> [NEO CONTROL]',
      'SAME. KEEP GOING.',
    ],
  },
];

/* ── types ───────────────────────────────────────────────────────────── */
type Phase  = 'play' | 'die' | 'over' | 'brief';
type EK     = 0 | 1 | 2;          // 0 = rock · 1 = alien · 2 = boss
type EMove  = 'drift' | 'sweep' | 'swoop' | 'chase';

interface Enemy {
  id: number; kind: EK; row: number; col: number;
  x: number; y: number;
  vx: number; vy: number;
  move: EMove;
  t: number;        // time alive (s) — drives sweep sine
  amp: number;      // sweep amplitude (px)
  freq: number;     // sweep frequency (rad/s)
  originX: number;  // sweep reference X
  shootCD: number;  // seconds until next shot
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
  waveT:   number;
  dieT:    number;
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
  stationProgress: number;
  dockSeq:         boolean;
  dockLock:        number;
  dockAscent:      number;
  totalEnemies:    number;
  scoreLog:        ScoreEvent[];
  activeProfile:   PhysicsProfile;
}

interface ScoreEvent {
  label: string;
  pts:   number;
  age:   number;
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
function buildWave(wave: number, profile: PhysicsProfile = DEFAULT_PROFILE): Enemy[] {
  const count = Math.min(6 + wave * 3, 24);
  const arr: Enemy[] = [];
  const allMoves: EMove[] = ['drift', 'drift', 'sweep', 'swoop', 'chase'];
  if (wave >= 3) allMoves.push('chase', 'swoop');
  if (wave >= 5) allMoves.push('chase', 'chase');

  for (let i = 0; i < count; i++) {
    const rng  = Math.random();
    const kind: EK = rng < 0.12 + wave * 0.03 ? 2 : rng < 0.35 + wave * 0.02 ? 1 : 0;
    const row  = kind === 2 ? 0 : kind === 1 ? 1 : Math.floor(Math.random() * 2) + 2;
    const move = allMoves[Math.floor(Math.random() * allMoves.length)];
    const baseSpd = (42 + wave * 9 + Math.random() * 18) * profile.rockSpeed;

    // all enemies enter from top, staggered
    const x = 16 + Math.random() * (W - 32);
    const y = -30 - i * 22;

    let vx = 0;
    let vy = baseSpd * 0.5;
    if (move === 'drift') {
      vx = (Math.random() - 0.5) * baseSpd * 0.85;
      vy = baseSpd * (0.35 + Math.random() * 0.3);
    } else if (move === 'swoop') {
      vx = (Math.random() > 0.5 ? 1 : -1) * baseSpd * 0.65;
      vy = baseSpd * 0.28;
    }

    arr.push({
      id: i, kind, row, col: i % 10,
      x, y, vx, vy,
      move, t: 0,
      amp:     28 + Math.random() * 36,
      freq:    1.0 + Math.random() * 1.4,
      originX: x,
      shootCD: 2 + Math.random() * 5,
      pts:  kind === 2 ? 50  : kind === 1 ? 20 : 10,
      dpts: kind === 2 ? 150 : kind === 1 ? 60 : 30,
    });
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
  };
}

function newGame(
  wave    = 1,
  score   = 0,
  hi      = 0,
  lives   = 3,
  profile: PhysicsProfile = DEFAULT_PROFILE,
): GS {
  const enemies = buildWave(wave, profile);
  return {
    phase: 'play', score, hi, lives, wave,
    px: W / 2, invT: 2, shootT: 0,
    waveT: 0, dieT: 0,
    enemies, sparks: [],
    bullets: [],
    stars: mkStars(), keys: new Set(), seq: 1000,
    ufo: null, ufoT: (15 + Math.random() * 8) * profile.ufoFreq,
    gravRocks: [mkRock(0, profile), mkRock(1, profile)],
    spawnRockT: 5 + Math.random() * 3,
    planets: [], spawnPlanetT: 6,
    txLines: [], txLine: 0, txCh: 0, txDone: false, txWait: 0,
    txIsIntro: false, txHasChoice: false, txProfiles: null, txChoiceTimer: 0,
    missionKind:     wave === 1 ? 'approach' : 'eliminate',
    stationProgress: 0,
    dockSeq:         false,
    dockLock:        0,
    dockAscent:      0,
    totalEnemies:    enemies.length,
    scoreLog:        [],
    activeProfile:   profile,
  };
}

function logScore(gs: GS, label: string, pts: number) {
  gs.scoreLog.unshift({ label, pts, age: 0 });
  if (gs.scoreLog.length > 8) gs.scoreLog.length = 8;
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
      const uPts = Math.round(u.pts * gs.activeProfile.bonusMult);
      gs.score += uPts;
      gs.hi    = Math.max(gs.hi, gs.score);
      logScore(gs, 'UFO', uPts);
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
        usedB.add(b.id);
        burst(gs, rock.x, rock.y, C.cyan, 10);
        break;
      }
    }
  });
  gs.bullets = gs.bullets.filter(b => !usedB.has(b.id));

  gs.gravRocks = gs.gravRocks.filter(rock => {
    rock.x += rock.vx * dt; rock.y += rock.vy * dt;
    if (rock.x < -80 || rock.x > W + 80 || rock.y < -80 || rock.y > H + 80) return false;

    if (gs.invT <= 0) {
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
      const dx = planet.x - e.x, dy = planet.y - e.y;
      const dist = Math.max(planet.radius * 0.4, Math.sqrt(dx * dx + dy * dy));
      if (dist < infR) {
        const f = planet.mass * 0.08 * (infR - dist) / (infR * dist);
        e.x = Math.max(12, Math.min(W - 12, e.x + dx * f * dt));
        e.y += dy * f * dt;
      }
    }

    gs.bullets = gs.bullets.filter(b => {
      const dx = planet.x - b.x, dy = planet.y - b.y;
      return dx * dx + dy * dy > planet.radius * planet.radius;
    });

    return true;
  });
}


/* ── update ──────────────────────────────────────────────────────────── */
function tickStars(gs: GS, dt: number) {
  const speedMult = gs.dockSeq ? 0.22 : 1;
  gs.stars.forEach(s => {
    s.y += (0.5 + s.s * 0.25) * dt * 30 * speedMult;
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
    }
    // player must actively continue — no auto-advance
    tickStars(gs, dt); tickPlanets(gs, dt);
    return;
  }

  gs.scoreLog.forEach(e => { e.age += dt; });

  /* ── individual enemy movement ── */
  gs.enemies.forEach(e => {
    e.t += dt;
    switch (e.move) {
      case 'drift':
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.x < 12)     { e.x = 12;     e.vx =  Math.abs(e.vx); }
        if (e.x > W - 12) { e.x = W - 12; e.vx = -Math.abs(e.vx); }
        break;
      case 'sweep':
        e.x  = Math.max(12, Math.min(W - 12, e.originX + Math.sin(e.t * e.freq) * e.amp));
        e.y += e.vy * dt;
        break;
      case 'swoop':
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vy = Math.min(e.vy + 28 * dt, 200);
        if (e.x < 12)     { e.x = 12;     e.vx =  Math.abs(e.vx) * 0.8; }
        if (e.x > W - 12) { e.x = W - 12; e.vx = -Math.abs(e.vx) * 0.8; }
        break;
      case 'chase': {
        const dx = gs.px - e.x;
        e.vx = Math.max(-110, Math.min(110, e.vx + Math.sign(dx) * Math.min(Math.abs(dx), 60) * dt));
        e.x  = Math.max(12, Math.min(W - 12, e.x + e.vx * dt));
        e.y += e.vy * dt;
        break;
      }
    }
    // wrap: if enemy exits bottom, re-enter from top
    if (e.y > H + 40) {
      e.y = -30; e.x = 16 + Math.random() * (W - 32);
      e.originX = e.x; e.t = 0;
    }
  });

  /* ── player move ── */
  gs.invT = Math.max(0, gs.invT - dt);
  if (gs.dockAscent <= 0) {
    if (gs.keys.has('ArrowLeft')  || gs.keys.has('a')) gs.px = Math.max(14, gs.px - P_SPD * dt);
    if (gs.keys.has('ArrowRight') || gs.keys.has('d')) gs.px = Math.min(W - 14, gs.px + P_SPD * dt);
  }

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
        const awarded = Math.round((e.y > H * 0.55 ? e.dpts : e.pts) * gs.activeProfile.bonusMult);
        gs.score += awarded;
        gs.hi = Math.max(gs.hi, gs.score);
        logScore(gs, e.kind === 2 ? 'BOSS' : e.kind === 1 ? 'FIGHTER' : 'DRONE', awarded);
        killedEnemies.add(e.id);
        usedBullets.add(b.id);
      }
    }
  }
  gs.enemies = gs.enemies.filter(e => !killedEnemies.has(e.id));
  gs.bullets = gs.bullets.filter(b => !usedBullets.has(b.id));

  /* ── station approach: progress mirrors enemy clearing ── */
  if (gs.missionKind === 'approach' && !gs.dockSeq && gs.totalEnemies > 0) {
    gs.stationProgress = 1 - gs.enemies.length / gs.totalEnemies;
  }

  /* ── enemy bullets → player ── */
  if (gs.invT <= 0) {
    const pw = sprW(SPR.player), ph = sprH(SPR.player);
    for (const b of gs.bullets) {
      if (b.player) continue;
      if (hit(b.x, b.y, PX, PX * 2, gs.px, PY, pw, ph)) { killPlayer(gs); break; }
    }
  }

  /* ── enemies → player collision ── */
  if (gs.invT <= 0) {
    const pw = sprW(SPR.player), ph = sprH(SPR.player);
    for (let i = gs.enemies.length - 1; i >= 0; i--) {
      const e = gs.enemies[i];
      const sp = eSpr(e.kind);
      if (hit(e.x, e.y, sprW(sp), sprH(sp), gs.px, PY, pw, ph)) {
        burst(gs, e.x, e.y, eColor(e.kind, e.row));
        gs.enemies.splice(i, 1);
        killPlayer(gs);
        break;
      }
    }
  }

  /* ── enemy shoot ── */
  gs.enemies.forEach(e => {
    e.shootCD -= dt;
    if (e.shootCD <= 0) {
      gs.bullets.push({ id: gs.seq++, x: e.x, y: e.y + 8, vx: 0, vy: EB_SPD, player: false });
      e.shootCD = 2.5 + Math.random() * 4.5;
    }
  });

  /* ── docking sequence: trigger when all enemies cleared ── */
  if (gs.missionKind === 'approach' && !gs.dockSeq && gs.enemies.length === 0) {
    gs.dockSeq      = true;
    gs.stationProgress = 1;
    gs.bullets      = gs.bullets.filter(b => b.player);
    gs.planets      = [];
    gs.gravRocks    = [];
    gs.ufo          = null;
    gs.ufoT         = 999;
    gs.spawnPlanetT = 999;
    gs.spawnRockT   = 999;
  }
  if (gs.dockSeq && gs.dockAscent <= 0) {
    const aligned = Math.abs(gs.px - W / 2) <= DOCK_TOL;
    gs.dockLock = aligned
      ? Math.min(DOCK_HOLD_TIME, gs.dockLock + dt)
      : Math.max(0, gs.dockLock - dt * 1.5);
  }
  /* ── dock ascent: rocket flies up to station ── */
  if (gs.dockSeq && gs.dockLock >= DOCK_HOLD_TIME && gs.dockAscent < 1) {
    gs.dockAscent = Math.min(1, gs.dockAscent + dt / ASCENT_DURATION);
    gs.px += (W / 2 - gs.px) * Math.min(1, dt * 10);
  }

  /* ── wave clear ── */
  const waveClear = gs.missionKind === 'approach'
    ? gs.dockSeq && gs.dockAscent >= 1
    : gs.enemies.length === 0;

  if (waveClear && gs.waveT <= 0) {
    const wBonus = Math.round(gs.wave * 500 * gs.activeProfile.bonusMult);
    gs.score += wBonus;
    gs.hi     = Math.max(gs.hi, gs.score);
    logScore(gs, 'WAVE BONUS', wBonus);
    gs.waveT  = 2.5;
  }

  if (!gs.dockSeq) {
    tickUFO(gs, dt);
    tickGravRocks(gs, dt);
    tickPlanets(gs, dt);
  }
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

function drawBrief(ctx: CanvasRenderingContext2D, gs: GS, t: number, isTouch: boolean) {
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
      : '── INCOMING TRANSMISSION ──';

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

  // footer buttons
  ctx.font      = "15px 'VT323', monospace";
  ctx.textAlign = 'center';
  ctx.lineWidth = 1;
  const btnBottom = TX_TOP + bh - 8;

  if (gs.txDone && gs.txHasChoice) {
    const btnH = 28, btnW = 82, gap = 10;
    const bx1  = W / 2 - btnW - gap / 2;
    const bx2  = W / 2 + gap / 2;
    const by   = btnBottom - btnH;

    ctx.fillStyle = 'rgba(0,229,255,0.10)';
    ctx.fillRect(bx1, by, btnW, btnH);
    ctx.strokeStyle = C.cyan;
    ctx.strokeRect(bx1, by, btnW, btnH);
    ctx.fillStyle = C.cyan;
    ctx.fillText('[ 1 ]', bx1 + btnW / 2, by + 20);

    ctx.fillStyle = 'rgba(255,79,216,0.10)';
    ctx.fillRect(bx2, by, btnW, btnH);
    ctx.strokeStyle = C.pink;
    ctx.strokeRect(bx2, by, btnW, btnH);
    ctx.fillStyle = C.pink;
    ctx.fillText('[ 2 ]', bx2 + btnW / 2, by + 20);

  } else if (gs.txDone) {
    const btnH = 28, btnW = 172;
    const bx   = W / 2 - btnW / 2;
    const by   = btnBottom - btnH;
    ctx.fillStyle = 'rgba(102,242,165,0.10)';
    ctx.fillRect(bx, by, btnW, btnH);
    ctx.strokeStyle = C.green;
    ctx.strokeRect(bx, by, btnW, btnH);
    ctx.fillStyle = C.green;
    ctx.fillText(isTouch ? 'TAP TO CONTINUE' : 'SPACE TO CONTINUE', W / 2, by + 20);

  } else {
    const btnH = 24, btnW = 130;
    const bx   = W / 2 - btnW / 2;
    const by   = btnBottom - btnH;
    ctx.fillStyle = 'rgba(122,112,136,0.07)';
    ctx.fillRect(bx, by, btnW, btnH);
    ctx.strokeStyle = 'rgba(122,112,136,0.28)';
    ctx.strokeRect(bx, by, btnW, btnH);
    ctx.fillStyle = 'rgba(122,112,136,0.6)';
    ctx.fillText(isTouch ? 'TAP TO SKIP' : 'SPACE TO SKIP', W / 2, by + 17);
  }
  ctx.textAlign = 'left';
}

/* ── render ──────────────────────────────────────────────────────────── */
function render(ctx: CanvasRenderingContext2D, gs: GS, t: number, isTouch: boolean) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  gs.stars.forEach(({ x, y, s }) => {
    ctx.fillStyle = s === 2 ? 'rgba(200,192,218,0.9)' : 'rgba(200,192,218,0.42)';
    ctx.fillRect(Math.floor(x), Math.floor(y), s, s);
  });

  gs.planets.forEach(planet => drawPlanet(ctx, planet));

  if (gs.phase === 'brief') { drawBrief(ctx, gs, t, isTouch); return; }

  // gravity rocks
  gs.gravRocks.forEach(rock => {
    const ringAlpha = 0.10 + 0.06 * Math.sin(t * 1.8);
    ctx.strokeStyle = `rgba(247,199,106,${ringAlpha})`;
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2); ctx.stroke();
    drawSpr(ctx, GRAV_SPR, C.amber, rock.x, rock.y, PX + 1);
  });

  // UFO
  if (gs.ufo) {
    const flash = Math.sin(t * 9) > 0.5;
    drawSpr(ctx, UFO_SPR, flash ? C.pink : C.green, gs.ufo.x, gs.ufo.y);
  }

  // enemies
  gs.enemies.forEach(e => {
    const col   = eColor(e.kind, e.row);
    const flash = e.y > H * 0.55 && Math.sin(t * 13) > 0.55;
    const bob   = Math.sin(t * 1.1 + e.col * 0.45) * 2.5;
    drawSpr(ctx, eSpr(e.kind), flash ? C.white : col, e.x, e.y + bob);
  });

  // station icon — fades in during approach, grows during docking sequence
  if (gs.missionKind === 'approach') {
    if (gs.dockSeq) {
      const prog  = gs.dockLock / DOCK_HOLD_TIME;
      const scale = 2 + prog * 2.5;
      const yPos  = 22 + prog * 55;
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 8);
      drawSpr(ctx, SPR.station, C.green, W / 2, yPos, scale);
      ctx.globalAlpha = 1;
    } else if (gs.stationProgress > 0.6) {
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
  }

  // bullets
  gs.bullets.forEach(b => {
    ctx.fillStyle = b.player ? C.cyan : C.red;
    const bw = PX, bh = b.player ? PX * 4 : PX * 2;
    ctx.fillRect(Math.floor(b.x - bw / 2), Math.floor(b.y - bh / 2), bw, bh);
  });

  // player
  if (gs.phase !== 'die' || gs.dieT > 1.2) {
    const blink = gs.invT > 0 && Math.sin(t * 12) > 0;
    if (!blink) {
      const playerY = gs.dockAscent > 0 ? PY - (PY - 45) * gs.dockAscent : PY;
      drawSpr(ctx, SPR.player, C.cyan, gs.px, playerY);
      if (gs.dockAscent > 0 || Math.sin(t * 22) > 0)
        drawSpr(ctx, SPR.thruster, C.pink, gs.px, playerY + sprH(SPR.player) / 2 + PX, PX);
    }
  }

  // sparks
  gs.sparks.forEach(s => {
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle   = s.color;
    ctx.fillRect(Math.floor(s.x), Math.floor(s.y), PX, PX);
  });
  ctx.globalAlpha = 1;

  // docking alignment overlay (hidden once ascent begins)
  if (gs.missionKind === 'approach' && gs.dockSeq && gs.dockAscent <= 0) {
    const cx      = W / 2;
    const aligned = Math.abs(gs.px - cx) <= DOCK_TOL;
    const lockPct = gs.dockLock / DOCK_HOLD_TIME;

    // dim everything outside the corridor
    ctx.fillStyle = 'rgba(7,6,14,0.55)';
    ctx.fillRect(0, 0, cx - DOCK_TOL, H);
    ctx.fillRect(cx + DOCK_TOL, 0, W - (cx + DOCK_TOL), H);

    // corridor walls
    ctx.strokeStyle = aligned ? 'rgba(102,242,165,0.85)' : 'rgba(247,199,106,0.75)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(cx - DOCK_TOL, 0); ctx.lineTo(cx - DOCK_TOL, H);
    ctx.moveTo(cx + DOCK_TOL, 0); ctx.lineTo(cx + DOCK_TOL, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // center hairline
    ctx.strokeStyle = 'rgba(102,242,165,0.15)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // status text
    ctx.font      = "20px 'VT323', monospace";
    ctx.textAlign = 'center';
    ctx.fillStyle = aligned ? C.green : C.amber;
    ctx.fillText(aligned ? 'HOLDING ALIGNMENT' : 'ALIGN FOR DOCK', cx, PY - 44);

    // direction nudge
    if (!aligned) {
      ctx.font        = "15px 'VT323', monospace";
      ctx.fillStyle   = C.amber;
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 5);
      ctx.fillText(gs.px < cx ? '→  MOVE RIGHT' : 'MOVE LEFT  ←', cx, PY - 26);
      ctx.globalAlpha = 1;
    }

    // dock-lock meter
    const mW = 130, mH = 8;
    const mx = cx - mW / 2, my = PY + 32;
    ctx.fillStyle   = 'rgba(102,242,165,0.07)';
    ctx.fillRect(mx, my, mW, mH);
    ctx.strokeStyle = 'rgba(102,242,165,0.25)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(mx, my, mW, mH);
    if (lockPct > 0) {
      ctx.fillStyle = aligned ? C.green : 'rgba(102,242,165,0.35)';
      ctx.fillRect(mx, my, Math.round(mW * lockPct), mH);
    }
    ctx.font      = "13px 'VT323', monospace";
    ctx.fillStyle = aligned ? C.green : C.muted;
    ctx.fillText('DOCK LOCK', cx, my - 4);
    ctx.textAlign = 'left';
  }

  // ascent message
  if (gs.missionKind === 'approach' && gs.dockAscent > 0 && gs.dockAscent < 1) {
    ctx.font      = "22px 'VT323', monospace";
    ctx.textAlign = 'center';
    ctx.fillStyle = C.green;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
    ctx.fillText('DOCKING…', W / 2, PY - 30);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawHUD(ctx, gs);
}

function drawHUD(ctx: CanvasRenderingContext2D, gs: GS) {
  ctx.font      = "16px 'VT323', monospace";
  ctx.textAlign = 'left';

  ctx.fillStyle = C.muted; ctx.fillText('SCORE', 8, 18);
  ctx.fillStyle = C.cyan;  ctx.fillText(String(gs.score), 8, 34);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted; ctx.fillText('HI-SCORE', W / 2, 18);
  ctx.fillStyle = C.amber; ctx.fillText(String(gs.hi), W / 2, 34);

  ctx.textAlign = 'right';
  ctx.fillStyle = C.muted; ctx.fillText(`WAVE ${gs.wave}`, W - 8, 18);

  // mission progress in HUD
  if (gs.phase === 'play' || gs.phase === 'die') {
    ctx.font = "13px 'VT323', monospace";
    const pct = gs.missionKind === 'approach'
      ? Math.round(gs.stationProgress * 100)
      : gs.totalEnemies > 0 ? Math.round((1 - gs.enemies.length / gs.totalEnemies) * 100) : 0;
    const label = gs.missionKind === 'approach' ? 'DOCK' : 'ELIM';
    ctx.fillStyle = C.green;
    ctx.fillText(`${label}: ${pct}%`, W - 8, 34);
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

}

/* ── component ───────────────────────────────────────────────────────── */
export default function GameCanvas() {
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const sidebarRef       = useRef<HTMLDivElement>(null);
  const progressFillRef  = useRef<HTMLDivElement>(null);
  const choiceOverlayRef = useRef<HTMLDivElement>(null);
  const hudControlsRef   = useRef<HTMLDivElement>(null);
  const lbOverlayRef     = useRef<HTMLDivElement>(null);
  const lbScoreRef       = useRef<HTMLParagraphElement>(null);
  const lbNameSectionRef = useRef<HTMLDivElement>(null);
  const lbBoardRef       = useRef<HTMLDivElement>(null);
  const lbInputRef       = useRef<HTMLInputElement>(null);
  const lbListRef        = useRef<HTMLOListElement>(null);
  const lbSubmitRef      = useRef<HTMLButtonElement>(null);
  const lbRetryRef       = useRef<HTMLButtonElement>(null);
  const lbRandomRef      = useRef<HTMLButtonElement>(null);
  const lbCapturedRef    = useRef({ score: 0, wave: 1 });
  // desktop panel refs
  const deskScoreRef     = useRef<HTMLSpanElement>(null);
  const deskHiRef        = useRef<HTMLSpanElement>(null);
  const deskWaveRef      = useRef<HTMLSpanElement>(null);
  const deskMissionRef   = useRef<HTMLSpanElement>(null);
  const deskPctRef       = useRef<HTMLSpanElement>(null);
  const deskFillRef      = useRef<HTMLDivElement>(null);
  const deskLogRef       = useRef<HTMLUListElement>(null);
  const navigate         = useNavigate();
  const gsRef            = useRef<GS>(introGame());
  const trackedPhaseRef  = useRef<Phase>('brief');
  const trackedWaveRef   = useRef(0);
  const trackedAscentRef = useRef(false);

  useEffect(() => {
    const canvas  = canvasRef.current!;
    const ctx     = canvas.getContext('2d')!;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    ctx.imageSmoothingEnabled = false;


    const onDown = (e: KeyboardEvent) => {
      if (document.activeElement === lbInputRef.current) return;
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

    };
    const onUp = (e: KeyboardEvent) => gsRef.current.keys.delete(e.key);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);

    // ── leaderboard handlers ─────────────────────────────────────────────
    const handleLbSubmit = async () => {
      const submitBtn = lbSubmitRef.current;
      if (!submitBtn || submitBtn.disabled) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'SUBMITTING…';

      const name  = (lbInputRef.current?.value.trim().toUpperCase().slice(0, 12)) || 'PILOT';
      const { score, wave } = lbCapturedRef.current;

      await submitScore(name, score, wave);
      const top = await fetchTopScores(10);

      if (lbListRef.current) {
        lbListRef.current.innerHTML = top.map((s, i) => {
          const highlight = s.score === score && s.name === name;
          return `<li class="lb-list-item${highlight ? ' lb-highlight' : ''}">
            <span class="lb-rank">${String(i + 1).padStart(2, '0')}</span>
            <span class="lb-name">${s.name}</span>
            <span class="lb-pts">${s.score.toLocaleString()}</span>
          </li>`;
        }).join('');
      }

      if (lbNameSectionRef.current) lbNameSectionRef.current.style.display = 'none';
      if (lbBoardRef.current)       lbBoardRef.current.style.display = 'flex';
    };

    const handleLbKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleLbSubmit();
    };

    const handleRetry = () => {
      gsRef.current = newGame(1, 0, gsRef.current.hi, 3);
    };

    const handleRandomize = () => {
      if (lbInputRef.current) lbInputRef.current.value = randomCallsign();
    };

    const submitEl = lbSubmitRef.current!;
    const inputEl  = lbInputRef.current!;
    const retryEl  = lbRetryRef.current!;
    const randomEl = lbRandomRef.current!;

    submitEl.addEventListener('click', handleLbSubmit);
    inputEl.addEventListener('keydown', handleLbKey);
    retryEl.addEventListener('click', handleRetry);
    randomEl.addEventListener('click', handleRandomize);

    let last    = performance.now();
    let raf     = 0;
    let mounted = true;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = gsRef.current;
      if (g.phase === 'play' || g.phase === 'die' || g.phase === 'brief') update(g, dt);
      else { tickStars(g, dt); tickSparks(g, dt); }
      render(ctx, g, now / 1000, isTouch);

      // ── analytics: fire once per state transition ──────────────────────
      const prevPhase = trackedPhaseRef.current;
      if (g.phase === 'play' && prevPhase === 'brief' && trackedWaveRef.current === 0) {
        track('game_start');
      }
      if (g.waveT > 0 && g.wave > trackedWaveRef.current) {
        track('wave_clear', { wave: g.wave, score: g.score });
        trackedWaveRef.current = g.wave;
      }
      if (g.dockAscent >= 1 && !trackedAscentRef.current) {
        track('dock_success', { score: g.score });
        trackedAscentRef.current = true;
      }
      if (g.phase === 'over' && prevPhase !== 'over') {
        track('game_over', { wave: g.wave, score: g.score });
      }
      trackedPhaseRef.current = g.phase;

      // sidebar progress bar (DOM, no React re-render)
      if (sidebarRef.current && progressFillRef.current) {
        const show = g.phase === 'play' || g.phase === 'die';
        sidebarRef.current.style.display = show ? 'flex' : 'none';
        if (show) {
          const pct = g.missionKind === 'approach'
            ? Math.round(g.stationProgress * 100)
            : g.totalEnemies > 0 ? Math.round((1 - g.enemies.length / g.totalEnemies) * 100) : 0;
          progressFillRef.current.style.height = `${pct}%`;
        }
      }

      // desktop panels (DOM, no React re-render)
      const playing = g.phase === 'play' || g.phase === 'die' || g.phase === 'brief' || g.phase === 'over';
      if (deskScoreRef.current) deskScoreRef.current.textContent = g.score.toLocaleString();
      if (deskHiRef.current)    deskHiRef.current.textContent    = g.hi.toLocaleString();
      if (deskWaveRef.current)  deskWaveRef.current.textContent  = String(g.wave);
      if (playing && deskMissionRef.current && deskPctRef.current && deskFillRef.current) {
        const pct = g.missionKind === 'approach'
          ? Math.round(g.stationProgress * 100)
          : g.totalEnemies > 0 ? Math.round((1 - g.enemies.length / g.totalEnemies) * 100) : 0;
        deskMissionRef.current.textContent = g.missionKind === 'approach' ? 'DOCK' : 'ELIMINATE';
        deskPctRef.current.textContent     = `${pct}%`;
        deskFillRef.current.style.width    = `${pct}%`;
      }
      if (deskLogRef.current) {
        deskLogRef.current.innerHTML = g.scoreLog.map(e => {
          const alpha = Math.max(0.2, 1 - e.age / 14).toFixed(2);
          return `<li class="desk-log-item" style="opacity:${alpha}">
            <span class="desk-log-label">${e.label}</span>
            <span class="desk-log-pts">+${e.pts.toLocaleString()}</span>
          </li>`;
        }).join('');
      }

      // HUD controls — touch only, visible during play only
      if (isTouch && hudControlsRef.current) {
        hudControlsRef.current.style.display = g.phase === 'play' ? 'flex' : 'none';
      }

      // briefing choice overlay — touch only, shown only when a choice is pending
      if (choiceOverlayRef.current) {
        const showChoices = isTouch && g.phase === 'brief' && g.txDone && g.txHasChoice;
        choiceOverlayRef.current.style.display = showChoices ? 'flex' : 'none';
      }

      // leaderboard overlay — appears on game over, resets when game restarts
      if (lbOverlayRef.current) {
        if (g.phase === 'over' && lbOverlayRef.current.style.display === 'none') {
          lbCapturedRef.current = { score: g.score, wave: g.wave };
          if (lbScoreRef.current) lbScoreRef.current.textContent = g.score.toLocaleString();
          if (lbInputRef.current) lbInputRef.current.value = randomCallsign();
          if (!supabase && lbNameSectionRef.current) lbNameSectionRef.current.style.display = 'none';
          lbOverlayRef.current.style.display = 'flex';
        }
        if (g.phase !== 'over') {
          lbOverlayRef.current.style.display = 'none';
          if (lbNameSectionRef.current) lbNameSectionRef.current.style.display = supabase ? 'flex' : 'none';
          if (lbBoardRef.current) lbBoardRef.current.style.display = 'none';
          if (lbInputRef.current) lbInputRef.current.value = '';
          if (lbSubmitRef.current) {
            lbSubmitRef.current.disabled = false;
            lbSubmitRef.current.textContent = 'SUBMIT SCORE';
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };
    document.fonts.ready.then(() => {
      if (mounted) raf = requestAnimationFrame(tick);
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup',   onUp);
      submitEl.removeEventListener('click', handleLbSubmit);
      inputEl.removeEventListener('keydown', handleLbKey);
      retryEl.removeEventListener('click', handleRetry);
      randomEl.removeEventListener('click', handleRandomize);
    };
  }, [navigate]);

  return (
    <div className="game-wrap">
      <div className="game-row">
        {/* ── desktop left panel ── */}
        <aside className="desk-panel desk-panel-left" aria-label="Pilot status">
          <p className="desk-panel-title">PILOT STATUS</p>
          <div className="desk-stat">
            <span className="desk-stat-label">SCORE</span>
            <span ref={deskScoreRef} className="desk-stat-value desk-stat-score">0</span>
          </div>
          <div className="desk-stat">
            <span className="desk-stat-label">HI-SCORE</span>
            <span ref={deskHiRef} className="desk-stat-value">0</span>
          </div>
          <div className="desk-stat">
            <span className="desk-stat-label">WAVE</span>
            <span ref={deskWaveRef} className="desk-stat-value">1</span>
          </div>
          <div className="desk-divider" />
          <p className="desk-panel-title">SCORE LOG</p>
          <ul ref={deskLogRef} className="desk-log-list" />
        </aside>

        <div className="canvas-wrap">
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
          <div ref={hudControlsRef} className="hud-controls" style={{ display: 'none' }} aria-hidden="true">
            <button
              className="hud-btn-dir"
              onTouchStart={e => { e.preventDefault(); gsRef.current.keys.add('ArrowLeft'); }}
              onTouchEnd={() => gsRef.current.keys.delete('ArrowLeft')}
              onTouchCancel={() => gsRef.current.keys.delete('ArrowLeft')}
            >◄</button>
            <button
              className="hud-btn hud-btn-fire"
              onTouchStart={e => { e.preventDefault(); gsRef.current.keys.add('z'); }}
              onTouchEnd={() => gsRef.current.keys.delete('z')}
              onTouchCancel={() => gsRef.current.keys.delete('z')}
            >FIRE</button>
            <button
              className="hud-btn-dir"
              onTouchStart={e => { e.preventDefault(); gsRef.current.keys.add('ArrowRight'); }}
              onTouchEnd={() => gsRef.current.keys.delete('ArrowRight')}
              onTouchCancel={() => gsRef.current.keys.delete('ArrowRight')}
            >►</button>
          </div>
          <div ref={lbOverlayRef} className="lb-overlay" style={{ display: 'none' }}>
            <p className="lb-header">GAME OVER</p>
            <div className="lb-score-block">
              <p className="lb-label">YOUR SCORE</p>
              <p ref={lbScoreRef} className="lb-score-value">0</p>
            </div>
            <div ref={lbNameSectionRef} className="lb-name-section">
              <p className="lb-label">ENTER CALLSIGN</p>
              <div className="lb-callsign-row">
                <input ref={lbInputRef} className="lb-input" maxLength={12} placeholder="NOVA WOLF" autoComplete="off" spellCheck={false} />
                <button ref={lbRandomRef} className="lb-random-btn" type="button" title="Generate random callsign">↻</button>
              </div>
              <button ref={lbSubmitRef} className="lb-submit-btn">SUBMIT SCORE</button>
            </div>
            <div ref={lbBoardRef} className="lb-board" style={{ display: 'none' }}>
              <p className="lb-label">TOP PILOTS</p>
              <ol ref={lbListRef} className="lb-list" />
            </div>
            <button ref={lbRetryRef} className="lb-retry-btn">► PLAY AGAIN</button>
          </div>
          <div ref={choiceOverlayRef} className="touch-choice-overlay" style={{ display: 'none' }} aria-hidden="true">
            <p className="touch-group-label">Choose your route</p>
            <div className="touch-row">
              <button
                className="touch-btn touch-btn-choice"
                onTouchEnd={() => {
                  const gs = gsRef.current;
                  if (gs.txHasChoice && gs.txDone && gs.txProfiles) {
                    Object.assign(gs, newGame(gs.wave + 1, gs.score, gs.hi, gs.lives, gs.txProfiles[0]));
                  }
                }}
              >[1]</button>
              <button
                className="touch-btn touch-btn-choice"
                onTouchEnd={() => {
                  const gs = gsRef.current;
                  if (gs.txHasChoice && gs.txDone && gs.txProfiles) {
                    Object.assign(gs, newGame(gs.wave + 1, gs.score, gs.hi, gs.lives, gs.txProfiles[1]));
                  }
                }}
              >[2]</button>
            </div>
          </div>
        </div>
        <div ref={sidebarRef} className="station-sidebar">
          <div className="sidebar-title">NEO-7</div>
          <div className="progress-track">
            <div ref={progressFillRef} className="progress-fill" style={{ height: '0%' }} />
          </div>
          <div className="sidebar-sub">DOCK</div>
        </div>

        {/* ── desktop right panel ── */}
        <aside className="desk-panel desk-panel-right" aria-label="Mission and controls">
          <div className="desk-mission-block">
            <p className="desk-panel-title">MISSION</p>
            <span ref={deskMissionRef} className="desk-stat-label desk-mission-kind">—</span>
            <div className="desk-progress-track">
              <div ref={deskFillRef} className="desk-progress-fill" style={{ width: '0%' }} />
            </div>
            <span ref={deskPctRef} className="desk-progress-pct">0%</span>
          </div>
          <div className="desk-divider" />
          <div className="desk-controls-block">
            <p className="desk-panel-title">CONTROLS</p>
            <div className="desk-key-row"><kbd className="desk-key">← →</kbd><span className="desk-key-label">MOVE</span></div>
            <div className="desk-key-row"><kbd className="desk-key">Z</kbd><span className="desk-key-label">SHOOT</span></div>
            <div className="desk-key-row"><kbd className="desk-key">ESC</kbd><span className="desk-key-label">MENU</span></div>
          </div>
        </aside>
      </div>
      <p className="game-hint">← → MOVE &nbsp;&nbsp; Z SHOOT &nbsp;&nbsp; ESC MENU</p>
    </div>
  );
}
