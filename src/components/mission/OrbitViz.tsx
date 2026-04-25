import type { Threat } from "../../types/game";
import { actionProfiles, predictThreat } from "../../gameplay/missionLogic";
import type { DefenseAction, MoonState } from "../../gameplay/missionLogic";

type OrbitVizProps = {
  threats: Threat[];
  selected?: string;
  actionsByThreat: Partial<Record<string, DefenseAction>>;
  previewAction: DefenseAction;
  elapsed: number;
  moon: MoonState;
};

export default function OrbitViz({
  threats,
  selected,
  actionsByThreat,
  previewAction,
  elapsed,
  moon
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
      <rect width={width} height={height} rx="18" fill="#080c14" />
      <circle cx={centerX} cy={centerY} r={earthRadius + 12} fill="#00e5ff" opacity="0.08" />
      <circle cx={centerX} cy={centerY} r={earthRadius} fill="url(#earth-glow)" filter="url(#soft-glow)" />
      <circle
        cx={centerX}
        cy={centerY}
        r={150}
        stroke="#243044"
        fill="none"
        strokeDasharray="4 10"
      />
      <circle cx={centerX} cy={centerY} r={88} stroke="#172033" fill="none" />
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

        return (
          <g key={threat.id}>
            {isSelected ? (
              <circle
                cx={point.x}
                cy={point.y}
                r={10}
                className="asteroid-selection-ring"
              />
            ) : null}
            <circle
              cx={point.x}
              cy={point.y}
              r={isSelected ? 7 : 5}
              className={`asteroid ${prediction.status}`}
            />
          </g>
        );
      })}
      {showPreview && selectedThreat ? (() => {
        const duration = Math.max(5, selectedThreat.etaDays);
        const progress = (elapsed / duration) % 1;
        const { start, control, end } = getGeometry(selectedThreat, previewAction);
        const point = pointOnCurve(start, control, end, progress);

        return (
          <circle
            cx={point.x}
            cy={point.y}
            r={6}
            className="asteroid preview"
          />
        );
      })() : null}
    </svg>
  );
}
