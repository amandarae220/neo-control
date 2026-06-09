import { useNavigate, useParams } from "react-router-dom";
import { scenarios } from "../data/scenarios";
import OrbitViz from "../components/mission/OrbitViz";
import { actionProfiles, getMissionOutcome, predictThreat } from "../gameplay/missionLogic";
import { useMissionStatus } from "../hooks/useMissionStatus";

type InfoTipProps = {
  label: string;
  children: string;
};

function InfoTip({ label, children }: InfoTipProps) {
  return (
    <span className="info-tip">
      <button type="button" className="info-tip-button" aria-label={label}>
        i
      </button>
      <span className="info-tip-bubble" role="tooltip">
        {children}
      </span>
    </span>
  );
}

export default function MissionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const scenarioIndex = scenarios.findIndex((s) => s.id === id);
  const scenario = scenarios.find((s) => s.id === id);
  const nextScenario = scenarioIndex >= 0 ? scenarios[scenarioIndex + 1] : undefined;

  const {
    setSelected,
    previewAction, setPreviewAction,
    actionsByThreat,
    commitMessage,
    elapsed,
    showBriefing, setShowBriefing,
    simulationStarted, setSimulationStarted,
    missionResolved,
    activeEvent,
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
    commitAction,
    clearAction,
  } = useMissionStatus(scenario);

  if (!scenario) return <div className="page-shell"><h1>Mission not found</h1></div>;

  return (
    <div className="mission-shell">
      <header className="mission-topbar">
        <div>
          <p className="eyebrow">Planetary Defense Console</p>
          <h1>{scenario.title}</h1>
          <p>{scenario.description}</p>
        </div>
        <div className="score-block">
          <span>Score</span>
          <strong>{score}</strong>
          <em>{getMissionOutcome(score)}</em>
        </div>
      </header>

      <main className="mission-layout">
        <aside className="panel left-panel">
          <h2>Threats</h2>
          <div className="threat-list">
            {effectiveThreats.map((threat) => {
              const action = actionsByThreat[threat.id] ?? "none";
              const prediction = predictThreat(threat, action, moon);
              const isActive = selectedThreat?.id === threat.id;
              const hasPlan = action !== "none";

              return (
                <button
                  className={`threat-row ${isActive ? "active" : ""}`}
                  key={threat.id}
                  onClick={() => setSelected(threat.id)}
                >
                  <span>
                    <strong>{threat.name}</strong>
                    <small>
                      {threat.etaDays} days · {threat.risk} risk
                      {prediction.moonCollision ? " · moon collision" : prediction.lunarAssist ? " · lunar assist" : ""}
                    </small>
                    <small className={hasPlan ? "plan-label active" : "plan-label"}>
                      {hasPlan ? `Plan: ${actionProfiles[action].label}` : "No committed plan"}
                    </small>
                  </span>
                  <b>{prediction.impactProbability}%</b>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="orbit-stage" aria-label="Animated asteroid trajectory view">
          {showBriefing ? (
            <div className="mission-briefing-overlay" role="dialog" aria-modal="true" aria-labelledby="mission-briefing-title">
              <div className="mission-briefing">
                <p className="eyebrow">Mission Briefing</p>
                <h2 id="mission-briefing-title">Defend Earth before the first impact window closes.</h2>
                <p>
                  You are assigning one maneuver per threat. Watch the simulated trajectories, compare the preview metrics,
                  and commit the intervention that creates the safest final path.
                </p>
                <div className="briefing-list">
                  <p><strong>Objective</strong> keep asteroids off an Earth-impact path before the countdown reaches zero.</p>
                  <p><strong>How to play</strong> select a threat, preview maneuvers, then commit the best option for each object.</p>
                  <p><strong>Moon effect</strong> the Moon moves during the simulation and can either help deflect a path or create moon-impact risk.</p>
                </div>
                <button className="primary-action compact" onClick={() => setShowBriefing(false)}>
                  Close Briefing
                </button>
              </div>
            </div>
          ) : null}
          <div className="mission-progress" aria-label="Mission countdown">
            <div className="mission-progress-track">
              <div className="mission-progress-fill" style={{ width: `${missionProgress * 100}%` }} />
            </div>
            <div className="mission-progress-meta">
              <span>Mission countdown</span>
              <strong>{earliestDaysRemaining.toFixed(1)} sim days to first arrival</strong>
            </div>
          </div>
          <div className="orbit-status-bar">
            <div className="status-chip live">
              <span>{simulationStarted && !missionResolved ? "Live simulation" : "Simulation paused"}</span>
              <InfoTip label="About the live simulation">
                This view is a continuously updating mission simulation, not a live telescope or radar feed.
              </InfoTip>
            </div>
            <div className={`status-chip ${urgencyClass}`}>
              <span>{urgencyLabel}</span>
              <strong>{selectedDaysRemaining.toFixed(1)} sim days left</strong>
              <InfoTip label="About the decision window">
                Countdown is based on the selected threat&apos;s projected arrival. Lower remaining time means less room for gradual maneuvers.
              </InfoTip>
            </div>
          </div>
          {activeEvent ? (
            <div
              className={`transmission-toast ${activeEvent.helpful ? "helpful" : "hostile"}`}
              aria-live="assertive"
            >
              <span className="transmission-label">{activeEvent.helpful ? "Transmission" : "Alert"}</span>
              <p>{activeEvent.message}</p>
            </div>
          ) : null}
          {!simulationStarted && !showBriefing ? (
            <div className="start-callout">
              <div className="start-tooltip" role="status">
                Press start to begin the simulation clock.
              </div>
              <button className="primary-action start-button pulse" onClick={() => setSimulationStarted(true)}>
                Start Simulation
              </button>
            </div>
          ) : null}
          <OrbitViz
            threats={effectiveThreats}
            selected={selectedThreat?.id}
            actionsByThreat={actionsByThreat}
            previewAction={previewAction}
            elapsed={elapsed}
            moon={moon}
            alienEvent={activeEvent}
          />
          {missionResolved ? (
            <div className="mission-result-overlay" aria-live="polite">
              <div className="mission-result-card">
                <p className="eyebrow">Mission Result</p>
                <h2>{getMissionOutcome(score)}</h2>
                <p>
                  Window closed. {deflectedCount} of {missionPredictions.length} rocks redirected
                  {moonCollisionCount > 0 ? `, ${moonCollisionCount} Moon ${moonCollisionCount === 1 ? "hit" : "hits"}` : ""}.
                  That&apos;s your final score.
                </p>
                <div className="result-grid">
                  <div>
                    <span>Final score</span>
                    <strong>{score}</strong>
                  </div>
                  <div>
                    <span>Highest Earth risk</span>
                    <strong>{highestImpactRisk}%</strong>
                  </div>
                  <div>
                    <span>Highest Moon risk</span>
                    <strong>{highestMoonRisk}%</strong>
                  </div>
                </div>
                <button
                  className="primary-action compact"
                  onClick={() => {
                    if (nextScenario) {
                      navigate(`/mission/${nextScenario.id}`);
                    } else {
                      navigate("/results", {
                        state: {
                          score,
                          outcome: getMissionOutcome(score),
                          deflectedCount,
                          totalThreats: missionPredictions.length,
                          moonCollisionCount,
                          highestImpactRisk,
                          highestMoonRisk,
                          scenarioTitle: scenario.title,
                        },
                      });
                    }
                  }}
                >
                  {nextScenario ? "Continue to Next Mission" : "View Final Results"}
                </button>
              </div>
            </div>
          ) : null}
          <div className="orbit-legend" aria-label="Trajectory legend">
            <span>
              <i className="legend-line preview" />
              Preview path
            </span>
            <span>
              <i className="legend-line impact" />
              Earth impact risk
            </span>
            <span>
              <i className="legend-line moon-impact" />
              Moon impact risk
            </span>
            <span>
              <i className="legend-line lunar-assist" />
              Lunar assist
            </span>
            <span>
              <i className="legend-line moon-orbit" />
              Moon orbit
            </span>
          </div>
          <div className="telemetry-strip">
            <div className="telemetry-card">
              <label>
                Sim day
                <InfoTip label="What sim day means">
                  Sim day is mission time inside the model. This clock advances faster than real time so you can inspect changing intercept windows.
                </InfoTip>
              </label>
              <strong>{elapsed.toFixed(1)}</strong>
              <small>1 real sec = 0.9 sim days</small>
            </div>
            <div className="telemetry-card">
              <label>
                Selected target
                <InfoTip label="What selected target means">
                  The selected asteroid drives the preview path, control panel estimates, and urgency countdown.
                </InfoTip>
              </label>
              <strong>{selectedThreat?.name}</strong>
              <small>{earliestDaysRemaining.toFixed(1)} sim days to earliest arrival</small>
            </div>
            <div className="telemetry-card">
              <label>
                Moon phase
                <InfoTip label="What moon phase means">
                  Moon phase tracks the Moon&apos;s position in this simulation. A different position can open or close lunar assist opportunities.
                </InfoTip>
              </label>
              <strong>{(moon.phase % (Math.PI * 2)).toFixed(2)} rad</strong>
              <small>Changes intercept geometry</small>
            </div>
          </div>
        </section>

        <aside className="panel right-panel">
          <h2>Control Panel</h2>
          {selectedThreat && committedPrediction && previewPrediction ? (
            <>
              <div className="target-card">
                <span className={`risk-pill ${selectedThreat.risk.toLowerCase()}`}>{selectedThreat.risk}</span>
                <strong>{selectedThreat.name}</strong>
                <p>{actionProfiles[previewAction].note}</p>
                {previewPrediction.moonCollision ? (
                  <p className="lunar-note danger">
                    Projected Moon collision. This path avoids Earth, but it counts as a lunar impact and carries a major penalty.
                  </p>
                ) : previewPrediction.lunarAssist ? (
                  <p className="lunar-note">
                    Lunar intercept window active. The Moon can redirect this path, but Moon impact risk is elevated.
                  </p>
                ) : null}
              </div>

              <div className="action-grid">
                {(["nudge", "fragment", "gravity"] as DefenseAction[]).map((action) => (
                  <button
                    key={action}
                    className={`action-button ${previewAction === action ? "active" : ""} ${
                      committedAction === action ? "committed" : ""
                    }`}
                    disabled={missionResolved}
                    onClick={() => setPreviewAction(action)}
                  >
                    <strong>{actionProfiles[action].label}</strong>
                    <span>
                      {committedAction === action ? "Committed" : previewAction === action ? "Previewing" : "Available"}
                      {" · "}-{actionProfiles[action].cost} pts
                    </span>
                  </button>
                ))}
              </div>

              <div className={hasPendingChange ? "commit-status pending" : "commit-status committed"}>
                <span>{hasPendingChange ? "Pending maneuver" : "Active maneuver"}</span>
                <strong>{hasPendingChange ? actionProfiles[previewAction].label : actionProfiles[committedAction].label}</strong>
              </div>

              <div className="prediction-panel">
                <div>
                  <span>Preview miss distance</span>
                  <strong>{previewPrediction.missDistance} km</strong>
                </div>
                <div>
                  <span>Impact probability</span>
                  <strong>{previewPrediction.impactProbability}%</strong>
                </div>
                <div>
                  <span>Moon impact risk</span>
                  <strong>{previewPrediction.moonImpactProbability}%</strong>
                </div>
                <div>
                  <span>Lunar closest approach</span>
                  <strong>{previewPrediction.lunarClosestApproach} km</strong>
                </div>
                <div>
                  <span>Score change</span>
                  <strong>{previewPrediction.scoreDelta > 0 ? "+" : ""}{previewPrediction.scoreDelta}</strong>
                </div>
                <div>
                  <span>Committed plan</span>
                  <strong>{actionProfiles[committedAction].label}</strong>
                </div>
              </div>

              <button className="primary-action" onClick={commitAction} disabled={missionResolved}>
                {hasPendingChange ? "Commit Maneuver" : "Recommit Maneuver"}
              </button>
              {commitMessage ? <p className="commit-message">{commitMessage}</p> : null}
              <button
                className="secondary-action"
                disabled={missionResolved}
                onClick={clearAction}
              >
                Clear Target Plan
              </button>
            </>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
