const K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function newRating(rating: number, expected: number, actual: number): number {
  return Math.round(rating + K * (actual - expected));
}

/**
 * Calculate updated Elo ratings for both players after a match.
 * Returns { winner: newElo, loser: newElo, eloChange: pointsExchanged }
 */
export function calculateEloUpdate(
  winnerElo: number,
  loserElo: number
): { winnerNewElo: number; loserNewElo: number; eloChange: number } {
  const winnerExpected = expectedScore(winnerElo, loserElo);
  const loserExpected = expectedScore(loserElo, winnerElo);

  const winnerNewElo = newRating(winnerElo, winnerExpected, 1);
  const loserNewElo = newRating(loserElo, loserExpected, 0);

  const eloChange = winnerNewElo - winnerElo;

  return { winnerNewElo, loserNewElo, eloChange };
}
