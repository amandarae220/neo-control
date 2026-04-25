import { useNavigate } from "react-router-dom";
import { scenarios } from "../data/scenarios";

export default function MissionSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <h1>Select Mission</h1>
      <div className="mission-card-grid">
        {scenarios.map((scenario) => (
          <article className="mission-card" key={scenario.id}>
            <h2>{scenario.title}</h2>
            <p>{scenario.description}</p>
            <button className="secondary-action" onClick={() => navigate(`/mission/${scenario.id}`)}>
              Start
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
