export class SoundManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.thrusterGain = null;
    this.thrusterFilter = null;
    this._ambientGain = null;
    this._combatGain  = null;
    this._combatActive = false;
    this._snareBuffer  = null;
    this._dysonRumble = null;
  }

  /** Call on first user gesture (LAUNCH click) */
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._startMusic();
    this._startThruster();

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  /** Fade out all audio (for planet entry) */
  mute() {
    if (!this.master) return;
    this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
  }

  /** Fade audio back in */
  unmute() {
    if (!this.master) return;
    this.master.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.5);
  }

  /** Switch to intense combat music (called when player joins multiplayer) */
  startCombatMusic() {
    if (!this.ctx || this._combatActive) return;
    this._combatActive = true;

    // Pre-bake snare noise buffer once
    if (!this._snareBuffer) {
      const len = Math.floor(this.ctx.sampleRate * 0.18);
      this._snareBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._snareBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }

    const now = this.ctx.currentTime;
    // Dim ambient to a quiet bed
    this._ambientGain.gain.cancelScheduledValues(now);
    this._ambientGain.gain.linearRampToValueAtTime(0.06, now + 2);
    // Raise combat track
    this._combatGain.gain.cancelScheduledValues(now);
    this._combatGain.gain.linearRampToValueAtTime(1, now + 1.5);

    this._scheduleCombatLoop();
  }

  /** Fade back to calm ambient music (called on reset/disconnect) */
  stopCombatMusic() {
    if (!this.ctx || !this._combatActive) return;
    this._combatActive = false;

    const now = this.ctx.currentTime;
    this._ambientGain.gain.cancelScheduledValues(now);
    this._ambientGain.gain.linearRampToValueAtTime(1, now + 2.5);
    this._combatGain.gain.cancelScheduledValues(now);
    this._combatGain.gain.linearRampToValueAtTime(0, now + 2.5);
  }

  /**
   * Procedural combat music — driving E-minor arpeggio + bass + snare.
   * Self-rescheduling via setTimeout; stops when _combatActive is false.
   */
  _scheduleCombatLoop() {
    if (!this._combatActive || !this.ctx) return;

    const ctx  = this.ctx;
    const dest = this._combatGain;
    const STEP = 0.125; // seconds per 16th note (~120 BPM × 4)
    const N    = 16;
    const now  = ctx.currentTime + 0.06;

    // E-minor pentatonic arpeggio (Hz): E3 B3 E4 G4 B4 G4 E4 B3 × 2
    const ARP = [
      164.81, 246.94, 329.63, 392.00, 493.88, 392.00, 329.63, 246.94,
      164.81, 246.94, 329.63, 392.00, 493.88, 392.00, 329.63, 246.94,
    ];

    // Bass hits (1=E2, 2=B1, 0=rest)
    const BASS = [1,0,2,0, 1,1,0,2, 1,0,2,0, 1,2,1,0];

    // Snare on beats 3 and 7 (0-indexed steps 4 and 12 of 16)
    const SNARE = new Set([4, 12]);

    for (let i = 0; i < N; i++) {
      const t = now + i * STEP;

      // ── Bass ──────────────────────────────────────────────────────────────
      if (BASS[i]) {
        const freq = BASS[i] === 1 ? 82.41 : 61.74; // E2 or B1
        const osc  = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        const g    = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        filt.type = 'lowpass';
        filt.frequency.value = 300;
        filt.Q.value = 3;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.55, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 0.75);
        osc.connect(filt); filt.connect(g); g.connect(dest);
        osc.start(t); osc.stop(t + STEP * 0.8);
      }

      // ── Arpeggio ──────────────────────────────────────────────────────────
      {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = ARP[i];
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.032, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 0.55);
        osc.connect(g); g.connect(dest);
        osc.start(t); osc.stop(t + STEP * 0.65);
      }

      // ── Sub-octave drone on beat 1 ─────────────────────────────────────────
      if (i === 0 || i === 8) {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 41.2; // E1
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.3, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 7);
        osc.connect(g); g.connect(dest);
        osc.start(t); osc.stop(t + STEP * 8);
      }

      // ── Snare ──────────────────────────────────────────────────────────────
      if (SNARE.has(i) && this._snareBuffer) {
        const sn    = ctx.createBufferSource();
        const sfilt = ctx.createBiquadFilter();
        const sg    = ctx.createGain();
        sn.buffer = this._snareBuffer;
        sfilt.type = 'bandpass';
        sfilt.frequency.value = 2200;
        sfilt.Q.value = 0.7;
        sg.gain.setValueAtTime(0.22, t);
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        sn.connect(sfilt); sfilt.connect(sg); sg.connect(dest);
        sn.start(t); sn.stop(t + 0.18);
      }
    }

    // Re-schedule just before this loop ends
    setTimeout(() => this._scheduleCombatLoop(), (N * STEP - 0.15) * 1000);
  }

  /** Procedural ambient space music */
  _startMusic() {
    const ctx = this.ctx;

    // Master gain
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    this.master = master;

    // Ambient sub-gain — fades during combat
    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 1.0;
    ambientGain.connect(master);
    this._ambientGain = ambientGain;

    // Combat sub-gain — rises during combat
    const combatGain = ctx.createGain();
    combatGain.gain.value = 0;
    combatGain.connect(master);
    this._combatGain = combatGain;

    // --- Layer 1: Ethereal high shimmer ---
    const shimmerNotes = [440, 659.25, 880];
    for (const freq of shimmerNotes) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const tremolo = ctx.createOscillator();
      const tremoloGain = ctx.createGain();
      tremolo.type = 'sine';
      tremolo.frequency.value = 0.15 + Math.random() * 0.15;
      tremoloGain.gain.value = 0.015;
      tremolo.connect(tremoloGain);

      const gain = ctx.createGain();
      gain.gain.value = 0.015;
      tremoloGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(ambientGain); // routed through ambientGain
      osc.start();
      tremolo.start();
    }

    // --- Layer 2: Slow arpeggiated melody ---
    this._startMelody(ctx, ambientGain);
  }

  /** Slow melodic notes that loop */
  _startMelody(ctx, dest) {
    const notes = [
      220, 261.63, 329.63, 392, 440, 523.25, 329.63, 392,
    ];
    const noteLength = 2.0;
    const totalLoop  = notes.length * noteLength;

    const scheduleNote = (freq, startTime) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.04, startTime + 0.4);
      gain.gain.setValueAtTime(0.04, startTime + noteLength - 0.6);
      gain.gain.linearRampToValueAtTime(0, startTime + noteLength);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + noteLength + 0.05);
    };

    const scheduleLoop = () => {
      const now = ctx.currentTime + 0.1;
      for (let i = 0; i < notes.length; i++) {
        scheduleNote(notes[i], now + i * noteLength);
      }
      setTimeout(scheduleLoop, (totalLoop - 1) * 1000);
    };

    scheduleLoop();
  }

  /** Continuous thruster engine noise */
  _startThruster() {
    const ctx   = this.ctx;
    const bufLen = ctx.sampleRate * 2;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d      = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop   = true;

    this.thrusterFilter = ctx.createBiquadFilter();
    this.thrusterFilter.type = 'lowpass';
    this.thrusterFilter.frequency.value = 120;
    this.thrusterFilter.Q.value = 2;

    this.thrusterGain = ctx.createGain();
    this.thrusterGain.gain.value = 0.03;

    noise.connect(this.thrusterFilter);
    this.thrusterFilter.connect(this.thrusterGain);
    this.thrusterGain.connect(ctx.destination);
    noise.start();
  }

  /** Call each frame with current ship speed (0–3) */
  updateThruster(speed) {
    if (!this.thrusterGain) return;
    const t = Math.min(speed / 3, 1);
    this.thrusterGain.gain.value = 0.03 + t * 0.12;
    this.thrusterFilter.frequency.value = 120 + t * 480;
  }

  /** Entry whoosh */
  playEntry() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const duration = 2;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t   = i / bufferSize;
      const env = t < 0.5 ? t * 2 : (1 - t) * 2;
      data[i]   = (Math.random() * 2 - 1) * env;
    }
    const noise     = ctx.createBufferSource();
    noise.buffer    = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.07;
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);

    const sweep     = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(150, now);
    sweep.frequency.exponentialRampToValueAtTime(800, now + duration);
    sweepGain.gain.setValueAtTime(0.001, now);
    sweepGain.gain.linearRampToValueAtTime(0.04, now + duration * 0.6);
    sweepGain.gain.linearRampToValueAtTime(0, now + duration);
    sweep.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweep.start(now);
    sweep.stop(now + duration);
  }

  /** Laser shot */
  playLaserShot() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Asteroid break / explosion burst */
  playAsteroidBreak() {
    if (!this.ctx) return;
    const ctx      = this.ctx;
    const now      = ctx.currentTime;
    const duration = 0.2;

    const bufferSize = ctx.sampleRate * duration;
    const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise  = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);
    filter.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Short metallic click — played each time a Dyson sphere panel slots in.
   * Throttle calls in main.js (≥600 ms apart).
   */
  playPanelSnap() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // High-pitched triangle ping that drops fast
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.07);
    gain.gain.setValueAtTime(0.10, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    // Tiny noise transient for the metallic bite
    const nLen = Math.floor(ctx.sampleRate * 0.03);
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd   = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
    const nsrc   = ctx.createBufferSource();
    nsrc.buffer  = nBuf;
    const nFilt  = ctx.createBiquadFilter();
    nFilt.type   = 'highpass';
    nFilt.frequency.value = 3000;
    const nGain  = ctx.createGain();
    nGain.gain.setValueAtTime(0.08, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    nsrc.connect(nFilt); nFilt.connect(nGain); nGain.connect(ctx.destination);
    nsrc.start(now);
    nsrc.stop(now + 0.03);
  }

  /**
   * Epic Dyson sphere activation — sub-bass boom + harmonic sweep + noise rush.
   * Called when the sphere locks down (panel construction complete).
   */
  playDysonActivate() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Sub-bass thud
    const sub     = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(35, now);
    sub.frequency.exponentialRampToValueAtTime(70, now + 0.6);
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.45, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    sub.connect(subGain); subGain.connect(ctx.destination);
    sub.start(now); sub.stop(now + 2.2);

    // Harmonic overtone sweep (lower, warmer)
    for (let k = 1; k <= 3; k++) {
      const osc  = ctx.createOscillator();
      const g    = ctx.createGain();
      osc.type   = 'sawtooth';
      osc.frequency.setValueAtTime(45 * k, now);
      osc.frequency.exponentialRampToValueAtTime(140 * k, now + 2.0);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.09 / k, now + 0.25);
      g.gain.linearRampToValueAtTime(0, now + 2.5);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 2.5);
    }

    // Broadband noise rush (sweeps high)
    const nLen = Math.floor(ctx.sampleRate * 2.5);
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd   = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
    const nsrc   = ctx.createBufferSource();
    nsrc.buffer  = nBuf;
    const nFilt  = ctx.createBiquadFilter();
    nFilt.type   = 'bandpass';
    nFilt.frequency.setValueAtTime(300, now);
    nFilt.frequency.exponentialRampToValueAtTime(8000, now + 1.5);
    nFilt.Q.value = 0.8;
    const nGain  = ctx.createGain();
    nGain.gain.setValueAtTime(0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    nsrc.connect(nFilt); nFilt.connect(nGain); nGain.connect(ctx.destination);
    nsrc.start(now); nsrc.stop(now + 2.5);

    // Low-mid “throat” swell instead of high pitch
    const throat = ctx.createOscillator();
    const throatGain = ctx.createGain();
    throat.type = 'triangle';
    throat.frequency.setValueAtTime(120, now + 0.35);
    throat.frequency.exponentialRampToValueAtTime(220, now + 1.6);
    throatGain.gain.setValueAtTime(0, now + 0.35);
    throatGain.gain.linearRampToValueAtTime(0.16, now + 0.8);
    throatGain.gain.linearRampToValueAtTime(0, now + 2.4);
    throat.connect(throatGain); throatGain.connect(ctx.destination);
    throat.start(now + 0.35); throat.stop(now + 2.4);
  }

  /**
   * Heavy low-frequency rumble during Dyson construction.
   * Call start + stop to control duration.
   */
  startDysonConstruct() {
    if (!this.ctx || this._dysonRumble) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = 28;
    filter.type = 'lowpass';
    filter.frequency.value = 140;

    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start();
    this._dysonRumble = { osc, gain };
  }

  stopDysonConstruct() {
    if (!this.ctx || !this._dysonRumble) return;
    const ctx = this.ctx;
    const { osc, gain } = this._dysonRumble;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.6);
    this._dysonRumble = null;
  }

  /** Rising power-up sweep + noise boom */
  playPowerUp() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc     = ctx.createOscillator();
    const gainOsc = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 1.5);
    gainOsc.gain.setValueAtTime(0.001, now);
    gainOsc.gain.linearRampToValueAtTime(0.1, now + 0.4);
    gainOsc.gain.linearRampToValueAtTime(0, now + 1.5);
    osc.connect(gainOsc); gainOsc.connect(ctx.destination);
    osc.start(now); osc.stop(now + 1.5);

    const boomLen = ctx.sampleRate * 1.2;
    const boomBuf = ctx.createBuffer(1, boomLen, ctx.sampleRate);
    const d       = boomBuf.getChannelData(0);
    for (let i = 0; i < boomLen; i++) d[i] = Math.random() * 2 - 1;
    const boom       = ctx.createBufferSource();
    boom.buffer      = boomBuf;
    const boomFilter = ctx.createBiquadFilter();
    boomFilter.type  = 'lowpass';
    boomFilter.frequency.value = 600;
    const boomGain   = ctx.createGain();
    boomGain.gain.setValueAtTime(0.18, now + 0.1);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    boom.connect(boomFilter); boomFilter.connect(boomGain); boomGain.connect(ctx.destination);
    boom.start(now + 0.05); boom.stop(now + 1.2);
  }

  /** Short metallic clang — for cargo ship hit */
  playCargoHit() {
    if (!this.ctx) return;
    const ctx      = this.ctx;
    const now      = ctx.currentTime;
    const duration = 0.18;

    const bufLen = ctx.sampleRate * duration;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise  = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.setValueAtTime(3500, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + duration);
    filter.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(now); noise.stop(now + duration);
  }

  /**
   * Short mechanical gunshot pop — called each time the gatling fires a round.
   * Very brief (45 ms) so it can fire rapidly without muddying at high RPM.
   */
  playGatlingShot() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Square-wave mechanical thump
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.04);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.05);

    // Noise click transient
    const nLen = Math.floor(ctx.sampleRate * 0.022);
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd   = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
    const nsrc  = ctx.createBufferSource();
    nsrc.buffer = nBuf;
    const nFilt = ctx.createBiquadFilter();
    nFilt.type  = 'bandpass';
    nFilt.frequency.value = 3200;
    nFilt.Q.value = 1.2;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.06, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
    nsrc.connect(nFilt);
    nFilt.connect(nGain);
    nGain.connect(this.master);
    nsrc.start(now);
    nsrc.stop(now + 0.022);
  }

  /**
   * Continuous gatling motor whir — call every frame with the current spin rate.
   * Uses a persistent sawtooth oscillator whose pitch and volume track spin rate.
   * @param {number} rate - 0 (stopped) to 1 (full speed)
   */
  setGatlingMotor(rate) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Lazy-init motor oscillator chain
    if (!this._motorOsc) {
      this._motorOsc    = ctx.createOscillator();
      this._motorFilter = ctx.createBiquadFilter();
      this._motorGain   = ctx.createGain();

      this._motorOsc.type    = 'sawtooth';
      this._motorFilter.type = 'lowpass';
      this._motorFilter.Q.value = 2;
      this._motorGain.gain.value = 0;

      this._motorOsc.connect(this._motorFilter);
      this._motorFilter.connect(this._motorGain);
      this._motorGain.connect(this.master);
      this._motorOsc.start();
    }

    const t          = rate * rate;                  // quadratic feel
    const freq       = 55  + t * 230;               // 55 → 285 Hz
    const filterFreq = 180 + t * 550;               // 180 → 730 Hz
    const gain       = rate * 0.045;

    this._motorOsc.frequency.setTargetAtTime(freq,       ctx.currentTime, 0.04);
    this._motorFilter.frequency.setTargetAtTime(filterFreq, ctx.currentTime, 0.04);
    this._motorGain.gain.setTargetAtTime(gain,           ctx.currentTime, 0.04);
  }

  /** Short sine blip for LAUNCH button */
  playLaunchBeep() {
    if (!this.ctx) return;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type   = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.15);
  }
}
