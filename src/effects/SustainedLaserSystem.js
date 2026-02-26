import * as THREE from 'three';

const MAX_ENERGY    = 100;
const DRAIN_RATE    = 22;  // energy/s while firing
const RECHARGE_RATE = 6;   // energy/s while idle
const DAMAGE_RATE   = 15;  // HP/s dealt to Goliath

export class SustainedLaserSystem {
  constructor(scene) {
    this._scene   = scene;
    this.energy   = MAX_ENERGY;
    this._active  = false;

    // Visual: line from ship to target
    const pts = [new THREE.Vector3(), new THREE.Vector3()];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    this._beamMat = new THREE.LineBasicMaterial({
      color: 0x00eeff,
      transparent: true,
      opacity: 1,
    });
    this._beam = new THREE.Line(geo, this._beamMat);
    this._beam.visible = false;
    scene.add(this._beam);

    // Outer glow line (slightly thicker feel via second line with different color)
    const geoGlow = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this._beamGlow = new THREE.Line(geoGlow, new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
    }));
    this._beamGlow.visible = false;
    scene.add(this._beamGlow);
  }

  get energyPct() { return this.energy / MAX_ENERGY; }
  get isActive()  { return this._active; }

  /**
   * @param {number}  delta
   * @param {THREE.Vector3} playerPos
   * @param {object|null}  goliath — GoliathBoss instance
   * @param {boolean} triggerHeld — true when F key is held
   */
  update(delta, playerPos, goliath, triggerHeld) {
    const canFire = triggerHeld && goliath?.isAlive && this.energy > 0;

    if (canFire) {
      this.energy -= DRAIN_RATE * delta;
      if (this.energy < 0) this.energy = 0;
      this._active = true;

      const targetPos = goliath._group.position;

      // Update beam geometry
      this._setBeamPoints(this._beam, playerPos, targetPos);
      this._setBeamPoints(this._beamGlow, playerPos, targetPos);
      this._beam.visible = true;
      this._beamGlow.visible = true;

      // Flicker effect
      this._beamMat.opacity = 0.7 + Math.random() * 0.3;

      // Deal damage to Goliath
      const dist = playerPos.distanceTo(targetPos);
      if (dist < 600) {
        goliath.takeDamage(DAMAGE_RATE * delta);
      }
    } else {
      this._active = false;
      this._beam.visible = false;
      this._beamGlow.visible = false;
      // Recharge
      this.energy = Math.min(MAX_ENERGY, this.energy + RECHARGE_RATE * delta);
    }
  }

  _setBeamPoints(line, from, to) {
    const pos = line.geometry.attributes.position;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, to.x,   to.y,   to.z);
    pos.needsUpdate = true;
  }

  dispose() {
    this._scene.remove(this._beam);
    this._scene.remove(this._beamGlow);
  }
}
