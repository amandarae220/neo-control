import { useLocation, useNavigate } from "react-router-dom";

type ResultsState = {
  score: number;
  outcome: string;
  deflectedCount: number;
  totalThreats: number;
  moonCollisionCount: number;
  highestImpactRisk: number;
  highestMoonRisk: number;
  scenarioTitle: string;
};

function isResultsState(s: unknown): s is ResultsState {
  if (!s || typeof s !== 'object') return false;
  const r = s as Record<string, unknown>;
  return (
    typeof r.score             === 'number' &&
    typeof r.outcome           === 'string' &&
    typeof r.deflectedCount    === 'number' &&
    typeof r.totalThreats      === 'number' &&
    typeof r.moonCollisionCount === 'number' &&
    typeof r.highestImpactRisk === 'number' &&
    typeof r.highestMoonRisk   === 'number' &&
    typeof r.scenarioTitle     === 'string'
  );
}

export default function ResultsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const results = isResultsState(state) ? state : null;

  if (!results) {
    return (
      <main className="page-shell">
        <h1>Mission Results</h1>
        <p>No mission data available.</p>
        <button className="secondary-action" onClick={() => navigate("/missions")}>
          Select Mission
        </button>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <p className="eyebrow">{results.scenarioTitle}</p>
      <h1>Mission Results</h1>
      <p className="result-outcome">{results.outcome}</p>
      <div className="result-grid">
        <div>
          <span>Final score</span>
          <strong>{results.score}</strong>
        </div>
        <div>
          <span>Threats redirected</span>
          <strong>
            {results.deflectedCount} / {results.totalThreats}
          </strong>
        </div>
        <div>
          <span>Highest Earth risk</span>
          <strong>{results.highestImpactRisk}%</strong>
        </div>
        <div>
          <span>Highest Moon risk</span>
          <strong>{results.highestMoonRisk}%</strong>
        </div>
        {results.moonCollisionCount > 0 && (
          <div>
            <span>Moon impacts</span>
            <strong>{results.moonCollisionCount}</strong>
          </div>
        )}
      </div>
      <button className="primary-action" onClick={() => navigate("/missions")}>
        Mission Select
      </button>
    </main>
  );
}
