import React, { createContext, useContext, useMemo, useState } from 'react';

type Language = 'en' | 'ms';

type TranslationKey =
  | 'lang.label'
  | 'lang.en'
  | 'lang.ms'
  | 'landing.subtitle'
  | 'landing.nicknamePlaceholder'
  | 'landing.createRoom'
  | 'landing.joinRoom'
  | 'landing.joinRoomTitle'
  | 'landing.playingAsLabel'
  | 'landing.roomCodePlaceholder'
  | 'landing.joinGame'
  | 'landing.back'
  | 'landing.howToPlay'
  | 'landing.howToPlay.title'
  | 'landing.howToPlay.letterTitle'
  | 'landing.howToPlay.letterDesc'
  | 'landing.howToPlay.fillTitle'
  | 'landing.howToPlay.fillDesc'
  | 'landing.howToPlay.voteTitle'
  | 'landing.howToPlay.voteDesc'
  | 'landing.howToPlay.scoreTitle'
  | 'landing.howToPlay.scoreDesc'
  | 'landing.howToPlay.winTitle'
  | 'landing.howToPlay.winDesc'
  | 'lobby.title'
  | 'lobby.roomCode'
  | 'lobby.players'
  | 'lobby.you'
  | 'lobby.host'
  | 'lobby.settings'
  | 'lobby.timerSeconds'
  | 'lobby.rounds'
  | 'lobby.categoriesPerRound'
  | 'lobby.validationMode'
  | 'lobby.validationAuto'
  | 'lobby.validationVote'
  | 'lobby.validationAutoDesc'
  | 'lobby.validationVoteDesc'
  | 'lobby.waitingForHost'
  | 'lobby.startGame'
  | 'lobby.needTwoPlayers'
  | 'lobby.leaveRoom'
  | 'roundStart.roundOf'
  | 'roundStart.yourLetterIs'
  | 'roundStart.rolling'
  | 'roundStart.getReady'
  | 'playing.roundShort'
  | 'playing.submittedCount'
  | 'playing.wrongLetter'
  | 'playing.tenSecondsWarning'
  | 'playing.placeholderLetter'
  | 'playing.submitAnswers'
  | 'playing.answersSubmitted'
  | 'playing.waitingForOthers'
  | 'playing.doneCount'
  | 'validation.votesSubmitted'
  | 'validation.waitingForOthers'
  | 'validation.votedCount'
  | 'validation.voteOnAnswers'
  | 'validation.instructions'
  | 'validation.you'
  | 'validation.noAnswer'
  | 'validation.duplicateSuffix'
  | 'validation.wrongLetterSuffix'
  | 'validation.submitVotes'
  | 'results.roundResultsTitle'
  | 'results.roundOf'
  | 'results.scores'
  | 'results.totalSuffix'
  | 'results.answerBreakdown'
  | 'results.duplicateShort'
  | 'results.nextRound'
  | 'results.waitingForHost'
  | 'final.gameOver'
  | 'final.wins'
  | 'final.tie'
  | 'final.finalStandings'
  | 'final.lastRoundBreakdown'
  | 'final.playAgain'
  | 'final.waitingForHost'
  | 'audio.mute'
  | 'audio.unmute'
  | 'error.roomJoinFailed'
  | 'error.joinGeneric'
  | 'error.notInRoom'
  | 'error.notHost'
  | 'error.needTwoPlayers'
  | 'error.gameInProgress'
  | 'error.notRoundResults'
  | 'error.notFinalResults'
  | 'error.notValidation';

type Params = Record<string, string | number>;

const en: Record<TranslationKey, string> = {
  'lang.label': 'Language',
  'lang.en': 'English',
  'lang.ms': 'Malay',
  'landing.subtitle': 'Online Party Game',
  'landing.nicknamePlaceholder': 'Enter your nickname',
  'landing.createRoom': 'Create Room',
  'landing.joinRoom': 'Join Room',
  'landing.joinRoomTitle': 'Join Room',
  'landing.playingAsLabel': 'Playing as',
  'landing.roomCodePlaceholder': 'ROOM CODE',
  'landing.joinGame': 'Join Game',
  'landing.back': 'Back',
  'landing.howToPlay': 'How to Play',
  'landing.howToPlay.title': 'How to Play',
  'landing.howToPlay.letterTitle': 'Each round, a letter is revealed',
  'landing.howToPlay.letterDesc': 'All your answers must start with that letter.',
  'landing.howToPlay.fillTitle': 'Fill in the categories',
  'landing.howToPlay.fillDesc': "Think fast — there's a timer! Write one answer per category.",
  'landing.howToPlay.voteTitle': 'Vote on answers',
  'landing.howToPlay.voteDesc': "After time's up, vote on whether each player's answers are valid. Majority rules.",
  'landing.howToPlay.scoreTitle': 'Score points',
  'landing.howToPlay.scoreDesc': 'Valid unique answers = 1 pt. Duplicate answers = 0 pts. Wrong letter = 0 pts.',
  'landing.howToPlay.winTitle': 'Most points wins!',
  'landing.howToPlay.winDesc': 'Play multiple rounds — highest total score at the end wins.',
  'lobby.title': 'Game Lobby',
  'lobby.roomCode': 'Room Code',
  'lobby.players': 'Players ({count})',
  'lobby.you': '(You)',
  'lobby.host': 'HOST',
  'lobby.settings': 'Settings',
  'lobby.timerSeconds': 'Timer (seconds)',
  'lobby.rounds': 'Rounds',
  'lobby.categoriesPerRound': 'Categories per round',
  'lobby.validationMode': 'Validation Mode',
  'lobby.validationAuto': 'Auto',
  'lobby.validationVote': 'Vote',
  'lobby.validationAutoDesc': 'Answers must start with the correct letter',
  'lobby.validationVoteDesc': "Players vote to accept/reject answers",
  'lobby.waitingForHost': 'Waiting for host to start...',
  'lobby.startGame': 'Start Game',
  'lobby.needTwoPlayers': 'Need 2+ Players',
  'lobby.leaveRoom': 'Leave Room',
  'roundStart.roundOf': 'Round {round} of {total}',
  'roundStart.yourLetterIs': 'Your letter is...',
  'roundStart.rolling': 'Rolling...',
  'roundStart.getReady': 'Get ready...',
  'playing.roundShort': 'Round {round}/{total}',
  'playing.submittedCount': '{submitted}/{total} submitted',
  'playing.wrongLetter': 'Must start with "{letter}"',
  'playing.tenSecondsWarning': "10 seconds left! Answers will auto-submit when time's up!",
  'playing.placeholderLetter': '{letter}...',
  'playing.submitAnswers': 'Submit Answers',
  'playing.answersSubmitted': 'Answers Submitted!',
  'playing.waitingForOthers': 'Waiting for other players...',
  'playing.doneCount': '{submitted}/{total} done',
  'validation.votesSubmitted': 'Votes Submitted!',
  'validation.waitingForOthers': 'Waiting for other players...',
  'validation.votedCount': '{voted}/{total} voted',
  'validation.voteOnAnswers': 'Vote on Answers',
  'validation.instructions': "Tap to reject answers that don't fit. Green = accept, Red = reject.",
  'validation.you': 'You',
  'validation.noAnswer': 'No answer',
  'validation.duplicateSuffix': '(duplicate)',
  'validation.wrongLetterSuffix': '(wrong letter)',
  'validation.submitVotes': 'Submit Votes',
  'results.roundResultsTitle': 'Round {round} Results',
  'results.roundOf': 'Round {round} of {total}',
  'results.scores': 'Scores',
  'results.totalSuffix': '({total} total)',
  'results.answerBreakdown': 'Answer Breakdown',
  'results.duplicateShort': 'DUP',
  'results.nextRound': 'Next Round',
  'results.waitingForHost': 'Waiting for host to continue...',
  'final.gameOver': 'Game Over!',
  'final.wins': '{name} wins!',
  'final.tie': '{names} tie!',
  'final.finalStandings': 'Final Standings',
  'final.lastRoundBreakdown': 'Last Round Breakdown',
  'final.playAgain': 'Play Again',
  'final.waitingForHost': 'Waiting for host...',
  'audio.mute': 'Mute',
  'audio.unmute': 'Unmute',
  'error.roomJoinFailed': 'Room not found, full, or nickname taken',
  'error.joinGeneric': 'Could not join room',
  'error.notInRoom': 'Not in a room',
  'error.notHost': 'Not the host',
  'error.needTwoPlayers': 'Need at least 2 players',
  'error.gameInProgress': 'Game already in progress',
  'error.notRoundResults': 'Not in round results phase',
  'error.notFinalResults': 'Not in final results phase',
  'error.notValidation': 'Not in validation phase',
};

const ms: Record<TranslationKey, string> = {
  'lang.label': 'Bahasa',
  'lang.en': 'Inggeris',
  'lang.ms': 'Melayu',
  'landing.subtitle': 'Permainan Parti Dalam Talian',
  'landing.nicknamePlaceholder': 'Masukkan nama panggilan',
  'landing.createRoom': 'Cipta Bilik',
  'landing.joinRoom': 'Sertai Bilik',
  'landing.joinRoomTitle': 'Sertai Bilik',
  'landing.playingAsLabel': 'Bermain sebagai',
  'landing.roomCodePlaceholder': 'KOD BILIK',
  'landing.joinGame': 'Sertai Permainan',
  'landing.back': 'Kembali',
  'landing.howToPlay': 'Cara Bermain',
  'landing.howToPlay.title': 'Cara Bermain',
  'landing.howToPlay.letterTitle': 'Setiap pusingan, satu huruf didedahkan',
  'landing.howToPlay.letterDesc': 'Semua jawapan anda mesti bermula dengan huruf tersebut.',
  'landing.howToPlay.fillTitle': 'Isi kategori',
  'landing.howToPlay.fillDesc': 'Fikir pantas — ada pemasa! Tulis satu jawapan bagi setiap kategori.',
  'landing.howToPlay.voteTitle': 'Undi jawapan',
  'landing.howToPlay.voteDesc': 'Selepas masa tamat, undi sama ada jawapan pemain lain sah. Majoriti menentukan.',
  'landing.howToPlay.scoreTitle': 'Kumpul mata',
  'landing.howToPlay.scoreDesc': 'Jawapan unik yang sah = 1 mata. Jawapan sama = 0 mata. Huruf salah = 0 mata.',
  'landing.howToPlay.winTitle': 'Mata terbanyak menang!',
  'landing.howToPlay.winDesc': 'Main beberapa pusingan — jumlah mata tertinggi pada akhir permainan menang.',
  'lobby.title': 'Lobi Permainan',
  'lobby.roomCode': 'Kod Bilik',
  'lobby.players': 'Pemain ({count})',
  'lobby.you': '(Anda)',
  'lobby.host': 'HOS',
  'lobby.settings': 'Tetapan',
  'lobby.timerSeconds': 'Pemasa (saat)',
  'lobby.rounds': 'Pusingan',
  'lobby.categoriesPerRound': 'Kategori setiap pusingan',
  'lobby.validationMode': 'Mod Pengesahan',
  'lobby.validationAuto': 'Auto',
  'lobby.validationVote': 'Undi',
  'lobby.validationAutoDesc': 'Jawapan mesti bermula dengan huruf yang betul',
  'lobby.validationVoteDesc': 'Pemain mengundi untuk terima/tolak jawapan',
  'lobby.waitingForHost': 'Menunggu hos memulakan permainan...',
  'lobby.startGame': 'Mula Permainan',
  'lobby.needTwoPlayers': 'Perlu 2+ pemain',
  'lobby.leaveRoom': 'Keluar Bilik',
  'roundStart.roundOf': 'Pusingan {round} daripada {total}',
  'roundStart.yourLetterIs': 'Huruf anda ialah...',
  'roundStart.rolling': 'Sedang berpusing...',
  'roundStart.getReady': 'Bersedia...',
  'playing.roundShort': 'Pusingan {round}/{total}',
  'playing.submittedCount': '{submitted}/{total} telah hantar',
  'playing.wrongLetter': 'Mesti bermula dengan "{letter}"',
  'playing.tenSecondsWarning': 'Tinggal 10 saat! Jawapan akan dihantar automatik bila masa tamat!',
  'playing.placeholderLetter': '{letter}...',
  'playing.submitAnswers': 'Hantar Jawapan',
  'playing.answersSubmitted': 'Jawapan Dihantar!',
  'playing.waitingForOthers': 'Menunggu pemain lain...',
  'playing.doneCount': '{submitted}/{total} selesai',
  'validation.votesSubmitted': 'Undian Dihantar!',
  'validation.waitingForOthers': 'Menunggu pemain lain...',
  'validation.votedCount': '{voted}/{total} telah undi',
  'validation.voteOnAnswers': 'Undi Jawapan',
  'validation.instructions': 'Tekan untuk tolak jawapan yang tidak sesuai. Hijau = terima, Merah = tolak.',
  'validation.you': 'Anda',
  'validation.noAnswer': 'Tiada jawapan',
  'validation.duplicateSuffix': '(duplikasi)',
  'validation.wrongLetterSuffix': '(huruf salah)',
  'validation.submitVotes': 'Hantar Undian',
  'results.roundResultsTitle': 'Keputusan Pusingan {round}',
  'results.roundOf': 'Pusingan {round} daripada {total}',
  'results.scores': 'Skor',
  'results.totalSuffix': '(jumlah {total})',
  'results.answerBreakdown': 'Perincian Jawapan',
  'results.duplicateShort': 'DUP',
  'results.nextRound': 'Pusingan Seterusnya',
  'results.waitingForHost': 'Menunggu hos untuk teruskan...',
  'final.gameOver': 'Permainan Tamat!',
  'final.wins': '{name} menang!',
  'final.tie': '{names} seri!',
  'final.finalStandings': 'Kedudukan Akhir',
  'final.lastRoundBreakdown': 'Perincian Pusingan Terakhir',
  'final.playAgain': 'Main Semula',
  'final.waitingForHost': 'Menunggu hos...',
  'audio.mute': 'Senyap',
  'audio.unmute': 'Buka bunyi',
  'error.roomJoinFailed': 'Bilik tidak ditemui, penuh, atau nama sudah digunakan',
  'error.joinGeneric': 'Tidak dapat sertai bilik',
  'error.notInRoom': 'Tidak berada dalam bilik',
  'error.notHost': 'Bukan hos',
  'error.needTwoPlayers': 'Perlu sekurang-kurangnya 2 pemain',
  'error.gameInProgress': 'Permainan sudah bermula',
  'error.notRoundResults': 'Bukan dalam fasa keputusan pusingan',
  'error.notFinalResults': 'Bukan dalam fasa keputusan akhir',
  'error.notValidation': 'Bukan dalam fasa pengesahan',
};

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ''));
}

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, ms };

function translateServerErrorToKey(error: string): TranslationKey | null {
  switch (error) {
    case 'Room not found, full, or nickname taken':
      return 'error.roomJoinFailed';
    case 'Could not join room':
      return 'error.joinGeneric';
    case 'Not in a room':
      return 'error.notInRoom';
    case 'Not the host':
      return 'error.notHost';
    case 'Need at least 2 players':
      return 'error.needTwoPlayers';
    case 'Game already in progress':
      return 'error.gameInProgress';
    case 'Not in round results phase':
      return 'error.notRoundResults';
    case 'Not in final results phase':
      return 'error.notFinalResults';
    case 'Not in validation phase':
      return 'error.notValidation';
    default:
      return null;
  }
}

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Params) => string;
  tError: (error: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage(): Language {
  const saved = localStorage.getItem('scattergories-language');
  return saved === 'ms' ? 'ms' : 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem('scattergories-language', nextLanguage);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => interpolate(dictionaries[language][key], params),
      tError: (error) => {
        const key = translateServerErrorToKey(error);
        if (!key) return error;
        return interpolate(dictionaries[language][key]);
      },
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}

export type { Language };
