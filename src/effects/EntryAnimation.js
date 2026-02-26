import * as THREE from 'three';

export class EntryAnimation {
  constructor(camera, controls, postProcessing, flashEl) {
    this.camera = camera;
    this.controls = controls;
    this.postProcessing = postProcessing;
    this.flashEl = flashEl;

    this._active = false;
    this._elapsed = 0;
    this._duration = 2.0;
    this._portal = null;
    this._onComplete = null;
    this._startCamPos = new THREE.Vector3();
    this._targetPos = new THREE.Vector3();
    this._urlOpened = false;
  }

  get isActive() {
    return this._active;
  }

  /**
   * @param {Object} portal - The portal object (has .group.position)
   * @param {Function} onComplete - Called when animation finishes (receives url)
   * @param {string} url - URL to open
   */
  start(portal, url, onComplete) {
    this._active = true;
    this._elapsed = 0;
    this._portal = portal;
    this._url = url;
    this._onComplete = onComplete;
    this._urlOpened = false;
    this._startCamPos.copy(this.camera.position);
    this._targetPos.copy(portal.group.position);
    this.controls.enabled = false;
  }

  /** @returns {boolean} true if animation is still active */
  update(delta) {
    if (!this._active) return false;

    this._elapsed += delta;
    const t = Math.min(this._elapsed / this._duration, 1);

    // Phase 1: 0–0.4 normalized (0–0.8s) — camera lerps toward planet, bloom ramps
    if (t < 0.4) {
      const p = t / 0.4; // 0→1 within phase
      this.camera.position.lerpVectors(this._startCamPos, this._targetPos, p * 0.7);
      this.camera.lookAt(this._targetPos);
      this.postProcessing.setBloomStrength(1.5 + p * 3.5);
    }
    // Phase 2: 0.4–0.8 normalized (0.8–1.6s) — white flash fades in
    else if (t < 0.8) {
      const p = (t - 0.4) / 0.4;
      this.camera.position.lerpVectors(this._startCamPos, this._targetPos, 0.7 + p * 0.25);
      this.camera.lookAt(this._targetPos);
      this.postProcessing.setBloomStrength(5);
      this.flashEl.style.opacity = p;
    }
    // Phase 3: 0.8–1.0 normalized (1.6–2.0s) — open URL, white fades out
    else {
      if (!this._urlOpened) {
        this._urlOpened = true;
        if (this._url) {
          window.open(this._url, '_blank');
        }
      }
      const p = (t - 0.8) / 0.2;
      this.flashEl.style.opacity = 1 - p;
    }

    // Animation done
    if (t >= 1) {
      this._active = false;
      this.flashEl.style.opacity = 0;
      this.postProcessing.resetBloom();
      this.controls.enabled = true;
      if (this._onComplete) this._onComplete();
      return false;
    }

    return true;
  }
}
