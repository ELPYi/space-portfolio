const MAX_HP       = 100;
const REGEN_RATE   = 6;   // hp per second
const REGEN_DELAY  = 3.5; // seconds after last hit before regen starts
const INVINCIBLE_AFTER_HIT    = 0.35; // brief invincibility on each hit
const INVINCIBLE_AFTER_RESPAWN = 3.0; // longer grace period after death

export class ShipHealth {
  constructor() {
    this.hp              = MAX_HP;
    this.maxHp           = MAX_HP;
    this._regenCooldown  = 0;
    this._invincibleTimer = 0;

    /** Called whenever hp changes: (hp, maxHp) => void */
    this.onChange = null;
    /** Called when hp reaches 0: () => void */
    this.onDeath = null;
  }

  get isDead()    { return this.hp <= 0; }
  get fraction()  { return this.hp / this.maxHp; }
  get isInvincible() { return this._invincibleTimer > 0; }

  takeDamage(amount) {
    if (this._invincibleTimer > 0 || this.hp <= 0) return;
    this.hp               = Math.max(0, this.hp - amount);
    this._regenCooldown   = REGEN_DELAY;
    this._invincibleTimer = INVINCIBLE_AFTER_HIT;
    if (this.onChange) this.onChange(this.hp, this.maxHp);
    if (this.hp <= 0 && this.onDeath) this.onDeath();
  }

  respawn() {
    this.hp               = this.maxHp;
    this._regenCooldown   = 0;
    this._invincibleTimer = INVINCIBLE_AFTER_RESPAWN;
    if (this.onChange) this.onChange(this.hp, this.maxHp);
  }

  /** Reset to full HP without triggering events (e.g. when leaving game mode). */
  reset() {
    this.hp              = this.maxHp;
    this._regenCooldown  = 0;
    this._invincibleTimer = 0;
  }

  update(delta) {
    if (this._invincibleTimer > 0) this._invincibleTimer -= delta;

    if (this._regenCooldown > 0) {
      this._regenCooldown -= delta;
    } else if (this.hp > 0 && this.hp < this.maxHp) {
      const prev = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + REGEN_RATE * delta);
      // Throttle onChange to avoid spamming the DOM every frame
      if (Math.floor(this.hp) !== Math.floor(prev) && this.onChange) {
        this.onChange(this.hp, this.maxHp);
      }
    }
  }
}
