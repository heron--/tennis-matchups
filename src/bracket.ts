import type { Player, Tournament, Round, Matchup } from './types';

function uuid(): string {
  return crypto.randomUUID();
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a double-elimination bracket.
 * seeding: 'ranked' sorts by Elo (randomizing ties), 'random' fully shuffles.
 * Byes go to top seeds. Pairings: seed 1 vs seed N, seed 2 vs seed N-1, etc.
 */
export function generateBracket(
  tournamentId: string,
  name: string,
  selectedPlayers: Player[],
  seeding: 'ranked' | 'random' = 'ranked'
): Tournament {
  let seeded: Player[];
  if (seeding === 'random') {
    seeded = shuffle([...selectedPlayers]);
  } else {
    // Sort by Elo descending, randomize within tied groups
    const groups = new Map<number, Player[]>();
    for (const p of selectedPlayers) {
      const group = groups.get(p.elo) ?? [];
      group.push(p);
      groups.set(p.elo, group);
    }
    const elos = [...groups.keys()].sort((a, b) => b - a);
    seeded = elos.flatMap(elo => shuffle([...groups.get(elo)!]));
  }
  const bracketSize = nextPowerOfTwo(seeded.length);
  const byeCount = bracketSize - seeded.length;

  // Pad with null (bye slots) at the bottom (lowest seeds get byes last)
  // Actually top seeds get byes: fill from the top
  // To give byes to top seeds, we arrange so that top seeds are matched
  // against "bye" opponents in round 1.
  // Standard approach: place seeds into bracket positions,
  // then pair positions 1v(N), 2v(N-1), etc.
  // Byes: the last `byeCount` seeds get bye opponents.

  // Build the seeded list padded with null for byes
  // Byes go to the highest seeds (they fill position bracketSize - byeCount .. bracketSize)
  // We'll represent a bye as a null player
  const padded: (Player | null)[] = [...seeded];
  while (padded.length < bracketSize) {
    padded.unshift(null); // add byes at top? No — give byes to top seeds.
  }
  // Actually: give byes to top seeds means they advance automatically.
  // Pad at the bottom: seed 1 gets bye, so pair seed 1 with null at position 0
  // Standard: fill bracket of size N. Top `byeCount` seeds face byes.
  // Re-do: put byes at the END so top seeds (front) face them via pairing logic below.
  const paddedSeeds: (Player | null)[] = [...seeded];
  for (let i = 0; i < byeCount; i++) {
    paddedSeeds.push(null);
  }

  // Build first round matchups pairing seed i vs seed (bracketSize-1-i)
  const firstRound: Matchup[] = [];
  const used = new Set<number>();
  for (let i = 0; i < bracketSize / 2; i++) {
    if (used.has(i)) continue;
    const j = bracketSize - 1 - i;
    used.add(i);
    used.add(j);
    const p1 = paddedSeeds[i] ?? null;
    const p2 = paddedSeeds[j] ?? null;
    const isBye = p1 === null || p2 === null;
    const matchup: Matchup = {
      id: uuid(),
      player1Id: p1?.id ?? null,
      player2Id: p2?.id ?? null,
      winnerId: null,
      player1Score: null,
      player2Score: null,
      isBye,
    };
    // Auto-resolve byes
    if (isBye) {
      matchup.winnerId = (p1 ?? p2)!.id;
    }
    firstRound.push(matchup);
  }

  // Build subsequent winners bracket rounds (empty, waiting for results)
  const winnersRounds: Round[] = [firstRound];
  let prevRoundSize = firstRound.length;
  while (prevRoundSize > 1) {
    const nextSize = Math.ceil(prevRoundSize / 2);
    const round: Round = Array.from({ length: nextSize }, () => ({
      id: uuid(),
      player1Id: null,
      player2Id: null,
      winnerId: null,
      player1Score: null,
      player2Score: null,
      isBye: false,
    }));
    winnersRounds.push(round);
    prevRoundSize = nextSize;
  }

  // Propagate bye winners into Round 2
  firstRound.forEach((matchup, mi) => {
    if (matchup.isBye && matchup.winnerId) {
      const nextMatchupIndex = Math.floor(mi / 2);
      const slot = mi % 2 === 0 ? 'player1Id' : 'player2Id';
      winnersRounds[1][nextMatchupIndex][slot] = matchup.winnerId;
    }
  });

  // Build losers bracket rounds (empty)
  // In double elimination with N winners rounds (k = winnersRounds.length):
  // losers bracket has 2*(k-1) rounds, alternating:
  //   even rounds (minor): LB players play each other, field halves
  //   odd rounds (major): LB survivors face WB drop-downs, field stays same
  // Round sizes: bracketSize / 2^(Math.floor(r/2) + 2)
  const lbRoundCount = Math.max(0, 2 * (winnersRounds.length - 1));
  const losersRounds: Round[] = [];
  for (let r = 0; r < lbRoundCount; r++) {
    const slots = Math.max(1, Math.floor(bracketSize / Math.pow(2, Math.floor(r / 2) + 2)));
    const round: Round = Array.from({ length: slots }, () => ({
      id: uuid(),
      player1Id: null,
      player2Id: null,
      winnerId: null,
      player1Score: null,
      player2Score: null,
      isBye: false,
    }));
    losersRounds.push(round);
  }

  const grandFinal: Matchup = {
    id: uuid(),
    player1Id: null,
    player2Id: null,
    winnerId: null,
    player1Score: null,
    player2Score: null,
    isBye: false,
  };

  return {
    id: tournamentId,
    name,
    status: 'in_progress',
    playerIds: selectedPlayers.map(p => p.id),
    winnersRounds,
    losersRounds,
    grandFinal,
    createdAt: new Date().toISOString(),
  };
}

/**
 * After recording a match result in the winners bracket, advance winner
 * and send loser to the appropriate losers bracket slot.
 * Returns the updated tournament.
 */
export function advanceWinnersBracket(
  tournament: Tournament,
  roundIndex: number,
  matchupIndex: number,
  winnerId: string,
  loserId: string
): Tournament {
  const t = structuredClone(tournament);

  // Update current matchup
  t.winnersRounds[roundIndex][matchupIndex].winnerId = winnerId;

  const isLastRound = roundIndex === t.winnersRounds.length - 1;

  if (!isLastRound) {
    // Advance winner to next round
    const nextMatchupIndex = Math.floor(matchupIndex / 2);
    const slot = matchupIndex % 2 === 0 ? 'player1Id' : 'player2Id';
    t.winnersRounds[roundIndex + 1][nextMatchupIndex][slot] = winnerId;
  } else {
    // Winner goes to grand final player1
    if (t.grandFinal) t.grandFinal.player1Id = winnerId;
  }

  // Send loser to losers bracket
  // WB R0 losers → LB R0 (minor round, they pair up with each other)
  // WB Rn (n≥1) losers → LB R(2n-1) (major/drop-down round)
  const lbRound = roundIndex === 0 ? 0 : 2 * roundIndex - 1;
  if (lbRound < t.losersRounds.length) {
    if (roundIndex === 0) {
      // Minor round: pair WB losers with each other
      const lbMatchupIndex = Math.floor(matchupIndex / 2);
      if (lbMatchupIndex < t.losersRounds[lbRound].length) {
        const lbSlot = matchupIndex % 2 === 0 ? 'player1Id' : 'player2Id';
        t.losersRounds[lbRound][lbMatchupIndex][lbSlot] = loserId;
      }
    } else {
      // Major/drop-down round: 1:1 mapping, loser goes into player2 slot
      if (matchupIndex < t.losersRounds[lbRound].length) {
        t.losersRounds[lbRound][matchupIndex].player2Id = loserId;
      }
    }
  }

  return t;
}

/**
 * After recording a match in the losers bracket, advance winner.
 * Loser is eliminated.
 */
export function advanceLosersBracket(
  tournament: Tournament,
  roundIndex: number,
  matchupIndex: number,
  winnerId: string
): Tournament {
  const t = structuredClone(tournament);

  t.losersRounds[roundIndex][matchupIndex].winnerId = winnerId;

  const isLastLbRound = roundIndex === t.losersRounds.length - 1;

  if (!isLastLbRound) {
    const isMinorRound = roundIndex % 2 === 0;
    if (isMinorRound) {
      // Minor → major (next round same size): 1:1 mapping, winner goes to player1 slot
      if (matchupIndex < t.losersRounds[roundIndex + 1].length) {
        t.losersRounds[roundIndex + 1][matchupIndex].player1Id = winnerId;
      }
    } else {
      // Major → minor (next round halves): pair up winners
      const nextMatchupIndex = Math.floor(matchupIndex / 2);
      const slot = matchupIndex % 2 === 0 ? 'player1Id' : 'player2Id';
      if (nextMatchupIndex < t.losersRounds[roundIndex + 1].length) {
        t.losersRounds[roundIndex + 1][nextMatchupIndex][slot] = winnerId;
      }
    }
  } else {
    // LB winner goes to grand final player2
    if (t.grandFinal) t.grandFinal.player2Id = winnerId;
  }

  return t;
}

/**
 * Check if all non-bye matchups in all rounds are completed.
 */
export function isTournamentComplete(tournament: Tournament): boolean {
  const allMatchups = [
    ...tournament.winnersRounds.flat(),
    ...tournament.losersRounds.flat(),
    ...(tournament.grandFinal ? [tournament.grandFinal] : []),
  ];
  return allMatchups
    .filter(m => !m.isBye && m.player1Id && m.player2Id)
    .every(m => m.winnerId !== null);
}
