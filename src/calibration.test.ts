import { describe, it, expect } from 'vitest';
import type { Player, CalibrationRound } from './types';
import {
  buildMatchupHistory,
  generateCalibrationPairings,
  createCalibrationSession,
} from './calibration';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    elo: 1200,
    wins: 0,
    losses: 0,
    createdAt: new Date().toISOString(),
  }));
}

describe('generateCalibrationPairings', () => {
  it('produces correct matchup count for even player count', () => {
    const players = makePlayers(4);
    const round = generateCalibrationPairings(players, []);
    expect(round.matchups).toHaveLength(2);
    expect(round.byePlayerId).toBeNull();
  });

  it('produces correct matchup count for odd player count', () => {
    const players = makePlayers(5);
    const round = generateCalibrationPairings(players, []);
    expect(round.matchups).toHaveLength(2);
    expect(round.byePlayerId).not.toBeNull();
  });

  it('bye player exists in the player list', () => {
    const players = makePlayers(5);
    const round = generateCalibrationPairings(players, []);
    const ids = players.map(p => p.id);
    expect(ids).toContain(round.byePlayerId);
  });

  it('every active player appears in exactly one matchup per round (even)', () => {
    const players = makePlayers(6);
    const round = generateCalibrationPairings(players, []);
    const usedIds = new Set<string>();
    for (const m of round.matchups) {
      expect(usedIds.has(m.player1Id)).toBe(false);
      expect(usedIds.has(m.player2Id)).toBe(false);
      usedIds.add(m.player1Id);
      usedIds.add(m.player2Id);
    }
    expect(usedIds.size).toBe(6);
  });

  it('every active player appears in exactly one matchup per round (odd)', () => {
    const players = makePlayers(5);
    const round = generateCalibrationPairings(players, []);
    const usedIds = new Set<string>();
    for (const m of round.matchups) {
      expect(usedIds.has(m.player1Id)).toBe(false);
      expect(usedIds.has(m.player2Id)).toBe(false);
      usedIds.add(m.player1Id);
      usedIds.add(m.player2Id);
    }
    // 4 active players (1 on bye)
    expect(usedIds.size).toBe(4);
    expect(usedIds.has(round.byePlayerId!)).toBe(false);
  });

  it('with 4 players and 3 rounds, all 6 possible pairs are used (no repeats in first 3)', () => {
    const players = makePlayers(4);
    const rounds: CalibrationRound[] = [];

    for (let i = 0; i < 3; i++) {
      const round = generateCalibrationPairings(players, rounds);
      rounds.push(round);
    }

    // Collect all pairs used
    const pairCounts = new Map<string, number>();
    for (const round of rounds) {
      for (const m of round.matchups) {
        const key = [m.player1Id, m.player2Id].sort().join('-');
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }

    // With 4 players there are C(4,2) = 6 unique pairs; 3 rounds × 2 matchups = 6 matchups
    // Each pair should appear exactly once
    expect(pairCounts.size).toBe(6);
    for (const count of pairCounts.values()) {
      expect(count).toBe(1);
    }
  });

  it('byes distributed fairly across 5 rounds with 5 players', () => {
    const players = makePlayers(5);
    const rounds: CalibrationRound[] = [];

    for (let i = 0; i < 5; i++) {
      const round = generateCalibrationPairings(players, rounds);
      rounds.push(round);
    }

    const byeCounts = new Map<string, number>(players.map(p => [p.id, 0]));
    for (const round of rounds) {
      if (round.byePlayerId) {
        byeCounts.set(round.byePlayerId, (byeCounts.get(round.byePlayerId) ?? 0) + 1);
      }
    }

    // Each of the 5 players should have exactly 1 bye
    for (const count of byeCounts.values()) {
      expect(count).toBe(1);
    }
  });
});

describe('buildMatchupHistory', () => {
  it('returns correct counts for played rounds', () => {
    const rounds: CalibrationRound[] = [
      {
        roundNumber: 1,
        matchups: [
          { id: 'm1', player1Id: 'p1', player2Id: 'p2', winnerId: null, player1Score: null, player2Score: null },
          { id: 'm2', player1Id: 'p3', player2Id: 'p4', winnerId: null, player1Score: null, player2Score: null },
        ],
        byePlayerId: null,
        completed: true,
      },
      {
        roundNumber: 2,
        matchups: [
          { id: 'm3', player1Id: 'p1', player2Id: 'p3', winnerId: null, player1Score: null, player2Score: null },
          { id: 'm4', player1Id: 'p2', player2Id: 'p4', winnerId: null, player1Score: null, player2Score: null },
        ],
        byePlayerId: null,
        completed: true,
      },
    ];

    const history = buildMatchupHistory(rounds);

    expect(history.get('p1')?.get('p2')).toBe(1);
    expect(history.get('p2')?.get('p1')).toBe(1);
    expect(history.get('p1')?.get('p3')).toBe(1);
    expect(history.get('p3')?.get('p1')).toBe(1);
    expect(history.get('p1')?.get('p4')).toBeUndefined();
    expect(history.get('p3')?.get('p4')).toBe(1);
  });

  it('returns empty history for no rounds', () => {
    const history = buildMatchupHistory([]);
    expect(history.size).toBe(0);
  });
});

describe('createCalibrationSession', () => {
  it('initializes with correct state', () => {
    const players = makePlayers(4);
    const session = createCalibrationSession(players, 3);

    expect(session.playerIds).toHaveLength(4);
    expect(session.totalRounds).toBe(3);
    expect(session.currentRound).toBe(1);
    expect(session.rounds).toHaveLength(1);
    expect(session.status).toBe('in_progress');
    expect(session.id).toBeTruthy();
    expect(session.createdAt).toBeTruthy();
  });

  it('snapshots starting ELOs correctly', () => {
    const players = makePlayers(3);
    players[0].elo = 1400;
    players[1].elo = 1200;
    players[2].elo = 1100;

    const session = createCalibrationSession(players, 2);

    expect(session.startingElos[players[0].id]).toBe(1400);
    expect(session.startingElos[players[1].id]).toBe(1200);
    expect(session.startingElos[players[2].id]).toBe(1100);
  });

  it('first round is generated with correct matchup count', () => {
    const players = makePlayers(4);
    const session = createCalibrationSession(players, 3);

    expect(session.rounds[0].matchups).toHaveLength(2);
    expect(session.rounds[0].roundNumber).toBe(1);
    expect(session.rounds[0].completed).toBe(false);
  });
});
