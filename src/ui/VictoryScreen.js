export class VictoryScreen {
  constructor() {
    this._el           = document.getElementById('victory-screen');
    this._onContinue   = null; // "Leave Game" — disconnect and warp to spawn
    this.onKeepPlaying = null; // "Keep Playing" — just dismiss the panel
    this.onRestart     = null; // "Restart Mission" — full reset then re-join
    this._keyHandler   = null;
  }

  show(panelsBuilt, playerCount, resetSeconds = 45) {
    if (!this._el) return;

    const panelEl = this._el.querySelector('#victory-panels');
    const pilotEl = this._el.querySelector('#victory-pilots');
    if (panelEl) panelEl.textContent = `${panelsBuilt} panels assembled`;
    if (pilotEl) pilotEl.textContent = `${playerCount} pilot${playerCount !== 1 ? 's' : ''} online`;

    // Show initial session countdown
    this.updateResetCountdown(resetSeconds);

    this._el.classList.remove('hidden');

    // Keyboard control — game pointer stays locked, buttons are key-driven
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
    this._keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this.hide();
        this.onKeepPlaying?.();
      } else if (e.key === 'r' || e.key === 'R') {
        this.hide();
        this.onRestart?.();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.hide();
        this._onContinue?.();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  /** Update the auto-reset countdown shown on the victory screen. */
  updateResetCountdown(seconds) {
    const el = document.getElementById('victory-reset-seconds');
    if (el) el.textContent = seconds;
  }

  hide() {
    this._el?.classList.add('hidden');
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }
}
