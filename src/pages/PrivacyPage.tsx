import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <main className="page-shell privacy-page">
      <p className="eyebrow">NEO Control</p>
      <h1>Privacy Policy</h1>
      <p className="privacy-updated">Last updated: June 2026</p>

      <section className="privacy-section">
        <h2>What We Collect</h2>
        <p>When you play NEO Control, we record the following per game session:</p>
        <ul>
          <li><strong>Game data</strong> — score, wave reached, session duration, path choices at each briefing, powerup selections, and whether the pause button was used</li>
          <li><strong>Device and browser type</strong> — whether you played with touch or keyboard controls, and your browser name (Chrome, Firefox, Safari, etc.) so we can tune the experience</li>
          <li><strong>A random player ID</strong> — a UUID generated once and stored in your browser's <code>localStorage</code> under the key <code>neo_player_id</code>. It is not linked to your name, email address, or any external account</li>
          <li><strong>Display name</strong> — only if you choose to submit a score to the leaderboard. You can enter any name you like; we do not verify it</li>
        </ul>
      </section>

      <section className="privacy-section">
        <h2>Analytics</h2>
        <p>
          This site uses <strong>Vercel Analytics</strong>, which collects anonymised visitor
          data — page views, referrer URLs, and an approximate location derived from your IP
          address. Vercel does not set tracking cookies or build individual user profiles.
          See <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel's privacy policy</a> for full details.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Where Data Is Stored</h2>
        <p>
          Session records and leaderboard entries are stored in <strong>Supabase</strong>,
          a cloud database hosted on AWS infrastructure in the United States.
          Your player ID lives only in your browser's <code>localStorage</code> and is never
          transmitted elsewhere. Vercel retains analytics data subject to their own retention policy.
        </p>
      </section>

      <section className="privacy-section">
        <h2>How Long We Keep It</h2>
        <p>
          Session records are kept indefinitely for gameplay analytics. Leaderboard entries
          are kept until removed on request. You can ask for your data to be deleted at any
          time — see below.
        </p>
      </section>

      <section className="privacy-section">
        <h2>What We Don't Do</h2>
        <ul>
          <li>We do not sell or share your data with advertisers or third-party marketers</li>
          <li>We do not require an account, email address, or any personal information to play</li>
          <li>We do not use cookies for tracking or analytics purposes</li>
          <li>We do not collect payment information</li>
        </ul>
      </section>

      <section className="privacy-section">
        <h2>Your Rights</h2>
        <p>
          You can request deletion of any data associated with your player ID at any time.
          Email <a href="mailto:amandarae19@gmail.com">amandarae19@gmail.com</a> with your
          player ID, which you can find in your browser's <code>localStorage</code> under
          the key <code>neo_player_id</code>. We will remove your records within 30 days.
        </p>
        <p style={{ marginTop: '10px' }}>
          If you are in the European Economic Area, you also have the right to access,
          correct, and port your data under GDPR.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Contact</h2>
        <p>
          Questions about this policy? Email <a href="mailto:amandarae19@gmail.com">amandarae19@gmail.com</a>.
        </p>
      </section>

      <Link to="/" className="privacy-back">← Back to Mission</Link>
    </main>
  );
}
