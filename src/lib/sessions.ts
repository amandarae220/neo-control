import { supabase } from './supabase';

export type SessionRow = {
  id?:               string;
  player_id:         string;
  score:             number;
  wave:              number;
  device:            'touch' | 'keyboard';
  browser:           string;
  replay_number:     number;
  duration_seconds:  number;
  path_choices?:     Record<string, 1 | 2>;
  pause_used?:       boolean;
  powerup_choices?:  Record<string, string>;
  created_at?:       string;
};

export async function submitSession(
  data: Omit<SessionRow, 'id' | 'created_at'>,
): Promise<void> {
  if (!supabase) return;
  await supabase.from('sessions').insert(data);
}

export async function fetchSessions(): Promise<{ sessions: SessionRow[]; error: string | null }> {
  if (!supabase) return { sessions: [], error: 'No database connection' };
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000);
  return {
    sessions: (data ?? []) as SessionRow[],
    error: error?.message ?? null,
  };
}
