import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { useI18n } from '../context/I18nContext';
import { audio } from '../lib/audio';
import { translateCategory } from '../lib/categoryTranslations';

export default function FinalResults() {
  const { state, isHost, playAgain } = useGame();
  const { t, language } = useI18n();

  const sortedPlayers = [...state.playerScores].sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks accounting for ties (standard competition ranking: 1,1,3 not 1,1,2)
  const ranks: number[] = [];
  sortedPlayers.forEach((p, i) => {
    if (i === 0) {
      ranks.push(1);
    } else {
      ranks.push(sortedPlayers[i - 1].totalScore === p.totalScore ? ranks[i - 1] : i + 1);
    }
  });

  const winners = sortedPlayers.filter((p) => p.totalScore === sortedPlayers[0]?.totalScore);

  useEffect(() => {
    audio.playVictoryFanfare();

    // Confetti burst for the winner reveal (reduced)
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#a855f7', '#14b8a6', '#facc15'],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#a855f7', '#14b8a6', '#facc15'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="font-display text-4xl text-accent-400 mb-2 animate-bounce-in">
            {t('final.gameOver')}
          </h1>
          {winners.length > 0 && (
            <p className="text-xl text-primary-200">
              {winners.length === 1
                ? t('final.wins', { name: winners[0].nickname })
                : t('final.tie', { names: winners.map((w) => w.nickname).join(' & ') })}
            </p>
          )}
        </div>

        {/* Final Leaderboard */}
        <div className="card mb-6">
          <h3 className="font-bold text-teal-300 mb-4 text-center">{t('final.finalStandings')}</h3>
          <div className="space-y-3">
            {sortedPlayers.map((p, i) => {
              const rank = ranks[i];
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-2xl px-5 py-4 transition-all ${
                    rank === 1
                      ? 'bg-gradient-to-r from-accent-400/30 to-accent-500/20 border-2 border-accent-400/50 scale-105'
                      : rank === 2
                        ? 'bg-white/10 border border-white/20'
                        : rank === 3
                          ? 'bg-white/5 border border-white/10'
                          : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl w-8 text-center">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`}
                    </span>
                    <span className="font-bold text-lg">{p.nickname}</span>
                  </div>
                  <span className="font-display text-2xl text-accent-400">{p.totalScore}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last round breakdown */}
        {state.roundResults && (
          <details className="card mb-6">
            <summary className="font-bold text-teal-300 cursor-pointer">
              {t('final.lastRoundBreakdown')}
            </summary>
            <div className="mt-3">
              {state.categories.map((cat, catIdx) => {
                const results = state.roundResults![catIdx] || [];
                return (
                  <div key={catIdx} className="mb-2 last:mb-0">
                    <p className="text-xs text-primary-300 font-bold mb-1">
                      {catIdx + 1}. {translateCategory(cat, language)}
                    </p>
                    <div className="space-y-1">
                      {results.map((r) => {
                        const player = state.players.find((pl) => pl.id === r.playerId);
                        return (
                          <div
                            key={r.playerId}
                            className="flex items-center justify-between text-sm px-2 py-1 rounded-lg bg-white/5"
                          >
                            <span className="text-primary-200 text-xs w-20 truncate">
                              {player?.nickname}
                            </span>
                            <span
                              className={`flex-1 text-center font-medium ${
                                !r.valid
                                  ? 'text-red-300 line-through'
                                  : r.duplicate
                                    ? 'text-accent-400'
                                    : 'text-teal-300'
                              }`}
                            >
                              {r.answer || '-'}
                            </span>
                            <span className="w-8 text-right font-bold text-sm">
                              {r.duplicate ? (
                                <span className="text-accent-400 text-xs">{t('results.duplicateShort')}</span>
                              ) : (
                                <span className={r.points > 0 ? 'text-teal-300' : 'text-red-300'}>
                                  {r.points}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        <div className="space-y-3">
          {isHost && (
            <button onClick={playAgain} className="btn-accent w-full text-lg py-4">
              {t('final.playAgain')}
            </button>
          )}
          {!isHost && (
            <p className="text-center text-primary-300 text-sm italic">
              {t('final.waitingForHost')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
