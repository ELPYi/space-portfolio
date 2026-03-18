import React from 'react';
import { useGame } from '../context/GameContext';
import { ValidationMode } from '../lib/constants';
import { useI18n } from '../context/I18nContext';

export default function Lobby() {
  const { state, isHost, updateSettings, startGame, leaveRoom } = useGame();
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl text-accent-400 mb-1">{t('lobby.title')}</h1>
          <div className="inline-block bg-white/10 rounded-xl px-4 py-2 mt-2">
            <span className="text-primary-300 text-sm">{t('lobby.roomCode')}</span>
            <p className="font-display text-3xl tracking-widest text-white">{state.roomCode}</p>
          </div>
        </div>

        {/* Players */}
        <div className="card mb-4">
          <h3 className="font-bold text-teal-300 mb-3">
            {t('lobby.players', { count: state.players.length })}
          </h3>
          <div className="space-y-2">
            {state.players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2"
              >
                <span className="font-semibold">
                  {p.nickname}
                  {p.id === state.playerId && (
                    <span className="text-primary-300 text-sm ml-2">{t('lobby.you')}</span>
                  )}
                </span>
                {p.isHost && (
                  <span className="bg-accent-400 text-primary-900 text-xs font-bold px-2 py-1 rounded-full">
                    {t('lobby.host')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Settings (host only) */}
        {isHost && (
          <div className="card mb-4">
            <h3 className="font-bold text-teal-300 mb-3">{t('lobby.settings')}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-primary-200">{t('lobby.timerSeconds')}</label>
                <input
                  type="range"
                  min={30}
                  max={300}
                  step={15}
                  value={state.settings.timerSeconds}
                  onChange={(e) => updateSettings({ timerSeconds: Number(e.target.value) })}
                  className="w-full accent-teal-400"
                />
                <span className="text-sm font-bold">{state.settings.timerSeconds}s</span>
              </div>
              <div>
                <label className="text-sm text-primary-200">{t('lobby.rounds')}</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={state.settings.numRounds}
                  onChange={(e) => updateSettings({ numRounds: Number(e.target.value) })}
                  className="w-full accent-teal-400"
                />
                <span className="text-sm font-bold">{state.settings.numRounds}</span>
              </div>
              <div>
                <label className="text-sm text-primary-200">{t('lobby.categoriesPerRound')}</label>
                <input
                  type="range"
                  min={3}
                  max={16}
                  step={1}
                  value={state.settings.numCategories}
                  onChange={(e) => updateSettings({ numCategories: Number(e.target.value) })}
                  className="w-full accent-teal-400"
                />
                <span className="text-sm font-bold">{state.settings.numCategories}</span>
              </div>
              <div>
                <label className="text-sm text-primary-200 block mb-2">{t('lobby.validationMode')}</label>
                <div className="flex gap-2">
                  {(['auto', 'vote'] as ValidationMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSettings({ validationMode: mode })}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                        state.settings.validationMode === mode
                          ? 'bg-teal-500 text-white'
                          : 'bg-white/10 text-primary-200 hover:bg-white/20'
                      }`}
                    >
                      {mode === 'auto' ? t('lobby.validationAuto') : t('lobby.validationVote')}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-primary-300 mt-1">
                  {state.settings.validationMode === 'auto' &&
                    t('lobby.validationAutoDesc')}
                  {state.settings.validationMode === 'vote' &&
                    t('lobby.validationVoteDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isHost && (
          <div className="card mb-4">
            <h3 className="font-bold text-teal-300 mb-2">{t('lobby.settings')}</h3>
            <div className="text-sm text-primary-200 space-y-1">
              <p>{t('lobby.timerSeconds')}: {state.settings.timerSeconds}s</p>
              <p>{t('lobby.rounds')}: {state.settings.numRounds}</p>
              <p>{t('lobby.categoriesPerRound')}: {state.settings.numCategories}</p>
              <p>{t('lobby.validationMode')}: {state.settings.validationMode === 'auto' ? t('lobby.validationAuto') : t('lobby.validationVote')}</p>
            </div>
            <p className="text-primary-300 text-sm mt-3 italic">{t('lobby.waitingForHost')}</p>
          </div>
        )}

        <div className="space-y-3">
          {isHost && (
            <button
              onClick={startGame}
              className="btn-accent w-full text-lg py-4"
              disabled={state.players.length < 2}
            >
              {state.players.length < 2 ? t('lobby.needTwoPlayers') : t('lobby.startGame')}
            </button>
          )}
          <button
            onClick={leaveRoom}
            className="text-primary-300 text-sm w-full text-center hover:text-white transition-colors"
          >
            {t('lobby.leaveRoom')}
          </button>
        </div>
      </div>
    </div>
  );
}
