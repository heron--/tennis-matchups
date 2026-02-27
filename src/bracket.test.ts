import { describe, it, expect } from 'vitest';
import {
  generateBracket,
  advanceWinnersBracket,
  advanceLosersBracket,
  isTournamentComplete,
} from './bracket';
import type { Player, Tournament, Matchup } from './types';

// ---------- helpers ----------

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    elo: 1200 + (n - i) * 10, // descending ELO so seed order is p1, p2, ...
    wins: 0,
    losses: 0,
    createdAt: new Date().toISOString(),
  }));
}

/** Find every matchup across the entire tournament that has exactly one player assigned (the other is null)
 *  and is NOT marked as a bye — these are the "facing TBD" bugs. */
function findTBDMatchups(t: Tournament): { location: string; matchup: Matchup }[] {
  const results: { location: string; matchup: Matchup }[] = [];

  for (let ri = 0; ri < t.winnersRounds.length; ri++) {
    for (let mi = 0; mi < t.winnersRounds[ri].length; mi++) {
      const m = t.winnersRounds[ri][mi];
      if (!m.isBye && !m.winnerId && ((m.player1Id && !m.player2Id) || (!m.player1Id && m.player2Id))) {
        results.push({ location: `WB R${ri}[${mi}]`, matchup: m });
      }
    }
  }

  for (let ri = 0; ri < t.losersRounds.length; ri++) {
    for (let mi = 0; mi < t.losersRounds[ri].length; mi++) {
      const m = t.losersRounds[ri][mi];
      if (!m.isBye && !m.winnerId && ((m.player1Id && !m.player2Id) || (!m.player1Id && m.player2Id))) {
        results.push({ location: `LB R${ri}[${mi}]`, matchup: m });
      }
    }
  }

  if (t.grandFinal) {
    const m = t.grandFinal;
    if (!m.isBye && !m.winnerId && ((m.player1Id && !m.player2Id) || (!m.player1Id && m.player2Id))) {
      results.push({ location: 'Grand Final', matchup: m });
    }
  }

  return results;
}

/** Find all playable matchups — both players assigned, no winner yet, not a bye. */
function findPlayableMatchups(
  t: Tournament
): { bracket: 'winners' | 'losers' | 'grandFinal'; roundIndex: number; matchupIndex: number; matchup: Matchup }[] {
  const results: { bracket: 'winners' | 'losers' | 'grandFinal'; roundIndex: number; matchupIndex: number; matchup: Matchup }[] = [];

  for (let ri = 0; ri < t.winnersRounds.length; ri++) {
    for (let mi = 0; mi < t.winnersRounds[ri].length; mi++) {
      const m = t.winnersRounds[ri][mi];
      if (m.player1Id && m.player2Id && !m.winnerId && !m.isBye) {
        results.push({ bracket: 'winners', roundIndex: ri, matchupIndex: mi, matchup: m });
      }
    }
  }

  for (let ri = 0; ri < t.losersRounds.length; ri++) {
    for (let mi = 0; mi < t.losersRounds[ri].length; mi++) {
      const m = t.losersRounds[ri][mi];
      if (m.player1Id && m.player2Id && !m.winnerId && !m.isBye) {
        results.push({ bracket: 'losers', roundIndex: ri, matchupIndex: mi, matchup: m });
      }
    }
  }

  if (t.grandFinal && t.grandFinal.player1Id && t.grandFinal.player2Id && !t.grandFinal.winnerId) {
    results.push({ bracket: 'grandFinal', roundIndex: 0, matchupIndex: 0, matchup: t.grandFinal });
  }

  return results;
}

/**
 * Simulate an entire tournament to completion. At each step, pick a playable matchup
 * and resolve it (player1 always wins for determinism). After each advancement,
 * assert that no matchup has a single player facing TBD.
 * Returns the completed tournament.
 */
function simulateTournament(t: Tournament): Tournament {
  let current = t;
  let safety = 0;
  const maxIterations = 100;

  while (!isTournamentComplete(current) && safety < maxIterations) {
    safety++;
    const playable = findPlayableMatchups(current);
    if (playable.length === 0) {
      // No playable matchups but tournament isn't complete — could be waiting for advancement
      // Check for TBD situations
      const tbds = findTBDMatchups(current);
      if (tbds.length > 0) {
        // This is the bug — a player is facing TBD with no way to resolve
        return current;
      }
      break;
    }

    const pick = playable[0];
    const winnerId = pick.matchup.player1Id!;
    const loserId = pick.matchup.player2Id!;

    if (pick.bracket === 'winners') {
      current = advanceWinnersBracket(current, pick.roundIndex, pick.matchupIndex, winnerId, loserId);
    } else if (pick.bracket === 'losers') {
      current = advanceLosersBracket(current, pick.roundIndex, pick.matchupIndex, winnerId);
    } else {
      // Grand final — just set the winner directly
      const t2 = structuredClone(current);
      t2.grandFinal!.winnerId = winnerId;
      current = t2;
    }
  }

  return current;
}

// ---------- tests ----------

describe('generateBracket', () => {
  it('creates correct structure for 4 players (no byes)', () => {
    const players = makePlayers(4);
    const t = generateBracket('t1', 'Test', players, 'ranked');

    expect(t.winnersRounds.length).toBe(2); // R0 (4→2 matchups) + R1 (finals, 1 matchup)
    expect(t.winnersRounds[0].length).toBe(2);
    expect(t.winnersRounds[1].length).toBe(1);

    // No byes with exactly 4 players
    const byes = t.winnersRounds[0].filter(m => m.isBye);
    expect(byes.length).toBe(0);

    // LB should have 2*(2-1) = 2 rounds
    expect(t.losersRounds.length).toBe(2);
    expect(t.grandFinal).toBeTruthy();
  });

  it('creates correct structure for 8 players (no byes)', () => {
    const players = makePlayers(8);
    const t = generateBracket('t1', 'Test', players, 'ranked');

    expect(t.winnersRounds.length).toBe(3); // R0(4) + R1(2) + R2(1)
    expect(t.winnersRounds[0].length).toBe(4);

    const byes = t.winnersRounds[0].filter(m => m.isBye);
    expect(byes.length).toBe(0);

    // LB: 2*(3-1) = 4 rounds
    expect(t.losersRounds.length).toBe(4);
  });

  it('creates byes for 5 players in an 8-bracket', () => {
    const players = makePlayers(5);
    const t = generateBracket('t1', 'Test', players, 'ranked');

    // Bracket size should be 8, so 4 matchups in R0, 3 of which are byes
    expect(t.winnersRounds[0].length).toBe(4);
    const byes = t.winnersRounds[0].filter(m => m.isBye);
    expect(byes.length).toBe(3);
  });

  it('creates byes for 6 players in an 8-bracket', () => {
    const players = makePlayers(6);
    const t = generateBracket('t1', 'Test', players, 'ranked');

    expect(t.winnersRounds[0].length).toBe(4);
    const byes = t.winnersRounds[0].filter(m => m.isBye);
    expect(byes.length).toBe(2);
  });

  it('creates byes for 3 players in a 4-bracket', () => {
    const players = makePlayers(3);
    const t = generateBracket('t1', 'Test', players, 'ranked');

    expect(t.winnersRounds[0].length).toBe(2);
    const byes = t.winnersRounds[0].filter(m => m.isBye);
    expect(byes.length).toBe(1);
  });
});

describe('losers bracket - no TBD opponents', () => {
  // The core invariant: after any advancement, no non-bye matchup should have
  // exactly one player assigned (one player facing TBD).

  it('4 players: full tournament completes with no TBD matchups', () => {
    const players = makePlayers(4);
    const t = generateBracket('t1', 'Test', players, 'ranked');
    const final = simulateTournament(t);

    expect(isTournamentComplete(final)).toBe(true);
    const tbds = findTBDMatchups(final);
    expect(tbds).toEqual([]);
  });

  it('5 players: no player faces TBD in losers bracket', () => {
    const players = makePlayers(5);
    const t = generateBracket('t1', 'Test', players, 'ranked');

    // After generation, bye winners should be propagated.
    // The single real WB R0 match should route its loser properly.
    const final = simulateTournament(t);

    const tbds = findTBDMatchups(final);
    expect(tbds).toEqual([]);
    expect(isTournamentComplete(final)).toBe(true);
  });

  it('6 players: no player faces TBD in losers bracket', () => {
    const players = makePlayers(6);
    const t = generateBracket('t1', 'Test', players, 'ranked');
    const final = simulateTournament(t);

    const tbds = findTBDMatchups(final);
    expect(tbds).toEqual([]);
    expect(isTournamentComplete(final)).toBe(true);
  });

  it('7 players: no player faces TBD in losers bracket', () => {
    const players = makePlayers(7);
    const t = generateBracket('t1', 'Test', players, 'ranked');
    const final = simulateTournament(t);

    const tbds = findTBDMatchups(final);
    expect(tbds).toEqual([]);
    expect(isTournamentComplete(final)).toBe(true);
  });

  it('3 players: no player faces TBD in losers bracket', () => {
    const players = makePlayers(3);
    const t = generateBracket('t1', 'Test', players, 'ranked');
    const final = simulateTournament(t);

    const tbds = findTBDMatchups(final);
    expect(tbds).toEqual([]);
    expect(isTournamentComplete(final)).toBe(true);
  });
});

describe('advanceWinnersBracket', () => {
  it('routes WB R0 losers to LB R0 correctly for 4 players', () => {
    const players = makePlayers(4);
    let t = generateBracket('t1', 'Test', players, 'ranked');

    // Play WB R0 — both matches
    const m0 = t.winnersRounds[0][0];
    const m1 = t.winnersRounds[0][1];

    t = advanceWinnersBracket(t, 0, 0, m0.player1Id!, m0.player2Id!);
    t = advanceWinnersBracket(t, 0, 1, m1.player1Id!, m1.player2Id!);

    // LB R0 should have both players assigned
    expect(t.losersRounds[0][0].player1Id).toBeTruthy();
    expect(t.losersRounds[0][0].player2Id).toBeTruthy();
  });

  it('routes WB R0 loser correctly when opponent slot is a bye (6 players)', () => {
    const players = makePlayers(6);
    let t = generateBracket('t1', 'Test', players, 'ranked');

    // Play the real WB R0 matches (non-bye ones)
    for (let mi = 0; mi < t.winnersRounds[0].length; mi++) {
      const m = t.winnersRounds[0][mi];
      if (!m.isBye && m.player1Id && m.player2Id) {
        t = advanceWinnersBracket(t, 0, mi, m.player1Id, m.player2Id);
      }
    }

    // LB R0[0] should be auto-resolved as a bye (both feeders were WB byes)
    expect(t.losersRounds[0][0].isBye).toBe(true);

    // LB R0[1] should be a playable match (both losers from real WB R0 matches)
    expect(t.losersRounds[0][1].player1Id).toBeTruthy();
    expect(t.losersRounds[0][1].player2Id).toBeTruthy();

    // LB R1[0] should already be auto-resolved as a bye (player1 was dead from empty LB R0[0])
    // — it won't be resolved yet since no WB R1 drop-down has arrived

    // Play WB R1 to send drop-downs to LB
    const wbPlayable = findPlayableMatchups(t).filter(p => p.bracket === 'winners');
    for (const p of wbPlayable) {
      t = advanceWinnersBracket(t, p.roundIndex, p.matchupIndex, p.matchup.player1Id!, p.matchup.player2Id!);
    }

    // LB R1[0] should be auto-resolved: its player1 was dead (from empty LB R0[0]),
    // and the WB R1 drop-down arrived as player2 → bye resolved
    expect(t.losersRounds[1][0].isBye).toBe(true);
    expect(t.losersRounds[1][0].winnerId).toBeTruthy();

    // Complete the full tournament to verify no stuck TBDs
    const final = simulateTournament(t);
    expect(isTournamentComplete(final)).toBe(true);
    expect(findTBDMatchups(final)).toEqual([]);
  });
});

describe('advanceLosersBracket', () => {
  it('advances LB minor round winners to the next major round', () => {
    const players = makePlayers(8);
    let t = generateBracket('t1', 'Test', players, 'ranked');

    // Play all WB R0 matches
    for (let mi = 0; mi < t.winnersRounds[0].length; mi++) {
      const m = t.winnersRounds[0][mi];
      t = advanceWinnersBracket(t, 0, mi, m.player1Id!, m.player2Id!);
    }

    // LB R0 should be fully populated (minor round)
    for (const m of t.losersRounds[0]) {
      expect(m.player1Id).toBeTruthy();
      expect(m.player2Id).toBeTruthy();
    }

    // Play LB R0
    for (let mi = 0; mi < t.losersRounds[0].length; mi++) {
      const m = t.losersRounds[0][mi];
      t = advanceLosersBracket(t, 0, mi, m.player1Id!);
    }

    // LB R1 player1 slots should be filled from LB R0 winners
    for (const m of t.losersRounds[1]) {
      expect(m.player1Id).toBeTruthy();
    }
  });
});

describe('full tournament simulation', () => {
  for (const count of [3, 4, 5, 6, 7, 8]) {
    it(`completes correctly with ${count} players`, () => {
      const players = makePlayers(count);
      const t = generateBracket('t1', 'Test', players, 'ranked');
      const final = simulateTournament(t);

      // Tournament must complete
      expect(isTournamentComplete(final)).toBe(true);

      // No TBD matchups at the end
      const tbds = findTBDMatchups(final);
      expect(tbds).toEqual([]);

      // Grand final must have a winner
      expect(final.grandFinal?.winnerId).toBeTruthy();
    });
  }

  it('every player who loses in WB eventually plays in LB (not stuck in TBD)', () => {
    const players = makePlayers(6);
    let t = generateBracket('t1', 'Test', players, 'ranked');

    // Track that after each step, no TBD matchups appear
    let stepCount = 0;
    const maxSteps = 50;

    while (!isTournamentComplete(t) && stepCount < maxSteps) {
      stepCount++;
      const tbds = findTBDMatchups(t);
      if (tbds.length > 0) {
        // If there are TBDs, there must also be playable matches that will resolve them
        const playable = findPlayableMatchups(t);
        expect(playable.length).toBeGreaterThan(0);
      }

      const playable = findPlayableMatchups(t);
      if (playable.length === 0) break;

      const pick = playable[0];
      const winnerId = pick.matchup.player1Id!;
      const loserId = pick.matchup.player2Id!;

      if (pick.bracket === 'winners') {
        t = advanceWinnersBracket(t, pick.roundIndex, pick.matchupIndex, winnerId, loserId);
      } else if (pick.bracket === 'losers') {
        t = advanceLosersBracket(t, pick.roundIndex, pick.matchupIndex, winnerId);
      } else {
        const t2 = structuredClone(t);
        t2.grandFinal!.winnerId = winnerId;
        t = t2;
      }
    }

    expect(isTournamentComplete(t)).toBe(true);
  });
});
