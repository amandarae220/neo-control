import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="page-shell landing-shell">
      <p className="eyebrow">Orbital Defense Simulator</p>
      <h1>NEO Control</h1>
      <p>Track incoming objects, choose deflection maneuvers, and protect Earth under pressure.</p>
      <button className="primary-action compact" onClick={() => navigate("/missions")}>
        Start Simulation
      </button>
    </div>
  );
}
