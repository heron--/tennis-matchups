export interface Player {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  createdAt: string;
}

export interface MatchRecord {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Score: number;
  player2Score: number;
  winnerId: string;
  eloChange: number;
  timestamp: string;
  context: 'ranked' | 'tournament';
  tournamentId?: string;
}

export interface Matchup {
  id: string;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  player1Score: number | null;
  player2Score: number | null;
  isBye: boolean;
}

export type Round = Matchup[];

export interface Tournament {
  id: string;
  name: string;
  status: 'in_progress' | 'completed';
  playerIds: string[];
  winnersRounds: Round[];
  losersRounds: Round[];
  grandFinal: Matchup | null;
  createdAt: string;
}

export interface AppState {
  players: Player[];
  matches: MatchRecord[];
  tournaments: Tournament[];
}
