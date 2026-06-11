const PLAYER_ID_KEY  = 'neo_player_id';
const PLAY_COUNT_KEY = 'neo_play_count';

export function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getAndIncrementPlayCount(): number {
  const n = parseInt(localStorage.getItem(PLAY_COUNT_KEY) ?? '0', 10) + 1;
  localStorage.setItem(PLAY_COUNT_KEY, String(n));
  return n;
}

export function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua))     return 'Edge';
  if (/Chrome\//.test(ua))  return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua))  return 'Safari';
  return 'Other';
}
