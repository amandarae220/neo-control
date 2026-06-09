import { supabase } from './supabase';

export interface Score {
  id: number;
  name: string;
  score: number;
  wave: number;
  created_at: string;
}

export async function submitScore(name: string, score: number, wave: number): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.from('scores').insert({
    name: name.toUpperCase().trim().slice(0, 12) || 'PILOT',
    score,
    wave,
  });
  return { error: error?.message ?? null };
}

export async function fetchTopScores(limit = 5): Promise<{ scores: Score[]; error: string | null }> {
  if (!supabase) return { scores: [], error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('scores')
    .select('id, name, score, wave, created_at')
    .order('score', { ascending: false })
    .limit(limit);
  return { scores: (data as Score[]) ?? [], error: error?.message ?? null };
}
