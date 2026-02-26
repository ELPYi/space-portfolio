import * as THREE from 'three';

const MAX_HP         = 200;
const APPROACH_TIME  = 6;   // seconds for entry approach
const SPAWN_DIST     = 800; // units away from player at spawn

// Attack timings
const CANNON_COOLDOWN  = 2.2;
const BARRAGE_COOLDOWN = 8;
const LASER_COOLDOWN   = 14;
const LASER_DURATION   = 3;

export class GoliathBoss {
  constructor(scene) {
    this._scene   = scene;
    this._hp      = MAX_HP;
    this._alive   = false;
    this._phase   = 'entry'; // 'entry' | 'battle' | 'dead'

    this._group = new THREE.Group();
    scene.add(this._group);
    this._group.visible = false;

    // Build ship geometry
    this._buildMesh();

    // Cache hittable meshes once — avoids per-frame group.traverse() in checkLaserHit
    this._hitTargets = [];
    this._group.traverse(c => {
      if (c.isMesh && c !== this._laserBeam) this._hitTargets.push(c);
    });

    // Bolt / beam containers
    this._boltGroup = new THREE.Group();
    scene.add(this._boltGroup);

    this._bolts = [];

    // Attack timers
    this._cannonTimer  = 2;
    this._barrageTimer = BARRAGE_COOLDOWN;
    this._laserTimer   = LASER_COOLDOWN;
    this._laserActive  = false;
    this._laserAge     = 0;

    // Entry
    this._entryT       = 0;
    this._entryStart   = new THREE.Vector3();
    this._entryEnd     = new THREE.Vector3();

    // Callbacks
    /** Called when destroyed: () => void */
    this.onDefeated  = null;
    /** Called when a bolt hits the player: (damage) => void */
    this.onPlayerHit = null;
  }

  get hp()     { return this._hp; }
  get maxHp()  { return MAX_HP; }
  get isAlive(){ return this._alive; }
  get progress(){ return Math.max(0, this._hp / MAX_HP); }
  get group()  { return this._group; }

  /** Spawn the boss near the player. Call when phase → 4. */
  spawn(playerPos) {
    if (this._alive) return;
    this._alive   = true;
    this._hp      = MAX_HP;
    this._phase   = 'entry';
    this._entryT  = 0;
    this._cannonTimer  = 4;
    this._barrageTimer = BARRAGE_COOLDOWN;
    this._laserTimer   = LASER_COOLDOWN;
    this._laserActive  = false;

    // Appear from a random side flank (±X) so it never spawns through the sun
    const side = Math.random() < 0.5 ? 1 : -1;
    const dir  = new THREE.Vector3(side, 0, 0);
    this._entryStart.copy(playerPos).add(dir.clone().multiplyScalar(SPAWN_DIST));
    this._entryEnd.copy(playerPos).add(dir.clone().multiplyScalar(200));
    this._entryStart.y += 80;
    this._entryEnd.y   += 20;

    this._group.position.copy(this._entryStart);
    this._group.visible = true;
    this._group.scale.setScalar(1);

    // Activate lights now that boss is in play
    this._bossLight.intensity   = 6;
    this._engineLight.intensity = 3;
  }

  /** Despawn immediately (e.g. phase leaves 4 without kill). */
  despawn() {
    this._alive = false;
    this._group.visible = false;
    this._bossLight.intensity   = 0;
    this._engineLight.intensity = 0;
    this._clearBolts();
  }

  // ─── Laser hit detection ─────────────────────────────────────────────────────
  checkLaserHit(raycaster) {
    if (!this._alive || this._phase !== 'battle') return null;

    const intersects = raycaster.intersectObjects(this._hitTargets, false);
    if (intersects.length > 0) {
      this._hp -= 8;
      if (this._hp <= 0) {
        this._hp = 0;
        this._defeat();
      }
      return { position: intersects[0].point.clone(), type: 'enemy' };
    }
    return null;
  }

  /** Apply damage from external sources (e.g. sustained laser). */
  takeDamage(amount) {
    if (!this._alive || this._phase !== 'battle') return;
    this._hp -= amount;
    if (this._hp <= 0) {
      this._hp = 0;
      this._defeat();
    }
  }

  // ─── Main update ─────────────────────────────────────────────────────────────
  update(delta, playerPos) {
    if (!this._alive) return;

    // Entry approach
    if (this._phase === 'entry') {
      this._entryT += delta / APPROACH_TIME;
      if (this._entryT >= 1) {
        this._entryT = 1;
        this._phase  = 'battle';
      }
      const t = _smoothstep(this._entryT);
      this._group.position.lerpVectors(this._entryStart, this._entryEnd, t);
      this._group.lookAt(playerPos);
      // Keep scene-level lights positioned at boss
      this._bossLight.position.copy(this._group.position);
      this._engineLight.position.copy(this._group.position);
      return;
    }

    if (this._phase === 'dead') return;

    // Aggressive orbit around battle position
    this._driftAngle = (this._driftAngle || 0) + delta * 0.12;
    this._group.position.x = this._entryEnd.x + Math.sin(this._driftAngle) * 30;
    this._group.position.y = this._entryEnd.y + Math.cos(this._driftAngle * 0.7) * 15;
    this._group.position.z = this._entryEnd.z + Math.cos(this._driftAngle * 0.5) * 20;
    this._group.lookAt(playerPos);

    // Keep scene-level lights positioned at boss
    this._bossLight.position.copy(this._group.position);
    this._engineLight.position.copy(this._group.position);

    // Pulsing glow
    const pulse = Math.sin(Date.now() * 0.002) * 0.5 + 0.5;
    this._coreMat.emissiveIntensity = 1.5 + pulse * 1.5;
    this._bossLight.intensity       = 4   + pulse * 3;

    // ── Attacks ──────────────────────────────────────────────────────────────
    const dist = this._group.position.distanceTo(playerPos);

    // Cannon shot
    this._cannonTimer -= delta;
    if (this._cannonTimer <= 0 && dist < 500) {
      this._cannonTimer = CANNON_COOLDOWN + Math.random() * 1.5;
      this._fireCannon(playerPos, 1);
    }

    // Missile barrage (3 bolts spread)
    this._barrageTimer -= delta;
    if (this._barrageTimer <= 0 && dist < 600) {
      this._barrageTimer = BARRAGE_COOLDOWN + Math.random() * 3;
      this._fireBarrage(playerPos);
    }

    // Tracking laser
    this._laserTimer -= delta;
    if (!this._laserActive && this._laserTimer <= 0) {
      this._laserTimer      = LASER_COOLDOWN + Math.random() * 4;
      this._laserActive     = true;
      this._laserAge        = 0;
      this._laserDmgTimer   = 0;
      // Start from a random offset angle so player has time to react
      this._laserBeam.rotation.y = (Math.random() < 0.5 ? 1 : -1) * (Math.PI * 0.4 + Math.random() * Math.PI * 0.4);
      this._laserBeam.visible = true;
    }

    if (this._laserActive) {
      this._laserAge += delta;

      // Tracking laser: rotates toward player at max speed (player can boost to escape)
      // group.lookAt(playerPos) already aims -Z at player, so rotation.y=0 = aimed at player
      let da = -this._laserBeam.rotation.y;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const maxTrackSpeed = 0.75; // rad/s — boost/barrel-roll to outrun
      this._laserBeam.rotation.y += Math.sign(da) * Math.min(Math.abs(da), maxTrackSpeed * delta);

      // Damage when beam is aimed at player (rotation.y close to 0)
      if (dist < 250 && Math.abs(this._laserBeam.rotation.y) < 0.28) {
        this._laserDmgTimer += delta;
        if (this._laserDmgTimer >= 0.45) {
          this._laserDmgTimer -= 0.45;
          if (this.onPlayerHit) this.onPlayerHit(9);
        }
      } else {
        this._laserDmgTimer = 0;
      }

      if (this._laserAge >= LASER_DURATION) {
        this._laserActive = false;
        this._laserBeam.visible = false;
      }
    }

    // ── Update bolts ────────────────────────────────────────────────────────
    for (let i = this._bolts.length - 1; i >= 0; i--) {
      const b = this._bolts[i];
      b.age += delta;
      if (b.age >= b.lifetime) {
        this._boltGroup.remove(b.mesh);
        this._bolts.splice(i, 1);
        continue;
      }
      b.mesh.position.addScaledVector(b.direction, b.speed * delta);
      if (b.mesh.position.distanceTo(playerPos) < 5) {
        if (this.onPlayerHit) this.onPlayerHit(b.damage);
        this._boltGroup.remove(b.mesh);
        this._bolts.splice(i, 1);
      }
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────────
  _fireCannon(playerPos, count = 1) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(_boltGeoSmall, _boltMatRed);
      const spawnPos = this._group.position.clone();
      spawnPos.y -= 10;
      mesh.position.copy(spawnPos);
      this._boltGroup.add(mesh);

      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.12,
        0,
      );
      const dir = _v3a.subVectors(playerPos, spawnPos).normalize().add(spread).normalize().clone();
      this._bolts.push({ mesh, direction: dir, speed: 110, age: 0, lifetime: 5, damage: 18 });
    }
  }

  _fireBarrage(playerPos) {
    const angles = [-0.25, 0, 0.25, 0.45];
    for (const offset of angles) {
      const mesh = new THREE.Mesh(_boltGeoLarge, _boltMatPink);
      const spawnPos = this._group.position.clone();
      mesh.position.copy(spawnPos);
      this._boltGroup.add(mesh);
      const base = _v3a.subVectors(playerPos, spawnPos).normalize();
      // Fan spread
      const dir = new THREE.Vector3(
        base.x + offset,
        base.y + (Math.random() - 0.5) * 0.2,
        base.z,
      ).normalize().clone();
      this._bolts.push({ mesh, direction: dir, speed: 75, age: 0, lifetime: 6, damage: 24 });
    }
  }

  _defeat() {
    this._phase = 'dead';
    this._laserBeam.visible = false;
    this._clearBolts();

    // Death shrink animation — frame-rate independent via performance.now()
    const startTime = performance.now();
    const shrink = (now) => {
      const elapsed = (now - startTime) / 1000; // seconds
      const s = Math.max(0, 1 - elapsed / 1.5);
      this._group.scale.setScalar(s);
      // Keep lights at boss center during death; fade with scale
      this._bossLight.position.copy(this._group.position);
      this._engineLight.position.copy(this._group.position);
      this._bossLight.intensity   = s * 6;
      this._engineLight.intensity = s * 3;
      if (s > 0) {
        requestAnimationFrame(shrink);
      } else {
        this._alive = false;
        this._group.visible = false;
        this._bossLight.intensity   = 0;
        this._engineLight.intensity = 0;
        if (this.onDefeated) this.onDefeated();
      }
    };
    requestAnimationFrame(shrink);
  }

  _clearBolts() {
    for (const b of this._bolts) this._boltGroup.remove(b.mesh);
    this._bolts.length = 0;
  }

  // ─── Mesh construction ────────────────────────────────────────────────────────
  _buildMesh() {
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xaa0000,
      emissive: 0x550000,
      emissiveIntensity: 0.4,
      metalness: 0.9,
      roughness: 0.3,
    });

    this._coreMat = new THREE.MeshStandardMaterial({
      color: 0xcc0033,
      emissive: 0xff0044,
      emissiveIntensity: 2,
      metalness: 0.6,
      roughness: 0.2,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      emissive: 0xaaaaaa,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.9,
    });

    // ── Main hull ───────────────────────────────────────────────────────────
    const hull = new THREE.Mesh(new THREE.BoxGeometry(70, 22, 140), hullMat);
    this._group.add(hull);

    // Superstructure ridge
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(28, 14, 100), hullMat.clone());
    ridge.position.y = 12;
    this._group.add(ridge);

    // Forward command section
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0, 22, 40, 8), hullMat.clone());
    nose.rotation.z = Math.PI / 2;
    nose.position.set(0, 2, -90);
    this._group.add(nose);

    // ── Swept wings ─────────────────────────────────────────────────────────
    const wingMat = new THREE.MeshStandardMaterial({
      color:     0xaa0000,
      emissive:  0x550000,
      emissiveIntensity: 0.4,
      metalness: 0.9,
      roughness: 0.3,
      side: THREE.DoubleSide, // needed because cloned wing has reversed winding
    });

    const wingVertsL = new Float32Array([
       20,  0, -40,
       90, -8,  70,
       20, -8,  60,
    ]);
    const wingGeoL = new THREE.BufferGeometry();
    wingGeoL.setAttribute('position', new THREE.BufferAttribute(wingVertsL, 3));
    wingGeoL.computeVertexNormals();
    const wingL = new THREE.Mesh(wingGeoL, wingMat);
    this._group.add(wingL);

    // Right wing: mirror X — DoubleSide ensures it's visible from both sides
    const wingVertsR = new Float32Array([
      -20,  0, -40,
      -90, -8,  70,
      -20, -8,  60,
    ]);
    const wingGeoR = new THREE.BufferGeometry();
    wingGeoR.setAttribute('position', new THREE.BufferAttribute(wingVertsR, 3));
    wingGeoR.computeVertexNormals();
    const wingR = new THREE.Mesh(wingGeoR, wingMat);
    this._group.add(wingR);

    // Wing edge strips (accent)
    const edgeGeo = new THREE.BoxGeometry(60, 1.5, 4);
    const edgeL = new THREE.Mesh(edgeGeo, accentMat);
    edgeL.position.set(50, -4, 20);
    edgeL.rotation.z = 0.2;
    this._group.add(edgeL);
    const edgeR = edgeL.clone();
    edgeR.position.x = -50;
    edgeR.rotation.z = -0.2;
    this._group.add(edgeR);

    // ── Turret clusters ─────────────────────────────────────────────────────
    const turretPositions = [
      [  22, 14, -30], [ -22, 14, -30],
      [  22, 14,  20], [ -22, 14,  20],
    ];
    for (const [tx, ty, tz] of turretPositions) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 5, 8), hullMat.clone());
      base.position.set(tx, ty, tz);
      this._group.add(base);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 12, 8), hullMat.clone());
      barrel.rotation.x = -0.6;
      barrel.position.set(tx, ty + 6, tz - 6);
      this._group.add(barrel);
    }

    // ── Engine banks (rear) ─────────────────────────────────────────────────
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x4400ff,
      emissive: 0x2200cc,
      emissiveIntensity: 4,
      transparent: true,
      opacity: 0.8,
    });
    const enginePositions = [[-24, -4, 72], [-8, -4, 72], [8, -4, 72], [24, -4, 72]];
    for (const [ex, ey, ez] of enginePositions) {
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 12, 12), hullMat.clone());
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(ex, ey, ez);
      this._group.add(nozzle);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(5, 12), engineMat);
      glow.rotation.x = Math.PI / 2;
      glow.position.set(ex, ey, ez + 6.1);
      this._group.add(glow);
    }

    // ── Core power reactor (underbelly) ────────────────────────────────────
    const core = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12), this._coreMat);
    core.position.set(0, -14, -10);
    this._group.add(core);

    // ── Sweeping laser beam ─────────────────────────────────────────────────
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.55,
    });
    const beamGeo = new THREE.BoxGeometry(4, 2, 200);
    this._laserBeam = new THREE.Mesh(beamGeo, beamMat);
    this._laserBeam.position.set(0, -14, -90);
    this._laserBeam.visible = false;
    this._group.add(this._laserBeam);

    // ── Lights ──────────────────────────────────────────────────────────────
    // Lights are added directly to the scene (not the group) at intensity=0
    // so Three.js sees a constant light count from page-load — preventing
    // mid-game shader recompilation when the boss becomes visible.
    this._bossLight = new THREE.PointLight(0xff2200, 0, 300);
    this._scene.add(this._bossLight);

    this._engineLight = new THREE.PointLight(0x2200ff, 0, 120);
    this._scene.add(this._engineLight);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function _smoothstep(t) { return t * t * (3 - 2 * t); }
const _v3a = new THREE.Vector3();

// Pre-built bolt assets — created once to avoid per-shot geometry/material allocation
// which triggers WebGL shader recompilation and causes frame spikes.
const _boltGeoSmall = new THREE.SphereGeometry(1.2, 6, 4);
const _boltGeoLarge = new THREE.SphereGeometry(1.8, 6, 4);
const _boltMatRed   = new THREE.MeshBasicMaterial({ color: 0xff2200 });
const _boltMatPink  = new THREE.MeshBasicMaterial({ color: 0xff0066 });
