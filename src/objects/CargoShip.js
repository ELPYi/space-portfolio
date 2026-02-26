import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { WORLD } from '../config/world.js';

const { x, y, z } = WORLD.cargoShip;

export class CargoShip {
  constructor(scene) {
    this._scene = scene;
    this._time  = 0;
    this.group  = new THREE.Group();
    this.group.position.set(x, y, z);

    // HP system
    this.hp    = 200;
    this.maxHp = 200;
    this._hitFlashTimer = 0;
    /** Called when cargo is destroyed: () => void */
    this.onDestroyed = null;
    /** Called when cargo arrives at the sun: () => void */
    this.onArrived = null;

    // ── Materials ─────────────────────────────────────────────────────────────
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xaa6622,
      metalness: 0.45,
      roughness: 0.6,
      emissive: 0x331800,
      emissiveIntensity: 0.2,
    });
    this._hullMat = hullMat;
    this._hullBaseColor = 0xaa6622;

    const containerMat = new THREE.MeshStandardMaterial({
      color: 0x886622,
      metalness: 0.3,
      roughness: 0.7,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xff9900,
      emissive: 0xff6600,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9,
    });

    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0088ff,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.9,
    });

    // ── Main hull — flat boxy freighter ───────────────────────────────────────
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(20, 10, 55),
      hullMat
    );
    this.group.add(hull);

    // ── Cockpit module (front) ────────────────────────────────────────────────
    const cockpit = new THREE.Mesh(
      new THREE.BoxGeometry(14, 9, 12),
      new THREE.MeshStandardMaterial({ color: 0xcc8833, metalness: 0.5, roughness: 0.4, emissive: 0x331800, emissiveIntensity: 0.3 })
    );
    cockpit.position.set(0, 2, -34);
    this.group.add(cockpit);

    // Cockpit windows
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x88ddff,
      emissive: 0x44aaff,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.6,
    });
    const window1 = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 1), windowMat);
    window1.position.set(0, 3.5, -41);
    this.group.add(window1);

    // ── Cargo containers (stacked on top) ────────────────────────────────────
    const containerGeo = new THREE.BoxGeometry(8, 7, 14);
    const containerPositions = [
      { x: -5.5, z: -10 }, { x:  5.5, z: -10 },
      { x: -5.5, z:   6 }, { x:  5.5, z:   6 },
      { x: -5.5, z:  20 }, { x:  5.5, z:  20 },
    ];
    for (const pos of containerPositions) {
      const container = new THREE.Mesh(containerGeo, containerMat);
      container.position.set(pos.x, 9, pos.z);
      this.group.add(container);

      // Container edge strip
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 0.6, 14.2),
        accentMat.clone()
      );
      strip.position.set(pos.x, 12.8, pos.z);
      this.group.add(strip);
    }

    // ── Engine block (rear) ───────────────────────────────────────────────────
    const engineBlock = new THREE.Mesh(
      new THREE.BoxGeometry(18, 12, 14),
      new THREE.MeshStandardMaterial({ color: 0x774422, metalness: 0.6, roughness: 0.4 })
    );
    engineBlock.position.set(0, 0, 35);
    this.group.add(engineBlock);

    // Engine nozzles (4)
    const nozzlePositions = [[-6, -3], [6, -3], [-6, 3], [6, 3]];
    for (const [nx, ny] of nozzlePositions) {
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 3, 8, 10),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 })
      );
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(nx, ny, 42);
      this.group.add(nozzle);

      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(2, 10),
        engineMat.clone()
      );
      glow.position.set(nx, ny, 46.5);
      this.group.add(glow);
    }

    const engineLight = new THREE.PointLight(0x0088ff, 2, 60);
    engineLight.position.set(0, 0, 50);
    this.group.add(engineLight);

    // ── Tractor beam emitter (underside dome) ─────────────────────────────────
    this._beamEmitterMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.8,
    });
    const emitterDome = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      this._beamEmitterMat
    );
    emitterDome.rotation.x = Math.PI; // dome faces down
    emitterDome.position.set(0, -5.5, -5);
    this.group.add(emitterDome);

    // Emitter point light
    this._beamLight = new THREE.PointLight(0x00ffcc, 1.5, 30);
    this._beamLight.position.set(0, -8, -5);
    this.group.add(this._beamLight);


    // ── Status light bar (top front) ──────────────────────────────────────────
    const statusBar = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.8, 2),
      accentMat.clone()
    );
    statusBar.position.set(0, 5.5, -26);
    this.group.add(statusBar);

    // ── Ambient ship light ────────────────────────────────────────────────────
    const ambLight = new THREE.PointLight(0xff9900, 1.5, 100);
    this.group.add(ambLight);

    // ── CSS2D label ───────────────────────────────────────────────────────────
    const div = document.createElement('div');
    div.className = 'world-label cargo-label';
    div.innerHTML = '<span class="world-label-title">CARGO SHIP</span><span class="world-label-sub">Materials Carrier</span>';
    div.style.transition = 'opacity 0.3s ease';
    const label = new CSS2DObject(div);
    label.position.set(0, 22, 0);
    this.group.add(label);
    this._labelDiv = div;

    // ── Transit state ─────────────────────────────────────────────────────────
    // Scratch objects for collision (avoids per-frame allocations)
    this._invMat  = new THREE.Matrix4();
    this._localPt = new THREE.Vector3();
    this._normal  = new THREE.Vector3();

    this._transitState = 'docked'; // 'docked' | 'departing' | 'atSun' | 'returning'
    this._transitT     = 0;
    this._homePos      = new THREE.Vector3(x, y, z);
    // Stop just outside the Dyson sphere surface (radius 480, sun at z=-3000)
    // z=-2480 → 520 units from sun centre = just clear of the sphere
    this._sunPos       = new THREE.Vector3(0, -30, -2480);

    scene.add(this.group);
  }

  /** Trigger a delivery run to the Dyson sphere. No-op if already in transit. */
  departToSun() {
    if (this._transitState !== 'docked') return;
    this._transitState = 'departing';
    this._transitT     = 0;
    this.hp = this.maxHp; // restore HP at start of escort
  }

  /** Force cargo ship back to dock and reset HP (e.g. after destruction). */
  returnToDock() {
    this._transitState = 'docked';
    this._transitT     = 0;
    this.group.position.copy(this._homePos);
    this.hp = this.maxHp;
  }

  get isInTransit() { return this._transitState !== 'docked'; }

  /** 0→1 transit progress: 0=docked, 1=at sun or returning */
  get transitProgress() {
    if (this._transitState === 'departing') return this._transitT;
    if (this._transitState === 'atSun' || this._transitState === 'returning') return 1;
    return 0;
  }

  /** Apply damage from enemies; triggers onDestroyed if HP reaches 0. */
  takeDamage(amount) {
    if (this.hp <= 0) return;
    this.hp -= amount;
    this._hitFlashTimer = 0.25;
    if (this.hp <= 0) {
      this.hp = 0;
      this.returnToDock();
      this.onDestroyed?.();
    }
  }

  /** Switch the label subtitle between "Materials Carrier" and "⚠ DEFEND". */
  setDefendMode(active) {
    const sub = this._labelDiv.querySelector('.world-label-sub');
    if (!sub) return;
    sub.textContent = active ? '⚠ DEFEND' : 'Materials Carrier';
    sub.classList.toggle('defend-label', active);
  }

  /**
   * Multi-box collision against the cargo ship hull.
   * Tests three axis-aligned boxes in local space for accurate coverage.
   * Returns a world-space bounce normal, or null if no collision.
   */
  checkPlayerCollision(playerPos) {
    this._invMat.copy(this.group.matrixWorld).invert();
    const lp = this._localPt.copy(playerPos).applyMatrix4(this._invMat);

    // [xMin, xMax, yMin, yMax, zMin, zMax] — all in local space
    const boxes = [
      [-12,  12, -8, 16, -30,  30],  // main hull + cargo containers
      [ -9,   9, -4,  8, -44, -26],  // cockpit module (front)
      [-11,  11, -8,  8,  26,  50],  // engine block + nozzles (rear)
    ];

    for (const [x0, x1, y0, y1, z0, z1] of boxes) {
      if (lp.x < x0 || lp.x > x1 ||
          lp.y < y0 || lp.y > y1 ||
          lp.z < z0 || lp.z > z1) continue;

      // Find shallowest-penetration axis and push out along it
      const ox0 = lp.x - x0, ox1 = x1 - lp.x;
      const oy0 = lp.y - y0, oy1 = y1 - lp.y;
      const oz0 = lp.z - z0, oz1 = z1 - lp.z;
      const dx = Math.min(ox0, ox1);
      const dy = Math.min(oy0, oy1);
      const dz = Math.min(oz0, oz1);

      const n = this._normal;
      if (dx < dy && dx < dz)   n.set(ox0 < ox1 ? -1 : 1, 0, 0);
      else if (dy < dz)          n.set(0, oy0 < oy1 ? -1 : 1, 0);
      else                       n.set(0, 0, oz0 < oz1 ? -1 : 1);

      return n.transformDirection(this.group.matrixWorld);
    }
    return null;
  }

  // Smooth-step easing
  _ease(t) { return t * t * (3 - 2 * t); }

  update(delta) {
    this._time += delta;

    if (this._transitState === 'docked') {
      // Idle dock drift
      this.group.position.set(x, y + Math.sin(this._time * 0.4) * 3, z);

    } else if (this._transitState === 'departing') {
      this._transitT += delta / 100; // ~100 s trip to sun
      if (this._transitT >= 1) {
        this._transitT = 0;
        this._transitState = 'atSun';
        this.group.position.copy(this._sunPos);
        this.onArrived?.(); // notify main.js → send cargo_arrived to server
      } else {
        this.group.position.lerpVectors(this._homePos, this._sunPos, this._ease(this._transitT));
      }

    } else if (this._transitState === 'atSun') {
      this._transitT += delta / 4; // 4 s at the sphere
      if (this._transitT >= 1) {
        this._transitT = 0;
        this._transitState = 'returning';
      }

    } else if (this._transitState === 'returning') {
      this._transitT += delta / 30; // ~30 s return
      if (this._transitT >= 1) {
        this._transitState = 'docked';
        this._transitT     = 0;
        this.group.position.copy(this._homePos);
      } else {
        this.group.position.lerpVectors(this._sunPos, this._homePos, this._ease(this._transitT));
      }
    }

    // Hit flash — hull turns red when taking damage
    if (this._hitFlashTimer > 0) {
      this._hitFlashTimer -= delta;
      this._hullMat.color.setHex(0xff2200);
    } else {
      this._hullMat.color.setHex(this._hullBaseColor);
    }

    // Beam emitter idle pulse (always)
    const pulse = Math.sin(this._time * 3) * 0.5 + 0.5;
    this._beamEmitterMat.emissiveIntensity = 2 + pulse * 2;
    this._beamLight.intensity = 1 + pulse * 2;
  }
}

