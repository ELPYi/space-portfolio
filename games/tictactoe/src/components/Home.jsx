import { useState } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Home({ onJoined }) {
  const socket = useSocket();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    socket.emit('create-room', { playerName: name.trim() }, (res) => {
      if (res.ok) {
        onJoined({ name: name.trim(), roomCode: res.roomCode, mark: res.mark, isCreator: true });
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    socket.emit('join-room', { roomCode: roomCode.trim().toUpperCase(), playerName: name.trim() }, (res) => {
      if (res.ok) {
        onJoined({ name: name.trim(), roomCode: roomCode.trim().toUpperCase(), mark: res.mark, isCreator: false });
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="screen">
      <h1>Tic Tac Toe</h1>
      <div className="form">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          maxLength={20}
        />
        <button className="btn btn-primary" onClick={handleCreate}>
          Create Room
        </button>
        <div className="divider">or join a room</div>
        <input
          type="text"
          placeholder="Room code"
          value={roomCode}
          onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
          maxLength={6}
        />
        <button className="btn btn-secondary" onClick={handleJoin}>
          Join Room
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
