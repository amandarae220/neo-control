import { supabase } from './supabase';

export interface Score {
  id: number;
  name: string;
  score: number;
  wave: number;
  created_at: string;
}

export async function submitScore(name: string, score: number, wave: number): Promise<void> {
  if (!supabase) return;
  await supabase.from('scores').insert({
    name: name.toUpperCase().trim().slice(0, 6) || 'PILOT',
    score,
    wave,
  });
}

export async function fetchTopScores(limit = 10): Promise<Score[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('scores')
    .select('id, name, score, wave, created_at')
    .order('score', { ascending: false })
    .limit(limit);
  return (data as Score[]) ?? [];
}
