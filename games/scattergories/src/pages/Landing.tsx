import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useI18n } from '../context/I18nContext';

export default function Landing() {
  const { createRoom, joinRoom, state } = useGame();
  const { language, setLanguage, t, tError } = useI18n();
  const [mode, setMode] = useState<'home' | 'create' | 'join' | 'howto'>('home');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleCreate = () => {
    if (nickname.trim()) createRoom(nickname.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && roomCode.trim()) joinRoom(roomCode.trim(), nickname.trim());
  };

  const hasNickname = nickname.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-end mb-3">
          <label className="text-sm text-primary-200 flex items-center gap-2">
            {t('lang.label')}
            <select
              className="bg-primary-800 border border-white/20 rounded-lg px-2 py-1 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ms')}
            >
              <option value="en">{t('lang.en')}</option>
              <option value="ms">{t('lang.ms')}</option>
            </select>
          </label>
        </div>
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl md:text-6xl text-accent-400 mb-2 drop-shadow-lg">
            Scattergories
          </h1>
          <p className="text-primary-200 text-lg font-semibold">{t('landing.subtitle')}</p>
        </div>

        {mode === 'home' && (
          <div className="space-y-4 animate-slide-up">
            <div className="card">
              <input
                type="text"
                className="input-field text-center"
                placeholder={t('landing.nicknamePlaceholder')}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>
            <button
              onClick={handleCreate}
              className="btn-primary w-full text-xl py-4"
              disabled={!hasNickname}
            >
              {t('landing.createRoom')}
            </button>
            <button
              onClick={() => hasNickname && setMode('join')}
              className="btn-secondary w-full text-xl py-4"
              disabled={!hasNickname}
            >
              {t('landing.joinRoom')}
            </button>
            <button
              onClick={() => setMode('howto')}
              className="text-primary-300 text-sm w-full text-center hover:text-white transition-colors py-1"
            >
              {t('landing.howToPlay')}
            </button>
          </div>
        )}

        {mode === 'howto' && (
          <div className="card space-y-4 animate-slide-up">
            <h2 className="font-display text-2xl text-center text-accent-400">{t('landing.howToPlay.title')}</h2>
            <div className="space-y-3 text-sm text-primary-200">
              <div className="flex gap-3">
                <span className="text-2xl">🎲</span>
                <div>
                  <p className="font-bold text-white">{t('landing.howToPlay.letterTitle')}</p>
                  <p>{t('landing.howToPlay.letterDesc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">✍️</span>
                <div>
                  <p className="font-bold text-white">{t('landing.howToPlay.fillTitle')}</p>
                  <p>{t('landing.howToPlay.fillDesc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">🗳️</span>
                <div>
                  <p className="font-bold text-white">{t('landing.howToPlay.voteTitle')}</p>
                  <p>{t('landing.howToPlay.voteDesc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-bold text-white">{t('landing.howToPlay.scoreTitle')}</p>
                  <p>{t('landing.howToPlay.scoreDesc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">🥇</span>
                <div>
                  <p className="font-bold text-white">{t('landing.howToPlay.winTitle')}</p>
                  <p>{t('landing.howToPlay.winDesc')}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setMode('home')}
              className="text-primary-300 text-sm w-full text-center hover:text-white transition-colors"
            >
              ← {t('landing.back')}
            </button>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="card space-y-4 animate-slide-up">
            <h2 className="font-display text-2xl text-center">{t('landing.joinRoomTitle')}</h2>
            <p className="text-primary-200 text-sm text-center">
              {t('landing.playingAsLabel')}{' '}
              <span className="font-bold text-teal-300">{nickname}</span>
            </p>
            <input
              type="text"
              className="input-field uppercase tracking-widest text-center text-2xl"
              placeholder={t('landing.roomCodePlaceholder')}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              autoFocus
            />
            <button
              type="submit"
              className="btn-accent w-full"
              disabled={roomCode.length < 4}
            >
              {t('landing.joinGame')}
            </button>
            <button
              type="button"
              onClick={() => setMode('home')}
              className="text-primary-300 text-sm w-full text-center hover:text-white transition-colors"
            >
              {t('landing.back')}
            </button>
          </form>
        )}

        {state.error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/40 rounded-2xl p-3 text-center text-red-200 animate-slide-up">
            {tError(state.error)}
          </div>
        )}
      </div>
    </div>
  );
}
