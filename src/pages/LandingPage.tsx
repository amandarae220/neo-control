import { useNavigate, Link } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="page-shell landing-shell">
      <p className="eyebrow">NEO Control · Incident Report Vol. I</p>
      <h1>Space Cadet</h1>
      <p>The autopilot is broken. You are not qualified for this.<br />You were the only one who picked up the phone.</p>
      <p className="landing-controls">← → move &nbsp; Z shoot &nbsp; ESC bail out</p>
      <button className="primary-action compact" onClick={() => navigate("/game")}>
        Accept Mission
      </button>
      <Link to="/privacy" className="landing-privacy">Privacy Policy</Link>
    </main>
  );
}
