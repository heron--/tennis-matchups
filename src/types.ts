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
  context: 'ranked' | 'tournament' | 'calibration';
  tournamentId?: string;
  calibrationSessionId?: string;
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

export interface CalibrationMatchup {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  player1Score: number | null;
  player2Score: number | null;
}

export interface CalibrationRound {
  roundNumber: number;
  matchups: CalibrationMatchup[];
  byePlayerId: string | null;
  completed: boolean;
}

export interface CalibrationSession {
  id: string;
  playerIds: string[];
  totalRounds: number;
  currentRound: number;
  rounds: CalibrationRound[];
  status: 'in_progress' | 'completed';
  startingElos: Record<string, number>;
  createdAt: string;
}

export interface AppState {
  players: Player[];
  matches: MatchRecord[];
  tournaments: Tournament[];
  calibrationSessions: CalibrationSession[];
}
