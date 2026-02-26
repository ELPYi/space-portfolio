import * as THREE from 'three';

// Spawn ring around player
const SPAWN_MIN = 220;
const SPAWN_MAX = 380;

// Gathering: wave config based on progress (0→1)
function _gatheringConfig(progress) {
  if (progress >= 0.66) return { swarm: 8, heavy: 2, spawnInterval: 8 };
  if (progress >= 0.33) return { swarm: 6, heavy: 1, spawnInterval: 10 };
  return { swarm: 4, heavy: 0, spawnInterval: 12 };
}

// Escort phase: continuous pressure on cargo ship
const ESCORT_CONFIG = { swarm: 8, heavy: 2, spawnInterval: 8 };

// Shared geometry / material cache — ALL created once to avoid per-spawn allocations
// (per-spawn geometry creation + PointLight additions cause shader recompiles → stutters)
let _swarmGeo = null;
let _heavyGeo = null;
let _swarmMat = null;
let _heavyMat = null;
let _domeMat  = null;
let _domeGeo  = null;
let _glowGeo  = null;
let _glowMat  = null;
let _coreGeo  = null;
let _coreMat  = null;
let _boltGeoSwarm  = null;
let _boltGeoHeavy  = null;
let _boltMatSwarm  = null;
let _boltMatHeavy  = null;

function _initShared() {
  if (_swarmGeo) return;

  // Swarm: flat saucer + dome
  _swarmGeo = new THREE.CylinderGeometry(5, 5.5, 1.8, 14);
  _swarmMat = new THREE.MeshStandardMaterial({
    color: 0xcc2200,
    emissive: 0xff3300,
    emissiveIntensity: 1.8,
    metalness: 0.7,
    roughness: 0.25,
  });
  _domeMat = new THREE.MeshStandardMaterial({
    color: 0xff4400,
    emissive: 0xff6600,
    emissiveIntensity: 2.5,
    metalness: 0.5,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  // Dome + glow geometries cached (previously recreated each spawn — caused stutter)
  _domeGeo = new THREE.SphereGeometry(2.8, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  _glowGeo = new THREE.CircleGeometry(0.8, 8);
  _glowMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

  // Heavy: spiky octahedron
  _heavyGeo = new THREE.OctahedronGeometry(9, 1);
  _heavyMat = new THREE.MeshStandardMaterial({
    color: 0x440066,
    emissive: 0xaa00ff,
    emissiveIntensity: 1.2,
    metalness: 0.9,
    roughness: 0.15,
  });
  _coreGeo = new THREE.SphereGeometry(3.5, 8, 6);
  _coreMat = new THREE.MeshBasicMaterial({ color: 0xdd00ff });

  // Bolt geometry
  _boltGeoSwarm = new THREE.SphereGeometry(0.5, 6, 4);
  _boltGeoHeavy = new THREE.SphereGeometry(1.2, 8, 5);
  _boltMatSwarm = new THREE.MeshBasicMaterial({ color: 0xff5500 });
  _boltMatHeavy = new THREE.MeshBasicMaterial({ color: 0xcc00ff });
}

export class EnemyManager {
  constructor(scene) {
    this._scene    = scene;
    this._phase    = 0;      // 0=gathering, 1=escort, 2=boss, 3=victory
    this._progress = 0;      // 0..1 gathering progress (for wave scaling)
    this._enemies  = [];
    this._bolts    = [];
    this._spawnTimer = 0;

    this._group     = new THREE.Group();
    this._boltGroup = new THREE.Group();
    scene.add(this._group);
    scene.add(this._boltGroup);

    _initShared();

    /** Called when an enemy bolt hits the player: (damage: number) => void */
    this.onPlayerHit = null;
    /** Called when an enemy is destroyed (for optional kill-count tracking) */
    this.onEnemyKilled = null;
  }

  /** Called by GameState.onPhaseChange */
  setPhase(phase) {
    this._phase = phase;
    this._spawnTimer = 2; // short delay before first spawn
    if (phase === 0) {
      this._clearAll(); // fresh start on reset
    } else if (phase >= 2) {
      this._clearAll(); // boss/victory: no enemies
    }
    // Phase 1 (escort): keep current enemies, reconfigure spawning
  }

  /** Update gathering progress (called from main.js each frame in phase 0) */
  setProgress(progress) {
    this._progress = Math.max(0, Math.min(1, progress));
  }

  // ─── Laser hit detection (same interface as SpaceDebris / FunnyDebris) ──────
  checkLaserHit(raycaster) {
    if (this._enemies.length === 0) return null;

    const hitTargets = [];
    for (const e of this._enemies) {
      e.group.children.forEach(c => { if (c.isMesh) hitTargets.push(c); });
    }

    const intersects = raycaster.intersectObjects(hitTargets, false);
    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const enemy = this._enemies.find(e => e.group.children.includes(hitObj));
      if (enemy && !enemy.dying) {
        enemy.hp--;
        if (enemy.hp <= 0) this._destroyEnemy(enemy);
        return { position: intersects[0].point.clone(), type: 'enemy' };
      }
    }
    return null;
  }

  /** Returns { normal, damage } if enemy collides with player, else null */
  checkPlayerCollision(playerPos) {
    for (const enemy of this._enemies) {
      if (enemy.dying) continue;
      const d = playerPos.distanceTo(enemy.group.position);
      if (d < enemy.radius + 2.5) {
        const normal = new THREE.Vector3()
          .subVectors(playerPos, enemy.group.position)
          .normalize();
        this._destroyEnemy(enemy);
        return { normal, damage: enemy.type === 'heavy' ? 25 : 15 };
      }
    }
    return null;
  }

  /**
   * Returns { position, velocity } for the nearest non-dying enemy, or null.
   * Velocity is estimated from known movement speed toward playerPos.
   */
  getNearestEnemy(playerPos) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const enemy of this._enemies) {
      if (enemy.dying) continue;
      const dist = playerPos.distanceTo(enemy.group.position);
      if (dist < nearestDist) { nearestDist = dist; nearest = enemy; }
    }
    if (!nearest) return null;
    const speed = nearest.type === 'swarm' ? 62 : 27;
    const velocity = new THREE.Vector3()
      .subVectors(playerPos, nearest.group.position)
      .normalize()
      .multiplyScalar(speed);
    return { position: nearest.group.position.clone(), velocity };
  }

  /** Returns { damage } if any enemy collides with the cargo ship, else null */
  checkCargoCollision(cargoPos) {
    for (const enemy of this._enemies) {
      if (enemy.dying) continue;
      const d = cargoPos.distanceTo(enemy.group.position);
      // Cargo ship is ~30 units wide
      if (d < enemy.radius + 20) {
        this._destroyEnemy(enemy);
        return { damage: enemy.type === 'heavy' ? 20 : 10 };
      }
    }
    return null;
  }

  /**
   * @param {number} delta
   * @param {THREE.Vector3} playerPos
   * @param {THREE.Vector3|null} cargoPos  — provided during escort phase
   */
  update(delta, playerPos, cargoPos = null) {
    // Determine active config
    let cfg;
    if (this._phase === 0) {
      cfg = _gatheringConfig(this._progress);
    } else if (this._phase === 1) {
      cfg = ESCORT_CONFIG;
    } else {
      // Boss / victory: no spawning; just clean up
      this._tickEnemies(delta, playerPos, null);
      this._tickBolts(delta, playerPos);
      return;
    }

    // ── Spawn ──────────────────────────────────────────────────────────────────
    this._spawnTimer -= delta;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = cfg.spawnInterval + Math.random() * 4;
      const aliveSwarm = this._enemies.filter(e => e.type === 'swarm').length;
      const aliveHeavy = this._enemies.filter(e => e.type === 'heavy').length;
      // In escort, spawn near cargo ship; in gathering, near player
      const spawnAnchor = (this._phase === 1 && cargoPos) ? cargoPos : playerPos;
      if (aliveSwarm < cfg.swarm) this._spawnEnemy('swarm', spawnAnchor);
      if (aliveHeavy < cfg.heavy) this._spawnEnemy('heavy', spawnAnchor);
    }

    this._tickEnemies(delta, playerPos, cargoPos);
    this._tickBolts(delta, playerPos, cargoPos);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────
  _tickEnemies(delta, playerPos, cargoPos) {
    const toRemove = [];
    for (const enemy of this._enemies) {
      if (enemy.dying) {
        enemy.dyingTimer -= delta;
        const s = Math.max(0, enemy.dyingTimer / 0.4);
        enemy.group.scale.setScalar(s);
        if (enemy.dyingTimer <= 0) toRemove.push(enemy);
        continue;
      }
      this._updateEnemy(enemy, delta, playerPos, cargoPos);
    }
    for (const e of toRemove) {
      this._group.remove(e.group);
      this._enemies.splice(this._enemies.indexOf(e), 1);
    }
  }

  _tickBolts(delta, playerPos, cargoPos = null) {
    for (let i = this._bolts.length - 1; i >= 0; i--) {
      const bolt = this._bolts[i];
      bolt.age += delta;
      if (bolt.age >= bolt.lifetime) {
        this._boltGroup.remove(bolt.mesh);
        this._bolts.splice(i, 1);
        continue;
      }
      bolt.mesh.position.addScaledVector(bolt.direction, bolt.speed * delta);

      // Player hit
      if (bolt.mesh.position.distanceTo(playerPos) < 4) {
        if (this.onPlayerHit) this.onPlayerHit(bolt.damage);
        this._boltGroup.remove(bolt.mesh);
        this._bolts.splice(i, 1);
      }
    }
  }

  _updateEnemy(enemy, delta, playerPos, cargoPos) {
    // In escort mode, enemy may target cargo ship if it's closer
    let target = playerPos;
    if (this._phase === 1 && cargoPos) {
      const distPlayer = enemy.group.position.distanceTo(playerPos);
      const distCargo  = enemy.group.position.distanceTo(cargoPos);
      if (distCargo < distPlayer) target = cargoPos;
    }

    const toTarget = _v3a.subVectors(target, enemy.group.position);
    const dist     = toTarget.length();
    const dir      = _v3b.copy(toTarget).normalize();

    const speed = enemy.type === 'swarm' ? 62 : 27;

    if (dist > 6) {
      if (enemy.type === 'swarm') {
        enemy.wobble += delta * 2.8;
        dir.x += Math.sin(enemy.wobble)       * 0.28;
        dir.y += Math.cos(enemy.wobble * 1.3) * 0.28;
        dir.normalize();
      }
      enemy.group.position.addScaledVector(dir, speed * delta);
    }

    // Accumulate spin angle across frames
    const spinRate = enemy.type === 'swarm' ? 2.5 : 0.8;
    enemy.spinAngle += delta * spinRate;

    if (enemy.type === 'heavy') {
      enemy.group.lookAt(target);
      _tempQ.setFromAxisAngle(_upAxis, enemy.spinAngle);
      enemy.group.quaternion.multiply(_tempQ);
    } else {
      _tempQ.setFromAxisAngle(_upAxis, enemy.spinAngle);
      enemy.group.quaternion.copy(_tempQ);
    }

    // Shoot at target (player or cargo)
    enemy.shootTimer -= delta;
    const shootRange = enemy.type === 'swarm' ? 160 : 200;
    if (enemy.shootTimer <= 0 && dist < shootRange) {
      const cooldown = (enemy.type === 'swarm' ? 3.5 : 2.5) + Math.random() * 2;
      enemy.shootTimer = cooldown;
      this._fireBolt(enemy, target);
    }
  }

  _fireBolt(enemy, target) {
    const isSwarm = enemy.type === 'swarm';
    const mesh = new THREE.Mesh(
      isSwarm ? _boltGeoSwarm : _boltGeoHeavy,
      isSwarm ? _boltMatSwarm : _boltMatHeavy,
    );
    mesh.position.copy(enemy.group.position);
    this._boltGroup.add(mesh);

    const direction = _v3c.subVectors(target, enemy.group.position).normalize().clone();
    this._bolts.push({
      mesh,
      direction,
      speed:    isSwarm ? 90 : 65,
      age:      0,
      lifetime: 4,
      damage:   isSwarm ? 12 : 22,
    });
  }

  _spawnEnemy(type, anchorPos) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
    const spawnPos = new THREE.Vector3(
      anchorPos.x + Math.cos(angle) * dist,
      anchorPos.y + (Math.random() - 0.5) * 100,
      anchorPos.z + Math.sin(angle) * dist,
    );

    const group = type === 'swarm' ? this._makeSwarmMesh() : this._makeHeavyMesh();
    group.position.copy(spawnPos);
    this._group.add(group);

    this._enemies.push({
      group,
      type,
      hp:          type === 'swarm' ? 6 : 16,
      radius:      type === 'swarm' ? 6 : 10,
      shootTimer:  1 + Math.random() * 3,
      wobble:      Math.random() * Math.PI * 2,
      spinAngle:   Math.random() * Math.PI * 2,
      dying:       false,
      dyingTimer:  0,
    });
  }

  _makeSwarmMesh() {
    const g = new THREE.Group();

    const disc = new THREE.Mesh(_swarmGeo, _swarmMat);
    g.add(disc);

    // Use cached dome geometry (no per-spawn allocation)
    const dome = new THREE.Mesh(_domeGeo, _domeMat);
    dome.position.y = 0.9;
    g.add(dome);

    // Use cached glow geometry + material
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const glow  = new THREE.Mesh(_glowGeo, _glowMat);
      glow.position.set(Math.cos(angle) * 3, -0.95, Math.sin(angle) * 3);
      glow.rotation.x = -Math.PI / 2;
      g.add(glow);
    }

    // PointLights removed — adding lights per-enemy changes the scene light count,
    // triggering WebGL shader recompilation and causing frame stutters.
    // Emissive materials provide the visual glow without the performance cost.

    return g;
  }

  _makeHeavyMesh() {
    const g = new THREE.Group();

    const body = new THREE.Mesh(_heavyGeo, _heavyMat);
    g.add(body);

    // Use cached core geometry + material
    const core = new THREE.Mesh(_coreGeo, _coreMat);
    g.add(core);

    // PointLight removed for same reason as swarm (shader recompile stutter)

    return g;
  }

  _destroyEnemy(enemy) {
    if (enemy.dying) return;
    enemy.dying      = true;
    enemy.dyingTimer = 0.4;
    if (this.onEnemyKilled) this.onEnemyKilled(enemy.type);
  }

  /** Clear all active enemies and bolts. */
  reset() { this._clearAll(); }

  _clearAll() {
    for (const e of this._enemies) this._group.remove(e.group);
    this._enemies.length = 0;
    for (const b of this._bolts) this._boltGroup.remove(b.mesh);
    this._bolts.length = 0;
  }
}

// Scratch objects
const _v3a   = new THREE.Vector3();
const _v3b   = new THREE.Vector3();
const _v3c   = new THREE.Vector3();
const _tempQ = new THREE.Quaternion();
const _upAxis = new THREE.Vector3(0, 1, 0);
