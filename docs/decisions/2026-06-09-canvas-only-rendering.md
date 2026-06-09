# Canvas-Only Rendering for the Arcade Mode

**Date**: 2026-06-09
**Status**: Accepted
**Decider(s)**: AL

## Context
The arcade mode required a pixel-art game loop at 60fps with custom physics (gravity field bending bullets), sprite rendering, and a RAF-driven tick. The question was whether to use a game library (Phaser, PixiJS) or write directly against the Canvas 2D API.

## Options Considered

### Option 1: Phaser or PixiJS
- Pros: Scene management, asset loading, input system, physics plugins included
- Cons: 300–500KB bundle weight; opinionated abstractions that fight the pixel-art aesthetic; harder to colocate UI overlays (React) with game state

### Option 2: Raw CanvasRenderingContext2D
- Pros: Zero bundle cost; full control over rendering pipeline; custom physics trivially expressed as plain math; React refs integrate cleanly
- Cons: No built-in scene management, input handling, or asset pipeline — must implement manually

### Option 3: HTML DOM-based rendering (CSS transforms)
- Pros: Accessible by default; React renders state naturally
- Cons: Cannot achieve pixel-level rendering fidelity; performance degrades at 60fps with many moving elements

## Decision
Raw Canvas 2D API. At the scope of this project (single screen, known entity count, no asset loading), the library overhead wasn't justified and the control was worth it.

## Consequences
- Game state lives in a `useRef<GS>` — no React re-renders during gameplay, which is correct
- UI overlays (leaderboard, settings) are DOM elements positioned over the canvas and manipulated via refs to avoid React reconciler cost in the RAF loop
- Canvas palette (`C` constant) must be kept in sync with CSS custom properties manually — there is no shared token source
- Testing the game loop requires canvas mock setup

## Revisit If
Bundle size budgets tighten and the canvas implementation exceeds 3,000 lines, at which point a lightweight renderer (PixiJS) would trade bundle weight for maintainability.
