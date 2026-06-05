import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="page-shell landing-shell">
      <p className="eyebrow">Orbital Defense System · Est. 1979</p>
      <h1>NEO Control</h1>
      <p>Rocks inbound. Aliens inbound. Earth not optional.</p>
      <p className="landing-controls">← → to move &nbsp; Z or SPACE to shoot &nbsp; ESC to retreat</p>
      <button className="primary-action compact" onClick={() => navigate("/game")}>
        Insert Coin
      </button>
    </div>
  );
}
