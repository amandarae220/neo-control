import type { Threat } from "../types/game";

export type DefenseAction = "none" | "nudge" | "fragment" | "gravity";

export const alienTransmissions = {
  helpful: [
    (name: string) => `ANOMALY — ${name} nudged off-course by a passing vessel. Works for us.`,
    (name: string) => `LUCKY BREAK — unidentified craft clipped ${name}. New path looks cleaner.`,
    (name: string) => `CONTACT — ${name} had an unexpected visitor. Trajectory improved.`,
    (name: string) => `SIGNAL — ${name} got a free nudge. Don't question it.`,
  ],
  hostile: [
    (name: string) => `ALERT — Zorgon probe detected near ${name}. Trajectory compromised.`,
    (name: string) => `WARNING — Unregistered vessel has altered ${name}'s approach vector. Recalculate.`,
    (name: string) => `SCRAMBLE — ${name} knocked off-course by external interference.`,
    (name: string) => `CONTACT — Unknown craft near ${name}. They're not helping.`,
  ],
};

export type ActionProfile = {
  label: string;
  cost: number;
  deflection: number;
  reliability: number;
  curve: number;
  note: string;
};

export type ThreatPrediction = {
  action: DefenseAction;
  missDistance: number;
  impactProbability: number;
  moonImpactProbability: number;
  moonCollision: boolean;
  lunarAssist: boolean;
  lunarClosestApproach: number;
  scoreDelta: number;
  status: "impact" | "deflected" | "lunar-assist" | "moon-impact";
};

export type MoonState = {
  x: number;
  y: number;
  phase: number;
  radius: number;
  orbitRadius: number;
};

const riskSeverity: Record<Threat["risk"], number> = {
  Low: 1,
  Medium: 2,
  High: 3
};

export function getMoonState(elapsed: number): MoonState {
  const orbitRadius = 118;
  const phase = (elapsed / 18) * Math.PI * 2 + Math.PI * 0.18;

  return {
    x: Math.cos(phase) * orbitRadius,
    y: Math.sin(phase) * orbitRadius * 0.72,
    phase,
    radius: 9,
    orbitRadius
  };
}

function closestDistanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const rawT =
    lengthSquared === 0
      ? 0
      : ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared;
  const t = Math.max(0, Math.min(1, rawT));
  const closest = {
    x: start.x + segmentX * t,
    y: start.y + segmentY * t
  };

  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

export const actionProfiles: Record<DefenseAction, ActionProfile> = {
  none: {
    label: "Observe",
    cost: 0,
    deflection: 0,
    reliability: 1,
    curve: 18,
    note: "No action. Rock goes where it wants."
  },
  nudge: {
    label: "Kinetic Nudge",
    cost: 18,
    deflection: 72,
    reliability: 0.9,
    curve: 36,
    note: "Cheap and direct. Works best with time to spare."
  },
  fragment: {
    label: "Fragment",
    cost: 38,
    deflection: 112,
    reliability: 0.68,
    curve: -42,
    note: "Big shove, messy fallout. High risk, high reward."
  },
  gravity: {
    label: "Gravity Tug",
    cost: 26,
    deflection: 58,
    reliability: 0.98,
    curve: 52,
    note: "Slow but reliable. Needs a long lead time."
  }
};

export function predictThreat(
  threat: Threat,
  action: DefenseAction,
  moon: MoonState = getMoonState(0)
): ThreatPrediction {
  const profile = actionProfiles[action];
  const severity = riskSeverity[threat.risk];
  const timeFactor = Math.min(1.35, Math.max(0.45, threat.etaDays / 10));
  const effectiveDeflection = profile.deflection * profile.reliability * timeFactor;
  const start = { x: threat.x, y: threat.y };
  const length = Math.hypot(threat.x, threat.y) || 1;
  const normal = { x: -threat.y / length, y: threat.x / length };
  const end = {
    x: normal.x * effectiveDeflection,
    y: normal.y * effectiveDeflection
  };
  const lunarClosestApproach = Math.round(closestDistanceToSegment(moon, start, end));
  const lunarWindow = moon.radius + 18;
  const moonCollision = lunarClosestApproach <= moon.radius;
  const lunarAssist = !moonCollision && lunarClosestApproach <= lunarWindow;
  const lunarAssistStrength = lunarAssist ? (lunarWindow - lunarClosestApproach) * 4 + 52 : 0;
  const missDistance = Math.round(effectiveDeflection + lunarAssistStrength);
  const safeDistance = 38 + severity * 14;
  const exposure = Math.max(0, 1 - missDistance / safeDistance);
  const impactProbability = Math.round(exposure * severity * 28);
  const moonImpactProbability = lunarClosestApproach <= lunarWindow
    ? moonCollision
      ? 100
      : Math.min(96, Math.round((1 - lunarClosestApproach / lunarWindow) * 86 + severity * 5))
    : 0;
  const actionPenalty = profile.cost;
  const debrisPenalty = action === "fragment" ? 14 : 0;
  const preventionBonus = Math.round(Math.min(85, missDistance * 0.85));
  const riskPenalty = impactProbability * severity;
  const lunarAssistBonus = lunarAssist ? 22 : 0;
  const lunarDamagePenalty = Math.round(moonImpactProbability * (moonCollision ? 0.75 : 0.35));
  const moonCollisionPenalty = moonCollision ? 42 + severity * 10 : 0;
  const scoreDelta = Math.round(
    preventionBonus +
      lunarAssistBonus -
      actionPenalty -
      debrisPenalty -
      riskPenalty -
      lunarDamagePenalty -
      moonCollisionPenalty
  );

  return {
    action,
    missDistance,
    impactProbability,
    moonImpactProbability,
    moonCollision,
    lunarAssist,
    lunarClosestApproach,
    scoreDelta,
    status: moonCollision ? "moon-impact" : lunarAssist ? "lunar-assist" : impactProbability > 20 ? "impact" : "deflected"
  };
}

export function calculateMissionScore(
  threats: Threat[],
  actionsByThreat: Partial<Record<string, DefenseAction>>,
  moon: MoonState = getMoonState(0)
) {
  return threats.reduce(
    (total, threat) => total + predictThreat(threat, actionsByThreat[threat.id] ?? "none", moon).scoreDelta,
    100
  );
}

export function getMissionOutcome(score: number) {
  if (score >= 150) return "Hero of Earth";
  if (score >= 105) return "Mission Clear";
  if (score >= 75) return "Close Call";
  return "Earth Impacted";
}
