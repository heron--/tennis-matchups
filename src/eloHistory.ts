import type { MatchRecord } from './types';

export interface EloDataPoint {
  timestamp: string;
  elo: number;
}

export function buildEloTimeline(
  playerId: string,
  matches: MatchRecord[],
  startingElo = 1200
): EloDataPoint[] {
  const playerMatches = matches
    .filter(m => m.player1Id === playerId || m.player2Id === playerId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const timeline: EloDataPoint[] = [];
  let elo = startingElo;

  // Starting point
  if (playerMatches.length > 0) {
    timeline.push({ timestamp: playerMatches[0].timestamp, elo });
  }

  for (const match of playerMatches) {
    const isWinner = match.winnerId === playerId;
    elo += isWinner ? match.eloChange : -match.eloChange;
    timeline.push({ timestamp: match.timestamp, elo });
  }

  return timeline;
}
