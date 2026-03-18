import React, { useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { audio } from '../lib/audio';

export default function MuteButton() {
  const { t } = useI18n();
  const [muted, setMuted] = useState(audio.isMuted);

  const toggle = () => {
    audio.toggleMute();
    setMuted(audio.isMuted);
  };

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-primary-800/80 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-primary-700/80 transition-all"
      aria-label={muted ? t('audio.unmute') : t('audio.mute')}
      title={muted ? t('audio.unmute') : t('audio.mute')}
    >
      {muted ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}
