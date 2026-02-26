export class LostDetector {
  constructor({ onYes }) {
    this.onYes = onYes;

    this.warnThreshold    = 1500;
    this.lostThreshold    = 2500;
    this.cooldownDuration = 30;

    this.isPromptActive   = false;
    this.cooldownTimer    = 0;
    this.disabled         = false;
    this._autoDismiss     = 0;

    this.banner = document.getElementById('lost-banner');
    this.hint   = document.getElementById('lost-banner-hint');
    this.yesBtn = document.getElementById('lost-yes');
    this.noBtn  = document.getElementById('lost-no');

    this.yesBtn.addEventListener('click', () => this._onYes());
    this.noBtn.addEventListener('click',  () => this._onNo());

    // Y / N keyboard shortcuts work even while pointer lock is active
    document.addEventListener('keydown', (e) => {
      if (!this.isPromptActive) return;
      if (e.key === 'y' || e.key === 'Y') this._onYes();
      if (e.key === 'n' || e.key === 'N') this._onNo();
    });
  }

  update(minDistToAny, delta) {
    // Re-enable once the player returns near portals
    if (this.disabled) {
      if (minDistToAny < this.warnThreshold) this.disabled = false;
      return;
    }

    // Count down cooldown; reset early if player comes back
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
      if (minDistToAny < this.warnThreshold) this.cooldownTimer = 0;
    }

    if (this.isPromptActive) {
      // Auto-dismiss after 10 s if ignored
      this._autoDismiss -= delta;
      if (this._autoDismiss <= 0) this._onNo();
      return;
    }

    if (minDistToAny >= this.lostThreshold && this.cooldownTimer <= 0) {
      this._showPrompt();
    }
  }

  _showPrompt() {
    this.isPromptActive = true;
    this._autoDismiss   = 10;
    this.hint.textContent = '';
    this.banner.classList.remove('show-hint');
    this.banner.classList.add('visible');
  }

  _hidePrompt() {
    this.isPromptActive = false;
    this.banner.classList.remove('visible', 'show-hint');
  }

  _onYes() {
    this._hidePrompt();
    this.disabled = true;
    if (this.onYes) this.onYes();
  }

  _onNo() {
    this.hint.textContent = 'Open the menu (top left) to warp to any planet';
    this.banner.classList.add('show-hint');
    setTimeout(() => {
      this._hidePrompt();
      this.disabled = true;
    }, 2200);
  }
}
