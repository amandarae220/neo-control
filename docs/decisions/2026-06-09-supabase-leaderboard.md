# Supabase for Arcade Leaderboard

**Date**: 2026-06-09
**Status**: Accepted
**Decider(s)**: AL

## Context
The arcade mode needed a persistent global leaderboard. Options ranged from local-only storage to a full backend. The constraints: no auth required, anonymous inserts from the browser, low operational overhead, and a free tier that can absorb a hobbyist traffic level.

## Options Considered

### Option 1: localStorage only
- Pros: Zero backend; works offline; no privacy concerns
- Cons: Per-device only — not a real leaderboard; wiped when user clears storage

### Option 2: Supabase (Postgres + REST API)
- Pros: Anonymous insert/select with RLS; hosted Postgres with no server to manage; generous free tier; JS client is small and typed
- Cons: Requires RLS policy setup; anon key is public (acceptable for this use case); cold-start latency on inactive projects

### Option 3: Custom API route (Vercel serverless)
- Pros: Full control; could add rate limiting and validation server-side
- Cons: More code to write and maintain; auth/secret management adds complexity for what is a low-stakes score board

## Decision
Supabase. The anonymous insert/select pattern with RLS is exactly the right fit — public reads, public writes, no sensitive data.

## Consequences
- Anon key is embedded in the client bundle via `VITE_SUPABASE_ANON_KEY` — this is expected and safe for anon-only access; RLS is the security boundary
- Supabase project URL must not include `/rest/v1/` — the JS client appends it internally
- Score validation (preventing cheated scores) happens only at the display level, not enforced server-side
- If the Supabase project goes inactive (free tier), scores table may be paused

## Revisit If
Cheating becomes a meaningful problem, at which point a serverless validation layer should sit between the client and the DB.
