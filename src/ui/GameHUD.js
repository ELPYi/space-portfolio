const MAX_HELD = 10;

const STATUS_OBJECTIVES = {
  full:       'Holds full. Fly to the MOTHERSHIP to deposit',
  depositing: 'Processing at MOTHERSHIP. Cargo ship en route...',
  hasCargo:   'Fly to the MOTHERSHIP to deposit materials',
};

export class GameHUD {
  constructor() {
    this._el              = document.getElementById('game-hud');
    this._phaseEl         = document.getElementById('game-hud-phase');
    this._objEl           = document.getElementById('game-hud-objective');
    this._fillEl          = document.getElementById('game-hud-progress-fill');
    this._panelsEl        = document.getElementById('game-hud-panels');
    this._playersEl       = document.getElementById('game-hud-players');
    this._oreFillEl       = document.getElementById('game-hud-ore-fill');
    this._oreCountEl      = document.getElementById('game-hud-ore-count');
    this._partsFillEl     = document.getElementById('game-hud-parts-fill');
    this._partsCountEl    = document.getElementById('game-hud-parts-count');

    // Standalone shield (always visible after launch)
    this._shieldHudEl   = document.getElementById('hud-shield');
    this._shieldFill    = document.getElementById('game-hud-shield-fill');
    this._shieldPct     = document.getElementById('game-hud-shield-pct');

    // Boss bar
    this._bossEl        = document.getElementById('game-hud-boss');
    this._bossFill      = document.getElementById('game-hud-boss-fill');

    // Cargo HP bar (escort phase)
    this._cargoHpEl     = document.getElementById('game-hud-cargo-hp');
    this._cargoHpFill   = document.getElementById('game-hud-cargo-hp-fill');

    // Special laser energy (boss phase)
    this._specialEl     = document.getElementById('game-hud-special-energy');
    this._specialFill   = document.getElementById('game-hud-special-energy-fill');

    // Boss phase construction countdown
    this._countdownEl      = document.getElementById('game-hud-countdown');
    this._countdownTimerEl = document.getElementById('game-hud-countdown-timer');

    this._lastPhaseObjective = '';
    this._cargoStatus        = 'idle';

    // Persistent objective banner (screen-space, always visible during active objective)
    this._objBannerEl   = document.getElementById('objective-banner');
    this._objBannerText = document.getElementById('objective-banner-text');
  }

  show()         { this._el.classList.remove('hidden'); }
  hide()         { this._el.classList.add('hidden'); }
  showShield()   { this._shieldHudEl?.classList.remove('hidden'); }
  hideShield()   { this._shieldHudEl?.classList.add('hidden'); }

  /** Show the persistent objective banner. Pass warn=true for the orange "defend" style. */
  showObjective(text, warn = false) {
    if (!this._objBannerEl) return;
    this._objBannerText.textContent = text;
    this._objBannerEl.classList.toggle('warn', warn);
    this._objBannerEl.classList.remove('hidden');
  }
  hideObjective() { this._objBannerEl?.classList.add('hidden'); }

  update(gameState) {
    const info = gameState.phaseInfo;
    const pct  = Math.round(gameState.progress * 100);
    const n    = gameState.playerCount;

    this._phaseEl.textContent   = info.name;
    this._lastPhaseObjective    = info.objective;
    this._fillEl.style.width    = `${pct}%`;
    this._panelsEl.textContent  = `${gameState.panelsBuilt} / ${gameState.panelsTarget} PANELS`;
    this._playersEl.textContent = `${n} PILOT${n !== 1 ? 'S' : ''} ONLINE`;

    // Always refresh objective — cargo status only overrides transiently
    this._cargoStatus = 'idle';
    this._objEl.textContent = info.objective;
  }

  showBossBar()  { this._bossEl?.classList.remove('hidden'); }
  hideBossBar()  { this._bossEl?.classList.add('hidden'); }

  updateBoss(hp, maxHp) {
    const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
    if (this._bossFill) this._bossFill.style.width = `${pct}%`;
  }

  showCargoHp()  { this._cargoHpEl?.classList.remove('hidden'); }
  hideCargoHp()  { this._cargoHpEl?.classList.add('hidden'); }

  updateCargoHp(hp, maxHp) {
    const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
    if (this._cargoHpFill) {
      this._cargoHpFill.style.width = `${pct}%`;
      // Turn red when below 30%
      if (pct <= 30) {
        this._cargoHpFill.style.background = 'linear-gradient(90deg, #880000, #cc2200)';
      } else {
        this._cargoHpFill.style.background = '';
      }
    }
  }

  showSpecialEnergy()  { this._specialEl?.classList.remove('hidden'); }
  hideSpecialEnergy()  { this._specialEl?.classList.add('hidden'); }

  showCountdown()      { this._countdownEl?.classList.remove('hidden'); }
  hideCountdown()      { this._countdownEl?.classList.add('hidden'); }

  /** Change the small label above the countdown timer (e.g. "CONSTRUCTION WINDOW" vs "MATCH RESETS"). */
  setCountdownLabel(text) {
    const el = document.getElementById('game-hud-countdown-header');
    if (el) el.textContent = text;
  }

  updateCountdown(seconds) {
    if (!this._countdownTimerEl) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this._countdownTimerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
    this._countdownTimerEl.classList.toggle('urgent', seconds <= 15);
  }

  updateSpecialEnergy(pct) {
    if (this._specialFill) this._specialFill.style.width = `${Math.round(pct * 100)}%`;
  }

  updateShield(hp, maxHp) {
    const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
    if (this._shieldFill) {
      this._shieldFill.style.width = `${pct}%`;
      this._shieldFill.classList.toggle('critical', pct <= 25);
      this._shieldFill.classList.toggle('damaged',  pct > 25 && pct <= 60);
    }
    if (this._shieldPct) this._shieldPct.textContent = pct;
  }

  updateCargo(heldOre, heldParts, status) {
    this._cargoStatus = status;

    this._oreFillEl.style.width    = `${(heldOre  / MAX_HELD) * 100}%`;
    this._partsFillEl.style.width  = `${(heldParts / MAX_HELD) * 100}%`;
    this._oreCountEl.textContent   = heldOre;
    this._partsCountEl.textContent = heldParts;

    const contextObj = STATUS_OBJECTIVES[status];
    this._objEl.textContent = contextObj ?? this._lastPhaseObjective;
  }
}
