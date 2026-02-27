const K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function newRating(rating: number, expected: number, actual: number): number {
  return Math.round(rating + K * (actual - expected));
}

/**
 * Returns a multiplier in [1.0, 1.5] based on score margin.
 * A blowout (6-0) gives ~1.5x; a close match (7-5) gives ~1.18x.
 */
export function marginMultiplier(winnerScore: number, loserScore: number): number {
  const total = winnerScore + loserScore;
  if (total <= 0 || winnerScore <= loserScore) return 1.0;
  const diff = winnerScore - loserScore;
  const raw = 1.0 + (Math.log(1 + diff) / Math.log(1 + total)) * 0.5;
  return Math.min(1.5, Math.max(1.0, raw));
}

/**
 * Calculate updated Elo ratings for both players after a match.
 * Returns { winner: newElo, loser: newElo, eloChange: pointsExchanged }
 * When winnerScore/loserScore are provided, the K-factor is scaled by the margin multiplier.
 */
export function calculateEloUpdate(
  winnerElo: number,
  loserElo: number,
  winnerScore?: number,
  loserScore?: number
): { winnerNewElo: number; loserNewElo: number; eloChange: number } {
  const winnerExpected = expectedScore(winnerElo, loserElo);
  const loserExpected = expectedScore(loserElo, winnerElo);

  const multiplier =
    winnerScore !== undefined && loserScore !== undefined
      ? marginMultiplier(winnerScore, loserScore)
      : 1.0;

  const winnerNewElo = Math.round(winnerElo + K * multiplier * (1 - winnerExpected));
  const loserNewElo = Math.round(loserElo + K * multiplier * (0 - loserExpected));

  const eloChange = winnerNewElo - winnerElo;

  return { winnerNewElo, loserNewElo, eloChange };
}
