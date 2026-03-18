// Procedural audio engine using Web Audio API — no external files needed

type MusicType = 'menu' | 'game';

class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentMusic: MusicType | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicTimeouts: number[] = [];
  private muted: boolean;
  private loopHandle: number | null = null;

  constructor() {
    this.muted = localStorage.getItem('scattergories-muted') === 'true';
    this.setupInteractionListener();
  }

  // ctx.resume() only works inside a user gesture. Listen for the first
  // gesture, resume the context, then start whatever music is pending.
  private setupInteractionListener() {
    const onGesture = () => {
      document.removeEventListener('click', onGesture);
      document.removeEventListener('touchstart', onGesture);
      document.removeEventListener('keydown', onGesture);

      if (!this.ctx || this.ctx.state !== 'suspended') return;

      this.ctx.resume().then(() => {
        if (this.currentMusic === 'menu') {
          this.currentMusic = null;
          this.playMenuMusic();
        } else if (this.currentMusic === 'game') {
          this.currentMusic = null;
          this.playGameMusic();
        }
      });
    };

    document.addEventListener('click', onGesture);
    document.addEventListener('touchstart', onGesture);
    document.addEventListener('keydown', onGesture);
  }

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.muted ? 0 : 0.25;
      this.musicGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.muted ? 0 : 0.4;
      this.sfxGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  get isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('scattergories-muted', String(this.muted));
    if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : 0.25;
    if (this.sfxGain) this.sfxGain.gain.value = this.muted ? 0 : 0.4;
  }

  // ── Music ──────────────────────────────────────────────

  playMenuMusic() {
    if (this.currentMusic === 'menu') return;
    this.stopMusic();
    const ctx = this.ensureContext();
    this.currentMusic = 'menu';
    if (ctx.state !== 'running') return; // onGesture will start it
    this.loopMenuMusic();
  }

  playGameMusic() {
    if (this.currentMusic === 'game') return;
    this.stopMusic();
    const ctx = this.ensureContext();
    this.currentMusic = 'game';
    if (ctx.state !== 'running') return; // onGesture will start it
    this.loopGameMusic();
  }

  stopMusic() {
    this.currentMusic = null;
    this.musicOscillators.forEach((o) => { try { o.stop(); } catch {} });
    this.musicOscillators = [];
    this.musicTimeouts.forEach((t) => clearTimeout(t));
    this.musicTimeouts = [];
    if (this.loopHandle !== null) {
      clearTimeout(this.loopHandle);
      this.loopHandle = null;
    }
  }

  // Bouncy pentatonic melody loop
  private loopMenuMusic() {
    if (this.currentMusic !== 'menu') return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Pentatonic scale notes (C major pentatonic across 2 octaves)
    const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    const tempo = 0.18; // seconds per note

    // Generate a fun 16-note melody pattern
    const pattern = [0, 2, 4, 5, 7, 5, 4, 2, 3, 5, 7, 6, 4, 2, 1, 0];

    pattern.forEach((noteIdx, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[noteIdx % notes.length];
      env.gain.setValueAtTime(0, now + i * tempo);
      env.gain.linearRampToValueAtTime(0.3, now + i * tempo + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * tempo + tempo * 0.9);
      osc.connect(env);
      env.connect(this.musicGain!);
      osc.start(now + i * tempo);
      osc.stop(now + i * tempo + tempo);
      this.musicOscillators.push(osc);
    });

    // Bass notes (root + fifth alternating)
    const bassPattern = [130.81, 130.81, 196.0, 196.0];
    bassPattern.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * tempo * 4;
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(0.2, start + 0.05);
      env.gain.exponentialRampToValueAtTime(0.001, start + tempo * 3.8);
      osc.connect(env);
      env.connect(this.musicGain!);
      osc.start(start);
      osc.stop(start + tempo * 4);
      this.musicOscillators.push(osc);
    });

    const loopDuration = pattern.length * tempo * 1000;
    this.loopHandle = window.setTimeout(() => this.loopMenuMusic(), loopDuration);
    this.musicTimeouts.push(this.loopHandle);
  }

  // Calm ambient pad loop
  private loopGameMusic() {
    if (this.currentMusic !== 'game') return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Soft chord (Cmaj7 voicing)
    const chordFreqs = [130.81, 164.81, 196.0, 246.94];
    const chordDuration = 4;

    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.12, now + 1);
      env.gain.linearRampToValueAtTime(0.1, now + chordDuration - 1);
      env.gain.linearRampToValueAtTime(0, now + chordDuration);
      osc.connect(env);
      env.connect(this.musicGain!);
      osc.start(now);
      osc.stop(now + chordDuration + 0.1);
      this.musicOscillators.push(osc);
    });

    // Second chord (Am7) after 4 seconds
    const chord2Freqs = [110.0, 164.81, 196.0, 220.0];
    chord2Freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, now + chordDuration);
      env.gain.linearRampToValueAtTime(0.12, now + chordDuration + 1);
      env.gain.linearRampToValueAtTime(0.1, now + chordDuration * 2 - 1);
      env.gain.linearRampToValueAtTime(0, now + chordDuration * 2);
      osc.connect(env);
      env.connect(this.musicGain!);
      osc.start(now + chordDuration);
      osc.stop(now + chordDuration * 2 + 0.1);
      this.musicOscillators.push(osc);
    });

    const loopDuration = chordDuration * 2 * 1000;
    this.loopHandle = window.setTimeout(() => this.loopGameMusic(), loopDuration);
    this.musicTimeouts.push(this.loopHandle);
  }

  // ── Sound Effects ──────────────────────────────────────

  playWarningBeep() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Three quick descending beeps
    [880, 660, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, now + i * 0.15);
      env.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.15);
    });
  }

  playRoundStart() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Ascending chime: C - E - G - C (high)
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, now + i * 0.12);
      env.gain.linearRampToValueAtTime(0.35, now + i * 0.12 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    });
  }

  playVictoryFanfare() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Triumphant fanfare: short melody
    const fanfare = [
      { freq: 523.25, time: 0, dur: 0.15 },
      { freq: 659.25, time: 0.15, dur: 0.15 },
      { freq: 783.99, time: 0.3, dur: 0.15 },
      { freq: 1046.5, time: 0.5, dur: 0.6 },
    ];

    fanfare.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, now + time);
      env.gain.linearRampToValueAtTime(0.4, now + time + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  }
}

export const audio = new AudioManager();
