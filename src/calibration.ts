import type { Player, CalibrationSession, CalibrationRound, CalibrationMatchup } from './types';

function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Build a history matrix: Map<playerId, Map<opponentId, timesPlayed>>
 */
export function buildMatchupHistory(
  rounds: CalibrationRound[]
): Map<string, Map<string, number>> {
  const history = new Map<string, Map<string, number>>();

  function ensure(id: string) {
    if (!history.has(id)) history.set(id, new Map());
  }

  for (const round of rounds) {
    for (const matchup of round.matchups) {
      ensure(matchup.player1Id);
      ensure(matchup.player2Id);
      const p1map = history.get(matchup.player1Id)!;
      const p2map = history.get(matchup.player2Id)!;
      p1map.set(matchup.player2Id, (p1map.get(matchup.player2Id) ?? 0) + 1);
      p2map.set(matchup.player1Id, (p2map.get(matchup.player1Id) ?? 0) + 1);
    }
  }

  return history;
}

/**
 * Diversity-First pairing algorithm.
 * Pairs players for a new calibration round minimizing repeat matchups.
 */
export function generateCalibrationPairings(
  players: Player[],
  pastRounds: CalibrationRound[]
): CalibrationRound {
  const roundNumber = pastRounds.length + 1;
  const playerIds = players.map(p => p.id);
  const history = buildMatchupHistory(pastRounds);

  // Determine bye player for odd counts
  let byePlayerId: string | null = null;
  let activePlayers = [...players];

  if (players.length % 2 !== 0) {
    // Count past byes per player
    const byeCounts = new Map<string, number>(playerIds.map(id => [id, 0]));
    for (const round of pastRounds) {
      if (round.byePlayerId) {
        byeCounts.set(round.byePlayerId, (byeCounts.get(round.byePlayerId) ?? 0) + 1);
      }
    }

    // Find minimum bye count
    const minByes = Math.min(...byeCounts.values());
    const byeCandidates = playerIds.filter(id => byeCounts.get(id) === minByes);

    // Pick randomly among candidates with fewest byes
    byePlayerId = byeCandidates[Math.floor(Math.random() * byeCandidates.length)];
    activePlayers = players.filter(p => p.id !== byePlayerId);
  }

  // Build all possible pairs and score them
  type ScoredPair = { i: number; j: number; cost: number };
  const scoredPairs: ScoredPair[] = [];

  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      const idA = activePlayers[i].id;
      const idB = activePlayers[j].id;
      const timesPlayed = history.get(idA)?.get(idB) ?? 0;
      const rankDiff = Math.abs(i - j);
      const randomFactor = 0.5 + Math.random();
      const cost = timesPlayed * 1000 + rankDiff * randomFactor;
      scoredPairs.push({ i, j, cost });
    }
  }

  // Sort pairs by cost ascending
  scoredPairs.sort((a, b) => a.cost - b.cost);

  // Greedy matching: pick lowest-cost pair of unpaired players
  const paired = new Set<number>();
  const matchups: CalibrationMatchup[] = [];

  for (const { i, j } of scoredPairs) {
    if (paired.has(i) || paired.has(j)) continue;
    paired.add(i);
    paired.add(j);
    matchups.push({
      id: uuid(),
      player1Id: activePlayers[i].id,
      player2Id: activePlayers[j].id,
      winnerId: null,
      player1Score: null,
      player2Score: null,
    });
    if (paired.size === activePlayers.length) break;
  }

  return {
    roundNumber,
    matchups,
    byePlayerId,
    completed: false,
  };
}

/**
 * Create a new CalibrationSession, snapshotting starting ELOs and generating round 1.
 */
export function createCalibrationSession(
  players: Player[],
  totalRounds: number
): CalibrationSession {
  const startingElos: Record<string, number> = {};
  for (const p of players) {
    startingElos[p.id] = p.elo;
  }

  const firstRound = generateCalibrationPairings(players, []);

  return {
    id: uuid(),
    playerIds: players.map(p => p.id),
    totalRounds,
    currentRound: 1,
    rounds: [firstRound],
    status: 'in_progress',
    startingElos,
    createdAt: new Date().toISOString(),
  };
}
