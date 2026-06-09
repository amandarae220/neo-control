# Dual-Mode Architecture (Arcade + Mission Console)

**Date**: 2026-06-09
**Status**: Accepted
**Decider(s)**: AL

## Context
The project combines two distinct game modes: a real-time pixel-art arcade shooter and a turn-based mission planning console with an orbital simulation. The question was whether these should be one application, two separate deployments, or one app with shared infrastructure.

## Options Considered

### Option 1: Two separate Vite projects / deployments
- Pros: Complete isolation; independent deploy cadence; no shared bundle
- Cons: Duplicated tooling, config, and design system; harder to cross-link or share state; two Vercel projects to manage

### Option 2: Monorepo with shared packages
- Pros: Explicit sharing via packages; clean dependency graph
- Cons: Monorepo overhead (workspace config, versioning) is disproportionate to the project size

### Option 3: Single Vite app, React Router routes
- Pros: Shared design tokens, typography, and CSS; single deploy; routes provide clean separation; each mode is a self-contained route
- Cons: Both modes share the same bundle — users loading the arcade mode download the mission console code too

## Decision
Single app, React Router routes. The shared design system is a real benefit, and bundle size is acceptable given the target audience (direct link share, not a storefront).

## Consequences
- `/` landing, `/game` arcade, `/missions` + `/mission/:id` + `/results` mission console — each route is independently navigable
- GameCanvas is a single large component (2300+ lines) — the canvas RAF loop and DOM overlay pattern make component extraction non-trivial
- Design tokens are defined in CSS custom properties but the canvas palette (`C` constant) must duplicate them since Canvas 2D cannot consume CSS variables
- Both modes are tested but at different levels — mission logic has unit tests; the arcade game loop does not

## Revisit If
The arcade and mission console diverge enough in their design language or deployment needs that maintaining shared CSS becomes a source of friction rather than a benefit.
