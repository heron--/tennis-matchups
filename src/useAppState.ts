import { useState, useCallback, useEffect } from 'react';
import type { AppState, Player, MatchRecord, Tournament } from './types';
import { loadState, saveState, clearState, DEFAULT_STATE } from './storage';
import { calculateEloUpdate } from './elo';

function uuid(): string {
  return crypto.randomUUID();
}

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState());

  // Persist every state change to localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  const addPlayer = useCallback((name: string) => {
    const player: Player = {
      id: uuid(),
      name: name.trim(),
      elo: 1200,
      wins: 0,
      losses: 0,
      createdAt: new Date().toISOString(),
    };
    setState(s => ({ ...s, players: [...s.players, player] }));
    return player;
  }, []);

  const updatePlayer = useCallback((id: string, updates: Partial<Pick<Player, 'name'>>) => {
    setState(s => ({
      ...s,
      players: s.players.map(p => (p.id === id ? { ...p, ...updates } : p)),
    }));
  }, []);

  const deletePlayer = useCallback((id: string) => {
    setState(s => ({
      ...s,
      players: s.players.filter(p => p.id !== id),
    }));
  }, []);

  const recordMatch = useCallback(
    (
      player1Id: string,
      player2Id: string,
      player1Score: number,
      player2Score: number,
      winnerId: string,
      context: 'ranked' | 'tournament',
      tournamentId?: string
    ) => {
      setState(s => {
        const winner = s.players.find(p => p.id === winnerId)!;
        const loserId = winnerId === player1Id ? player2Id : player1Id;
        const loser = s.players.find(p => p.id === loserId)!;

        const { winnerNewElo, loserNewElo, eloChange } = calculateEloUpdate(
          winner.elo,
          loser.elo
        );

        const match: MatchRecord = {
          id: uuid(),
          player1Id,
          player2Id,
          player1Score,
          player2Score,
          winnerId,
          eloChange,
          timestamp: new Date().toISOString(),
          context,
          tournamentId,
        };

        const updatedPlayers = s.players.map(p => {
          if (p.id === winnerId) return { ...p, elo: winnerNewElo, wins: p.wins + 1 };
          if (p.id === loserId) return { ...p, elo: loserNewElo, losses: p.losses + 1 };
          return p;
        });

        return {
          ...s,
          players: updatedPlayers,
          matches: [match, ...s.matches],
        };
      });
    },
    []
  );

  const addTournament = useCallback((tournament: Tournament) => {
    setState(s => ({ ...s, tournaments: [tournament, ...s.tournaments] }));
  }, []);

  const updateTournament = useCallback((id: string, updates: Partial<Tournament>) => {
    setState(s => ({
      ...s,
      tournaments: s.tournaments.map(t => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, []);

  const deleteTournament = useCallback((id: string) => {
    setState(s => ({ ...s, tournaments: s.tournaments.filter(t => t.id !== id) }));
  }, []);

  const importState = useCallback((newState: AppState) => {
    clearState();
    setState(newState);
  }, []);

  const resetState = useCallback(() => {
    clearState();
    setState(DEFAULT_STATE);
  }, []);

  const resetElos = useCallback(() => {
    setState(s => ({
      ...s,
      players: s.players.map(p => ({ ...p, elo: 1200, wins: 0, losses: 0 })),
      matches: [],
    }));
  }, []);

  return {
    state,
    addPlayer,
    updatePlayer,
    deletePlayer,
    recordMatch,
    addTournament,
    deleteTournament,
    updateTournament,
    importState,
    resetState,
    resetElos,
  };
}

export type AppStateHandle = ReturnType<typeof useAppState>;
