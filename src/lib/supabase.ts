import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key    = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// createClient appends /rest/v1 itself — strip it if accidentally included
const url = rawUrl?.replace(/\/rest\/v1\/?$/, '');

export const supabase = url && key ? createClient(url, key) : null;
