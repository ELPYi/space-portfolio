import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Lobby({ roomCode, playerName, onGameStart, onLeave }) {
  const socket = useSocket();

  useEffect(() => {
    const onOpponentJoined = ({ opponentName }) => {
      onGameStart(opponentName);
    };

    socket.on('opponent-joined', onOpponentJoined);
    return () => socket.off('opponent-joined', onOpponentJoined);
  }, [socket, onGameStart]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  return (
    <div className="screen">
      <h1>Waiting for opponent...</h1>
      <p>Share this code with a friend:</p>
      <div className="room-code" onClick={copyCode} title="Click to copy">
        {roomCode}
      </div>
      <p className="hint">Tap the code to copy it</p>
      <div className="waiting-dots">
        <span></span><span></span><span></span>
      </div>
      <button className="btn btn-secondary" onClick={onLeave}>
        Leave
      </button>
    </div>
  );
}
