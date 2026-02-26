import * as THREE from 'three';

/**
 * A handful of absurd objects floating in space — rare Easter eggs for the player to stumble upon.
 * All meshes live inside `this.group` so WarpAnimation can hide them with one toggle.
 * Objects can be shot with the laser (explode into color-matched fragments, respawn after 10 s)
 * or knocked away by the ship on collision.
 */
export class FunnyDebris {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this._objects      = [];
    this._fragments    = [];
    this._respawnQueue = [];
    this._range        = 260;
    this._fadeNear     = this._range * 0.85;
    this._fadeFar      = this._range * 1.25;

    // Shared geometry for explosion fragments
    this._fragGeo = new THREE.IcosahedronGeometry(1, 0);

    // Paired: maker function + dominant explosion colour
    const makers = [
      { fn: this._makeMonolith,    color: 0x1144ff }, // electric blue
      { fn: this._makeTrafficCone, color: 0xff5500 }, // orange
      { fn: this._makeDice,        color: 0xff2222 }, // red (pip colour)
      { fn: this._makeRubberDuck,  color: 0xffdd00 }, // yellow
      { fn: this._makeToiletSeat,  color: 0x88ccff }, // water blue
      { fn: this._makeCRTTV,       color: 0x22ff66 }, // green screen
    ];

    for (const { fn, color } of makers) {
      const mesh = fn.call(this);
      const meshes = [];
      mesh.traverse((node) => {
        if (!node.isMesh || !node.material) return;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of mats) {
          m.transparent = true;
          if (typeof m.opacity !== 'number') m.opacity = 1;
        }
        meshes.push(node);
      });

      mesh.scale.setScalar(2.5);
      mesh.position.set(
        (Math.random() - 0.5) * this._range * 2,
        (Math.random() - 0.5) * this._range * 0.4,
        (Math.random() - 0.5) * this._range * 2,
      );
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );

      this.group.add(mesh);

      const speed = 0.5 + Math.random() * 2.5;
      this._objects.push({
        mesh,
        meshes,
        color,
        destroyed: false,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 2,
        ).normalize().multiplyScalar(speed),
        spawnFade: 1,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
        ),
      });
    }
  }

  /** Shorthand for MeshStandardMaterial */
  _std(color, emissive = null, ei = 0.05, roughness = 0.7, metalness = 0.2) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: emissive ?? color,
      emissiveIntensity: ei,
      roughness,
      metalness,
      transparent: true,
      opacity: 1,
    });
  }

  // ─── Object factories ────────────────────────────────────────────────────────

  _makeMonolith() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 5.5, 0.45),
      new THREE.MeshStandardMaterial({
        color:             0x000000,
        emissive:          0x001133,
        emissiveIntensity: 0.6,
        roughness:         0.05,
        metalness:         0.9,
        transparent:       true,
        opacity:           1,
      }),
    ));
    return g;
  }

  _makeTrafficCone() {
    const g = new THREE.Group();

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 3.0, 10),
      this._std(0xff5500, 0xcc2200, 0.2, 0.8, 0.0),
    );
    cone.position.y = 1.64;
    g.add(cone);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.28, 10),
      this._std(0xffffff, 0xcccccc, 0.08, 0.5, 0.0),
    );
    stripe.position.y = 1.14;
    g.add(stripe);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 0.14, 10),
      this._std(0xff5500, 0xcc2200, 0.1, 0.9, 0.0),
    );
    base.position.y = 0.07;
    g.add(base);

    return g;
  }

  _makeDice() {
    const g = new THREE.Group();

    g.add(new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.4, 2.4),
      this._std(0xfafafa, 0xdddddd, 0.02, 0.6, 0.0),
    ));

    const dotMat = new THREE.MeshStandardMaterial({
      color: 0x220000,
      roughness: 0.8,
      transparent: true,
      opacity: 1,
    });
    const dotGeo = new THREE.SphereGeometry(0.14, 6, 6);
    const off = 1.22;
    const s   = 0.52;

    const faces = [
      { n: [0, +1, 0], pips: [[0, 0]] },
      { n: [0, -1, 0], pips: [[-s,-s],[0,-s],[s,-s],[-s,s],[0,s],[s,s]] },
      { n: [+1,  0, 0], pips: [[s, s], [-s, -s]] },
      { n: [-1,  0, 0], pips: [[0, 0], [s, s], [-s, -s], [s, -s], [-s, s]] },
      { n: [0,  0,+1], pips: [[0, 0], [s, s], [-s, -s]] },
      { n: [0,  0,-1], pips: [[s, s], [s, -s], [-s, s], [-s, -s]] },
    ];

    for (const { n, pips } of faces) {
      for (const [a, b] of pips) {
        const d = new THREE.Mesh(dotGeo, dotMat);
        if      (n[1] !== 0) d.position.set(a, n[1] * off, b);
        else if (n[0] !== 0) d.position.set(n[0] * off, a, b);
        else                 d.position.set(a, b, n[2] * off);
        g.add(d);
      }
    }

    return g;
  }

  _makeRubberDuck() {
    const g = new THREE.Group();

    const yellow  = this._std(0xffdd00, 0xcc9900, 0.15, 0.6, 0.0);
    const orange  = this._std(0xff7700, 0xcc5500, 0.10, 0.7, 0.0);
    const darkEye = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 8), yellow);
    body.scale.set(1, 0.85, 1.2);
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), yellow);
    head.position.set(0.5, 1.2, 0);
    g.add(head);

    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.42), orange);
    beak.position.set(1.15, 1.2, 0);
    beak.rotation.z = -0.12;
    g.add(beak);

    const eyeGeo = new THREE.SphereGeometry(0.1, 6, 6);
    for (const z of [-0.44, 0.44]) {
      const eye = new THREE.Mesh(eyeGeo, darkEye);
      eye.position.set(0.92, 1.46, z);
      g.add(eye);
    }

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), yellow);
    tail.scale.set(0.5, 0.6, 0.5);
    tail.position.set(-1.2, 0.45, 0);
    g.add(tail);

    return g;
  }

  _makeToiletSeat() {
    const g = new THREE.Group();
    const white = this._std(0xf0f0e8, 0xcccccc, 0.03, 0.4, 0.05);

    const seat = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.28, 8, 24), white);
    seat.rotation.x = Math.PI / 2;
    seat.scale.set(1, 1.3, 1);
    g.add(seat);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.1, 16), white);
    lid.scale.set(1, 1, 1.3);
    lid.position.y = 0.22;
    g.add(lid);

    const tank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.55), white);
    tank.position.set(0, 0.55, -1.35);
    g.add(tank);

    const tankLid = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.1, 0.6), white);
    tankLid.position.set(0, 1.35, -1.35);
    g.add(tankLid);

    return g;
  }

  _makeCRTTV() {
    const g = new THREE.Group();

    const bodyMat  = this._std(0xd4c5a0, 0x8a7a60, 0.04, 0.85, 0.05);
    const bezelMat = this._std(0xb8aa88, 0x706050, 0.02, 0.9,  0.05);
    const antMat   = this._std(0x555555, 0x222222, 0.02, 0.6,  0.4);
    const knobMat  = this._std(0x444444, 0x222222, 0.02, 0.5,  0.5);

    g.add(new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 2.2), bodyMat));

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(2.75, 2.15, 0.12), bezelMat);
    bezel.position.z = 1.16;
    g.add(bezel);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.72, 0.05),
      new THREE.MeshStandardMaterial({
        color:             0x0a1a0a,
        emissive:          0x11ff55,
        emissiveIntensity: 0.35,
        roughness:         0.2,
        transparent:       true,
        opacity:           1,
      }),
    );
    screen.position.z = 1.23;
    g.add(screen);

    const antGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.9, 6);
    for (let i = 0; i < 2; i++) {
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(i === 0 ? -0.55 : 0.55, 2.15, 0);
      ant.rotation.z = i === 0 ? -0.4 : 0.4;
      g.add(ant);
    }

    const knobGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.2, 10);
    for (const y of [0.2, -0.25]) {
      const knob = new THREE.Mesh(knobGeo, knobMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(1.38, y, 1.2);
      g.add(knob);
    }

    return g;
  }

  // ─── Destruction ─────────────────────────────────────────────────────────────

  _destroyObject(obj, hitPos) {
    obj.destroyed      = true;
    obj.mesh.visible   = false;

    // Spawn colour-matched fragments at the hit position
    const fragCount = 10 + Math.floor(Math.random() * 8);
    const mat = new THREE.MeshBasicMaterial({ color: obj.color });

    for (let i = 0; i < fragCount; i++) {
      const size = 0.4 + Math.random() * 0.8;
      const frag = new THREE.Mesh(this._fragGeo, mat);
      frag.scale.setScalar(size);
      frag.position.copy(hitPos);
      frag.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      this.group.add(frag);

      const speed = 8 + Math.random() * 20;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ).normalize().multiplyScalar(speed);

      const lifetime = 0.5 + Math.random() * 0.6;
      this._fragments.push({ mesh: frag, velocity: vel, age: 0, lifetime, initialSize: size });
    }

    // Queue respawn after 10 s
    this._respawnQueue.push({ obj, timer: 10 });
  }

  // ─── Laser hit detection ─────────────────────────────────────────────────────

  /**
   * Called by LaserSystem each frame. Checks all live funny objects against the
   * bolt raycaster. Returns { position } on hit, null otherwise.
   */
  checkLaserHit(raycaster) {
    if (!this.group.visible) return null;

    const liveMeshes = this._objects.filter(o => !o.destroyed).map(o => o.mesh);
    if (liveMeshes.length === 0) return null;

    const intersects = raycaster.intersectObjects(liveMeshes, true /* recursive */);
    if (intersects.length === 0) return null;

    const hitPos    = intersects[0].point.clone();
    const hitObject = intersects[0].object;

    // Walk up the parent chain to find which top-level object was hit
    for (const obj of this._objects) {
      if (obj.destroyed) continue;
      let node = hitObject;
      while (node) {
        if (node === obj.mesh) {
          this._destroyObject(obj, hitPos);
          return { position: hitPos, type: 'parts' };
        }
        node = node.parent;
      }
    }

    return null;
  }

  // ─── Ship collision ───────────────────────────────────────────────────────────

  checkShipCollision(shipPosition, shipSpeed) {
    const RADIUS  = 9;
    const MAX_SPD = 60;

    for (const obj of this._objects) {
      if (obj.destroyed) continue;

      const dist = shipPosition.distanceTo(obj.mesh.position);
      if (dist < RADIUS) {
        const awayDir = new THREE.Vector3()
          .subVectors(obj.mesh.position, shipPosition)
          .normalize();

        const impulse = 10 + shipSpeed * 5;
        obj.velocity.addScaledVector(awayDir, impulse);
        if (obj.velocity.length() > MAX_SPD) obj.velocity.setLength(MAX_SPD);

        obj.rotSpeed.x += (Math.random() - 0.5) * 4;
        obj.rotSpeed.y += (Math.random() - 0.5) * 4;
        obj.rotSpeed.z += (Math.random() - 0.5) * 4;

        return { normal: awayDir.clone().negate() };
      }
    }
    return null;
  }

  // ─── Game loop ───────────────────────────────────────────────────────────────

  update(delta, cameraPosition) {
    const r = this._range;
    const fadeNear = this._fadeNear;
    const fadeFar  = this._fadeFar;
    const spawnFadeDuration = 1.0;

    // Move live objects
    for (const obj of this._objects) {
      if (obj.destroyed) continue;

      obj.mesh.position.addScaledVector(obj.velocity, delta);
      obj.mesh.rotation.x += obj.rotSpeed.x * delta;
      obj.mesh.rotation.y += obj.rotSpeed.y * delta;
      obj.mesh.rotation.z += obj.rotSpeed.z * delta;

      for (let axis = 0; axis < 3; axis++) {
        const camVal = axis === 0 ? cameraPosition.x : axis === 1 ? cameraPosition.y : cameraPosition.z;
        const pos    = axis === 0 ? 'x'              : axis === 1 ? 'y'              : 'z';
        const diff   = obj.mesh.position[pos] - camVal;
        if (diff > r) {
          obj.mesh.position[pos] -= r * 2;
          obj.spawnFade = 0;
        } else if (diff < -r) {
          obj.mesh.position[pos] += r * 2;
          obj.spawnFade = 0;
        }
      }

      if (obj.spawnFade < 1) {
        obj.spawnFade = Math.min(1, obj.spawnFade + delta / spawnFadeDuration);
      }

      // Distance fade (fog-like): visible nearby, fades out far away
      const dist = obj.mesh.position.distanceTo(cameraPosition);
      let t = (dist - fadeNear) / (fadeFar - fadeNear);
      t = Math.max(0, Math.min(1, t));
      const alpha = 1 - (t * t * (3 - 2 * t));
      const finalAlpha = alpha * obj.spawnFade;
      for (const m of obj.meshes) {
        if (!m.material) continue;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) mat.opacity = finalAlpha;
      }
    }

    // Update explosion fragments — shrink and fade them out
    for (let i = this._fragments.length - 1; i >= 0; i--) {
      const f = this._fragments[i];
      f.age += delta;

      if (f.age >= f.lifetime) {
        this.group.remove(f.mesh);
        f.mesh.geometry = null; // let shared geo stay; just drop the ref
        this._fragments.splice(i, 1);
        continue;
      }

      f.mesh.position.addScaledVector(f.velocity, delta);
      const t = f.age / f.lifetime;
      f.mesh.scale.setScalar(f.initialSize * (1 - t));
    }

    // Process respawn queue
    for (let i = this._respawnQueue.length - 1; i >= 0; i--) {
      const entry = this._respawnQueue[i];
      entry.timer -= delta;

      if (entry.timer <= 0) {
        const obj = entry.obj;
        obj.destroyed      = false;
        obj.mesh.visible   = true;
        obj.mesh.position.set(
          cameraPosition.x + (Math.random() - 0.5) * r * 2,
          cameraPosition.y + (Math.random() - 0.5) * r * 0.4,
          cameraPosition.z + (Math.random() - 0.5) * r * 2,
        );
        const speed = 0.5 + Math.random() * 2.5;
        obj.velocity.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 2,
        ).normalize().multiplyScalar(speed);
        obj.rotSpeed.set(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
        );
        obj.spawnFade = 0;
        for (const m of obj.meshes) {
          if (!m.material) continue;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) mat.opacity = 1;
        }
        this._respawnQueue.splice(i, 1);
      }
    }
  }
}
