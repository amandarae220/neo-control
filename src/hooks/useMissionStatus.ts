import { useEffect, useRef, useState } from 'react';
import {
  actionProfiles,
  alienTransmissions,
  calculateMissionScore,
  getMoonState,
  predictThreat,
} from '../gameplay/missionLogic';
import type { DefenseAction } from '../gameplay/missionLogic';
import type { Scenario } from '../types/game';

export function useMissionStatus(scenario: Scenario | undefined) {
  const missionDuration = scenario
    ? Math.min(...scenario.threats.map((t) => t.etaDays))
    : 0;

  const [selected,          setSelected]          = useState<string | undefined>(scenario?.threats[0]?.id);
  const [previewAction,     setPreviewAction]      = useState<DefenseAction>('nudge');
  const [actionsByThreat,   setActionsByThreat]    = useState<Partial<Record<string, DefenseAction>>>({});
  const [commitMessage,     setCommitMessage]      = useState('');
  const [elapsed,           setElapsed]            = useState(0);
  const [showBriefing,      setShowBriefing]       = useState(true);
  const [simulationStarted, setSimulationStarted]  = useState(false);
  const [missionResolved,   setMissionResolved]    = useState(false);
  const [threatModifiers,   setThreatModifiers]    = useState<Partial<Record<string, { x: number; y: number }>>>({});
  const [activeEvent,       setActiveEvent]        = useState<{ helpful: boolean; threatId: string; message: string } | null>(null);
  const lastEventIntervalRef = useRef(-1);

  const moon = getMoonState(elapsed);

  const effectiveThreats = scenario
    ? scenario.threats.map((threat) => {
        const mod = threatModifiers[threat.id];
        return mod ? { ...threat, x: threat.x + mod.x, y: threat.y + mod.y } : threat;
      })
    : [];

  // RAF-driven elapsed time
  useEffect(() => {
    if (!simulationStarted || missionResolved) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      setElapsed((c) => c + delta * 0.9);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [missionResolved, simulationStarted]);

  // Auto-clear commit toast
  useEffect(() => {
    if (!commitMessage) return;
    const t = window.setTimeout(() => setCommitMessage(''), 1800);
    return () => window.clearTimeout(t);
  }, [commitMessage]);

  // Reset all state when scenario changes
  useEffect(() => {
    setSelected(scenario?.threats[0]?.id);
    setPreviewAction('nudge');
    setActionsByThreat({});
    setCommitMessage('');
    setElapsed(0);
    setShowBriefing(true);
    setSimulationStarted(false);
    setMissionResolved(false);
    setThreatModifiers({});
    setActiveEvent(null);
    lastEventIntervalRef.current = -1;
  }, [scenario?.id]);

  // Alien transmission events
  useEffect(() => {
    if (!simulationStarted || missionResolved || !scenario) return;
    const interval = Math.floor(elapsed / 4);
    if (interval <= 0 || interval <= lastEventIntervalRef.current) return;
    lastEventIntervalRef.current = interval;
    if (Math.random() > 0.42) return;

    const threat  = scenario.threats[Math.floor(Math.random() * scenario.threats.length)];
    const helpful = Math.random() > 0.5;
    const length  = Math.hypot(threat.x, threat.y) || 1;
    const magnitude = 35 + Math.random() * 35;
    const sign = helpful ? 1 : -1;

    setThreatModifiers((prev) => ({
      ...prev,
      [threat.id]: {
        x: (prev[threat.id]?.x ?? 0) + sign * (threat.x / length) * magnitude,
        y: (prev[threat.id]?.y ?? 0) + sign * (threat.y / length) * magnitude,
      },
    }));

    const pool    = helpful ? alienTransmissions.helpful : alienTransmissions.hostile;
    const message = pool[Math.floor(Math.random() * pool.length)](threat.name);
    setActiveEvent({ helpful, threatId: threat.id, message });
  }, [elapsed, simulationStarted, missionResolved, scenario]);

  // Auto-clear active event
  useEffect(() => {
    if (!activeEvent) return;
    const t = window.setTimeout(() => setActiveEvent(null), 3500);
    return () => window.clearTimeout(t);
  }, [activeEvent]);

  // ── derived values ──────────────────────────────────────────────────────────
  const selectedThreat       = effectiveThreats.find((t) => t.id === selected) ?? effectiveThreats[0];
  const committedAction      = selectedThreat ? actionsByThreat[selectedThreat.id] ?? 'none' : 'none';
  const committedPrediction  = selectedThreat ? predictThreat(selectedThreat, committedAction, moon) : undefined;
  const previewPrediction    = selectedThreat ? predictThreat(selectedThreat, previewAction, moon) : undefined;
  const score                = scenario ? calculateMissionScore(effectiveThreats, actionsByThreat, moon) : 0;
  const hasPendingChange     = selectedThreat ? previewAction !== committedAction : false;
  const selectedDaysRemaining = selectedThreat ? Math.max(0, selectedThreat.etaDays - elapsed) : 0;
  const earliestDaysRemaining = scenario
    ? Math.max(0, Math.min(...scenario.threats.map((t) => t.etaDays - elapsed)))
    : 0;
  const missionProgress      = missionDuration > 0 ? Math.min(1, elapsed / missionDuration) : 0;
  const urgencyLabel         = selectedDaysRemaining <= 1.5 ? 'Very close now'
                             : selectedDaysRemaining <= 4   ? 'Window closing'
                             : 'Window open';
  const urgencyClass         = selectedDaysRemaining <= 1.5 ? 'critical'
                             : selectedDaysRemaining <= 4   ? 'warning'
                             : 'stable';
  const missionPredictions   = effectiveThreats.map((threat) => ({
    threat,
    prediction: predictThreat(threat, actionsByThreat[threat.id] ?? 'none', moon),
  }));
  const deflectedCount       = missionPredictions.filter(({ prediction }) =>
    prediction.status === 'deflected' || prediction.status === 'lunar-assist'
  ).length;
  const moonCollisionCount   = missionPredictions.filter(({ prediction }) => prediction.moonCollision).length;
  const highestImpactRisk    = missionPredictions.reduce((max, { prediction }) =>
    Math.max(max, prediction.impactProbability), 0);
  const highestMoonRisk      = missionPredictions.reduce((max, { prediction }) =>
    Math.max(max, prediction.moonImpactProbability), 0);

  // Mark mission resolved when all threats have passed
  useEffect(() => {
    if (!simulationStarted || missionResolved || earliestDaysRemaining > 0) return;
    setMissionResolved(true);
  }, [earliestDaysRemaining, missionResolved, simulationStarted]);

  const commitAction = () => {
    if (!selectedThreat) return;
    setActionsByThreat((current) => ({
      ...current,
      [selectedThreat.id]: previewAction,
    }));
    setCommitMessage(`${actionProfiles[previewAction].label} committed to ${selectedThreat.name}`);
  };

  const clearAction = () => {
    if (!selectedThreat) return;
    setActionsByThreat((current) => ({ ...current, [selectedThreat.id]: 'none' }));
  };

  return {
    // state
    setSelected,
    previewAction, setPreviewAction,
    actionsByThreat,
    commitMessage,
    elapsed,
    showBriefing, setShowBriefing,
    simulationStarted, setSimulationStarted,
    missionResolved,
    activeEvent,
    // derived
    moon,
    effectiveThreats,
    selectedThreat,
    committedAction,
    committedPrediction,
    previewPrediction,
    score,
    hasPendingChange,
    selectedDaysRemaining,
    earliestDaysRemaining,
    missionProgress,
    urgencyLabel,
    urgencyClass,
    missionPredictions,
    deflectedCount,
    moonCollisionCount,
    highestImpactRisk,
    highestMoonRisk,
    // actions
    commitAction,
    clearAction,
  };
}
