import { useEffect } from 'react';
import { useGame } from './context/GameContext';
import Landing from './pages/Landing';
import Lobby from './pages/Lobby';
import RoundStart from './pages/RoundStart';
import Playing from './pages/Playing';
import Validation from './pages/Validation';
import RoundResults from './pages/RoundResults';
import FinalResults from './pages/FinalResults';
import BackgroundAnimation from './components/BackgroundAnimation';
import MuteButton from './components/MuteButton';
import { audio } from './lib/audio';

const MENU_PHASES = new Set(['LANDING', 'LOBBY']);
const GAME_PHASES = new Set(['ROUND_START', 'PLAYING', 'VALIDATION', 'ROUND_RESULTS']);

export default function App() {
  const { state } = useGame();

  // Switch music based on phase
  useEffect(() => {
    if (MENU_PHASES.has(state.phase)) {
      audio.playMenuMusic();
    } else if (GAME_PHASES.has(state.phase)) {
      audio.playGameMusic();
    } else if (state.phase === 'FINAL_RESULTS') {
      audio.stopMusic();
    }
  }, [state.phase]);

  const bgIntensity = MENU_PHASES.has(state.phase) || state.phase === 'FINAL_RESULTS' ? 'lively' : 'calm';

  const page = (() => {
    switch (state.phase) {
      case 'LANDING':
        return <Landing />;
      case 'LOBBY':
        return <Lobby />;
      case 'ROUND_START':
        return <RoundStart />;
      case 'PLAYING':
        return <Playing />;
      case 'VALIDATION':
        return <Validation />;
      case 'ROUND_RESULTS':
        return <RoundResults />;
      case 'FINAL_RESULTS':
        return <FinalResults />;
      default:
        return <Landing />;
    }
  })();

  return (
    <>
      <BackgroundAnimation intensity={bgIntensity} />
      <div className="relative z-10">
        {page}
      </div>
      <MuteButton />
    </>
  );
}
