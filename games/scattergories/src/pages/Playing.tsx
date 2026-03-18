import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useI18n } from '../context/I18nContext';
import { useTimer } from '../hooks/useTimer';
import { socket } from '../socket';
import { audio } from '../lib/audio';
import { translateCategory } from '../lib/categoryTranslations';

export default function Playing() {
  const { state, submitAnswers } = useGame();
  const { t, language } = useI18n();
  const secondsLeft = useTimer(state.timerEndsAt);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const answersRef = useRef(answers);
  const submittedRef = useRef(submitted);

  // Keep refs in sync so the auto-submit effect reads the latest values
  answersRef.current = answers;
  submittedRef.current = submitted;

  // Auto-submit when local timer runs out
  useEffect(() => {
    if (secondsLeft !== null && secondsLeft <= 0 && !submittedRef.current) {
      submitAnswers(answersRef.current);
      setSubmitted(true);
    }
  }, [secondsLeft, submitAnswers]);

  // Also auto-submit when the server says time is up (handles clock drift)
  useEffect(() => {
    const handleTimeUp = () => {
      if (!submittedRef.current) {
        submitAnswers(answersRef.current);
        setSubmitted(true);
      }
    };
    socket.on('game:time-up', handleTimeUp);
    return () => { socket.off('game:time-up', handleTimeUp); };
  }, [submitAnswers]);

  // Show 10-second warning + beep
  useEffect(() => {
    if (secondsLeft === 10 && !submittedRef.current) {
      setShowWarning(true);
      audio.playWarningBeep();
      const timeout = setTimeout(() => setShowWarning(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [secondsLeft]);

  const handleChange = useCallback((catIndex: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [catIndex]: value }));
  }, []);

  const handleSubmit = () => {
    submitAnswers(answers);
    setSubmitted(true);
  };

  const displaySeconds = secondsLeft ?? '--';
  const isUrgent = secondsLeft !== null && secondsLeft <= 10;
  const timerColor =
    isUrgent ? 'text-red-400' : (secondsLeft !== null && secondsLeft <= 30) ? 'text-accent-400' : 'text-teal-300';

  const connectedCount = state.players.filter((p) => p.connected).length;

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Sticky header with timer - always visible */}
        <div className="sticky top-0 z-20 bg-primary-900 pb-3 pt-2 -mx-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-400 to-accent-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="font-display text-2xl text-primary-900">
                  {state.currentLetter}
                </span>
              </div>
              <div>
                <p className="text-xs text-primary-300">
                  {t('playing.roundShort', { round: state.currentRound, total: state.totalRounds })}
                </p>
                <p className="text-xs text-primary-300">
                  {t('playing.submittedCount', { submitted: state.submittedCount, total: connectedCount })}
                </p>
              </div>
            </div>
            <div
              className={`font-display text-3xl ${timerColor} transition-colors ${
                isUrgent && !submitted ? 'animate-pulse' : ''
              }`}
            >
              {displaySeconds}s
            </div>
          </div>

          {/* 10-second warning banner */}
          {showWarning && !submitted && (
            <div className="mt-2 bg-red-500/30 border border-red-400/50 rounded-xl py-2 px-4 text-center animate-bounce-in">
              <p className="font-bold text-red-300 text-sm">
                {t('playing.tenSecondsWarning')}
              </p>
            </div>
          )}
        </div>

        {/* Categories */}
        {submitted ? (
          <div className="card text-center animate-fade-in mt-2">
            <p className="font-display text-2xl text-teal-300 mb-2">{t('playing.answersSubmitted')}</p>
            <p className="text-primary-200">{t('playing.waitingForOthers')}</p>
            <p className="text-primary-300 text-sm mt-2">
              {t('playing.doneCount', { submitted: state.submittedCount, total: connectedCount })}
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in mt-2">
            {state.categories.map((cat, idx) => {
              const answer = answers[idx] || '';
              const wrongLetter = answer.length > 0 && !answer.trimStart().toLowerCase().startsWith(state.currentLetter.toLowerCase());
              return (
                <div key={idx} className={`bg-primary-800 rounded-3xl p-3 px-4 shadow-xl border transition-colors ${wrongLetter ? 'border-red-400/70' : 'border-white/10'}`}>
                  <label className="text-sm text-teal-300 font-bold mb-1 block">
                    {idx + 1}. {translateCategory(cat, language)}
                  </label>
                  <input
                    type="text"
                    className={`input-field py-2 ${wrongLetter ? 'border-red-400/70 focus:border-red-400' : ''}`}
                    placeholder={t('playing.placeholderLetter', { letter: state.currentLetter })}
                    value={answer}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    autoComplete="off"
                  />
                  {wrongLetter && (
                    <p className="text-red-400 text-xs mt-1">
                      {t('playing.wrongLetter', { letter: state.currentLetter })}
                    </p>
                  )}
                </div>
              );
            })}

            <button onClick={handleSubmit} className="btn-accent w-full text-lg py-4 mt-4">
              {t('playing.submitAnswers')}
            </button>
          </div>
        )}
      </div>

      {/* Floating timer for mobile - visible when scrolled past header */}
      {!submitted && (
        <div
          className={`fixed bottom-4 right-4 z-30 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl font-display text-xl ${
            isUrgent
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-primary-700/90 backdrop-blur-sm text-teal-300 border-2 border-teal-400/30'
          }`}
        >
          {displaySeconds}
        </div>
      )}
    </div>
  );
}
