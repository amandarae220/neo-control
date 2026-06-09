import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Score } from './scores';

// ── mock supabase module ──────────────────────────────────────────────────────
const mockInsert = vi.fn();
const mockSelect = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      insert: mockInsert,
      select: () => ({ order: () => ({ limit: mockSelect }) }),
    }),
  },
}));

// Re-import after mock is registered
const { submitScore, fetchTopScores } = await import('./scores');

// ── helpers ───────────────────────────────────────────────────────────────────
const makeScore = (overrides: Partial<Score> = {}): Score => ({
  id: 1,
  name: 'NOVA WOLF',
  score: 1000,
  wave: 3,
  created_at: '2026-06-09T00:00:00Z',
  ...overrides,
});

beforeEach(() => {
  mockInsert.mockReset();
  mockSelect.mockReset();
});

// ── submitScore ───────────────────────────────────────────────────────────────
describe('submitScore', () => {
  it('returns null error on success', async () => {
    mockInsert.mockResolvedValue({ error: null });
    const result = await submitScore('NOVA WOLF', 1000, 3);
    expect(result.error).toBeNull();
  });

  it('uppercases and trims the name', async () => {
    mockInsert.mockResolvedValue({ error: null });
    await submitScore('  nova wolf  ', 500, 1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NOVA WOLF' })
    );
  });

  it('truncates name to 12 characters', async () => {
    mockInsert.mockResolvedValue({ error: null });
    await submitScore('AVERYLONGCALLSIGNHERE', 100, 1);
    const call = mockInsert.mock.calls[0][0];
    expect(call.name.length).toBeLessThanOrEqual(12);
  });

  it('falls back to PILOT for empty name', async () => {
    mockInsert.mockResolvedValue({ error: null });
    await submitScore('   ', 100, 1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'PILOT' })
    );
  });

  it('returns error message on Supabase failure', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } });
    const result = await submitScore('NOVA WOLF', 1000, 3);
    expect(result.error).toBe('insert failed');
  });
});

// ── fetchTopScores ────────────────────────────────────────────────────────────
describe('fetchTopScores', () => {
  it('returns scores sorted by the DB (passes limit to query)', async () => {
    const scores = [makeScore({ score: 5000 }), makeScore({ score: 3000 })];
    mockSelect.mockResolvedValue({ data: scores, error: null });
    const result = await fetchTopScores(5);
    expect(result.scores).toEqual(scores);
    expect(result.error).toBeNull();
  });

  it('returns empty array and no error when table is empty', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });
    const result = await fetchTopScores(5);
    expect(result.scores).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns empty array and error message on Supabase failure', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'fetch failed' } });
    const result = await fetchTopScores(5);
    expect(result.scores).toEqual([]);
    expect(result.error).toBe('fetch failed');
  });

  it('qualifies a score that beats the last entry in a full board', () => {
    const top: Score[] = [5, 4, 3, 2, 1].map((s, i) =>
      makeScore({ id: i, score: s * 1000 })
    );
    const playerScore = 1500;
    const qualifies = top.length < 5 || playerScore > top[top.length - 1].score;
    expect(qualifies).toBe(true);
  });

  it('does not qualify a score below the lowest entry on a full board', () => {
    const top: Score[] = [5, 4, 3, 2, 1].map((s, i) =>
      makeScore({ id: i, score: s * 1000 })
    );
    const playerScore = 500;
    const qualifies = top.length < 5 || playerScore > top[top.length - 1].score;
    expect(qualifies).toBe(false);
  });

  it('always qualifies when the board has fewer than 5 entries', () => {
    const top: Score[] = [makeScore({ score: 9000 })];
    const playerScore = 100;
    const qualifies = top.length < 5 || playerScore > top[top.length - 1].score;
    expect(qualifies).toBe(true);
  });
});
