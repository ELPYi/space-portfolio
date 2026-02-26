import * as THREE from 'three';

export class ShipControls {
  constructor(camera, shipGroup, shipMesh, domElement) {
    this.camera = camera;
    this.group = shipGroup;
    this.mesh = shipMesh;
    this.domElement = domElement;

    this.velocity = new THREE.Vector3();
    this.acceleration = 0.015;
    this.boostAcceleration = 0.04;
    this.drag = 0.96;
    this.maxSpeed = 1.2;
    this.boostMaxSpeed = 3.0;
    this.boosting = false;

    this.currentRoll = 0;
    this.mouseSensitivity = 0.002;

    // Yaw accumulator — collects mouse/touch yaw between frames so update()
    // can derive a smooth rad/sec rate for sustained banking into turns
    this._pendingYawRad = 0;
    this._yawRate = 0;

    // Quaternion-based orientation — no pitch clamp, allows full loops
    this.orientation = new THREE.Quaternion();

    this.keys = {};
    this.isLocked = false;
    this.enabled = true;
    this.isMobile = false;

    // Shoot callback (set externally)
    this.onShoot = null;
    this._mouseHeld = false;

    // Touch input state
    this._touchInput = { x: 0, z: 0 };
    this._touchBoosting = false;

    // Barrel roll state
    this._barrelActive   = false;
    this._barrelAngle    = 0;
    this._barrelDir      = 1;
    this._barrelCooldown = 0;
    /** Called when a barrel roll starts: (dir) => void */
    this.onBarrelRoll = null;

    // Camera offset behind ship
    this.cameraOffset = new THREE.Vector3(0, 3, 10);
    // Camera looks above the ship so ship sits in the lower portion of the screen
    this._camLookAheadOffset = new THREE.Vector3(0, 3, -8);
    this._camTargetPos = new THREE.Vector3();
    this._camLookTarget = new THREE.Vector3();

    // Speed-based FOV
    this._baseFov = camera.fov;
    this._currentFov = camera.fov;
    this._maxFovAdd = 20; // extra degrees at max boost speed

    this.bindEvents();
  }

  bindEvents() {
    // Track which direction the next barrel roll will go
    this._lastBarrelDir = 1;

    document.addEventListener('keydown', (e) => {
      if (!this.enabled || !this.isLocked) return;
      this.keys[e.code] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Clear all keys when window loses focus so nothing gets stuck
    window.addEventListener('blur', () => {
      this.keys = {};
    });

    this._pitchAxis = new THREE.Vector3(1, 0, 0);
    this._yawAxis = new THREE.Vector3(0, 1, 0);
    this._tempQ = new THREE.Quaternion();

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked || !this.enabled) return;

      // Apply yaw around world Y axis, pitch around local X axis
      const yawAmount = -e.movementX * this.mouseSensitivity;
      const pitchAmount = -e.movementY * this.mouseSensitivity;

      this._tempQ.setFromAxisAngle(this._yawAxis, yawAmount);
      this.orientation.premultiply(this._tempQ);

      this._tempQ.setFromAxisAngle(this._pitchAxis, pitchAmount);
      this.orientation.multiply(this._tempQ);

      this.orientation.normalize();

      // Accumulate yaw so update() can derive a sustained roll rate
      this._pendingYawRad += yawAmount;
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.isLocked || !this.enabled) return;
      if (e.button === 0) {
        this._mouseHeld = true;
        if (this.onShoot) this.onShoot();
      } else if (e.button === 2) {
        // Right-click barrel roll — alternates direction each press
        if (!this._barrelActive && this._barrelCooldown <= 0) {
          this._barrelActive   = true;
          this._barrelAngle    = 0;
          this._barrelDir      = this._lastBarrelDir;
          this._lastBarrelDir  = -this._lastBarrelDir; // flip for next press
          this._barrelCooldown = 1.5;
          if (this.onBarrelRoll) this.onBarrelRoll(this._barrelDir);
        }
      }
    });

    // Prevent browser context menu on right-click
    document.addEventListener('contextmenu', (e) => {
      if (this.isLocked) e.preventDefault();
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this._mouseHeld = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      if (!this.isLocked) {
        this.keys = {};
      }
    });
  }

  lock() {
    if (this.isMobile) {
      // On mobile, no pointer lock — just mark as locked for game loop
      this.isLocked = true;
      return;
    }
    this.domElement.requestPointerLock();
  }

  setTouchInput(x, z) {
    this._touchInput.x = x;
    this._touchInput.z = z;
  }

  setTouchLook(dx, dy) {
    if (!this.isLocked || !this.enabled) return;
    const sensitivity = this.mouseSensitivity * 1.5;

    const yawAmount = -dx * sensitivity;
    const pitchAmount = -dy * sensitivity;

    this._tempQ.setFromAxisAngle(this._yawAxis, yawAmount);
    this.orientation.premultiply(this._tempQ);

    this._tempQ.setFromAxisAngle(this._pitchAxis, pitchAmount);
    this.orientation.multiply(this._tempQ);

    this.orientation.normalize();

    this._pendingYawRad += yawAmount;
  }

  setTouchBoosting(val) {
    this._touchBoosting = val;
  }

  update(delta, updateCamera = true) {
    if (!this.enabled) return;

    const quaternion = this.orientation;

    // Thrust from WASD + touch input
    const inputDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) inputDir.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inputDir.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inputDir.x += 1;

    // Merge touch joystick input
    inputDir.x += this._touchInput.x;
    inputDir.z -= this._touchInput.z;

    // Boost with Shift or touch boost
    this.boosting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this._touchBoosting);
    const accel = this.boosting ? this.boostAcceleration : this.acceleration;
    const cap = this.boosting ? this.boostMaxSpeed : this.maxSpeed;

    if (inputDir.lengthSq() > 0) {
      inputDir.normalize();
      inputDir.applyQuaternion(quaternion);
      this.velocity.add(inputDir.multiplyScalar(accel));
    }

    // Drag
    this.velocity.multiplyScalar(this.drag);

    // Clamp speed
    if (this.velocity.length() > cap) {
      this.velocity.setLength(cap);
    }

    // Apply velocity to group position
    this.group.position.add(this.velocity);

    // ── Visual roll banking ───────────────────────────────────────────────────
    // Convert accumulated yaw this frame into rad/sec, smooth it so banking
    // persists during continuous turns and fades when the mouse stops
    this._yawRate = THREE.MathUtils.lerp(
      this._yawRate,
      this._pendingYawRad / Math.max(delta, 0.008),
      0.25
    );
    this._pendingYawRad = 0;

    // Barrel roll cooldown
    if (this._barrelCooldown > 0) this._barrelCooldown -= delta;

    // Roll from turning + A/D strafing combined
    const rawStrafe = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0)
                    + this._touchInput.x;
    const yawRoll    = THREE.MathUtils.clamp( this._yawRate * 0.65, -0.42, 0.42);
    const strafeRoll = THREE.MathUtils.clamp(-rawStrafe   * 0.22, -0.22, 0.22);
    const targetRoll = THREE.MathUtils.clamp(yawRoll + strafeRoll, -0.52, 0.52);

    // Barrel roll overrides visual roll when active
    let appliedRoll;
    if (this._barrelActive) {
      this._barrelAngle += delta * (Math.PI * 2 / 0.65); // full 360° in 0.65s
      if (this._barrelAngle >= Math.PI * 2) {
        this._barrelAngle  = 0;
        this._barrelActive = false;
        this.currentRoll   = 0;
      }
      appliedRoll = this._barrelDir * this._barrelAngle;
    } else {
      this.currentRoll = THREE.MathUtils.lerp(this.currentRoll, targetRoll, 0.13);
      appliedRoll = this.currentRoll;
    }

    // Apply orientation + visual roll to mesh
    this.mesh.quaternion.copy(quaternion);
    this._tempQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), appliedRoll);
    this.mesh.quaternion.multiply(this._tempQ);

    const speed = this.velocity.length();
    if (updateCamera) {
      // Smooth camera position — cushions loops/fast rotations, still very responsive
      const offset = this.cameraOffset.clone().applyQuaternion(quaternion);
      this._camTargetPos.copy(this.group.position).add(offset);
      const posLerp = 1 - Math.exp(-12 * delta);
      this.camera.position.lerp(this._camTargetPos, posLerp);

      // Camera looks above and ahead of the ship so ship sits lower on screen
      const lookAhead = this._camLookAheadOffset.clone().applyQuaternion(quaternion);
      this._camLookTarget.copy(this.group.position).add(lookAhead);
      this.camera.lookAt(this._camLookTarget);

      // Speed-based FOV — widens at higher speeds for a sense of rush
      const speedT = Math.min(speed / this.boostMaxSpeed, 1);
      const targetFov = this._baseFov + speedT * this._maxFovAdd;
      this._currentFov = THREE.MathUtils.lerp(this._currentFov, targetFov, 0.08);
      this.camera.fov = this._currentFov;
      this.camera.updateProjectionMatrix();
    }

    // Auto-fire while mouse held
    if (this._mouseHeld && this.onShoot) {
      this.onShoot();
    }
  }

  getSpeed() {
    return this.velocity.length();
  }

  getPosition() {
    return this.group.position;
  }

  /** Bounce ship velocity off a collision normal */
  applyBounce(normal) {
    // Reflect velocity component along normal, dampen to 60%
    const dot = this.velocity.dot(normal);
    if (dot < 0) {
      this.velocity.addScaledVector(normal, -2 * dot);
      this.velocity.multiplyScalar(0.6);
    }
  }

  /** Returns current directional input for ship sway animation */
  getInput() {
    if (!this.enabled) return { x: 0, z: 0 };
    let x = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0)
           - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);
    let z = (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0)
           - (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    // Add touch input
    x += this._touchInput.x;
    z += this._touchInput.z;
    return { x: Math.max(-1, Math.min(1, x)), z: Math.max(-1, Math.min(1, z)) };
  }
}
