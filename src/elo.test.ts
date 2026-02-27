import { describe, it, expect } from 'vitest';
import { marginMultiplier, calculateEloUpdate } from './elo';

describe('marginMultiplier', () => {
  it('returns 1.0 for edge case: 0-0', () => {
    expect(marginMultiplier(0, 0)).toBe(1.0);
  });

  it('returns 1.0 when winner score equals loser score', () => {
    expect(marginMultiplier(6, 6)).toBe(1.0);
  });

  it('returns 1.0 when winner score is less than loser score', () => {
    expect(marginMultiplier(3, 6)).toBe(1.0);
  });

  it('is always in [1.0, 1.5]', () => {
    const cases: [number, number][] = [
      [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 5], [7, 6],
      [10, 0], [1, 0], [100, 1],
    ];
    for (const [w, l] of cases) {
      const m = marginMultiplier(w, l);
      expect(m).toBeGreaterThanOrEqual(1.0);
      expect(m).toBeLessThanOrEqual(1.5);
    }
  });

  it('ordering: 6-0 > 6-1 > 7-5 > 7-6', () => {
    const m60 = marginMultiplier(6, 0);
    const m61 = marginMultiplier(6, 1);
    const m75 = marginMultiplier(7, 5);
    const m76 = marginMultiplier(7, 6);
    expect(m60).toBeGreaterThan(m61);
    expect(m61).toBeGreaterThan(m75);
    expect(m75).toBeGreaterThan(m76);
  });

  it('6-0 blowout gives approximately 1.5x', () => {
    expect(marginMultiplier(6, 0)).toBeCloseTo(1.5, 1);
  });
});

describe('calculateEloUpdate', () => {
  it('backward compat: omitting scores gives same result as before', () => {
    const winnerElo = 1200;
    const loserElo = 1200;

    const withoutScores = calculateEloUpdate(winnerElo, loserElo);
    const withMultiplierOne = calculateEloUpdate(winnerElo, loserElo, 7, 6);

    // Without scores should use multiplier 1.0
    // Both should change winner ELO by K * (1 - 0.5) = 16
    expect(withoutScores.eloChange).toBe(16);
    // 7-6 is close, multiplier > 1 but less than blowout
    expect(withMultiplierOne.eloChange).toBeGreaterThanOrEqual(withoutScores.eloChange);
  });

  it('blowout produces larger ELO change than close match (same starting ELOs)', () => {
    const blowout = calculateEloUpdate(1200, 1200, 6, 0);
    const close = calculateEloUpdate(1200, 1200, 7, 6);
    expect(blowout.eloChange).toBeGreaterThan(close.eloChange);
  });

  it('max ELO change never exceeds 1.5x base change', () => {
    const base = calculateEloUpdate(1200, 1200);
    const maxBlowout = calculateEloUpdate(1200, 1200, 6, 0);
    expect(maxBlowout.eloChange).toBeLessThanOrEqual(Math.ceil(base.eloChange * 1.5));
  });

  it('underdog blowout win produces large swing', () => {
    const normalWin = calculateEloUpdate(1400, 1200);
    const underdogBlowout = calculateEloUpdate(1200, 1400, 6, 0);
    // Underdog blowout should gain more ELO than a normal expected win
    expect(underdogBlowout.eloChange).toBeGreaterThan(normalWin.eloChange);
  });

  it('winner always gains ELO, loser always loses ELO', () => {
    const cases: [number, number, number, number][] = [
      [1200, 1200, 6, 0],
      [1200, 1200, 7, 5],
      [1500, 1000, 6, 1],
      [1000, 1500, 6, 4],
    ];
    for (const [we, le, ws, ls] of cases) {
      const result = calculateEloUpdate(we, le, ws, ls);
      expect(result.winnerNewElo).toBeGreaterThan(we);
      expect(result.loserNewElo).toBeLessThan(le);
      expect(result.eloChange).toBeGreaterThan(0);
    }
  });
});
