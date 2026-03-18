import { useState } from 'react';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import { useSocket } from './context/SocketContext';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [myMark, setMyMark] = useState('');

  const handleJoined = ({ name, roomCode: code, mark, isCreator }) => {
    setPlayerName(name);
    setRoomCode(code);
    setMyMark(mark);
    setScreen(isCreator ? 'lobby' : 'game');
  };

  const handleGameStart = () => {
    setScreen('game');
  };

  const socket = useSocket();

  const handleLeave = () => {
    socket.emit('leave-room');
    setScreen('home');
    setRoomCode('');
    setMyMark('');
  };

  switch (screen) {
    case 'home':
      return <Home onJoined={handleJoined} />;
    case 'lobby':
      return (
        <Lobby
          roomCode={roomCode}
          playerName={playerName}
          onGameStart={handleGameStart}
          onLeave={handleLeave}
        />
      );
    case 'game':
      return (
        <Game
          roomCode={roomCode}
          myMark={myMark}
          playerName={playerName}
          onLeave={handleLeave}
        />
      );
    default:
      return <Home onJoined={handleJoined} />;
  }
}
