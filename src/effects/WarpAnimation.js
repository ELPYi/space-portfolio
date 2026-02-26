import * as THREE from 'three';

export class WarpAnimation {
  constructor(camera, controls, postProcessing, starfield, flashEl, portalManager, shipGroup, spaceDebris, laserSystem) {
    this.camera = camera;
    this.controls = controls;
    this.postProcessing = postProcessing;
    this.starfield = starfield;
    this.flashEl = flashEl;
    this.portalManager = portalManager;
    this.shipGroup = shipGroup;
    this.spaceDebris = spaceDebris;
    this.laserSystem = laserSystem;

    this._active = false;
    this._elapsed = 0;
    this._duration = 2.5;
    this._targetProject = null;
    this._onComplete = null;
    this._startPos = new THREE.Vector3();
    this._targetPos = new THREE.Vector3();
    this._teleported = false;

    // Saved ship mesh local position/quaternion to restore after swoop
    this._savedMeshPos = new THREE.Vector3();
    this._savedMeshQuat = new THREE.Quaternion();

    // Warp star streaks — thin elongated rectangles facing the camera
    this._warpGroup = new THREE.Group();
    this._warpGroup.visible = false;
    this._warpStarCount = 500;
    this._warpStarData = []; // per-star metadata
    this._warpMesh = null;
    this._initWarpStars();
  }

  get isActive() {
    return this._active;
  }

  _initWarpStars() {
    const count = this._warpStarCount;

    // Elongated plane facing +Z (toward camera in local space)
    const geo = new THREE.PlaneGeometry(0.3, 1.0);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this._warpMesh = new THREE.InstancedMesh(geo, mat, count);
    this._warpMesh.frustumCulled = false;
    this._warpGroup.add(this._warpMesh);

    const dummy = new THREE.Object3D();
    this._warpStarData = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 90;
      const z = -Math.random() * 200;

      this._warpStarData.push({ angle, radius, z, origZ: z });

      // Position in cylinder and rotate so the streak points radially from center
      dummy.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        z
      );
      // Rotate around Z so the elongated axis radiates outward from tunnel center
      dummy.rotation.set(0, 0, angle + Math.PI / 2);
      dummy.updateMatrix();
      this._warpMesh.setMatrixAt(i, dummy.matrix);
    }
    this._warpMesh.instanceMatrix.needsUpdate = true;
  }

  start(project, onComplete) {
    if (this._active) return;

    this._active = true;
    this._elapsed = 0;
    this._targetProject = project;
    this._onComplete = onComplete;
    this._teleported = false;

    this._startPos.copy(this.controls.getPosition());

    const pp = project.position;
    const ps = project.scale || 1.0;
    this._targetPos.set(pp.x, pp.y, pp.z + 80 * ps);

    this.controls.enabled = false;

    // Save ship mesh local transform so we can animate it independently
    this._savedMeshPos.copy(this.controls.mesh.position);
    this._savedMeshQuat.copy(this.controls.mesh.quaternion);

    // Add warp group to scene
    const scene = this.starfield.points.parent;
    if (!this._warpGroup.parent) {
      scene.add(this._warpGroup);
    }
    this._warpGroup.visible = true;

    // Reset warp star positions
    for (let i = 0; i < this._warpStarCount; i++) {
      this._warpStarData[i].z = this._warpStarData[i].origZ;
    }

    // Hide real starfield, debris, lasers, shooting stars and portals (but NOT the ship)
    this.starfield.points.visible = false;
    this.spaceDebris.group.visible = false;
    if (this.laserSystem)     this.laserSystem.group.visible    = false;
    if (this.shootingStars)   this.shootingStars.group.visible  = false;
    if (this.funnyDebris)     this.funnyDebris.group.visible    = false;
    for (const portal of this.portalManager.portals) {
      portal.group.visible = false;
    }
  }

  update(delta) {
    if (!this._active) return false;

    this._elapsed += delta;
    const t = Math.min(this._elapsed / this._duration, 1);

    // Move warp stars toward camera every frame
    this._updateWarpStars(delta, t);

    // Animate ship swoop
    this._updateShipSwoop(t);

    // Phase 1: 0–0.5 — stars rushing, bloom ramps, ship swoops in
    if (t < 0.5) {
      const p = t / 0.5;
      this.postProcessing.setBloomStrength(1.5 + p * 3);
    }
    // Phase 2: 0.5–0.7 — white flash in, teleport behind flash, hide ship
    else if (t < 0.7) {
      const p = (t - 0.5) / 0.2;
      this.postProcessing.setBloomStrength(4.5);
      this.flashEl.style.opacity = p;
      this.shipGroup.visible = false;

      if (p > 0.5) {
        this._teleport();
      }
    }
    // Phase 3: 0.7–0.9 — flash holds at full white (ship still hidden)
    else if (t < 0.9) {
      this.flashEl.style.opacity = 1;
      this.postProcessing.setBloomStrength(4.5);
      this._warpGroup.visible = false;
      this.shipGroup.visible = false;
    }
    // Phase 4: 0.9–1.0 — flash fades, ship reappears
    else {
      const p = (t - 0.9) / 0.1;
      this.flashEl.style.opacity = 1 - p;
      this.postProcessing.setBloomStrength(4.5 - p * 3);
      this._warpGroup.visible = false;
      // Show ship only once flash is mostly gone
      if (p > 0.6) {
        this.shipGroup.visible = true;
      }
    }

    if (t >= 1) {
      this._finish();
      return false;
    }

    return true;
  }

  _updateWarpStars(delta, t) {
    // Position warp group at camera, oriented with camera
    this._warpGroup.position.copy(this.camera.position);
    this._warpGroup.quaternion.copy(this.camera.quaternion);

    const speed = 80 + t * 250;
    const count = this._warpStarCount;
    const dummy = new THREE.Object3D();

    // Streak length grows as warp intensifies
    const streakScale = 1.0 + t * 3.0;

    for (let i = 0; i < count; i++) {
      const s = this._warpStarData[i];
      s.z += speed * delta;

      // Recycle stars that pass behind camera
      if (s.z > 10) {
        s.z = -150 - Math.random() * 50;
        s.angle = Math.random() * Math.PI * 2;
        s.radius = 4 + Math.random() * 90;
      }

      dummy.position.set(
        Math.cos(s.angle) * s.radius,
        Math.sin(s.angle) * s.radius,
        s.z
      );
      // Rotate so elongation radiates outward, scale to stretch along the streak
      dummy.rotation.set(0, 0, s.angle + Math.PI / 2);
      dummy.scale.set(1, streakScale, 1);
      dummy.updateMatrix();
      this._warpMesh.setMatrixAt(i, dummy.matrix);
    }

    this._warpMesh.instanceMatrix.needsUpdate = true;
    this._warpMesh.material.opacity = 0.5 + t * 0.4;
  }

  _updateShipSwoop(t) {
    const mesh = this.controls.mesh;

    if (t < 0.35) {
      // Swoop phase: ship enters from top-right and curves to center-forward
      const p = t / 0.35;
      const ease = p * p * (3 - 2 * p); // smoothstep

      // Start: offset top-right, end: centered slightly ahead
      const startX = 8;
      const startY = 5;
      const startZ = 3;
      const endX = 0;
      const endY = 0;
      const endZ = -2;

      // Arc path — cubic ease with a curve
      const x = startX * (1 - ease) + endX * ease;
      const y = startY * (1 - ease) + endY * ease + Math.sin(ease * Math.PI) * 1.5; // arc up
      const z = startZ * (1 - ease) + endZ * ease;

      mesh.position.set(x, y, z);

      // Bank into the turn
      const bankAngle = (1 - ease) * -0.6; // roll left as it swoops in
      const noseDown = (1 - ease) * 0.3;
      const euler = new THREE.Euler(noseDown, 0, bankAngle);
      mesh.quaternion.setFromEuler(euler);
      // Compose with the ship's control orientation
      mesh.quaternion.premultiply(this.controls.orientation);
    } else if (t < 0.5) {
      // Settle phase: ship rockets forward (shrinks toward vanishing point)
      const p = (t - 0.35) / 0.15;
      const ease = p * p;

      const z = -2 - ease * 15; // rush forward
      mesh.position.set(0, 0, z);
      mesh.quaternion.copy(this.controls.orientation);
    }
    // After 0.5 the flash covers everything — ship position doesn't matter visually
  }

  _teleport() {
    if (this._teleported) return;
    this._teleported = true;

    // Restore mesh local transform before moving the group
    this.controls.mesh.position.copy(this._savedMeshPos);
    this.controls.mesh.quaternion.copy(this._savedMeshQuat);

    // Move ship group to target position
    this.controls.group.position.copy(this._targetPos);
    this.controls.velocity.set(0, 0, 0);

    // Face the planet
    const pp = this._targetProject.position;
    const planetPos = new THREE.Vector3(pp.x, pp.y, pp.z);
    const rotMatrix = new THREE.Matrix4().lookAt(this._targetPos, planetPos, new THREE.Vector3(0, 1, 0));
    const lookQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
    this.controls.orientation.copy(lookQuat);

    // Update camera to match new position
    const offset = this.controls.cameraOffset.clone().applyQuaternion(lookQuat);
    this.camera.position.copy(this._targetPos).add(offset);
    this.camera.lookAt(planetPos);
  }

  _finish() {
    this._active = false;
    this._teleported = false;
    this.flashEl.style.opacity = 0;
    this.postProcessing.resetBloom();
    this._warpGroup.visible = false;
    this.starfield.points.visible = true;
    this.spaceDebris.group.visible = true;
    this.shipGroup.visible = true;
    if (this.laserSystem)   this.laserSystem.group.visible   = true;
    if (this.shootingStars) this.shootingStars.group.visible = true;
    if (this.funnyDebris)   this.funnyDebris.group.visible   = true;

    // Restore mesh local transform
    this.controls.mesh.position.copy(this._savedMeshPos);
    this.controls.mesh.quaternion.copy(this._savedMeshQuat);

    for (const portal of this.portalManager.portals) {
      portal.group.visible = true;
    }
    this.controls.enabled = true;

    if (this._onComplete) {
      this._onComplete(this._targetProject);
    }
  }
}
