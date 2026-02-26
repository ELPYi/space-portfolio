import * as THREE from 'three';

export class IntroAnimation {
  /**
   * Two-phase cinematic intro:
   *   Phase 0 — ship flies in from behind (from +Z) toward origin, camera watches cinematically
   *   Phase 1 — camera sweeps around the ship, then settles behind it
   *
   * @param {THREE.Camera}   camera
   * @param {THREE.Group}    shipGroup      - world-space position group
   * @param {THREE.Group}    shipMesh       - visual mesh group (for orientation)
   * @param {THREE.Vector3}  restOffset     - normal camera offset behind ship (e.g. 0,3,10)
   * @param {THREE.Vector3}  lookAheadOffset- controls' look-ahead offset (e.g. 0,3,-8)
   *                                          used to match the look target when controls take over
   */
  constructor(camera, shipGroup, shipMesh, restOffset, lookAheadOffset) {
    this.camera    = camera;
    this.shipGroup = shipGroup;
    this.shipMesh  = shipMesh;
    this.restOffset = restOffset.clone();

    // Match controls' look-ahead so the hand-off look direction is seamless
    this._lookAheadOffset = lookAheadOffset
      ? lookAheadOffset.clone()
      : new THREE.Vector3(0, 3, -8);

    this._active  = false;
    this._elapsed = 0;
    this._onComplete = null;
    this._allowControlAt = 0.55; // allow player control midway through intro
    this._controlEnabled = false;

    // ── Phase 0: fly-in ──────────────────────────────────────────────────────
    this._flyInDuration = 2.5; // seconds

    // Ship comes from +Z (behind the normal camera position) → nose faces -Z = natural forward
    this._shipFlyInStart = new THREE.Vector3(0, 8, 200);
    this._shipFlyInEnd   = new THREE.Vector3(0, 0,   0);

    // Cinematic camera: off to the side and ahead, watching the ship fly in
    // Drifts to p0 by end of fly-in so the sweep starts seamlessly
    this._camFlyInStart = new THREE.Vector3(50, 22, 60);

    // ── Phase 1: camera sweep ────────────────────────────────────────────────
    this._sweepDuration = 3.5; // seconds

    // Keyframe offsets relative to ship at origin
    this._p0 = new THREE.Vector3(15,  8, -12); // front-right, above  (sweep start)
    this._p1 = new THREE.Vector3(-10, 6,  -5); // left side
    this._p2 = new THREE.Vector3(-6,  4,   8); // behind-left
    this._p3 = this.restOffset.clone();         // rest position behind ship (sweep end)
  }

  get isActive() { return this._active; }
  get allowControl() { return this._controlEnabled; }

  start(onComplete) {
    this._active     = true;
    this._elapsed    = 0;
    this._onComplete = onComplete;
    this._controlEnabled = false;

    // Move ship to fly-in start — behind the normal camera space
    this.shipGroup.position.copy(this._shipFlyInStart);

    // Default orientation: nose faces -Z, which IS the direction of travel (toward origin)
    // No rotation needed — just clear any accumulated transform
    this.shipMesh.quaternion.identity();
    this.shipMesh.position.set(0, 0, 0);

    // Open the cinematic camera wide, tracking the ship
    this.camera.position.copy(this._camFlyInStart);
    this.camera.lookAt(this.shipGroup.position);
  }

  // ── Smooth easing: ease-in-out cubic ────────────────────────────────────────
  _ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ── Catmull-Rom spline through 4 points ─────────────────────────────────────
  _catmullRom(t, p0, p1, p2, p3) {
    const out = new THREE.Vector3();
    const t2 = t * t, t3 = t2 * t;
    out.x = 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
    out.y = 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
    out.z = 0.5 * ((2*p1.z) + (-p0.z+p2.z)*t + (2*p0.z-5*p1.z+4*p2.z-p3.z)*t2 + (-p0.z+3*p1.z-3*p2.z+p3.z)*t3);
    return out;
  }

  update(delta) {
    if (!this._active) return false;

    this._elapsed += delta;
    const total   = this._flyInDuration + this._sweepDuration;
    const rawT    = Math.min(this._elapsed / total, 1);
    const flyFrac = this._flyInDuration / total;

    if (rawT < flyFrac) {
      // ── Phase 0: Ship fly-in ───────────────────────────────────────────────
      const segT  = rawT / flyFrac; // 0 → 1
      const easeT = this._ease(segT);

      // Ship flies straight from +Z toward origin; gentle X-arc for visual interest
      const arcX = Math.sin(segT * Math.PI) * 5; // swings slightly left then back
      this.shipGroup.position.lerpVectors(this._shipFlyInStart, this._shipFlyInEnd, easeT);
      this.shipGroup.position.x -= arcX; // arc to the left (negative X)

      // Subtle banking into the arc — ship rolls slightly left as it curves
      const bank  = -Math.sin(segT * Math.PI) * 0.18; // gentle left roll
      const pitch =  (1 - easeT) * 0.06;              // very slight nose-up at start
      this.shipMesh.quaternion.setFromEuler(new THREE.Euler(pitch, 0, bank));

      // Camera drifts from cinematic spot → p0 (sweep start), always looking at ship
      this.camera.position.lerpVectors(this._camFlyInStart, this._p0, easeT);
      this.camera.lookAt(this.shipGroup.position);

    } else {
      // ── Phase 1: Camera sweep ──────────────────────────────────────────────
      // Ensure ship is exactly at origin, mesh cleared for idle animation
      this.shipGroup.position.copy(this._shipFlyInEnd);
      this.shipMesh.quaternion.identity();

      const sweepRaw = (rawT - flyFrac) / (1 - flyFrac); // 0 → 1
      const sweepT   = this._ease(sweepRaw);

      const shipPos = this.shipGroup.position;

      // Camera sweeps around ship via Catmull-Rom spline
      let camOffset;
      if (sweepT < 0.5) {
        const s = sweepT / 0.5;
        camOffset = this._catmullRom(s, this._p0, this._p0, this._p1, this._p2);
      } else {
        const s = (sweepT - 0.5) / 0.5;
        camOffset = this._catmullRom(s, this._p1, this._p2, this._p3, this._p3);
      }

      this.camera.position.copy(shipPos).add(camOffset);

      // Smoothly blend the look target from shipPos → shipPos+lookAheadOffset
      // over the final 30% of the sweep so controls can take over without any snap
      const lookBlend = THREE.MathUtils.smoothstep(sweepT, 0.70, 1.0);
      const lookTarget = new THREE.Vector3().lerpVectors(
        shipPos,
        shipPos.clone().add(this._lookAheadOffset),
        lookBlend
      );
      this.camera.lookAt(lookTarget);
    }

    if (!this._controlEnabled && rawT >= this._allowControlAt) {
      this._controlEnabled = true;
    }

    if (rawT >= 1) {
      this._active = false;
      if (this._onComplete) this._onComplete();
      return false;
    }

    return true;
  }
}
