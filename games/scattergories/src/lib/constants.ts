export type GamePhase =
  | 'LANDING'
  | 'LOBBY'
  | 'ROUND_START'
  | 'PLAYING'
  | 'VALIDATION'
  | 'ROUND_RESULTS'
  | 'FINAL_RESULTS';

export type ValidationMode = 'auto' | 'vote';

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  connected: boolean;
  totalScore: number;
}

export interface RoomSettings {
  timerSeconds: number;
  numRounds: number;
  numCategories: number;
  validationMode: ValidationMode;
}

export interface CategoryResult {
  playerId: string;
  answer: string;
  valid: boolean;
  duplicate: boolean;
  points: number;
}

export interface PlayerScore {
  id: string;
  nickname: string;
  totalScore: number;
  roundScore: number;
}
