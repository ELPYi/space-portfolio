import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { socket } from '../socket';
import {
  GamePhase,
  Player,
  RoomSettings,
  CategoryResult,
  PlayerScore,
} from '../lib/constants';

interface GameState {
  phase: GamePhase;
  playerId: string | null;
  roomCode: string | null;
  players: Player[];
  settings: RoomSettings;
  currentRound: number;
  totalRounds: number;
  currentLetter: string;
  categories: string[];
  timerEndsAt: number | null;
  submittedCount: number;
  // Validation
  answersForVoting: {
    [playerId: string]: { nickname: string; answers: { [catIndex: number]: string } };
  } | null;
  votedCount: number;
  // Results
  roundResults: { [catIndex: number]: CategoryResult[] } | null;
  playerScores: PlayerScore[];
  error: string | null;
}

type Action =
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'JOINED_ROOM'; playerId: string; roomCode: string; players: Player[]; settings: RoomSettings }
  | { type: 'REJOINED_ROOM'; playerId: string; roomCode: string; players: Player[]; settings: RoomSettings; phase: GamePhase; currentRound: number; totalRounds: number; currentLetter: string; categories: string[]; timerEndsAt: number | null; answersForVoting: any | null; roundResults: any | null; playerScores: PlayerScore[] | null }
  | { type: 'PLAYER_JOINED'; player: Player }
  | { type: 'PLAYER_LEFT'; players: Player[] }
  | { type: 'PLAYERS_UPDATED'; players: Player[] }
  | { type: 'SETTINGS_UPDATED'; settings: RoomSettings }
  | { type: 'ROUND_START'; round: number; totalRounds: number; letter: string; categories: string[] }
  | { type: 'PLAYING'; timerEndsAt: number }
  | { type: 'PLAYER_SUBMITTED'; submittedCount: number }
  | { type: 'TIME_UP' }
  | { type: 'VALIDATION_START'; answers: any; categories: string[]; letter: string }
  | { type: 'PLAYER_VOTED'; votedCount: number }
  | { type: 'ROUND_RESULTS'; roundResults: any; players: PlayerScore[]; currentRound: number; totalRounds: number }
  | { type: 'FINAL_RESULTS'; roundResults: any; players: PlayerScore[] }
  | { type: 'PLAY_AGAIN'; players: Player[] }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

const initialState: GameState = {
  phase: 'LANDING',
  playerId: null,
  roomCode: null,
  players: [],
  settings: { timerSeconds: 90, numRounds: 3, numCategories: 12, validationMode: 'vote' },
  currentRound: 0,
  totalRounds: 3,
  currentLetter: '',
  categories: [],
  timerEndsAt: null,
  submittedCount: 0,
  answersForVoting: null,
  votedCount: 0,
  roundResults: null,
  playerScores: [],
  error: null,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'JOINED_ROOM':
      return {
        ...state,
        phase: 'LOBBY',
        playerId: action.playerId,
        roomCode: action.roomCode,
        players: action.players,
        settings: action.settings,
        error: null,
      };
    case 'PLAYER_JOINED':
      return { ...state, players: [...state.players, action.player] };
    case 'REJOINED_ROOM':
      return {
        ...state,
        phase: action.phase,
        playerId: action.playerId,
        roomCode: action.roomCode,
        players: action.players,
        settings: action.settings,
        currentRound: action.currentRound,
        totalRounds: action.totalRounds,
        currentLetter: action.currentLetter,
        categories: action.categories,
        timerEndsAt: action.timerEndsAt,
        answersForVoting: action.answersForVoting ?? state.answersForVoting,
        roundResults: action.roundResults ?? state.roundResults,
        playerScores: action.playerScores ?? state.playerScores,
        error: null,
      };
    case 'PLAYER_LEFT':
      return { ...state, players: action.players };
    case 'PLAYERS_UPDATED':
      return { ...state, players: action.players };
    case 'SETTINGS_UPDATED':
      return { ...state, settings: action.settings };
    case 'ROUND_START':
      return {
        ...state,
        phase: 'ROUND_START',
        currentRound: action.round,
        totalRounds: action.totalRounds,
        currentLetter: action.letter,
        categories: action.categories,
        submittedCount: 0,
        roundResults: null,
      };
    case 'PLAYING':
      return { ...state, phase: 'PLAYING', timerEndsAt: action.timerEndsAt };
    case 'PLAYER_SUBMITTED':
      return { ...state, submittedCount: action.submittedCount };
    case 'TIME_UP':
      return { ...state, timerEndsAt: null };
    case 'VALIDATION_START':
      return {
        ...state,
        phase: 'VALIDATION',
        answersForVoting: action.answers,
        votedCount: 0,
      };
    case 'PLAYER_VOTED':
      return { ...state, votedCount: action.votedCount };
    case 'ROUND_RESULTS':
      return {
        ...state,
        phase: 'ROUND_RESULTS',
        roundResults: action.roundResults,
        playerScores: action.players,
        currentRound: action.currentRound,
        totalRounds: action.totalRounds,
      };
    case 'FINAL_RESULTS':
      return {
        ...state,
        phase: 'FINAL_RESULTS',
        roundResults: action.roundResults,
        playerScores: action.players,
      };
    case 'PLAY_AGAIN':
      return {
        ...state,
        phase: 'LOBBY',
        players: action.players,
        currentRound: 0,
        roundResults: null,
        playerScores: [],
      };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  createRoom: (nickname: string) => void;
  joinRoom: (code: string, nickname: string) => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  startGame: () => void;
  submitAnswers: (answers: { [catIndex: number]: string }) => void;
  submitVotes: (votes: { [catIndex: number]: { [playerId: string]: boolean } }) => void;
  nextRound: () => void;
  playAgain: () => void;
  leaveRoom: () => void;
  isHost: boolean;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const isHost = state.players.find((p) => p.id === state.playerId)?.isHost ?? false;

  // Keep a ref to current state so reconnect handler is never stale
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Warn before refresh/close when the player is in a room
  useEffect(() => {
    if (state.phase === 'LANDING') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.phase]);

  // Connect socket on mount + handle reconnection
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      const s = stateRef.current;

      // Determine session to rejoin: prefer live React state, fall back to sessionStorage
      let roomCode = s.roomCode;
      let nickname: string | null = null;

      if (roomCode) {
        nickname = s.players.find((p) => p.id === s.playerId)?.nickname ?? null;
      } else {
        const saved = sessionStorage.getItem('scattergories_session');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            roomCode = parsed.roomCode ?? null;
            nickname = parsed.nickname ?? null;
          } catch {
            sessionStorage.removeItem('scattergories_session');
          }
        }
      }

      if (roomCode && nickname) {
        socket.emit('room:rejoin', { code: roomCode, nickname }, (res: any) => {
          if (res.ok) {
            dispatch({
              type: 'REJOINED_ROOM',
              playerId: res.playerId,
              roomCode: res.room.code,
              players: res.room.players,
              settings: res.room.settings,
              phase: res.room.phase,
              currentRound: res.room.currentRound,
              totalRounds: res.room.totalRounds,
              currentLetter: res.room.currentLetter,
              categories: res.room.categories,
              timerEndsAt: res.room.timerEndsAt,
              answersForVoting: res.room.answersForVoting ?? null,
              roundResults: res.room.roundResults ?? null,
              playerScores: res.room.playerScores ?? null,
            });
          } else {
            // Room expired or player not found — clear stale session
            sessionStorage.removeItem('scattergories_session');
            if (stateRef.current.roomCode) {
              dispatch({ type: 'RESET' });
            }
          }
        });
      }
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off();
    };
  }, []);

  // Register socket listeners
  useEffect(() => {
    socket.on('room:player-joined', (data) => {
      dispatch({ type: 'PLAYER_JOINED', player: data.player });
    });

    socket.on('room:player-left', (data) => {
      dispatch({ type: 'PLAYER_LEFT', players: data.players });
    });

    // Temporary disconnect — player still in room but marked offline
    socket.on('room:player-disconnected', (data) => {
      dispatch({ type: 'PLAYERS_UPDATED', players: data.players });
    });

    // Player came back within grace period
    socket.on('room:player-rejoined', (data) => {
      dispatch({ type: 'PLAYERS_UPDATED', players: data.players });
    });

    socket.on('room:settings-updated', (data) => {
      dispatch({ type: 'SETTINGS_UPDATED', settings: data.settings });
    });

    socket.on('game:round-start', (data) => {
      dispatch({
        type: 'ROUND_START',
        round: data.round,
        totalRounds: data.totalRounds,
        letter: data.letter,
        categories: data.categories,
      });
    });

    socket.on('game:playing', (data) => {
      dispatch({ type: 'PLAYING', timerEndsAt: data.timerEndsAt });
    });

    socket.on('game:player-submitted', (data) => {
      dispatch({ type: 'PLAYER_SUBMITTED', submittedCount: data.submittedCount });
    });

    socket.on('game:time-up', () => {
      dispatch({ type: 'TIME_UP' });
    });

    socket.on('game:validation-start', (data) => {
      dispatch({
        type: 'VALIDATION_START',
        answers: data.answers,
        categories: data.categories,
        letter: data.letter,
      });
    });

    socket.on('game:player-voted', (data) => {
      dispatch({ type: 'PLAYER_VOTED', votedCount: data.votedCount });
    });

    socket.on('game:round-results', (data) => {
      dispatch({
        type: 'ROUND_RESULTS',
        roundResults: data.roundResults,
        players: data.players,
        currentRound: data.currentRound,
        totalRounds: data.totalRounds,
      });
    });

    socket.on('game:final-results', (data) => {
      dispatch({
        type: 'FINAL_RESULTS',
        roundResults: data.roundResults,
        players: data.players,
      });
    });

    socket.on('game:play-again', (data) => {
      dispatch({ type: 'PLAY_AGAIN', players: data.players });
    });

    return () => {
      socket.off('room:player-joined');
      socket.off('room:player-left');
      socket.off('room:player-disconnected');
      socket.off('room:player-rejoined');
      socket.off('room:settings-updated');
      socket.off('game:round-start');
      socket.off('game:playing');
      socket.off('game:player-submitted');
      socket.off('game:time-up');
      socket.off('game:validation-start');
      socket.off('game:player-voted');
      socket.off('game:round-results');
      socket.off('game:final-results');
      socket.off('game:play-again');
    };
  }, []);

  const createRoom = useCallback((nickname: string) => {
    socket.emit('room:create', { nickname }, (res: any) => {
      if (res.ok) {
        sessionStorage.setItem(
          'scattergories_session',
          JSON.stringify({ roomCode: res.room.code, nickname })
        );
        dispatch({
          type: 'JOINED_ROOM',
          playerId: res.playerId,
          roomCode: res.room.code,
          players: res.room.players,
          settings: res.room.settings,
        });
      } else {
        dispatch({ type: 'SET_ERROR', error: res.error });
      }
    });
  }, []);

  const joinRoom = useCallback((code: string, nickname: string) => {
    socket.emit('room:join', { code: code.toUpperCase(), nickname }, (res: any) => {
      if (res.ok) {
        sessionStorage.setItem(
          'scattergories_session',
          JSON.stringify({ roomCode: res.room.code, nickname })
        );
        dispatch({
          type: 'JOINED_ROOM',
          playerId: res.playerId,
          roomCode: res.room.code,
          players: res.room.players,
          settings: res.room.settings,
        });
      } else {
        dispatch({ type: 'SET_ERROR', error: res.error || 'Could not join room' });
      }
    });
  }, []);

  const updateSettingsFn = useCallback((settings: Partial<RoomSettings>) => {
    socket.emit('room:update-settings', { settings }, () => {});
  }, []);

  const startGame = useCallback(() => {
    socket.emit('game:start', {}, (res: any) => {
      if (!res.ok) {
        dispatch({ type: 'SET_ERROR', error: res.error });
      }
    });
  }, []);

  const submitAnswers = useCallback((answers: { [catIndex: number]: string }) => {
    socket.emit('game:submit-answers', { answers }, () => {});
  }, []);

  const submitVotes = useCallback(
    (votes: { [catIndex: number]: { [playerId: string]: boolean } }) => {
      socket.emit('game:vote', { votes }, () => {});
    },
    []
  );

  const nextRound = useCallback(() => {
    socket.emit('game:next-round', {}, () => {});
  }, []);

  const playAgain = useCallback(() => {
    socket.emit('game:play-again', {}, () => {});
  }, []);

  const leaveRoom = useCallback(() => {
    sessionStorage.removeItem('scattergories_session');
    socket.emit('room:leave');
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        createRoom,
        joinRoom,
        updateSettings: updateSettingsFn,
        startGame,
        submitAnswers,
        submitVotes,
        nextRound,
        playAgain,
        leaveRoom,
        isHost,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
