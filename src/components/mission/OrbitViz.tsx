import type { Threat } from "../../types/game";
import { actionProfiles, predictThreat } from "../../gameplay/missionLogic";
import type { DefenseAction, MoonState } from "../../gameplay/missionLogic";

const ROCK_SHAPES = [
  "0,-11 7,-7 12,0 8,9 0,12 -7,8 -11,-1 -7,-9",
  "0,-13 9,-6 11,3 6,11 -2,13 -9,7 -12,-1 -7,-9",
  "0,-10 6,-6 10,2 5,9 -3,10 -8,4 -9,-4 -3,-10",
  "0,-12 8,-5 11,4 5,11 -4,11 -10,4 -10,-5 -4,-11",
];

function threatSeed(id: string) {
  return id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function rockPoints(id: string, scale = 1) {
  const base = ROCK_SHAPES[threatSeed(id) % ROCK_SHAPES.length];
  if (scale === 1) return base;
  return base
    .split(" ")
    .map((pt) => {
      const [x, y] = pt.split(",").map(Number);
      return `${(x * scale).toFixed(1)},${(y * scale).toFixed(1)}`;
    })
    .join(" ");
}

function tumbleSpeed(id: string) {
  const seed = threatSeed(id);
  return (seed % 2 === 0 ? 1 : -1) * (20 + (seed % 15));
}

type OrbitVizProps = {
  threats: Threat[];
  selected?: string;
  actionsByThreat: Partial<Record<string, DefenseAction>>;
  previewAction: DefenseAction;
  elapsed: number;
  moon: MoonState;
  alienEvent?: { threatId: string; helpful: boolean } | null;
};

export default function OrbitViz({
  threats,
  selected,
  actionsByThreat,
  previewAction,
  elapsed,
  moon,
  alienEvent
}: OrbitVizProps) {
  const width = 500;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const earthRadius = 22;

  const getGeometry = (threat: Threat, action: DefenseAction) => {
    const start = {
      x: centerX + threat.x,
      y: centerY + threat.y
    };
    const prediction = predictThreat(threat, action, moon);
    const profile = actionProfiles[action];
    const dx = centerX - start.x;
    const dy = centerY - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = {
      x: -dy / length,
      y: dx / length
    };
    const end = {
      x: centerX + normal.x * prediction.missDistance,
      y: centerY + normal.y * prediction.missDistance
    };
    const control = {
      x: (start.x + end.x) / 2 + normal.x * profile.curve,
      y: (start.y + end.y) / 2 + normal.y * profile.curve
    };

    return { start, control, end, prediction };
  };

  const pointOnCurve = (
    start: { x: number; y: number },
    control: { x: number; y: number },
    end: { x: number; y: number },
    progress: number
  ) => {
    const inverse = 1 - progress;

    return {
      x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x,
      y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y
    };
  };

  const pathFor = (threat: Threat, action: DefenseAction) => {
    const { start, control, end } = getGeometry(threat, action);

    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  };

  const selectedThreat = threats.find((threat) => threat.id === selected);
  const selectedCommittedAction = selectedThreat ? actionsByThreat[selectedThreat.id] ?? "none" : "none";
  const showPreview = selectedThreat && previewAction !== selectedCommittedAction;
  const moonX = centerX + moon.x;
  const moonY = centerY + moon.y;

  return (
    <svg className="orbit-viz" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <radialGradient id="earth-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#d6fbff" />
          <stop offset="52%" stopColor="#00d5ff" />
          <stop offset="100%" stopColor="#076a88" />
        </radialGradient>
        <filter id="soft-glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={width} height={height} rx="2" fill="#07060e" />
      <circle cx={centerX} cy={centerY} r={earthRadius + 12} fill="#00e5ff" opacity="0.08" />
      <circle cx={centerX} cy={centerY} r={earthRadius} fill="url(#earth-glow)" filter="url(#soft-glow)" />
      <circle
        cx={centerX}
        cy={centerY}
        r={150}
        stroke="#2a2540"
        fill="none"
        strokeDasharray="4 10"
      />
      <circle cx={centerX} cy={centerY} r={88} stroke="#1c1830" fill="none" />
      <ellipse
        cx={centerX}
        cy={centerY}
        rx={moon.orbitRadius}
        ry={moon.orbitRadius * 0.72}
        className="moon-orbit"
      />
      {threats.map((threat) => {
        const action = actionsByThreat[threat.id] ?? "none";
        const isSelected = selected === threat.id;
        const hasCommittedPlan = action !== "none";
        const { prediction } = getGeometry(threat, action);

        return (
          <path
            key={`${threat.id}-path`}
            d={pathFor(threat, action)}
            className={`trajectory-line ${prediction.status} ${isSelected ? "selected" : ""} ${
              hasCommittedPlan ? "committed" : ""
            }`}
          />
        );
      })}
      {showPreview && selectedThreat ? (
        <path
          d={pathFor(selectedThreat, previewAction)}
          className="trajectory-line preview"
        />
      ) : null}
      <g className="moon-group">
        <line x1={centerX} y1={centerY} x2={moonX} y2={moonY} className="moon-radius-line" />
        <circle cx={moonX} cy={moonY} r={moon.radius + 16} className="moon-influence" />
        <circle cx={moonX} cy={moonY} r={moon.radius} className="moon-body" />
      </g>
      {threats.map((threat) => {
        const action = actionsByThreat[threat.id] ?? "none";
        const isSelected = selected === threat.id;
        const duration = Math.max(5, threat.etaDays);
        const progress = (elapsed / duration) % 1;
        const { start, control, end, prediction } = getGeometry(threat, action);
        const point = pointOnCurve(start, control, end, progress);

        const angle = (elapsed * tumbleSpeed(threat.id)) % 360;
        const scale = isSelected ? 1.35 : 1;

        return (
          <g key={threat.id}>
            {isSelected ? (
              <circle
                cx={point.x}
                cy={point.y}
                r={18}
                className="asteroid-selection-ring"
              />
            ) : null}
            <g transform={`translate(${point.x},${point.y}) rotate(${angle})`}>
              <polygon
                points={rockPoints(threat.id, scale)}
                className={`asteroid-rock ${prediction.status}`}
              />
            </g>
          </g>
        );
      })}
      {showPreview && selectedThreat ? (() => {
        const duration = Math.max(5, selectedThreat.etaDays);
        const progress = (elapsed / duration) % 1;
        const { start, control, end } = getGeometry(selectedThreat, previewAction);
        const point = pointOnCurve(start, control, end, progress);

        const angle = (elapsed * tumbleSpeed(selectedThreat.id)) % 360;

        return (
          <g transform={`translate(${point.x},${point.y}) rotate(${angle})`}>
            <polygon
              points={rockPoints(selectedThreat.id)}
              className="asteroid-rock preview"
            />
          </g>
        );
      })() : null}
      {alienEvent ? (() => {
        const alienThreat = threats.find((t) => t.id === alienEvent.threatId);
        if (!alienThreat) return null;
        const action = actionsByThreat[alienThreat.id] ?? "none";
        const duration = Math.max(5, alienThreat.etaDays);
        const progress = (elapsed / duration) % 1;
        const { start, control, end } = getGeometry(alienThreat, action);
        const point = pointOnCurve(start, control, end, progress);
        const shipX = point.x - 26;
        const shipY = point.y - 30;

        return (
          <g className={`alien-event ${alienEvent.helpful ? "helpful" : "hostile"}`}>
            <line x1={shipX} y1={shipY} x2={point.x} y2={point.y} className="alien-beam" />
            <g transform={`translate(${shipX}, ${shipY})`} className="alien-ship">
              <ellipse cx="0" cy="4" rx="14" ry="5" className="alien-hull" />
              <ellipse cx="0" cy="-1" rx="8" ry="7" className="alien-dome" />
              <circle cx="0" cy="-3" r="3" className="alien-window" />
            </g>
          </g>
        );
      })() : null}
    </svg>
  );
}
