import * as THREE from 'three';

/**
 * Fast-moving meteorites that streak through the scene.
 * Visually distinct from regular asteroids: hot dark rock with orange emissive glow
 * and a two-layer fire trail (white inner core + orange-red outer glow).
 * All meshes live inside `this.group` so WarpAnimation can hide them with one toggle.
 */
export class Meteorites {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this._pool       = [];
    this._spawnTimer = 3 + Math.random() * 4;

    // Hot dark rock — dark brownish base, bright orange emissive to look heated
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color:             0x1a0d05,
      emissive:          0xff4400,
      emissiveIntensity: 1.4,
      roughness:         0.9,
      metalness:         0.05,
    });

    // Trail geometry: tapered cylinder — wide base at rock, narrow tip trailing behind
    // radiusTop = tip (narrow), radiusBottom = base (wide at rock end)
    const innerTrailGeo = new THREE.CylinderGeometry(0.05, 0.8, 1, 8, 1, true);
    const innerTrailMat = new THREE.MeshBasicMaterial({
      color:       0xffffaa,
      transparent: true,
      opacity:     0.9,
      side:        THREE.DoubleSide,
      depthWrite:  false,
    });

    const outerTrailGeo = new THREE.CylinderGeometry(0.12, 1.6, 1, 8, 1, true);
    const outerTrailMat = new THREE.MeshBasicMaterial({
      color:       0xff5500,
      transparent: true,
      opacity:     0.5,
      side:        THREE.DoubleSide,
      depthWrite:  false,
    });

    // Up vector used for trail quaternion alignment
    this._up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < 6; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.visible = false;
      this.group.add(rock);

      const innerTrail = new THREE.Mesh(innerTrailGeo, innerTrailMat.clone());
      innerTrail.visible = false;
      this.group.add(innerTrail);

      const outerTrail = new THREE.Mesh(outerTrailGeo, outerTrailMat.clone());
      outerTrail.visible = false;
      this.group.add(outerTrail);

      this._pool.push({
        rock,
        innerTrail,
        outerTrail,
        active:    false,
        direction: new THREE.Vector3(),
        rotSpeed:  new THREE.Vector3(),
        speed:     0,
        size:      1,
        age:       0,
        lifetime:  0,
        spawnFade: 1,
        // Quaternion that aligns trail cylinder with travel direction
        trailQuat: new THREE.Quaternion(),
        // Scaled trail lengths
        innerLen:  1,
        outerLen:  1,
      });
    }
  }

  _spawn(playerPos) {
    const m = this._pool.find(p => !p.active);
    if (!m) return;

    // Random travel direction — flattened so they streak across the horizon
    m.direction.set(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 2,
    ).normalize();

    // Spawn at a random offset from the player
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 2,
    ).normalize();
    const dist = 140 + Math.random() * 180;

    const size = 1.5 + Math.random() * 4.5;
    m.size = size;

    const startPos = new THREE.Vector3().copy(playerPos).addScaledVector(offset, dist);
    m.rock.position.copy(startPos);
    m.rock.scale.set(
      size * (0.6 + Math.random() * 0.8),
      size * (0.6 + Math.random() * 0.8),
      size * (0.6 + Math.random() * 0.8),
    );
    m.rock.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );

    // Fast tumble
    m.rotSpeed.set(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
    );

    m.speed    = 130 + Math.random() * 160; // 130 – 290 units/sec
    m.age      = 0;
    m.lifetime = 3 + Math.random() * 3;
    m.active   = true;

    // Trail lengths scale with rock size
    m.innerLen = size * 3.5;
    m.outerLen = size * 5.0;

    // Quaternion: cylinder default axis is Y+, we want it pointing along -direction
    // (wide end at rock, narrow tip in the wake)
    const negDir = m.direction.clone().negate();
    m.trailQuat.setFromUnitVectors(this._up, negDir);

    // Scale trail cylinders along Y (length axis)
    m.innerTrail.scale.set(size, m.innerLen, size);
    m.outerTrail.scale.set(size, m.outerLen, size);

    m.innerTrail.quaternion.copy(m.trailQuat);
    m.outerTrail.quaternion.copy(m.trailQuat);

    m.spawnFade = 0;
    m.rock.visible       = true;
    m.innerTrail.visible = true;
    m.outerTrail.visible = true;
  }

  update(delta, playerPos) {
    const spawnFadeDuration = 0.35;
    this._spawnTimer -= delta;
    if (this._spawnTimer <= 0) {
      this._spawn(playerPos);
      this._spawnTimer = 4 + Math.random() * 6;
    }

    for (const m of this._pool) {
      if (!m.active) continue;

      m.age += delta;

      if (m.age >= m.lifetime) {
        m.active             = false;
        m.rock.visible       = false;
        m.innerTrail.visible = false;
        m.outerTrail.visible = false;
        continue;
      }

      if (m.spawnFade < 1) {
        m.spawnFade = Math.min(1, m.spawnFade + delta / spawnFadeDuration);
      }

      // Fade in over first 0.3 s, fade out over last 0.5 s
      const fadeIn  = Math.min(m.age / 0.3, 1);
      const fadeOut = Math.min((m.lifetime - m.age) / 0.5, 1);
      const alpha   = Math.min(fadeIn, fadeOut) * m.spawnFade;

      m.innerTrail.material.opacity = 0.9 * alpha;
      m.outerTrail.material.opacity = 0.5 * alpha;
      m.rock.material.opacity       = alpha;

      // Move rock
      m.rock.position.addScaledVector(m.direction, m.speed * delta);

      // Tumble
      m.rock.rotation.x += m.rotSpeed.x * delta;
      m.rock.rotation.y += m.rotSpeed.y * delta;
      m.rock.rotation.z += m.rotSpeed.z * delta;

      // Position trails — center is halfway along the trail, behind the rock
      // wide end (base) stays at rock position, tip extends behind
      const halfInner = m.innerLen * 0.5;
      const halfOuter = m.outerLen * 0.5;

      m.innerTrail.position.copy(m.rock.position)
        .addScaledVector(m.direction, -halfInner);
      m.outerTrail.position.copy(m.rock.position)
        .addScaledVector(m.direction, -halfOuter);
    }
  }
}
