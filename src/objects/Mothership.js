import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { WORLD } from '../config/world.js';

const { x, y, z } = WORLD.mothership;

/**
 * Carrier-class Mothership with a ventral hangar bay.
 *
 * Hangar bay coordinate (local space, y-down):
 *   Width  x: −22 to +22  (44 units clear — cargo ship is 20 wide)
 *   Height y: −12 ceiling to open bottom (cargo ship top at y≈−24.5)
 *   Depth  z: −65 to +70  (135 units — cargo ship is 87 long)
 *
 * Cargo ship docks at world (100, −62, 150) = local (0, −37, 0).
 */
export class Mothership {
  constructor(scene) {
    this._scene = scene;
    this._time  = 0;
    this.group  = new THREE.Group();
    this.group.position.set(x, y, z);

    // ── Materials ──────────────────────────────────────────────────────────────
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x4a9e78,
      metalness: 0.45,
      roughness: 0.5,
      emissive: 0x1a5c38,
      emissiveIntensity: 0.5,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x2e6e50,
      metalness: 0.5,
      roughness: 0.55,
      emissive: 0x0d3020,
      emissiveIntensity: 0.25,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x236645,
      metalness: 0.4,
      roughness: 0.5,
      emissive: 0x0a2a18,
      emissiveIntensity: 0.2,
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.9,
    });

    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x00ccff,
      emissive: 0x00ccff,
      emissiveIntensity: 4,
      transparent: true,
      opacity: 0.95,
    });

    const interiorMat = new THREE.MeshStandardMaterial({
      color: 0x060f09,
      metalness: 0.25,
      roughness: 0.9,
    });

    // ── DORSAL PLATE (top of carrier) ──────────────────────────────────────────
    // Wide flat top hull — the "flight deck" of the carrier
    const dorsalPlate = new THREE.Mesh(
      new THREE.BoxGeometry(130, 30, 310),
      hullMat
    );
    dorsalPlate.position.set(0, 15, 5);
    this.group.add(dorsalPlate);

    // ── PORT INNER HULL (closes left wall of hangar bay) ───────────────────────
    const portInnerHull = new THREE.Mesh(
      new THREE.BoxGeometry(14, 54, 270),
      darkMat
    );
    portInnerHull.position.set(-29, -13, 0);
    this.group.add(portInnerHull);

    // ── STARBOARD INNER HULL ───────────────────────────────────────────────────
    const stbdInnerHull = new THREE.Mesh(
      new THREE.BoxGeometry(14, 54, 270),
      darkMat
    );
    stbdInnerHull.position.set(29, -13, 0);
    this.group.add(stbdInnerHull);

    // ── PORT OUTER SPONSON (nacelle mounting flank) ────────────────────────────
    const portSponson = new THREE.Mesh(
      new THREE.BoxGeometry(38, 32, 250),
      hullMat
    );
    portSponson.position.set(-57, -3, 0);
    this.group.add(portSponson);

    // ── STARBOARD OUTER SPONSON ────────────────────────────────────────────────
    const stbdSponson = new THREE.Mesh(
      new THREE.BoxGeometry(38, 32, 250),
      hullMat
    );
    stbdSponson.position.set(57, -3, 0);
    this.group.add(stbdSponson);

    // ── BOW SECTION ────────────────────────────────────────────────────────────
    const bow = new THREE.Mesh(
      new THREE.BoxGeometry(105, 26, 45),
      hullMat
    );
    bow.position.set(0, 8, -152);
    this.group.add(bow);

    // Bow nose taper
    const bowNose = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 14, 60, 8),
      hullMat
    );
    bowNose.rotation.x = -Math.PI / 2;
    bowNose.scale.x = 2.8;
    bowNose.position.set(0, 6, -202);
    this.group.add(bowNose);

    // ── STERN SECTION ──────────────────────────────────────────────────────────
    const stern = new THREE.Mesh(
      new THREE.BoxGeometry(105, 30, 48),
      darkMat
    );
    stern.position.set(0, 10, 155);
    this.group.add(stern);

    // ── COMMAND BRIDGE ─────────────────────────────────────────────────────────
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(30, 32, 52),
      hullMat
    );
    bridge.position.set(0, 40, -48);
    this.group.add(bridge);

    // Bridge forward slope (pyramid)
    const bridgeSlope = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 17, 22, 4),
      hullMat
    );
    bridgeSlope.rotation.x = -Math.PI / 2;
    bridgeSlope.rotation.z = Math.PI / 4;
    bridgeSlope.position.set(0, 42, -77);
    this.group.add(bridgeSlope);

    // Bridge windows (glowing strip)
    const windowStrip = new THREE.Mesh(
      new THREE.BoxGeometry(24, 5, 34),
      glowMat
    );
    windowStrip.position.set(0, 46, -55);
    this.group.add(windowStrip);

    // Secondary sensor tower (aft bridge)
    const sensorTower = new THREE.Mesh(
      new THREE.BoxGeometry(16, 18, 22),
      accentMat
    );
    sensorTower.position.set(0, 38, 30);
    this.group.add(sensorTower);

    // ── HANGAR BAY INTERIOR ────────────────────────────────────────────────────
    // The bay is open at the bottom (y < −40) and partially open at the bow
    // so the cargo ship can slide in/out from below-forward.

    // Bay ceiling — glowing green panel that illuminates the docked cargo ship
    const bayCeiling = new THREE.Mesh(
      new THREE.BoxGeometry(44, 2.5, 135),
      glowMat
    );
    bayCeiling.position.set(0, -11.5, 3);
    this.group.add(bayCeiling);

    // Bay port inner wall (dark surface facing into the bay)
    const bayPortWall = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 52, 135),
      interiorMat
    );
    bayPortWall.position.set(-22.5, -25, 3);
    this.group.add(bayPortWall);

    // Bay starboard inner wall
    const bayStbdWall = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 52, 135),
      interiorMat
    );
    bayStbdWall.position.set(22.5, -25, 3);
    this.group.add(bayStbdWall);

    // Bay rear bulkhead (aft end of bay)
    const bayRear = new THREE.Mesh(
      new THREE.BoxGeometry(44, 52, 2.5),
      interiorMat
    );
    bayRear.position.set(0, -25, 71);
    this.group.add(bayRear);

    // Hangar deck edge strips — glowing landing guide rails on inner bay walls
    for (const side of [-1, 1]) {
      for (let iz = -2; iz <= 2; iz++) {
        const guideStrip = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 9),
          glowMat.clone()
        );
        guideStrip.position.set(side * 19, -36, iz * 25 + 3);
        this.group.add(guideStrip);
      }

      // Continuous rail strip along wall bottom
      const railStrip = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2, 130),
        glowMat.clone()
      );
      railStrip.position.set(side * 19, -38, 3);
      this.group.add(railStrip);
    }

    // Hangar bay interior lighting
    const bayLight1 = new THREE.PointLight(0x00ff88, 4, 100);
    bayLight1.position.set(0, -20, 3);
    this.group.add(bayLight1);

    const bayLight2 = new THREE.PointLight(0x00ff88, 2.5, 60);
    bayLight2.position.set(0, -20, -35);
    this.group.add(bayLight2);

    // ── NACELLES ──────────────────────────────────────────────────────────────
    const nacelleGeo = new THREE.CylinderGeometry(8, 12, 190, 8);
    for (const side of [-1, 1]) {
      // Main nacelle body
      const nacelle = new THREE.Mesh(nacelleGeo, darkMat);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(side * 90, -17, 8);
      this.group.add(nacelle);

      // Connecting pylon (strut from sponson to nacelle)
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(20, 12, 32),
        accentMat
      );
      pylon.position.set(side * 78, -10, 6);
      this.group.add(pylon);

      // Nacelle engine glow disc (aft)
      const nGlow = new THREE.Mesh(
        new THREE.CircleGeometry(7, 14),
        engineMat.clone()
      );
      nGlow.position.set(side * 90, -17, 105);
      this.group.add(nGlow);

      // Nacelle engine light
      const nLight = new THREE.PointLight(0x00ccff, 2.5, 90);
      nLight.position.set(side * 90, -17, 110);
      this.group.add(nLight);

      // Nacelle nose detail — tip faces forward (−Z)
      const nacelleNose = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 8, 20, 8),
        accentMat
      );
      nacelleNose.rotation.x = -Math.PI / 2;
      nacelleNose.position.set(side * 90, -17, -104);
      this.group.add(nacelleNose);
    }

    // ── MAIN ENGINES (6 nozzles in 2×3 grid on the stern) ─────────────────────
    const enginePositions = [
      [-18, 6], [0, 6], [18, 6],
      [-18, -10], [0, -10], [18, -10],
    ];
    for (const [ex, ey] of enginePositions) {
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 9, 18, 10),
        darkMat
      );
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(ex, ey, 172);
      this.group.add(nozzle);

      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(6, 10),
        engineMat.clone()
      );
      glow.position.set(ex, ey, 182);
      this.group.add(glow);

      const eLight = new THREE.PointLight(0x00ccff, 2, 75);
      eLight.position.set(ex, ey, 186);
      this.group.add(eLight);
    }

    // ── ANTENNA / SENSOR ARRAY ─────────────────────────────────────────────────
    for (let i = 0; i < 5; i++) {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 14 - i * 1.5, 4),
        glowMat.clone()
      );
      antenna.position.set((i - 2) * 5.5, 60, -45);
      this.group.add(antenna);
    }

    // Side array panel (aft sensor)
    const sensorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(14, 8, 4),
      accentMat
    );
    sensorPanel.position.set(0, 48, 30);
    this.group.add(sensorPanel);

    // ── NAVIGATION LIGHTS ──────────────────────────────────────────────────────
    const navGeo = new THREE.SphereGeometry(1.8, 8, 6);
    const redNavMat   = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 5 });
    const greenNavMat = new THREE.MeshStandardMaterial({ color: 0x22ff55, emissive: 0x00ff44, emissiveIntensity: 5 });

    const portNav = new THREE.Mesh(navGeo, redNavMat);
    portNav.position.set(-96, -17, 8);
    this.group.add(portNav);
    const portNavLight = new THREE.PointLight(0xff0000, 1.5, 40);
    portNavLight.position.set(-96, -17, 8);
    this.group.add(portNavLight);

    const stbdNav = new THREE.Mesh(navGeo, greenNavMat);
    stbdNav.position.set(96, -17, 8);
    this.group.add(stbdNav);
    const stbdNavLight = new THREE.PointLight(0x00ff44, 1.5, 40);
    stbdNavLight.position.set(96, -17, 8);
    this.group.add(stbdNavLight);

    // Fore mast light (top of bridge)
    const mastLight = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4 })
    );
    mastLight.position.set(0, 62, -45);
    this.group.add(mastLight);

    // ── AMBIENT SHIP LIGHT ─────────────────────────────────────────────────────
    const ambientLight = new THREE.PointLight(0x00ff88, 2.5, 350);
    this.group.add(ambientLight);

    // ── CSS2D LABEL ───────────────────────────────────────────────────────────
    const div = document.createElement('div');
    div.className = 'world-label mothership-label';
    div.innerHTML =
      '<span class="world-label-title">MOTHERSHIP</span>' +
      '<span class="world-label-sub">Allied Carrier</span>';
    div.style.transition = 'opacity 0.3s ease';
    const label = new CSS2DObject(div);
    label.position.set(0, 68, 0);
    this.group.add(label);
    this._labelDiv = div;

    // Scratch objects for collision (avoids per-frame allocations)
    this._invMat  = new THREE.Matrix4();
    this._localPt = new THREE.Vector3();
    this._normal  = new THREE.Vector3();

    // Bow faces roughly toward the player spawn (origin)
    this.group.rotation.y = 0.3;

    scene.add(this.group);
  }

  /** Highlight the deposit prompt when player is carrying cargo. */
  setDepositPrompt(active) {
    const sub = this._labelDiv.querySelector('.world-label-sub');
    if (!sub) return;
    sub.textContent = active ? '↓ DEPOSIT MATERIALS' : 'Allied Carrier';
    sub.classList.toggle('deposit-prompt', active);
  }

  /**
   * Multi-box collision against the carrier hull in local space.
   * Covers main body, nacelles, sponsons, bow, stern, and bridge tower.
   * The ventral hangar bay (below local y −30, within x ±26) stays open.
   * Returns a world-space bounce normal, or null if no collision.
   */
  checkPlayerCollision(playerPos) {
    this._invMat.copy(this.group.matrixWorld).invert();
    const lp = this._localPt.copy(playerPos).applyMatrix4(this._invMat);

    // Preserve ventral hangar bay opening
    if (lp.y < -30 && Math.abs(lp.x) < 26) return null;

    // [xMin, xMax, yMin, yMax, zMin, zMax] — all in local space
    const boxes = [
      [ -70,  70, -28,  33, -145, 168],  // main hull body (floor avoids hangar)
      [ -82, -34, -22,  16, -130, 130],  // port outer sponson
      [  34,  82, -22,  16, -130, 130],  // starboard outer sponson
      [ -58,  58,  -8,  24, -182, -125], // bow section + nose
      [ -58,  58,  -8,  28,  125,  186], // stern section
      [ -18,  18,  22,  60,  -78,  -18], // command bridge tower
      [-110, -70, -32,  -1, -116,  118], // port nacelle + pylon
      [  70, 110, -32,  -1, -116,  118], // starboard nacelle + pylon
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

  update(delta) {
    this._time += delta;
    // Very slow yaw — barely perceptible, keeps ship feeling alive
    // At 0.0004 rad/s the alignment drifts ~1° per 44 seconds
    this.group.rotation.y += delta * 0.0004;
  }
}
