import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { WORLD } from '../config/world.js';

const { x, y, z, radius, panelDetail } = WORLD.dysonSphere;

/**
 * DysonSphere — Geodesic construction target.
 *
 * Visual layers:
 *   1. Thin white scaffold wireframe (always visible)
 *   2. 320 individually-addressable triangular panels with gaps (detail=2)
 *   3. Three large orbital rings at different inclinations
 *   4. Warm inner glow (sun visible through panel gaps)
 *
 * API:
 *   showPanel(i)     — reveal panel i with slot-in animation
 *   syncPanels(n)    — instantly sync to n visible panels (mid-game join)
 *   lockDown()       — completion animation: beams + shockwaves + flash
 *   powerUp()        — panels transition to gold (called by lockDown)
 *   setBeamTarget(g) — draw pulsing beam from group g → sphere centre
 */
export class DysonSphere {
  constructor(scene) {
    this._scene = scene;
    this._time  = 0;
    // Tunable animation timings (can be adjusted for cinematic sequences)
    this._slotInSpeed = 4;        // higher = faster panel slot-in
    this._powerUpDuration = 4;    // seconds
    this._ringPowerUpDuration = 1.4; // seconds

    this.group = new THREE.Group();
    this.group.position.set(x, y, z);

    // ── Icosahedron base geometry ──────────────────────────────────────────────
    const icoIndexed = new THREE.IcosahedronGeometry(radius, panelDetail);
    const icoFlat    = icoIndexed.toNonIndexed();

    // ── Scaffold wireframe — subtle white structural lines ─────────────────────
    const scaffoldMat = new THREE.LineBasicMaterial({
      color: 0xc8d8e8,
      transparent: true,
      opacity: 0.22,
    });
    const edges = new THREE.EdgesGeometry(icoIndexed);
    this._scaffold = new THREE.LineSegments(edges, scaffoldMat);
    this.group.add(this._scaffold);

    // ── Panel meshes — dark metallic triangles with gaps ──────────────────────
    // Each triangle is shrunk toward its centroid so gaps show the sun inside.
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1c2333,
      emissive: 0x060a12,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.18,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    });

    const posAttr   = icoFlat.attributes.position;
    const GAP_SCALE = 0.84; // 16% gap → sun glow visible between panels
    this.panels = [];

    for (let i = 0; i < posAttr.count; i += 3) {
      const x0 = posAttr.getX(i),   y0 = posAttr.getY(i),   z0 = posAttr.getZ(i);
      const x1 = posAttr.getX(i+1), y1 = posAttr.getY(i+1), z1 = posAttr.getZ(i+1);
      const x2 = posAttr.getX(i+2), y2 = posAttr.getY(i+2), z2 = posAttr.getZ(i+2);

      // Centroid of this triangle face
      const cx = (x0 + x1 + x2) / 3;
      const cy = (y0 + y1 + y2) / 3;
      const cz = (z0 + z1 + z2) / 3;

      const verts = new Float32Array([
        cx + (x0 - cx) * GAP_SCALE, cy + (y0 - cy) * GAP_SCALE, cz + (z0 - cz) * GAP_SCALE,
        cx + (x1 - cx) * GAP_SCALE, cy + (y1 - cy) * GAP_SCALE, cz + (z1 - cz) * GAP_SCALE,
        cx + (x2 - cx) * GAP_SCALE, cy + (y2 - cy) * GAP_SCALE, cz + (z2 - cz) * GAP_SCALE,
      ]);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, panelMat.clone());
      mesh.visible = false;
      mesh.userData.slotting = false;
      mesh.userData.slotT    = 0;
      this.group.add(mesh);
      this.panels.push(mesh);
    }

    // ── Three large orbital rings (different inclinations) ─────────────────────
    // Modelled after the reference image: thin dark metallic rings orbiting
    // the sphere at varying angles like inclined satellite tracks.
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x4a4f57,
      metalness: 0.7,
      roughness: 0.45,
      emissive: 0x5a6672,
      emissiveIntensity: 0.28,
    });

    const rr = radius * 1.14; // base ring orbit radius — wider circumference
    this._rings = [];
    [
      { tube: 15, rMul: 1.02, rx: Math.PI / 2,  rz: Math.PI / 9,   spinX: 0,    spinY: 0.06,  spinZ: 0    },
      { tube: 15, rMul: 1.10, rx: Math.PI / 2,  rz: Math.PI / 2.7, spinX: 0.04, spinY: 0,     spinZ: 0.03 },
      { tube: 15, rMul: 1.18, rx: Math.PI / 4,  rz: Math.PI / 5,   spinX: 0,    spinY: -0.05, spinZ: 0.02 },
    ].forEach(cfg => {
      const ringRadius = rr * cfg.rMul;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(ringRadius, cfg.tube, 8, 128),
        ringMat.clone()
      );
      ring.rotation.x = cfg.rx;
      ring.rotation.z = cfg.rz;
      this.group.add(ring);
      this._rings.push({ mesh: ring, spinX: cfg.spinX, spinY: cfg.spinY, spinZ: cfg.spinZ });
    });

    // ── Inner glow — warm golden-white light visible through panel gaps ─────────
    this._innerGlowMat = new THREE.MeshStandardMaterial({
      color: 0x553311,
      emissive: 0xff7722,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.group.add(new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.96, 32, 24),
      this._innerGlowMat
    ));

    // ── Construction aura — pulses as panels appear during boss phase ──────────
    this._auraMat = new THREE.MeshStandardMaterial({
      color: 0x0055bb,
      emissive: 0x0055bb,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this._aura = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.2, 24, 16),
      this._auraMat
    );
    this.group.add(this._aura);

    // ── Ambient construction light ─────────────────────────────────────────────
    this._light = new THREE.PointLight(0x4466ff, 2, 1200);
    this.group.add(this._light);

    // ── CSS2D label ───────────────────────────────────────────────────────────
    const div = document.createElement('div');
    div.className = 'world-label dyson-label';
    div.innerHTML =
      '<span class="world-label-title">DYSON SPHERE</span>' +
      '<span class="world-label-sub dyson-progress-text">Under Construction</span>';
    div.style.transition = 'opacity 0.3s ease';
    this._progressText = div.querySelector('.dyson-progress-text');
    const label = new CSS2DObject(div);
    label.position.set(0, radius + 400, 0);
    this.group.add(label);
    this._labelDiv = div;

    // ── Panel visibility counter — avoids O(n) filter() in constructionProgress ──
    this._visibleCount = 0;

    // ── Pre-created lockDown assets ────────────────────────────────────────────
    // All built here at load time so lockDown() never adds new lights or materials.
    // Adding a PointLight mid-scene changes the scene's total light count, forcing
    // WebGL to recompile ALL MeshStandardMaterial shaders → massive one-frame freeze.
    this._ldActive = false;
    this._powerUpComplete = false;

    // 16 energy beams (hidden, opacity = 0 until lockDown)
    const ldBeamMat = new THREE.LineBasicMaterial({ color: 0xffee44, transparent: true, opacity: 0 });
    this._ldBeams = [];
    for (let i = 0; i < 16; i++) {
      const phi   = (i / 16) * Math.PI * 2;
      const theta = (Math.sin(i * 1.3) * 0.5 + 0.5) * Math.PI;
      const dir   = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi),
      ).normalize();
      const pts = [new THREE.Vector3(), new THREE.Vector3()];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, ldBeamMat.clone());
      line.visible = false;
      this.group.add(line);
      this._ldBeams.push({ line, dir, age: 0 });
    }

    // 3 shockwave torus rings (hidden until lockDown)
    const _ldRingCfgs = [
      { delay: 0,    color: 0xffffff, rotX: Math.PI / 2, rotZ: 0,           thickness: 10, duration: 2.0 },
      { delay: 0.55, color: 0xffdd44, rotX: 0,           rotZ: 0,           thickness: 7,  duration: 2.5 },
      { delay: 1.1,  color: 0x00aaff, rotX: Math.PI / 4, rotZ: Math.PI / 6, thickness: 5,  duration: 3.0 },
    ];
    this._ldShockwaves = [];
    for (const cfg of _ldRingCfgs) {
      const mat  = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, cfg.thickness, 8, 96), mat);
      mesh.rotation.x = cfg.rotX;
      mesh.rotation.z = cfg.rotZ;
      mesh.visible    = false;
      this.group.add(mesh);
      this._ldShockwaves.push({ mesh, age: 0, delay: cfg.delay, duration: cfg.duration });
    }

    // Flash point light — pre-created at intensity 0 so no shader recompile on activation
    this._flashLight  = new THREE.PointLight(0xffffff, 0, 6000);
    this._flashAge    = 0;
    this._flashActive = false;
    this.group.add(this._flashLight);

    // Camera shake (triggered on lockDown shockwave)
    this._shakeActive = false;
    this._shakeTime = 0;
    this._shakeDuration = 0.6;
    this._shakeStrength = 0.8;

    /** Optional callback fired when lockDown shockwave starts. */
    this.onShockwave = null;

    scene.add(this.group);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get totalPanels()          { return this.panels.length; }
  get visiblePanels()        { return this._visibleCount; }
  get constructionProgress() { return this.visiblePanels / this.totalPanels; }

  /**
   * Instantly synchronise panel visibility to n panels — no animation.
   * Used when a player joins mid-game.
   */
  syncPanels(n) {
    const count = Math.min(Math.max(Math.floor(n), 0), this.panels.length);
    this._visibleCount = count;
    for (let i = 0; i < this.panels.length; i++) {
      const panel = this.panels[i];
      if (i < count) {
        panel.visible = true;
        panel.scale.setScalar(1);
        panel.userData.slotting = false;
      } else {
        panel.visible = false;
      }
    }
    if (this._progressText) {
      const pct = Math.round((count / this.panels.length) * 100);
      this._progressText.textContent = count > 0 ? `Construction: ${pct}%` : 'Under Construction';
    }
  }

  /** Reveal panel at index i with a brief scale-in animation. */
  showPanel(i) {
    const panel = this.panels[i];
    if (!panel || panel.visible) return;
    panel.visible = true;
    this._visibleCount++;
    panel.scale.setScalar(0.01);
    panel.userData.slotting = true;
    panel.userData.slotT    = 0;

    const pct = Math.round(this.constructionProgress * 100);
    if (this._progressText) {
      this._progressText.textContent = `Construction: ${pct}%`;
    }
  }

  /**
   * Set or clear the construction beam target.
   * Pass a THREE.Group (e.g. cargoShip.group) to draw a pulsing cyan beam
   * from that object to the sphere centre during phase 1.
   */
  setBeamTarget(group) {
    this._beamTarget = group || null;
    if (!group && this._constructionBeam) {
      this._scene.remove(this._constructionBeam);
      this._constructionBeam = null;
    }
  }

  /**
   * Full reset — reverts all visual and state back to the pre-game idle state.
   * Call from doResetGame() before syncing panels to 0.
   */
  reset() {
    // Clear locked/powered flags
    this._lockedDown  = false;
    this._poweredUp   = false;
    this._powerUpTime = 0;

    // Stop group rotation drift (accumulated during powered-up spin)
    this.group.rotation.set(0, 0, 0);

    // Reset pre-created lockDown assets (they stay in the scene graph)
    this._ldActive = false;
    for (const b of this._ldBeams) {
      b.line.visible = false;
      b.line.material.opacity = 0;
      b.age = 0;
    }
    for (const sw of this._ldShockwaves) {
      sw.mesh.visible = false;
      sw.mesh.scale.setScalar(1);
      sw.mesh.material.opacity = 0;
      sw.age = 0;
    }
    this._flashLight.intensity = 0;
    this._flashActive          = false;
    this._flashAge             = 0;
    this._powerUpComplete      = false;

    // Reset every panel material back to dark metallic and hide it
    this._visibleCount = 0;
    for (const panel of this.panels) {
      panel.visible = false;
      panel.scale.setScalar(1);
      panel.userData.slotting = false;
      panel.material.color.setHex(0x1c2333);
      panel.material.emissive.setRGB(0.024, 0.039, 0.071); // 0x060a12
      panel.material.emissiveIntensity = 0.5;
    }

    // Reset inner glow to warm orange (pre-construction state)
    this._innerGlowMat.color.setRGB(0.333, 0.200, 0.067); // 0x553311
    this._innerGlowMat.emissive.setRGB(1.0, 0.467, 0.133); // 0xff7722
    this._innerGlowMat.emissiveIntensity = 0.55;
    this._innerGlowMat.opacity = 0.14;

    // Reset scaffold to default dim white
    this._scaffold.material.color.setHex(0xc8d8e8);
    this._scaffold.material.opacity = 0.22;

    // Reset construction light
    this._light.color.setRGB(0.267, 0.400, 1.0); // 0x4466ff
    this._light.intensity = 2;

    // Reset aura
    this._auraMat.opacity = 0;

    // Reset label
    if (this._progressText) this._progressText.textContent = 'Under Construction';

    // Clear any construction beam
    this.setBeamTarget(null);
  }

  /** Trigger the Dyson sphere power-up victory glow animation. */
  powerUp() {
    if (this._poweredUp) return;
    this._poweredUp       = true;
    this._powerUpTime     = 0;
    this._powerUpComplete = false;

    if (this._progressText) {
      this._progressText.textContent = 'ONLINE — Full Power';
    }
  }

  /**
   * Lockdown: called when construction completes (boss killed or timer ends).
   * Flash-reveals all remaining panels, fires 16 energy beams, launches
   * 3 staggered shockwave rings, and pulses a blinding flash light.
   */
  lockDown() {
    if (this._lockedDown) return;
    this._lockedDown = true;
    this.powerUp();

    this._auraMat.opacity = 0;

    // Flash-reveal any panels not yet built
    for (const panel of this.panels) {
      panel.visible = true;
      panel.scale.setScalar(1);
      panel.userData.slotting = false;
      // Prime white for the powerUp gold transition
      panel.material.emissive.setRGB(1, 1, 1);
      panel.material.emissiveIntensity = 3;
    }

    if (this._progressText) this._progressText.textContent = 'ONLINE — Full Power';

    this._visibleCount = this.panels.length;

    // Activate pre-created energy beams (no new materials/lights = no shader recompile)
    this._ldActive = true;
    for (const b of this._ldBeams) {
      b.age = 0;
      const pos = b.line.geometry.attributes.position;
      pos.setXYZ(1, 0, 0, 0);
      pos.needsUpdate = true;
      b.line.material.opacity = 1;
      b.line.visible = true;
    }

    // Activate pre-created shockwave rings
    for (const sw of this._ldShockwaves) {
      sw.age = 0;
      sw.mesh.scale.setScalar(1);
      sw.mesh.material.opacity = 1;
      sw.mesh.visible = true;
    }

    // Activate pre-created flash light (already in scene graph at intensity 0)
    this._flashLight.intensity = 60;
    this._flashAge    = 0;
    this._flashActive = true;

    // Trigger camera shake
    this._shakeActive = true;
    this._shakeTime = 0;
    if (this.onShockwave) this.onShockwave(this.group.position);
  }

  /** Returns current shake strength (0..max), advances timer. */
  getShake(delta) {
    if (!this._shakeActive) return 0;
    this._shakeTime += delta;
    const t = Math.min(this._shakeTime / this._shakeDuration, 1);
    const falloff = 1 - t;
    const strength = this._shakeStrength * falloff * falloff;
    if (t >= 1) this._shakeActive = false;
    return strength;
  }

  update(delta) {
    this._time += delta;

    // ── Construction beam (phase 1: cargo ship → sphere) ─────────────────────
    if (this._beamTarget) {
      if (!this._constructionBeam) {
        const pts = [new THREE.Vector3(), new THREE.Vector3()];
        const beamGeo = new THREE.BufferGeometry().setFromPoints(pts);
        this._constructionBeamMat = new THREE.LineBasicMaterial({
          color: 0x00ffcc,
          transparent: true,
          opacity: 0.7,
        });
        this._constructionBeam = new THREE.Line(beamGeo, this._constructionBeamMat);
        this._scene.add(this._constructionBeam);
      }
      const sp = this._beamTarget.position;
      const dp = this.group.position;
      const posAttr = this._constructionBeam.geometry.attributes.position;
      posAttr.setXYZ(0, sp.x, sp.y, sp.z);
      posAttr.setXYZ(1, dp.x, dp.y, dp.z);
      posAttr.needsUpdate = true;
      this._constructionBeamMat.opacity = 0.4 + Math.sin(this._time * 5) * 0.35;
    }

    // Scaffold rotation — faster when sphere is active/powered
    const scaffoldSpeed = this._poweredUp ? 0.05 : 0.008;
    this._scaffold.rotation.y += delta * scaffoldSpeed;
    this._scaffold.rotation.x += delta * (this._poweredUp ? 0.02 : 0.003);

    // Orbital rings — spin speeds ramp up during activation (power-up)
    let ringSpinMul = 0.25;
    if (this._poweredUp) {
      const ringDur = this._ringPowerUpDuration ?? 1.4;
      const t = Math.min(this._powerUpTime / ringDur, 1);
      ringSpinMul = 1 + t * 19.0; // ramps 1.0 → 20.0 during activation
    } else if (!this._lockedDown) {
      const progress = this.constructionProgress;
      ringSpinMul = 0.25 + progress * 1.2; // slow idle, ramps during construction
    }
    for (const r of this._rings) {
      r.mesh.rotation.x += delta * r.spinX * ringSpinMul;
      r.mesh.rotation.y += delta * r.spinY * ringSpinMul;
      r.mesh.rotation.z += delta * r.spinZ * ringSpinMul;
    }

    // Scaffold opacity breath
    this._scaffold.material.opacity = 0.18 + Math.sin(this._time * 0.9) * 0.06;

    // Panel slot-in animation
    for (const panel of this.panels) {
      if (!panel.userData.slotting) continue;
      const slotSpeed = this._slotInSpeed ?? 4;
      panel.userData.slotT += delta * slotSpeed;
      const t = Math.min(panel.userData.slotT, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      panel.scale.setScalar(eased);
      if (t >= 1) {
        panel.userData.slotting = false;
        panel.scale.setScalar(1);
      }
    }

    const pulse = Math.sin(this._time * 0.8) * 0.4;

    // ── Construction aura (boss phase — panels building up) ───────────────────
    if (!this._poweredUp && !this._lockedDown) {
      const progress = this.constructionProgress;
      if (progress > 0) {
        this._auraMat.opacity = progress * 0.12 + Math.sin(this._time * 2.2) * progress * 0.06;
        const breathScale = 1 + Math.sin(this._time * 1.4) * 0.02 * progress;
        this._aura.scale.setScalar(breathScale);
      }
    }

    // ── Energy beams (post-lockDown) ──────────────────────────────────────────
    if (this._ldActive) {
      for (const b of this._ldBeams) {
        b.age += delta;
        const t = Math.min(b.age / 2.2, 1);
        const endDist = radius * 3.5 * t;
        const pos = b.line.geometry.attributes.position;
        pos.setXYZ(1, b.dir.x * endDist, b.dir.y * endDist, b.dir.z * endDist);
        pos.needsUpdate = true;
        b.line.material.opacity = t > 0.8 ? (1 - t) * 5 : 1;
      }
    }

    // ── 3 staggered shockwave rings ───────────────────────────────────────────
    if (this._ldActive) {
      for (const sw of this._ldShockwaves) {
        sw.age += delta;
        if (sw.age < sw.delay) continue;
        const t = Math.min((sw.age - sw.delay) / sw.duration, 1);
        if (t < 1) {
          sw.mesh.scale.setScalar(1 + t * 9);
          sw.mesh.material.opacity = (1 - t) * (1 - t);
        } else {
          sw.mesh.visible = false;
        }
      }
    }

    // ── Flash light fade ───────────────────────────────────────────────────────
    if (this._flashActive) {
      this._flashAge += delta;
      const ft = Math.min(this._flashAge / 2.5, 1);
      this._flashLight.intensity = 60 * Math.pow(1 - ft, 2);
      if (ft >= 1) {
        this._flashLight.intensity = 0;
        this._flashActive = false;
      }
    }

    if (this._poweredUp) {
      this._powerUpTime += delta;
      const powerUpDur = this._powerUpDuration ?? 4;
      const pt   = Math.min(this._powerUpTime / powerUpDur, 1);
      const ease = pt * pt * (3 - 2 * pt);

      // Spin the entire sphere group (panels + scaffold) for a majestic powered look
      this.group.rotation.y += delta * 0.018;

      // Scaffold spins faster when active (on top of group rotation)
      this._scaffold.material.color.setHex(0xffffff);
      this._scaffold.material.opacity = 0.55 + Math.sin(this._time * 3) * 0.15;

      // Panels → warm gold glow (only during the 4s transition — skip once complete)
      if (!this._powerUpComplete) {
        for (const panel of this.panels) {
          if (!panel.visible) continue;
          panel.material.emissive.setRGB(0.4 + ease * 0.6, 0.8 + ease * 0.2, ease * 0.1);
          panel.material.emissiveIntensity = 0.5 + ease * 2.0;
          panel.material.color.setRGB(0.25 + ease * 0.55, 0.4 + ease * 0.35, 0.15);
        }
        if (pt >= 1) this._powerUpComplete = true;
      }

      // Transition inner sphere → opaque black so gaps appear as crisp dark voids
      // against the bright gold panels, making the triangle pattern pop visually
      const blackDur = Math.max((this._powerUpDuration ?? 4) * 0.75, 0.01);
      const blackFade = Math.min(this._powerUpTime / blackDur, 1);
      this._innerGlowMat.emissive.setRGB(
        (1 - blackFade) * (0xff / 255),
        (1 - blackFade) * (0x77 / 255),
        (1 - blackFade) * (0x22 / 255),
      );
      this._innerGlowMat.emissiveIntensity = 0.55 * (1 - blackFade);
      this._innerGlowMat.opacity = 0.14 + blackFade * 0.84; // opaque black
      this._innerGlowMat.color.setRGB(0, 0, 0);

      this._light.color.setRGB(1, 0.8 + ease * 0.2, 0.3 * ease);
      this._light.intensity = (4 + ease * 10) + pulse * 2;
    } else {
      this._light.intensity = (1 + this.constructionProgress * 4) + pulse;
    }
  }
}
