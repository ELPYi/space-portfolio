import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useI18n } from '../context/I18nContext';
import { audio } from '../lib/audio';

const LETTERS = 'ABCDEFGHIJKLMNOPRSTW'.split('');

export default function RoundStart() {
  const { state } = useGame();
  const { t } = useI18n();
  const [displayLetter, setDisplayLetter] = useState('?');
  const [landed, setLanded] = useState(false);
  const timeoutIds = useRef<number[]>([]);

  useEffect(() => {
    const target = state.currentLetter;
    const totalSteps = 15;

    // Schedule each letter change with increasing delays (deceleration)
    // Finishes in ~1.5s so the landed letter is shown for ~5.5s before play starts
    let elapsed = 0;
    for (let i = 0; i < totalSteps; i++) {
      const delay = 35 + Math.pow(i / totalSteps, 2.5) * 200;
      elapsed += delay;

      const isLast = i === totalSteps - 1;
      const tid = window.setTimeout(() => {
        if (isLast) {
          setDisplayLetter(target);
          setLanded(true);
          audio.playRoundStart();
        } else {
          // Random letter, avoid showing target early
          let letter: string;
          do {
            letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
          } while (letter === target && i < totalSteps - 3);
          setDisplayLetter(letter);
        }
      }, elapsed);

      timeoutIds.current.push(tid);
    }

    return () => {
      timeoutIds.current.forEach(clearTimeout);
      timeoutIds.current = [];
    };
  }, [state.currentLetter]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-primary-200 font-bold text-lg mb-2 animate-fade-in">
          {t('roundStart.roundOf', { round: state.currentRound, total: state.totalRounds })}
        </p>
        <p className="text-primary-300 text-xl mb-6 animate-fade-in">
          {landed ? t('roundStart.yourLetterIs') : t('roundStart.rolling')}
        </p>

        <div
          className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center shadow-2xl mb-6 transition-all duration-300 ${
            landed
              ? 'bg-gradient-to-br from-accent-400 to-accent-500 scale-110'
              : 'bg-gradient-to-br from-primary-500 to-primary-700 border-2 border-primary-400/50'
          }`}
        >
          <span
            key={displayLetter}
            className={`font-display text-7xl animate-fade-in ${
              landed ? 'text-primary-900' : 'text-white'
            }`}
          >
            {displayLetter}
          </span>
        </div>

        <p className={`text-primary-200 transition-opacity duration-300 ${landed ? 'animate-pulse-slow' : 'opacity-0'}`}>
          {t('roundStart.getReady')}
        </p>
      </div>
    </div>
  );
}
