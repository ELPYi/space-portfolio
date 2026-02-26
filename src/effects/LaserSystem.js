import * as THREE from 'three';

export class LaserSystem {
  constructor(scene, spaceDebris) {
    this.spaceDebris = spaceDebris;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._poolSize    = 40;
    this._bolts       = [];
    this._boltSpeed   = 300;
    this._boltLifetime = 1.5;

    // ── Gatling spin state ────────────────────────────────────────────────────
    this._spinRate     = 0;  // 0–1  (0 = stopped, 1 = full speed)
    this._spinAngle    = 0;  // accumulated radians — drives barrel visual
    this._cooldownTimer = 0;

    // Laser bolt: long thin beam so consecutive shots visually connect
    // At full spin (cooldown=0.04s): bolt length 20 > speed*cooldown (12) → overlap, no gaps
    const geometry = new THREE.BoxGeometry(0.06, 0.06, 20);
    const material = new THREE.MeshBasicMaterial({ color: 0xff2200 });

    for (let i = 0; i < this._poolSize; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.visible = false;
      this.group.add(mesh);
      this._bolts.push({
        mesh,
        active:    false,
        direction: new THREE.Vector3(),
        age:       0,
      });
    }

    this._raycaster = new THREE.Raycaster();
    this._raycaster.near = 0;
    this._raycaster.far  = 12;
  }

  /** Current spin rate 0–1 (read by main.js for barrel visual + motor sound) */
  get spinRate()  { return this._spinRate;  }
  /** Accumulated spin angle in radians (drive barrel group rotation.z) */
  get spinAngle() { return this._spinAngle; }

  /**
   * Main update — call every frame.
   * @param {number} delta
   * @param {boolean} mouseHeld - true while left mouse button is held
   * @param {THREE.Camera} camera
   * @param {THREE.Vector3} shipPosition
   * @returns {{ fired: boolean, hit: object|null }}
   */
  update(delta, mouseHeld, camera, shipPosition) {
    // ── Spin up / down ────────────────────────────────────────────────────────
    if (mouseHeld) {
      this._spinRate = Math.min(1, this._spinRate + delta * 1.4); // ~0.7 s to full
    } else {
      this._spinRate = Math.max(0, this._spinRate - delta * 1.1); // ~0.9 s to stop
    }
    this._spinAngle += this._spinRate * 22 * delta;

    // ── Firing ────────────────────────────────────────────────────────────────
    if (this._cooldownTimer > 0) this._cooldownTimer -= delta;

    let fired = false;
    if (mouseHeld && this._spinRate > 0.15 && this._cooldownTimer <= 0 && camera && shipPosition) {
      // Exponential cooldown: 0.40 s stopped → 0.04 s full spin
      // Formula: 0.40 * 0.1^spinRate — halves roughly every 0.3 of spin
      // Continuous fire achieved at ~0.8 spin (bolt length 20 > speed*cooldown 18.9)
      const cooldown = 0.40 * Math.pow(0.1, this._spinRate);
      this._cooldownTimer = cooldown;
      fired = this._spawnBolt(camera, shipPosition, this._spinRate);
    }

    // ── Move bolts + check hits ───────────────────────────────────────────────
    let hitResult = null;
    for (const bolt of this._bolts) {
      if (!bolt.active) continue;

      bolt.age += delta;
      if (bolt.age >= this._boltLifetime) {
        this._deactivateBolt(bolt);
        continue;
      }

      bolt.mesh.position.addScaledVector(bolt.direction, this._boltSpeed * delta);

      this._raycaster.set(bolt.mesh.position, bolt.direction);
      const hit = this.spaceDebris.checkLaserHit(this._raycaster)
               ?? this.funnyDebris?.checkLaserHit(this._raycaster)
               ?? this.enemyManager?.checkLaserHit(this._raycaster)
               ?? this.goliath?.checkLaserHit(this._raycaster);
      if (hit) {
        this._deactivateBolt(bolt);
        if (!hitResult) hitResult = hit;
      }
    }

    return { fired, hit: hitResult };
  }

  _spawnBolt(camera, shipPosition, spinRate = 1) {
    const bolt = this._bolts.find(b => !b.active);
    if (!bolt) return false;

    const forward   = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const aimTarget = camera.position.clone().addScaledVector(forward, 1000);
    const spawnPos  = shipPosition.clone().addScaledVector(forward, 3);
    const fireDir   = aimTarget.clone().sub(spawnPos).normalize();

    // Random spread — wider when just spinning up, tighter at full spin
    const spread = THREE.MathUtils.lerp(0.12, 0.038, spinRate);
    fireDir.x += (Math.random() - 0.5) * spread;
    fireDir.y += (Math.random() - 0.5) * spread;
    fireDir.normalize();

    bolt.mesh.position.copy(spawnPos);
    bolt.mesh.quaternion.copy(camera.quaternion);
    bolt.direction.copy(fireDir);
    bolt.active = true;
    bolt.age    = 0;
    bolt.mesh.visible = true;
    return true;
  }

  _deactivateBolt(bolt) {
    bolt.active = false;
    bolt.mesh.visible = false;
  }
}
