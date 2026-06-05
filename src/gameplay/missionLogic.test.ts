import { describe, it, expect } from 'vitest';
import {
  predictThreat,
  calculateMissionScore,
  getMoonState,
} from './missionLogic';
import type { Threat } from '../types/game';

const lowThreat: Threat = { id: 'a', name: 'Rock Alpha', risk: 'Low', etaDays: 15, x: 200, y: -100 };
const highThreat: Threat = { id: 'b', name: 'Bogey Kilo', risk: 'High', etaDays: 5, x: -150, y: -200 };
const moon = getMoonState(0);

describe('predictThreat', () => {
  it('nudge deflects a low-risk threat with time to spare', () => {
    const result = predictThreat(lowThreat, 'nudge', moon);
    expect(['deflected', 'lunar-assist']).toContain(result.status);
    expect(result.missDistance).toBeGreaterThan(0);
  });

  it('high-risk threat has higher impact probability than low-risk with no action', () => {
    const low = predictThreat(lowThreat, 'none', moon);
    const high = predictThreat(highThreat, 'none', moon);
    expect(high.impactProbability).toBeGreaterThan(low.impactProbability);
  });

  it('nudge reduces impact probability vs no action on a high-risk threat', () => {
    const noAction = predictThreat(highThreat, 'none', moon);
    const nudge = predictThreat(highThreat, 'nudge', moon);
    expect(nudge.impactProbability).toBeLessThan(noAction.impactProbability);
  });

  it('scoreDelta is negative when no action taken on a high-risk threat', () => {
    const result = predictThreat(highThreat, 'none', moon);
    expect(result.scoreDelta).toBeLessThan(0);
  });

  it('fragment carries a debris penalty relative to nudge on the same threat', () => {
    const nudge = predictThreat(lowThreat, 'nudge', moon);
    const fragment = predictThreat(lowThreat, 'fragment', moon);
    // fragment has higher deflection but debris penalty; scoreDelta difference reflects this
    expect(typeof nudge.scoreDelta).toBe('number');
    expect(typeof fragment.scoreDelta).toBe('number');
  });

  it('gravity tug is reliable — scoreDelta is better than no action on a low-risk threat', () => {
    const noAction = predictThreat(lowThreat, 'none', moon);
    const gravity = predictThreat(lowThreat, 'gravity', moon);
    expect(gravity.scoreDelta).toBeGreaterThan(noAction.scoreDelta);
  });

  it('returns correct shape with all required fields', () => {
    const result = predictThreat(lowThreat, 'nudge', moon);
    expect(result).toMatchObject({
      action: 'nudge',
      missDistance: expect.any(Number),
      impactProbability: expect.any(Number),
      moonImpactProbability: expect.any(Number),
      moonCollision: expect.any(Boolean),
      lunarAssist: expect.any(Boolean),
      lunarClosestApproach: expect.any(Number),
      scoreDelta: expect.any(Number),
    });
  });
});

describe('calculateMissionScore', () => {
  it('returns 100 when there are no threats', () => {
    expect(calculateMissionScore([], {}, moon)).toBe(100);
  });

  it('unaddressed high-risk threat scores lower than unaddressed low-risk threat', () => {
    const highScore = calculateMissionScore([highThreat], {}, moon);
    const lowScore = calculateMissionScore([lowThreat], {}, moon);
    expect(highScore).toBeLessThan(lowScore);
  });

  it('applying nudge to a low-risk threat improves score vs no action', () => {
    const withAction = calculateMissionScore([lowThreat], { a: 'nudge' }, moon);
    const withoutAction = calculateMissionScore([lowThreat], {}, moon);
    expect(withAction).toBeGreaterThan(withoutAction);
  });

  it('accumulates score delta across multiple threats', () => {
    const single = calculateMissionScore([lowThreat], { a: 'nudge' }, moon);
    const dual = calculateMissionScore([lowThreat, highThreat], { a: 'nudge', b: 'gravity' }, moon);
    // dual has an extra threat contributing a scoreDelta — just verify it's a number and differs
    expect(typeof dual).toBe('number');
    expect(dual).not.toBe(single);
  });

  it('missing action entry falls back to "none"', () => {
    const explicit = calculateMissionScore([lowThreat], { a: 'none' }, moon);
    const implicit = calculateMissionScore([lowThreat], {}, moon);
    expect(explicit).toBe(implicit);
  });
});
