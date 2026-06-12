import { useEffect, useState } from 'react';
import { fetchSessions, type SessionRow } from '../lib/sessions';

const PASS = import.meta.env.VITE_ADMIN_PASS as string | undefined;

// ── icons ────────────────────────────────────────────────────────────────────

function IconCrosshair() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="11" cy="11" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="11" y1="1.5" x2="11" y2="5"    stroke="currentColor" strokeWidth="1.5"/>
      <line x1="11" y1="17"  x2="11" y2="20.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="1.5" y1="11" x2="5"   y2="11"  stroke="currentColor" strokeWidth="1.5"/>
      <line x1="17"  y1="11" x2="20.5" y2="11" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2"  y="16" width="4" height="5"  fill="currentColor" rx="0.5"/>
      <rect x="8"  y="11" width="4" height="10" fill="currentColor" rx="0.5"/>
      <rect x="14" y="6"  width="4" height="15" fill="currentColor" rx="0.5"/>
      <polyline points="14,1 20,1 20,7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="miter"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="11,6 11,11 15,14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="square" strokeLinejoin="miter"/>
      <circle cx="11" cy="11" r="1" fill="currentColor"/>
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M18 11 A7 7 0 1 1 11 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="square"/>
      <polyline points="10.5,1.5 10.5,6 15,6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="miter"/>
    </svg>
  );
}

// ── small utilities ───────────────────────────────────────────────────────────

function pct(n: number, total: number): string {
  if (!total) return '—';
  return `${n} (${Math.round((n / total) * 100)}%)`;
}

function median(vals: number[]): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function fmtDur(s: number): string {
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

// ── funnel chart ─────────────────────────────────────────────────────────────

function funnelStageColor(i: number, n: number): string {
  // green → amber as retention falls
  const t = n > 1 ? i / (n - 1) : 0;
  const r = Math.round(102 + 145 * t);
  const g = Math.round(242 -  43 * t);
  const b = Math.round(165 -  59 * t);
  const a = +(0.88 - t * 0.28).toFixed(3);
  return `rgba(${r},${g},${b},${a})`;
}

function FunnelChart({ sessions }: { sessions: SessionRow[] }) {
  const total = sessions.length;

  if (total === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.88rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '28px 0' }}>
        No data yet
      </p>
    );
  }

  const maxWave = Math.max(...sessions.map(s => s.wave));
  const cap     = Math.min(maxWave, 8);
  const stages  = Array.from({ length: cap }, (_, i) => {
    const count = sessions.filter(s => s.wave >= i + 1).length;
    return { wave: i + 1, count, ratio: count / total };
  });

  const W      = 520;
  const MAX_BW = 460;
  const BAR_H  = 52;
  const GAP_H  = 30;
  const STEP   = BAR_H + GAP_H;
  const PAD_T  = 10;
  const svgH   = PAD_T + Math.max(0, stages.length - 1) * STEP + BAR_H + 38;

  return (
    <svg viewBox={`0 0 ${W} ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {stages.map((stage, i) => {
        const next  = stages[i + 1];
        const bw    = Math.max(6, MAX_BW * stage.ratio);
        const nbw   = next ? Math.max(6, MAX_BW * next.ratio) : bw;
        const bx    = (W - bw)  / 2;
        const nbx   = (W - nbw) / 2;
        const by    = PAD_T + i * STEP;
        const color = funnelStageColor(i, stages.length);
        const alpha = 0.88 - (stages.length > 1 ? (i / (stages.length - 1)) * 0.28 : 0);
        const textFill = alpha >= 0.65 ? 'rgba(4,4,10,0.88)' : 'rgba(232,224,255,0.92)';
        const drop  = next
          ? Math.round(((stage.count - next.count) / stage.count) * 100)
          : null;

        const fitFull = bw >= 320;
        const fitMid  = bw >= 150;

        return (
          <g key={i}>
            {/* funnel neck connecting this bar to the next */}
            {next && (
              <polygon
                points={`${bx},${by+BAR_H} ${bx+bw},${by+BAR_H} ${nbx+nbw},${by+STEP} ${nbx},${by+STEP}`}
                fill={color}
                opacity={0.15}
              />
            )}

            {/* bar */}
            <rect x={bx} y={by} width={bw} height={BAR_H} fill={color} rx={1}/>

            {/* text: wide / medium / narrow */}
            {fitFull ? (
              <>
                <text x={bx+12}    y={by+BAR_H/2+6} fontSize="16" fontFamily="VT323, monospace" fill={textFill}>WAVE {stage.wave}</text>
                <text x={W/2}      y={by+BAR_H/2+6} textAnchor="middle" fontSize="16" fontFamily="VT323, monospace" fill={textFill}>{stage.count.toLocaleString()} players</text>
                <text x={bx+bw-12} y={by+BAR_H/2+6} textAnchor="end"    fontSize="16" fontFamily="VT323, monospace" fill={textFill}>{Math.round(stage.ratio*100)}%</text>
              </>
            ) : fitMid ? (
              <>
                <text x={bx+10}    y={by+BAR_H/2+6} fontSize="16" fontFamily="VT323, monospace" fill={textFill}>W{stage.wave}</text>
                <text x={bx+bw-10} y={by+BAR_H/2+6} textAnchor="end"    fontSize="16" fontFamily="VT323, monospace" fill={textFill}>{Math.round(stage.ratio*100)}%</text>
              </>
            ) : (
              <text x={bx+bw+8} y={by+BAR_H/2+6} fontSize="14" fontFamily="VT323, monospace" fill="var(--muted)">
                W{stage.wave} {Math.round(stage.ratio*100)}%
              </text>
            )}

            {/* drop-off label between bars */}
            {drop !== null && (
              <text x={W/2} y={by+BAR_H+GAP_H/2+5} textAnchor="middle" fontSize="13" fontFamily="VT323, monospace" fill="rgba(255,90,90,0.78)">
                ↓ {drop}% dropped
              </text>
            )}
          </g>
        );
      })}

      {/* colour legend */}
      <g>
        <rect x={W/2-110} y={svgH-22} width={12} height={10} fill={funnelStageColor(0, 2)} rx={1}/>
        <text x={W/2-93} y={svgH-13} fontSize="12" fontFamily="VT323, monospace" fill="var(--muted)">strong retention</text>
        <rect x={W/2+44} y={svgH-22} width={12} height={10} fill={funnelStageColor(1, 2)} rx={1}/>
        <text x={W/2+61} y={svgH-13} fontSize="12" fontFamily="VT323, monospace" fill="var(--muted)">attrition</text>
      </g>
    </svg>
  );
}

// ── funnel summary strip ──────────────────────────────────────────────────────

function FunnelSummary({ sessions }: { sessions: SessionRow[] }) {
  const total   = sessions.length;
  if (total === 0) return null;
  const w3plus  = sessions.filter(s => s.wave >= 3).length;
  const w5plus  = sessions.filter(s => s.wave >= 5).length;
  const maxWave = Math.max(...sessions.map(s => s.wave));
  const pctFmt  = (n: number) => total ? `${Math.round((n / total) * 100)}%` : '—';
  return (
    <div className="admin-funnel-summary">
      <div className="admin-funnel-kpi">
        <span className="admin-funnel-kpi-val" style={{ color: 'var(--green)' }}>{pctFmt(total)}</span>
        <span className="admin-funnel-kpi-label">Started</span>
      </div>
      <div className="admin-funnel-divider"/>
      <div className="admin-funnel-kpi">
        <span className="admin-funnel-kpi-val" style={{ color: 'var(--green)' }}>{pctFmt(w3plus)}</span>
        <span className="admin-funnel-kpi-label">Wave 3+</span>
      </div>
      <div className="admin-funnel-divider"/>
      <div className="admin-funnel-kpi">
        <span className="admin-funnel-kpi-val" style={{ color: 'var(--amber)' }}>{pctFmt(w5plus)}</span>
        <span className="admin-funnel-kpi-label">Wave 5+</span>
      </div>
      <div className="admin-funnel-divider"/>
      <div className="admin-funnel-kpi">
        <span className="admin-funnel-kpi-val" style={{ color: 'var(--pink)' }}>{maxWave}</span>
        <span className="admin-funnel-kpi-label">Max Wave</span>
      </div>
    </div>
  );
}

// ── chart helpers ────────────────────────────────────────────────────────────

type Bar = { label: string; value: number };

function BarChart({ data, color = 'var(--cyan)' }: { data: Bar[]; color?: string }) {
  const max  = Math.max(...data.map(d => d.value), 1);
  const W    = 400;
  const H    = 120;
  const gap  = data.length > 20 ? 2 : 5;
  const bw   = Math.max(2, Math.floor((W - gap * (data.length - 1)) / data.length));
  const step = data.length > 20 ? 5 : data.length > 10 ? 2 : 1;

  if (data.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} 60`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <text x={W / 2} y="36" textAnchor="middle" fontSize="15" fill="var(--muted)" fontFamily="VT323, monospace">
          NO DATA YET
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1="0" y1={H} x2={W} y2={H} stroke="rgba(122,112,136,0.2)" strokeWidth="1"/>
      {data.map((d, i) => {
        const bh      = Math.max(d.value > 0 ? 4 : 0, Math.round((d.value / max) * H));
        const x       = i * (bw + gap);
        const y       = H - bh;
        const showLbl = i % step === 0;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} fill={color} opacity={0.8} rx={1}/>
            {showLbl && (
              <text x={x + bw / 2} y={H + 20} textAnchor="middle" fontSize="14" fill="var(--muted)" fontFamily="VT323, monospace">
                {d.label}
              </text>
            )}
            {d.value > 0 && bh > 18 && (
              <text x={x + bw / 2} y={Math.max(y - 5, 14)} textAnchor="middle" fontSize="14" fill={color} fontFamily="VT323, monospace">
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── line chart ───────────────────────────────────────────────────────────────

const COLOR_HEX: Record<string, string> = {
  'var(--cyan)':  '#00e5ff',
  'var(--green)': '#66f2a5',
  'var(--amber)': '#f7c76a',
  'var(--pink)':  '#ff4fd8',
};

type LinePt = { label: string; value: number; count?: number };

function LineChart({ data, color = 'var(--cyan)' }: { data: LinePt[]; color?: string }) {
  if (data.length < 2) {
    return (
      <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.88rem', textAlign: 'center', padding: '24px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Not enough data yet
      </p>
    );
  }

  const W     = 500;
  const H     = 140;
  const PL    = 12;
  const PR    = 12;
  const PT    = 20;
  const PB    = 28;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const hex   = COLOR_HEX[color] ?? '#00e5ff';
  const step  = data.length > 12 ? 3 : data.length > 6 ? 2 : 1;

  const vals  = data.map(d => d.value);
  const min   = Math.min(...vals);
  const max   = Math.max(...vals, min + 1);
  const range = max - min;

  const px = (i: number) => PL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const py = (v: number) => PT + plotH - ((v - min) / range) * plotH;

  const pts      = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');
  const areaPts  = `${px(0)},${PT + plotH} ${pts} ${px(data.length - 1)},${PT + plotH}`;

  const maxCount = Math.max(...data.map(d => d.count ?? 1), 1);
  const maxIdx   = vals.indexOf(max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="lc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={hex} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={hex} stopOpacity="0.01"/>
        </linearGradient>
      </defs>

      <polygon points={areaPts} fill="url(#lc-grad)"/>
      <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="rgba(122,112,136,0.2)" strokeWidth="1"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>

      {data.map((d, i) => {
        const cx = px(i);
        const cy = py(d.value);
        const r  = 3 + Math.round(((d.count ?? 1) / maxCount) * 3);
        const showVal = i === 0 || i === data.length - 1 || i === maxIdx;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.88"/>
            {showVal && (
              <text
                x={cx}
                y={cy - r - 4}
                textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                fontSize="13"
                fontFamily="VT323, monospace"
                fill={color}
              >
                {d.value.toLocaleString()}
              </text>
            )}
            {i % step === 0 && (
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="13" fontFamily="VT323, monospace" fill="var(--muted)">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── player progression card ───────────────────────────────────────────────────

function PlayerProgressionCard({ sessions }: { sessions: SessionRow[] }) {
  const byReplay: Record<number, SessionRow[]> = {};
  sessions.forEach(s => {
    if (!byReplay[s.replay_number]) byReplay[s.replay_number] = [];
    byReplay[s.replay_number].push(s);
  });

  const maxReplay = Math.min(Math.max(...Object.keys(byReplay).map(Number), 1), 20);

  const data: LinePt[] = Array.from({ length: maxReplay }, (_, i) => {
    const r     = i + 1;
    const group = byReplay[r] ?? [];
    if (!group.length) return null;
    return {
      label: String(r),
      value: Math.round(group.reduce((a, s) => a + s.score, 0) / group.length),
      count: group.length,
    };
  }).filter((d): d is LinePt => d !== null);

  const first      = data[0]?.value ?? 0;
  const last       = data[data.length - 1]?.value ?? 0;
  const lastLabel  = data[data.length - 1]?.label ?? '';
  const improvement = first ? Math.round(((last - first) / first) * 100) : 0;

  const verdict = data.length < 2
    ? 'Not enough replay data yet'
    : improvement > 5
    ? `Avg score improves ${improvement}% by replay ${lastLabel} — players are learning`
    : improvement < -5
    ? `Avg score drops ${Math.abs(improvement)}% by replay ${lastLabel} — later attempts score lower`
    : `Consistent performance across ${lastLabel} replays — score stays flat`;

  return (
    <ChartCard title="Player Progression Curve" color="var(--pink)" wide>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        Avg score by replay attempt · dot size = sample size
      </p>
      <LineChart data={data} color="var(--pink)"/>
      <p className="path-cmp-verdict">{verdict}</p>
    </ChartCard>
  );
}

// ── cohort retention table ────────────────────────────────────────────────────

function mondayOf(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  out.setDate(out.getDate() - (day === 0 ? 6 : day - 1));
  out.setHours(0, 0, 0, 0);
  return out;
}

type RetentionCell = { count: number; pct: number } | null;
type CohortRow = {
  label:   string;
  weekStart: Date;
  players: number;
  d1:  RetentionCell;
  d7:  RetentionCell;
  d30: RetentionCell;
};

function buildCohorts(sessions: SessionRow[]): { rows: CohortRow[]; totals: Omit<CohortRow, 'label' | 'weekStart'> } {
  const byPlayer: Record<string, Date[]> = {};
  sessions.forEach(s => {
    if (!s.created_at) return;
    if (!byPlayer[s.player_id]) byPlayer[s.player_id] = [];
    byPlayer[s.player_id].push(new Date(s.created_at));
  });

  const playerFirst: Record<string, Date>   = {};
  const playerDates: Record<string, Date[]> = {};
  Object.entries(byPlayer).forEach(([pid, dates]) => {
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    playerFirst[pid] = sorted[0];
    playerDates[pid] = sorted;
  });

  const cohortMap: Record<string, { weekStart: Date; pids: string[] }> = {};
  Object.entries(playerFirst).forEach(([pid, first]) => {
    const mon = mondayOf(first);
    const key = mon.toISOString().slice(0, 10);
    if (!cohortMap[key]) cohortMap[key] = { weekStart: mon, pids: [] };
    cohortMap[key].pids.push(pid);
  });

  const today = Date.now();

  const retCell = (pids: string[], days: number): RetentionCell => {
    const elapsed = (today - Math.min(...pids.map(pid => playerFirst[pid].getTime()))) / 86_400_000;
    if (elapsed < days) return null; // not enough time has passed
    const returned = pids.filter(pid => {
      const first    = playerFirst[pid].getTime();
      const laterSessions = playerDates[pid].filter(d => d.getTime() > first);
      return laterSessions.some(d => (d.getTime() - first) / 86_400_000 <= days);
    }).length;
    return { count: returned, pct: pids.length ? Math.round((returned / pids.length) * 100) : 0 };
  };

  const rows: CohortRow[] = Object.entries(cohortMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { weekStart, pids }]) => ({
      label:    weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weekStart,
      players:  pids.length,
      d1:  retCell(pids, 1),
      d7:  retCell(pids, 7),
      d30: retCell(pids, 30),
    }));

  const allPids = Object.keys(playerFirst);
  const totals = {
    players: allPids.length,
    d1:  retCell(allPids, 1),
    d7:  retCell(allPids, 7),
    d30: retCell(allPids, 30),
  };

  return { rows, totals };
}

function retentionColor(pct: number): string {
  if (pct >= 30) return 'var(--green)';
  if (pct >= 15) return 'var(--amber)';
  return 'var(--muted)';
}

function RetentionCell({ cell }: { cell: RetentionCell }) {
  if (cell === null) return <td style={{ color: 'rgba(122,112,136,0.4)', fontFamily: 'var(--mono)', textAlign: 'center' }}>—</td>;
  return (
    <td style={{ textAlign: 'center' }}>
      <span style={{ fontFamily: 'var(--mono)', color: retentionColor(cell.pct), fontSize: '1rem' }}>
        {cell.pct}%
      </span>
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: '0.75rem', display: 'block', lineHeight: 1.2 }}>
        {cell.count} players
      </span>
    </td>
  );
}

function CohortRetentionTable({ sessions }: { sessions: SessionRow[] }) {
  if (!sessions.length) return null;

  const { rows, totals } = buildCohorts(sessions);

  return (
    <div className="admin-table-wrap">
      <table className="admin-table cohort-table">
        <thead>
          <tr>
            <th>Cohort (week of)</th>
            <th style={{ textAlign: 'center' }}>New Players</th>
            <th style={{ textAlign: 'center' }}>D1 · next day</th>
            <th style={{ textAlign: 'center' }}>D7 · 1 week</th>
            <th style={{ textAlign: 'center' }}>D30 · 1 month</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <td style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{r.label}</td>
              <td style={{ color: 'var(--cyan)', fontFamily: 'var(--mono)', textAlign: 'center' }}>{r.players}</td>
              <RetentionCell cell={r.d1}/>
              <RetentionCell cell={r.d7}/>
              <RetentionCell cell={r.d30}/>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '1px solid var(--border-strong)' }}>
            <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Total</td>
            <td style={{ color: 'var(--cyan)', fontFamily: 'var(--mono)', textAlign: 'center', fontWeight: 700 }}>{totals.players}</td>
            <RetentionCell cell={totals.d1}/>
            <RetentionCell cell={totals.d7}/>
            <RetentionCell cell={totals.d30}/>
          </tr>
        </tfoot>
      </table>
    </div>
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
    ['0–999',   0,     999],
    ['1k–4k',   1000,  4999],
    ['5k–9k',   5000,  9999],
    ['10k–19k', 10000, 19999],
    ['20k–49k', 20000, 49999],
    ['50k+',    50000, Infinity],
  ];
  return buckets.map(([label, lo, hi]) => ({
    label,
    value: sessions.filter(s => s.score >= lo && s.score <= hi).length,
  }));
}

function durationDistribution(sessions: SessionRow[]): Bar[] {
  const buckets: [string, number, number][] = [
    ['<1m',   0,   59],
    ['1–3m',  60,  179],
    ['3–7m',  180, 419],
    ['7–15m', 420, 899],
    ['15m+',  900, Infinity],
  ];
  return buckets.map(([label, lo, hi]) => ({
    label,
    value: sessions.filter(s => s.duration_seconds >= lo && s.duration_seconds <= hi).length,
  }));
}

function replayDistribution(sessions: SessionRow[]): Bar[] {
  const byPlayer: Record<string, number> = {};
  sessions.forEach(s => { byPlayer[s.player_id] = Math.max(byPlayer[s.player_id] ?? 0, s.replay_number); });
  return [
    ...Array.from({ length: 9 }, (_, i) => ({
      label: String(i + 1),
      value: Object.values(byPlayer).filter(v => v === i + 1).length,
    })),
    { label: '10+', value: Object.values(byPlayer).filter(v => v >= 10).length },
  ];
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

// ── path comparison ──────────────────────────────────────────────────────────

const PATH_META = {
  2: [
    { name: 'Gravity Field Approach', tag: 'Dense rocks · strong pull' },
    { name: 'High-Velocity Corridor', tag: 'Fast rocks · +30% bonus' },
  ],
  4: [
    { name: 'Direct Intercept',       tag: 'High UFOs · +50% bonus' },
    { name: 'Stealth Corridor',       tag: 'Reduced enemies' },
  ],
  6: [
    { name: 'Force Through',          tag: 'Extreme conditions · +100% bonus' },
    { name: 'Work the Angles',        tag: 'Near-zero gravity · precision' },
  ],
} as const;

function PathComparisonCard({ sessions, waveNum }: { sessions: SessionRow[]; waveNum: 2 | 4 | 6 }) {
  const key   = `wave_${waveNum}_path`;
  const s1    = sessions.filter(s => s.path_choices?.[key] === 1);
  const s2    = sessions.filter(s => s.path_choices?.[key] === 2);
  if (s1.length === 0 && s2.length === 0) return null;

  const meta  = PATH_META[waveNum];
  const total = s1.length + s2.length;

  const avgOf = (arr: SessionRow[], fn: (s: SessionRow) => number) =>
    arr.length ? arr.reduce((a, s) => a + fn(s), 0) / arr.length : null;

  const score1 = avgOf(s1, s => s.score);
  const score2 = avgOf(s2, s => s.score);
  const wave1  = avgOf(s1, s => s.wave);
  const wave2  = avgOf(s2, s => s.wave);

  const scoreWin = score1 !== null && score2 !== null
    ? (score1 > score2 ? 1 : score2 > score1 ? 2 : 0) : 0;
  const waveWin  = wave1 !== null && wave2 !== null
    ? (wave1 > wave2 ? 1 : wave2 > wave1 ? 2 : 0) : 0;

  const p1wins = (scoreWin === 1 ? 1 : 0) + (waveWin === 1 ? 1 : 0);
  const p2wins = (scoreWin === 2 ? 1 : 0) + (waveWin === 2 ? 1 : 0);
  const verdict = p1wins > p2wins
    ? `${meta[0].name} led to better outcomes`
    : p2wins > p1wins
    ? `${meta[1].name} led to better outcomes`
    : 'Both paths had comparable outcomes';

  return (
    <ChartCard title={`Wave ${waveNum} — Path Choice Outcomes`} color="var(--amber)" wide>
      <div className="path-cmp">

        <div className="path-cmp-side">
          <p className="path-cmp-name" style={{ color: 'var(--cyan)' }}>{meta[0].name}</p>
          <p className="path-cmp-tag">{meta[0].tag}</p>
          <div className="path-cmp-metrics">
            <div className="path-cmp-metric">
              <span className="path-cmp-metric-label">avg score</span>
              <span className="path-cmp-metric-val" style={{ color: 'var(--cyan)' }}>
                {score1 !== null ? Math.round(score1).toLocaleString() : '—'}
                {scoreWin === 1 && <span className="path-cmp-winner"> ▲</span>}
              </span>
            </div>
            <div className="path-cmp-metric">
              <span className="path-cmp-metric-label">avg wave</span>
              <span className="path-cmp-metric-val" style={{ color: 'var(--cyan)' }}>
                {wave1 !== null ? wave1.toFixed(1) : '—'}
                {waveWin === 1 && <span className="path-cmp-winner"> ▲</span>}
              </span>
            </div>
          </div>
        </div>

        <div className="path-cmp-center">
          <p className="path-cmp-center-label">Player Split</p>
          <div className="path-cmp-split-bar">
            {s1.length > 0 && <div className="path-cmp-split-p1" style={{ flex: s1.length }}/>}
            {s2.length > 0 && <div className="path-cmp-split-p2" style={{ flex: s2.length }}/>}
          </div>
          <div className="path-cmp-split-pcts">
            <span style={{ color: 'var(--cyan)' }}>{total ? Math.round(s1.length / total * 100) : 0}%</span>
            <span style={{ color: 'var(--pink)' }}>{total ? Math.round(s2.length / total * 100) : 0}%</span>
          </div>
          <p className="path-cmp-split-counts">{s1.length} vs {s2.length} players</p>
        </div>

        <div className="path-cmp-side path-cmp-side--r">
          <p className="path-cmp-name" style={{ color: 'var(--pink)' }}>{meta[1].name}</p>
          <p className="path-cmp-tag">{meta[1].tag}</p>
          <div className="path-cmp-metrics">
            <div className="path-cmp-metric path-cmp-metric--r">
              <span className="path-cmp-metric-label">avg score</span>
              <span className="path-cmp-metric-val" style={{ color: 'var(--pink)' }}>
                {scoreWin === 2 && <span className="path-cmp-winner">▲ </span>}
                {score2 !== null ? Math.round(score2).toLocaleString() : '—'}
              </span>
            </div>
            <div className="path-cmp-metric path-cmp-metric--r">
              <span className="path-cmp-metric-label">avg wave</span>
              <span className="path-cmp-metric-val" style={{ color: 'var(--pink)' }}>
                {waveWin === 2 && <span className="path-cmp-winner">▲ </span>}
                {wave2 !== null ? wave2.toFixed(1) : '—'}
              </span>
            </div>
          </div>
        </div>

      </div>
      <p className="path-cmp-verdict">{verdict}</p>
    </ChartCard>
  );
}

// ── stat tile with tooltip ────────────────────────────────────────────────────

type TipRow = { label: string; value: string; highlight?: boolean };

function Stat({ label, value, icon, accent = 'var(--cyan)', tooltip }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  tooltip?: TipRow[];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="admin-stat-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="admin-stat" style={{ borderTopColor: accent }}>
        <div className="admin-stat-header">
          <span className="admin-stat-icon" style={{ color: accent }}>{icon}</span>
          <span className="admin-stat-label">{label}</span>
        </div>
        <strong className="admin-stat-value" style={{ color: accent }}>{value}</strong>
      </div>
      {hovered && tooltip && tooltip.length > 0 && (
        <div className="admin-tooltip" role="tooltip">
          {tooltip.map(row => (
            <div key={row.label} className="admin-tooltip-row">
              <span className="admin-tooltip-label">{row.label}</span>
              <span className="admin-tooltip-val" style={row.highlight ? { color: accent } : undefined}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── chart card ───────────────────────────────────────────────────────────────

function ChartCard({ title, children, color = 'var(--cyan)', wide = false }: {
  title: string;
  children: React.ReactNode;
  color?: string;
  wide?: boolean;
}) {
  return (
    <div className={`admin-card${wide ? ' admin-card-wide' : ''}`}>
      <p className="admin-card-title" style={{ borderLeft: `2px solid ${color}` }}>{title}</p>
      {children}
    </div>
  );
}

// ── component ────────────────────────────────────────────────────────────────

type TimeFilter = 'all' | '24h' | '7d' | '30d';

export default function AdminPage() {
  const [input,         setInput]         = useState('');
  const [authed,        setAuthed]        = useState(false);
  const [sessions,      setSessions]      = useState<SessionRow[]>([]);
  const [error,         setError]         = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);
  const [deviceFilter,  setDeviceFilter]  = useState('');
  const [browserFilter, setBrowserFilter] = useState('');
  const [timeFilter,    setTimeFilter]    = useState<TimeFilter>('all');

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

  // ── filter options derived from raw data ──
  const allDevices  = [...new Set(sessions.map(s => s.device))].sort();
  const allBrowsers = [...new Set(sessions.map(s => s.browser))].sort();
  const hasFilter   = !!(deviceFilter || browserFilter || timeFilter !== 'all');

  // ── apply filters ──
  const filteredSessions = sessions.filter(s => {
    if (deviceFilter  && s.device  !== deviceFilter)  return false;
    if (browserFilter && s.browser !== browserFilter) return false;
    if (timeFilter !== 'all') {
      const cutoff = new Date();
      if (timeFilter === '24h') cutoff.setHours(cutoff.getHours() - 24);
      else if (timeFilter === '7d')  cutoff.setDate(cutoff.getDate() - 7);
      else if (timeFilter === '30d') cutoff.setDate(cutoff.getDate() - 30);
      if (!s.created_at || new Date(s.created_at) < cutoff) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setDeviceFilter('');
    setBrowserFilter('');
    setTimeFilter('all');
  };

  // ── aggregate metrics ──
  const n            = filteredSessions.length;
  const uniquePlayers = new Set(filteredSessions.map(s => s.player_id)).size;
  const avgScore     = n ? Math.round(filteredSessions.reduce((a, s) => a + s.score, 0) / n) : 0;
  const avgWave      = n ? (filteredSessions.reduce((a, s) => a + s.wave, 0) / n).toFixed(1) : '—';
  const avgDuration  = n ? Math.round(filteredSessions.reduce((a, s) => a + s.duration_seconds, 0) / n) : 0;
  const replayRate   = n ? Math.round((filteredSessions.filter(s => s.replay_number > 1).length / n) * 100) : 0;

  // ── tooltip data ──
  const scores = filteredSessions.map(s => s.score);
  const scoreTooltip: TipRow[] = n ? [
    { label: 'High Score',   value: Math.max(...scores).toLocaleString(),   highlight: true },
    { label: 'Median Score', value: median(scores).toLocaleString() },
    { label: 'Above 10k',    value: pct(scores.filter(v => v >= 10000).length, n) },
    { label: 'Above 50k',    value: pct(scores.filter(v => v >= 50000).length, n) },
  ] : [];

  const waves = filteredSessions.map(s => s.wave);
  const waveTooltip: TipRow[] = n ? [
    { label: 'Max Wave',  value: String(Math.max(...waves)),                               highlight: true },
    { label: 'Wave 3+',   value: pct(filteredSessions.filter(s => s.wave >= 3).length, n) },
    { label: 'Wave 5+',   value: pct(filteredSessions.filter(s => s.wave >= 5).length, n) },
    { label: 'Wave 7+',   value: pct(filteredSessions.filter(s => s.wave >= 7).length, n) },
  ] : [];

  const durations = filteredSessions.map(s => s.duration_seconds);
  const durTooltip: TipRow[] = n ? [
    { label: 'Longest',        value: fmtDur(Math.max(...durations)),                                        highlight: true },
    { label: 'Shortest',       value: fmtDur(Math.min(...durations)) },
    { label: 'Quick Bounces',  value: pct(filteredSessions.filter(s => s.duration_seconds < 60).length,  n) },
    { label: 'Long Sessions',  value: pct(filteredSessions.filter(s => s.duration_seconds >= 600).length, n) },
  ] : [];

  const playerCounts: Record<string, number> = {};
  filteredSessions.forEach(s => {
    playerCounts[s.player_id] = Math.max(playerCounts[s.player_id] ?? 0, s.replay_number);
  });
  const playerVals    = Object.values(playerCounts);
  const multiPlayers  = playerVals.filter(v => v > 1).length;
  const avgPlaysPerPlayer = uniquePlayers
    ? (playerVals.reduce((a, v) => a + v, 0) / uniquePlayers).toFixed(1)
    : '—';
  const replayTooltip: TipRow[] = n ? [
    { label: 'Unique Players',    value: String(uniquePlayers), highlight: true },
    { label: 'Avg Plays/Player',  value: avgPlaysPerPlayer },
    { label: 'Returned Players',  value: pct(multiPlayers, uniquePlayers) },
    { label: 'Top Player',        value: `${Math.max(...playerVals, 0)} plays` },
  ] : [];

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
        <strong style={{ color: 'var(--heading)' }}>{n}</strong>
        {n !== sessions.length && <span className="admin-meta-total"> / {sessions.length}</span>} sessions
        {' · '}
        <strong style={{ color: 'var(--heading)' }}>{uniquePlayers}</strong> unique players
        {lastUpdated && (
          <span className="admin-last-updated">
            {' · '}Updated {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </p>

      {/* ── filter bar ── */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <label className="admin-filter-label" htmlFor="filter-time">Timeframe</label>
          <select
            id="filter-time"
            className={`admin-filter-select${timeFilter !== 'all' ? ' is-active' : ''}`}
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value as TimeFilter)}
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        <div className="admin-filter-group">
          <label className="admin-filter-label" htmlFor="filter-device">Device</label>
          <select
            id="filter-device"
            className={`admin-filter-select${deviceFilter ? ' is-active' : ''}`}
            value={deviceFilter}
            onChange={e => setDeviceFilter(e.target.value)}
          >
            <option value="">All Devices</option>
            {allDevices.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>

        <div className="admin-filter-group">
          <label className="admin-filter-label" htmlFor="filter-browser">Browser</label>
          <select
            id="filter-browser"
            className={`admin-filter-select${browserFilter ? ' is-active' : ''}`}
            value={browserFilter}
            onChange={e => setBrowserFilter(e.target.value)}
          >
            <option value="">All Browsers</option>
            {allBrowsers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {hasFilter && (
          <button className="admin-filter-clear" onClick={clearFilters}>
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* ── 4-column paired layout ── */}
      <div className="admin-columns">

        <div className="admin-column">
          <Stat
            label="Avg Score" value={avgScore.toLocaleString()}
            icon={<IconCrosshair/>} accent="var(--cyan)"
            tooltip={scoreTooltip}
          />
          <ChartCard title="Score Distribution" color="var(--cyan)">
            <BarChart data={scoreDistribution(filteredSessions)} color="var(--cyan)"/>
          </ChartCard>
        </div>

        <div className="admin-column">
          <Stat
            label="Avg Wave" value={avgWave}
            icon={<IconTrendUp/>} accent="var(--green)"
            tooltip={waveTooltip}
          />
          <ChartCard title="Wave Dropoff" color="var(--green)">
            <BarChart data={waveDropoff(filteredSessions)} color="var(--green)"/>
          </ChartCard>
        </div>

        <div className="admin-column">
          <Stat
            label="Avg Duration" value={fmtDur(avgDuration)}
            icon={<IconClock/>} accent="var(--amber)"
            tooltip={durTooltip}
          />
          <ChartCard title="Session Length" color="var(--amber)">
            <BarChart data={durationDistribution(filteredSessions)} color="var(--amber)"/>
          </ChartCard>
        </div>

        <div className="admin-column">
          <Stat
            label="Replay Rate" value={`${replayRate}%`}
            icon={<IconRepeat/>} accent="var(--pink)"
            tooltip={replayTooltip}
          />
          <ChartCard title="Replays per Player" color="var(--pink)">
            <BarChart data={replayDistribution(filteredSessions)} color="var(--pink)"/>
          </ChartCard>
        </div>

      </div>

      {/* ── secondary charts ── */}
      <div className="admin-grid">
        <ChartCard title="Wave Progression Funnel" color="var(--green)" wide>
          <FunnelSummary sessions={filteredSessions}/>
          <FunnelChart sessions={filteredSessions}/>
        </ChartCard>

        <ChartCard title="Cohort Retention" color="var(--green)" wide>
          <CohortRetentionTable sessions={filteredSessions}/>
        </ChartCard>

        <ChartCard title="Plays — Last 30 Days" color="var(--cyan)">
          <BarChart data={playsOverTime(filteredSessions)} color="var(--cyan)"/>
        </ChartCard>

        <ChartCard title="Device" color="var(--cyan)">
          <BarChart data={splitBy(filteredSessions, 'device')} color="var(--cyan)"/>
        </ChartCard>

        <ChartCard title="Browser" color="var(--green)">
          <BarChart data={splitBy(filteredSessions, 'browser')} color="var(--green)"/>
        </ChartCard>

        {([2, 4, 6] as const).map(wn => (
          <PathComparisonCard key={wn} sessions={filteredSessions} waveNum={wn}/>
        ))}

        <PlayerProgressionCard sessions={filteredSessions}/>
      </div>

      {/* ── recent sessions table ── */}
      <div className="admin-card">
        <p className="admin-card-title" style={{ borderLeft: '2px solid var(--muted)' }}>
          Recent Sessions
        </p>
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
              {filteredSessions.slice(0, 50).map(s => (
                <tr key={s.id}>
                  <td>{s.created_at?.slice(0, 10)}</td>
                  <td className="admin-td-score">{s.score.toLocaleString()}</td>
                  <td className="admin-td-wave">{s.wave}</td>
                  <td className="admin-td-dur">{s.duration_seconds}s</td>
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
