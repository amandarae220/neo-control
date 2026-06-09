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
  const { error } = await supabase.from('scores').insert({
    name: name.toUpperCase().trim().slice(0, 12) || 'PILOT',
    score,
    wave,
  });
  if (error) console.error('[scores] insert failed:', error.message, error.details);
}

export async function fetchTopScores(limit = 5): Promise<Score[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('scores')
    .select('id, name, score, wave, created_at')
    .order('score', { ascending: false })
    .limit(limit);
  if (error) console.error('[scores] fetch failed:', error.message, error.details);
  return (data as Score[]) ?? [];
}
