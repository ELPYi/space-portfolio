import * as THREE from 'three';
import { WORLD } from '../config/world.js';

const DEPOSIT_RADIUS = 100;
const MAX_HELD       = 10; // per material type

const _mothershipPos = new THREE.Vector3(
  WORLD.mothership.x, WORLD.mothership.y, WORLD.mothership.z
);

export class MaterialsSystem {
  constructor(networkManager) {
    this._net            = networkManager;
    this.heldOre         = 0;
    this.heldParts       = 0;
    this._nearMothership = false;

    /** Called on any collection: ({ ore, parts }) => void */
    this.onCollect = null;
    /** Called on deposit: ({ ore, parts }) => void */
    this.onDeposit = null;
  }

  get maxHeld() { return MAX_HELD; }

  /** +1 ore from destroying an asteroid. */
  collectOre() {
    if (this.heldOre >= MAX_HELD) return false;
    this.heldOre++;
    if (this.onCollect) this.onCollect({ ore: this.heldOre, parts: this.heldParts });
    return true;
  }

  /** +1 parts from destroying a debris object. */
  collectParts() {
    if (this.heldParts >= MAX_HELD) return false;
    this.heldParts++;
    if (this.onCollect) this.onCollect({ ore: this.heldOre, parts: this.heldParts });
    return true;
  }

  /** Context string for the HUD objective line. */
  get status() {
    const hasCargo = this.heldOre > 0 || this.heldParts > 0;
    if (this._nearMothership && hasCargo)                         return 'depositing';
    if (this.heldOre >= MAX_HELD && this.heldParts >= MAX_HELD)  return 'full';
    if (hasCargo)                                                 return 'hasCargo';
    return 'idle';
  }

  update(delta, playerPos) {
    const dist = playerPos.distanceTo(_mothershipPos);
    this._nearMothership = dist < DEPOSIT_RADIUS;

    // Auto-deposit both types when close to mothership
    if (this._nearMothership && (this.heldOre > 0 || this.heldParts > 0)) {
      const ore   = this.heldOre;
      const parts = this.heldParts;
      this.heldOre   = 0;
      this.heldParts = 0;
      this._net.sendDeposit(ore, parts);
      if (this.onDeposit) this.onDeposit({ ore, parts });
    }
  }
}
