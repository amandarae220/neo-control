import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="page-shell landing-shell">
      <p className="eyebrow">NEO Control · Incident Report Vol. I</p>
      <h1>Space Cadet</h1>
      <p>You are not qualified for this. The autopilot is broken.<br />You were the only one who picked up the phone.</p>
      <p className="landing-controls">← → move &nbsp; Z shoot &nbsp; ESC bail out</p>
      <button className="primary-action compact" onClick={() => navigate("/game")}>
        Accept Mission
      </button>
    </main>
  );
}
