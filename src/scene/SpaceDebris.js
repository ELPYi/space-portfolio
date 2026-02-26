import * as THREE from 'three';

export class SpaceDebris {
  constructor(scene) {
    const count = 320;
    const range = 500;
    this.range = range;
    this.group = new THREE.Group();
    this._scene = scene;
    const geometry = new THREE.IcosahedronGeometry(1, 0);

    // 4 color variants — lighter tones so they're visible in space
    const colors = [0x6a6a6a, 0x7a6b5f, 0x5e5e5e, 0x807060];
    const materials = colors.map(c => new THREE.MeshStandardMaterial({
      color: c,
      emissive: c,
      emissiveIntensity: 0.35,
      roughness: 0.85,
      metalness: 0.15,
      transparent: true,
      opacity: 1,
    }));

    this._asteroids = [];
    this._fragments = [];
    this._respawnQueue = [];
    this._fragmentGeometry = new THREE.IcosahedronGeometry(1, 0);
    this._fragmentMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a7a6a,
      emissive: 0x8a7a6a,
      emissiveIntensity: 0.4,
      roughness: 0.8,
      metalness: 0.2,
    });

    // Pre-allocate fragment pool to avoid runtime allocations
    this._fragmentPool = [];
    this._fragmentPoolSize = 120;
    for (let i = 0; i < this._fragmentPoolSize; i++) {
      const frag = new THREE.Mesh(this._fragmentGeometry, this._fragmentMaterial);
      frag.visible = false;
      this.group.add(frag); // must be in the group so group.visible hides them during warp
      this._fragmentPool.push(frag);
    }

    for (let i = 0; i < count; i++) {
      const mat = materials[Math.floor(Math.random() * materials.length)].clone();
      const mesh = new THREE.Mesh(geometry, mat);

      // Random position in range
      mesh.position.set(
        (Math.random() - 0.5) * range * 2,
        (Math.random() - 0.5) * range * 2,
        (Math.random() - 0.5) * range * 2,
      );

      // Varying sizes — heavier skew to small, but with occasional big rocks
      const sizeRand = Math.pow(Math.random(), 1.7); // bias small
      const baseSize = 1.0 + sizeRand * 14.0; // 1.0 – 15.0
      mesh.scale.set(
        baseSize * (0.6 + Math.random() * 0.8),
        baseSize * (0.6 + Math.random() * 0.8),
        baseSize * (0.6 + Math.random() * 0.8),
      );

      // Random initial rotation
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );

      this.group.add(mesh);

      // Drift velocity — most drift slowly, ~12% move noticeably faster
      const speed = Math.random() < 0.12
        ? 22 + Math.random() * 28   // fast drifters:  22 – 50 units/sec
        : 1  + Math.random() * 11;  // slow drifters:   1 – 12 units/sec
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.4, // mostly horizontal
        (Math.random() - 0.5) * 2,
      ).normalize().multiplyScalar(speed);

      this._asteroids.push({
        mesh,
        baseSize,
        destroyed: false,
        velocity,
        spawnFade: 1,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
        ),
      });
    }

    scene.add(this.group);
  }

  /**
   * Radial shockwave impulse (e.g. Dyson sphere lockDown).
   * @param {THREE.Vector3} center
   * @param {number} strength - base impulse magnitude
   * @param {number} radius - effective radius
   */
  applyShockwave(center, strength = 65, radius = 1400) {
    const dir = new THREE.Vector3();
    for (const asteroid of this._asteroids) {
      if (asteroid.destroyed) continue;
      dir.subVectors(asteroid.mesh.position, center);
      const dist = dir.length();
      if (dist <= 1 || dist > radius) continue;
      dir.normalize();
      // Falloff: strong near center, soft at edge
      const falloff = 1 - (dist / radius);
      const impulse = strength * (0.3 + falloff * falloff);
      asteroid.velocity.addScaledVector(dir, impulse);
    }
  }

  /** Check ship collision with asteroids. Returns collision info or null. */
  checkShipCollision(shipPosition, shipSpeed) {
    const _worldPos = new THREE.Vector3();

    for (let i = 0; i < this._asteroids.length; i++) {
      const asteroid = this._asteroids[i];
      if (asteroid.destroyed) continue;

      asteroid.mesh.getWorldPosition(_worldPos);
      const collisionRadius = asteroid.baseSize * 1.2;
      const dist = shipPosition.distanceTo(_worldPos);

      if (dist < collisionRadius + 1.5) { // 1.5 = approximate ship radius
        const normal = new THREE.Vector3().subVectors(shipPosition, _worldPos).normalize();

        if (asteroid.baseSize < 3.5) {
          // Small: destroy on contact, no bounce
          this._destroyAsteroid(i);
          return { hit: true, bounced: false, position: _worldPos.clone(), normal };
        } else if (asteroid.baseSize <= 6.0) {
          // Medium: destroy + bounce
          this._destroyAsteroid(i);
          return { hit: true, bounced: true, position: _worldPos.clone(), normal };
        } else {
          // Large: bounce only, no destroy
          return { hit: true, bounced: true, unbreakable: true, position: _worldPos.clone(), normal };
        }
      }
    }

    return null;
  }

  /** Check laser raycaster against asteroids. Destroys hit asteroid, returns position or null. */
  checkLaserHit(raycaster) {
    const intersects = raycaster.intersectObjects(this.group.children, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const idx = this._asteroids.findIndex(a => a.mesh === hitMesh && !a.destroyed);
      if (idx !== -1) {
        const pos = intersects[0].point.clone();
        this._destroyAsteroid(idx);
        return { position: pos, type: 'ore' };
      }
    }

    return null;
  }

  /** Destroy asteroid at index, spawn fragments, queue respawn. */
  _destroyAsteroid(index) {
    const asteroid = this._asteroids[index];
    asteroid.destroyed = true;
    asteroid.mesh.visible = false;

    // Scale fragment count, size, speed, and lifetime based on asteroid size
    const s = asteroid.baseSize; // 0.5 – 4.0
    const fragCount = Math.floor(3 + s * 2 + Math.random() * (s * 1.5));
    const pos = new THREE.Vector3();
    asteroid.mesh.getWorldPosition(pos);

    for (let i = 0; i < fragCount; i++) {
      // Pull from pool instead of allocating new meshes
      let frag;
      if (this._fragmentPool.length > 0) {
        frag = this._fragmentPool.pop();
      } else {
        frag = new THREE.Mesh(this._fragmentGeometry, this._fragmentMaterial);
        this.group.add(frag); // keep overflow fragments inside the group too
      }

      const size = (0.1 + Math.random() * 0.2) * s;
      frag.scale.set(size, size * (0.5 + Math.random()), size * (0.5 + Math.random()));
      frag.position.copy(pos);
      frag.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
      frag.visible = true;

      const spread = 4 + s * 2;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
      );

      const tumble = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
      );

      const lifetime = 0.6 + s * 0.2 + Math.random() * 0.4;
      this._fragments.push({ mesh: frag, velocity, tumble, age: 0, lifetime, initialScale: size });
    }

    // Queue respawn after 5s
    this._respawnQueue.push({ index, timer: 5 });
  }

  update(delta, cameraPosition) {
    const r = this.range;
    const fadeNear = r * 0.9;
    const fadeFar = r * 1.35;
    const spawnFadeDuration = 0.8;

    for (const asteroid of this._asteroids) {
      if (asteroid.destroyed) continue;
      const { mesh, rotSpeed } = asteroid;

      // Drift
      mesh.position.addScaledVector(asteroid.velocity, delta);

      // Tumble
      mesh.rotation.x += rotSpeed.x * delta;
      mesh.rotation.y += rotSpeed.y * delta;
      mesh.rotation.z += rotSpeed.z * delta;

      // Reposition if too far from camera, biased behind the view direction
      // Wrap per-axis around camera
      for (let axis = 0; axis < 3; axis++) {
        const camVal = axis === 0 ? cameraPosition.x : axis === 1 ? cameraPosition.y : cameraPosition.z;
        const pos = axis === 0 ? 'x' : axis === 1 ? 'y' : 'z';
        const diff = mesh.position[pos] - camVal;
        if (diff > r) {
          mesh.position[pos] -= r * 2;
          asteroid.spawnFade = 0;
        } else if (diff < -r) {
          mesh.position[pos] += r * 2;
          asteroid.spawnFade = 0;
        }
      }

      if (asteroid.spawnFade < 1) {
        asteroid.spawnFade = Math.min(1, asteroid.spawnFade + delta / spawnFadeDuration);
      }

      // Distance-based fade to reduce pop-in
      const dist = mesh.position.distanceTo(cameraPosition);
      let t = (dist - fadeNear) / (fadeFar - fadeNear);
      t = Math.max(0, Math.min(1, t));
      const alpha = 1 - (t * t * (3 - 2 * t)); // smoothstep (fade out far away)
      mesh.material.opacity = alpha * asteroid.spawnFade;
    }

    // Update fragments
    for (let i = this._fragments.length - 1; i >= 0; i--) {
      const frag = this._fragments[i];
      frag.age += delta;

      if (frag.age >= frag.lifetime) {
        frag.mesh.visible = false;
        this._fragmentPool.push(frag.mesh);
        this._fragments.splice(i, 1);
        continue;
      }

      // Move
      frag.mesh.position.addScaledVector(frag.velocity, delta);
      // Tumble
      frag.mesh.rotation.x += frag.tumble.x * delta;
      frag.mesh.rotation.y += frag.tumble.y * delta;
      frag.mesh.rotation.z += frag.tumble.z * delta;
      // Shrink
      const t = frag.age / frag.lifetime;
      const s = frag.initialScale * (1 - t);
      frag.mesh.scale.setScalar(Math.max(s, 0.01));
    }

    // Process respawn queue
    for (let i = this._respawnQueue.length - 1; i >= 0; i--) {
      const entry = this._respawnQueue[i];
      entry.timer -= delta;

      if (entry.timer <= 0) {
        const asteroid = this._asteroids[entry.index];
        asteroid.destroyed = false;
        asteroid.mesh.visible = true;

        // Reposition far from camera
        asteroid.mesh.position.set(
          cameraPosition.x + (Math.random() - 0.5) * r * 2,
          cameraPosition.y + (Math.random() - 0.5) * r * 2,
          cameraPosition.z + (Math.random() - 0.5) * r * 2,
        );

        // Ensure it's not too close
        const dist = asteroid.mesh.position.distanceTo(cameraPosition);
        if (dist < 50) {
          const dir = new THREE.Vector3().subVectors(asteroid.mesh.position, cameraPosition).normalize();
          asteroid.mesh.position.copy(cameraPosition).addScaledVector(dir, 80 + Math.random() * 100);
        }

        this._respawnQueue.splice(i, 1);
      }
    }
  }
}
