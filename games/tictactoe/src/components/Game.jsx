import Board from './Board';
import { useGame } from '../hooks/useGame';

export default function Game({ roomCode, myMark, playerName, onLeave }) {
  const {
    board,
    winner,
    gameActive,
    isMyTurn,
    opponent,
    opponentLeft,
    playAgainVotes,
    makeMove,
    requestPlayAgain,
  } = useGame(roomCode, myMark);

  if (opponentLeft) {
    return (
      <div className="screen">
        <h1>Opponent left</h1>
        <p>Your opponent has disconnected.</p>
        <button className="btn btn-primary" onClick={onLeave}>
          Back to Home
        </button>
      </div>
    );
  }

  let status;
  if (winner === 'draw') {
    status = "It's a draw!";
  } else if (winner) {
    status = winner === myMark ? 'You won!' : 'You lost!';
  } else if (isMyTurn) {
    status = 'Your turn';
  } else {
    status = `Waiting for ${opponent ? opponent.name : '...'}`;
  }

  return (
    <div className="screen">
      <div className="game-info">
        <p className="player-label">
          You: <strong>{playerName}</strong> ({myMark})
        </p>
        {opponent && (
          <p className="player-label">
            Opponent: <strong>{opponent.name}</strong> ({opponent.mark})
          </p>
        )}
      </div>
      <h2 className={`status ${winner ? 'status-end' : ''}`}>{status}</h2>
      <Board
        board={board}
        onCellClick={makeMove}
        disabled={!gameActive || !isMyTurn}
      />
      {!gameActive && winner && (
        <div className="game-over-actions">
          {playAgainVotes.includes(myMark) ? (
            <p className="waiting-text">Waiting for opponent...</p>
          ) : playAgainVotes.length > 0 ? (
            <p className="waiting-text">Opponent wants to play again!</p>
          ) : null}
          {!playAgainVotes.includes(myMark) && (
            <button className="btn btn-primary" onClick={requestPlayAgain}>
              Play Again
            </button>
          )}
          <button className="btn btn-secondary" onClick={onLeave}>
            Leave Room
          </button>
        </div>
      )}
    </div>
  );
}
