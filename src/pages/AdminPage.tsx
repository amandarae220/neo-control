import { useEffect, useState } from 'react';
import { fetchSessions, type SessionRow } from '../lib/sessions';

const PASS = import.meta.env.VITE_ADMIN_PASS as string | undefined;

// ── chart helpers ────────────────────────────────────────────────────────────

type Bar = { label: string; value: number };

function BarChart({ data, color = 'var(--cyan)' }: { data: Bar[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const W   = 400;
  const H   = 90;
  const gap = 3;
  const bw  = Math.max(1, Math.floor((W - gap * (data.length - 1)) / data.length));

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {data.map((d, i) => {
        const bh = Math.max(d.value > 0 ? 2 : 0, Math.round((d.value / max) * H));
        const x  = i * (bw + gap);
        const y  = H - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} fill={color} opacity={0.72} rx={1} />
            <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="VT323, monospace">
              {d.label}
            </text>
            {d.value > 0 && (
              <text x={x + bw / 2} y={Math.max(y - 3, 10)} textAnchor="middle" fontSize="10" fill={color} fontFamily="VT323, monospace">
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── data transforms ──────────────────────────────────────────────────────────

function playsOverTime(sessions: SessionRow[]): Bar[] {
  const days: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days[d.toISOString().slice(5, 10)] = 0;
  }
  sessions.forEach(s => {
    const key = s.created_at?.slice(5, 10);
    if (key && key in days) days[key]++;
  });
  return Object.entries(days).map(([label, value]) => ({
    label: label.replace(/^0/, ''),
    value,
  }));
}

function waveDropoff(sessions: SessionRow[]): Bar[] {
  const maxWave = Math.max(...sessions.map(s => s.wave), 1);
  const cap     = Math.min(maxWave, 10);
  return Array.from({ length: cap }, (_, i) => ({
    label: `W${i + 1}`,
    value: sessions.filter(s => s.wave >= i + 1).length,
  }));
}

function scoreDistribution(sessions: SessionRow[]): Bar[] {
  const buckets: [string, number, number][] = [
    ['0-999',   0,     999],
    ['1k-4k',   1000,  4999],
    ['5k-9k',   5000,  9999],
    ['10k-19k', 10000, 19999],
    ['20k-49k', 20000, 49999],
    ['50k+',    50000, Infinity],
  ];
  return buckets.map(([label, lo, hi]) => ({
    label,
    value: sessions.filter(s => s.score >= lo && s.score <= hi).length,
  }));
}

function splitBy(sessions: SessionRow[], key: keyof SessionRow): Bar[] {
  const counts: Record<string, number> = {};
  sessions.forEach(s => {
    const k = String(s[key]);
    counts[k] = (counts[k] ?? 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}

function pathChoiceSplit(sessions: SessionRow[], waveNum: number): Bar[] {
  const key = `wave_${waveNum}_path`;
  const c1  = sessions.filter(s => s.path_choices?.[key] === 1).length;
  const c2  = sessions.filter(s => s.path_choices?.[key] === 2).length;
  if (c1 === 0 && c2 === 0) return [];
  return [
    { label: 'Path 1', value: c1 },
    { label: 'Path 2', value: c2 },
  ];
}

function replayDistribution(sessions: SessionRow[]): Bar[] {
  const byPlayer: Record<string, number> = {};
  sessions.forEach(s => { byPlayer[s.player_id] = Math.max(byPlayer[s.player_id] ?? 0, s.replay_number); });
  const buckets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return [
    ...buckets.slice(0, 9).map(n => ({
      label: String(n),
      value: Object.values(byPlayer).filter(v => v === n).length,
    })),
    {
      label: '10+',
      value: Object.values(byPlayer).filter(v => v >= 10).length,
    },
  ];
}

// ── stat tile ────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-label">{label}</span>
      <strong className="admin-stat-value">{value}</strong>
    </div>
  );
}

// ── chart card ───────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-card">
      <p className="admin-card-title">{title}</p>
      {children}
    </div>
  );
}

// ── component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [input,       setInput]       = useState('');
  const [authed,      setAuthed]      = useState(false);
  const [sessions,    setSessions]    = useState<SessionRow[]>([]);
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = () => {
    setLoading(true);
    fetchSessions().then(({ sessions: rows, error: err }) => {
      setSessions(rows);
      setError(err);
      setLoading(false);
      if (!err) setLastUpdated(new Date());
    });
  };

  const attempt = () => {
    if (!PASS) { setError('VITE_ADMIN_PASS is not set.'); return; }
    if (input.trim() === PASS) setAuthed(true);
    else setError('WRONG PASSPHRASE');
  };

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  if (!authed) {
    return (
      <main className="page-shell admin-gate">
        <p className="eyebrow">NEO Control</p>
        <h1>Admin</h1>
        <div className="admin-auth-row">
          <input
            className="cheat-input"
            type="password"
            placeholder="PASSPHRASE"
            value={input}
            onChange={e => { setInput(e.target.value); setError(null); }}
            onKeyDown={e => e.key === 'Enter' && attempt()}
            aria-label="Admin passphrase"
            autoFocus
          />
          <button className="primary-action compact" onClick={attempt}>ENTER</button>
        </div>
        {error && <p className="admin-error">{error}</p>}
      </main>
    );
  }

  if (loading) {
    return <main className="page-shell"><p className="eyebrow">Loading sessions…</p></main>;
  }

  if (error) {
    return <main className="page-shell"><p className="admin-error">{error}</p></main>;
  }

  const uniquePlayers  = new Set(sessions.map(s => s.player_id)).size;
  const avgScore       = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) : 0;
  const avgWave        = sessions.length ? (sessions.reduce((a, s) => a + s.wave, 0) / sessions.length).toFixed(1) : '—';
  const avgDuration    = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.duration_seconds, 0) / sessions.length) : 0;
  const returning      = sessions.length ? Math.round((sessions.filter(s => s.replay_number > 1).length / sessions.length) * 100) : 0;

  return (
    <main className="page-shell">
      <p className="eyebrow">NEO Control · Admin</p>
      <div className="admin-header-row">
        <h1>Player Analytics</h1>
        <button
          className="secondary-action compact"
          onClick={load}
          disabled={loading}
          aria-label="Refresh analytics data"
        >
          {loading ? 'REFRESHING…' : '↻ REFRESH'}
        </button>
      </div>
      <p className="admin-meta">
        {sessions.length} sessions · {uniquePlayers} unique players
        {lastUpdated && (
          <span className="admin-last-updated">
            · Last updated {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </p>

      <div className="admin-stats-row">
        <Stat label="Avg Score"      value={avgScore.toLocaleString()} />
        <Stat label="Avg Wave"       value={avgWave} />
        <Stat label="Avg Duration"   value={`${avgDuration}s`} />
        <Stat label="Replay Rate"    value={`${returning}%`} />
      </div>

      <div className="admin-grid">
        <ChartCard title="Plays — Last 30 Days">
          <BarChart data={playsOverTime(sessions)} color="var(--cyan)" />
        </ChartCard>

        <ChartCard title="Wave Dropoff">
          <BarChart data={waveDropoff(sessions)} color="var(--green)" />
        </ChartCard>

        <ChartCard title="Score Distribution">
          <BarChart data={scoreDistribution(sessions)} color="var(--amber)" />
        </ChartCard>

        <ChartCard title="Replays per Player">
          <BarChart data={replayDistribution(sessions)} color="var(--pink)" />
        </ChartCard>

        <ChartCard title="Device">
          <BarChart data={splitBy(sessions, 'device')} color="var(--cyan)" />
        </ChartCard>

        <ChartCard title="Browser">
          <BarChart data={splitBy(sessions, 'browser')} color="var(--green)" />
        </ChartCard>

        {[2, 4, 6].map(wn => {
          const d = pathChoiceSplit(sessions, wn);
          if (d.length === 0) return null;
          return (
            <ChartCard key={wn} title={`Wave ${wn} Path Choice`}>
              <BarChart data={d} color="var(--amber)" />
            </ChartCard>
          );
        })}
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <p className="admin-card-title">Recent Sessions</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Score</th>
                <th>Wave</th>
                <th>Duration</th>
                <th>Replay #</th>
                <th>Device</th>
                <th>Browser</th>
                <th>Player ID</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 50).map(s => (
                <tr key={s.id}>
                  <td>{s.created_at?.slice(0, 10)}</td>
                  <td>{s.score.toLocaleString()}</td>
                  <td>{s.wave}</td>
                  <td>{s.duration_seconds}s</td>
                  <td>{s.replay_number}</td>
                  <td>{s.device}</td>
                  <td>{s.browser}</td>
                  <td className="admin-player-id">{s.player_id.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
