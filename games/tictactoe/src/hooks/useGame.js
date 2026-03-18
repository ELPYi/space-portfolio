import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

export function useGame(roomCode, myMark) {
  const socket = useSocket();
  const [gameState, setGameState] = useState(null);
  const [opponentLeft, setOpponentLeft] = useState(false);

  useEffect(() => {
    if (!socket || !roomCode) return;

    const onGameState = (state) => setGameState(state);
    const onOpponentLeft = () => setOpponentLeft(true);

    socket.on('game-state', onGameState);
    socket.on('opponent-left', onOpponentLeft);

    return () => {
      socket.off('game-state', onGameState);
      socket.off('opponent-left', onOpponentLeft);
    };
  }, [socket, roomCode]);

  const makeMove = useCallback(
    (index) => {
      if (!gameState || !gameState.gameActive) return;
      if (gameState.currentTurn !== myMark) return;
      if (gameState.board[index] !== null) return;
      socket.emit('make-move', { roomCode, index });
    },
    [socket, roomCode, myMark, gameState]
  );

  const requestPlayAgain = useCallback(() => {
    socket.emit('play-again', { roomCode });
  }, [socket, roomCode]);

  const isMyTurn = gameState ? gameState.currentTurn === myMark : false;
  const opponent = gameState
    ? gameState.players.find((p) => p.mark !== myMark)
    : null;

  return {
    board: gameState ? gameState.board : Array(9).fill(null),
    currentTurn: gameState ? gameState.currentTurn : null,
    winner: gameState ? gameState.winner : null,
    gameActive: gameState ? gameState.gameActive : false,
    isMyTurn,
    opponent,
    opponentLeft,
    playAgainVotes: gameState ? gameState.playAgainVotes : [],
    makeMove,
    requestPlayAgain,
  };
}
