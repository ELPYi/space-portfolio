import * as THREE from 'three';
import { WORLD } from '../config/world.js';

const { x, y, z, radius } = WORLD.sun;

export class Sun {
  constructor(scene) {
    this._time = 0;
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);

    // ── Core ─────────────────────────────────────────────────────────────────
    this._coreMat = new THREE.MeshStandardMaterial({
      color: 0xffdd44,
      emissive: 0xffaa00,
      emissiveIntensity: 6,
      roughness: 1,
      metalness: 0,
    });
    this._core = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 36, 28),
      this._coreMat
    );
    this.group.add(this._core);

    // ── Inner corona ──────────────────────────────────────────────────────────
    this._corona1Mat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      emissive: 0xff6600,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      depthWrite: false,
    });
    // Inner corona removed

    // ── Outer corona / haze ───────────────────────────────────────────────────
    this._corona2Mat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff3300,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.07,
      side: THREE.BackSide,
      depthWrite: false,
    });
    // Outer corona removed

    // Far halo disabled (kept null so update can safely skip)
    this._haloMat = null;

    // ── Light sources ─────────────────────────────────────────────────────────
    // Warm key light
    this._light1 = new THREE.PointLight(0xffaa44, 12, 7000);
    this.group.add(this._light1);
    // Softer fill — reaches further
    this._light2 = new THREE.PointLight(0xff7700, 5, 0); // distance=0 means unlimited
    this.group.add(this._light2);

    scene.add(this.group);
  }

  update(delta, playerPos) {
    this._time += delta;

    // Slow rotation to show surface detail
    this._core.rotation.y += delta * 0.03;
    this._core.rotation.z += delta * 0.01;

    // Breathing pulse — two overlapping sine waves for organic feel
    const pulse = Math.sin(this._time * 0.7) * 0.35
                + Math.sin(this._time * 1.9) * 0.12;

    // Distance-based proximity factor (same curve used for halo + bloom)
    let t = 1;
    if (playerPos) {
      const dist      = playerPos.distanceTo(this.group.position);
      const fadeStart = 1800;
      const fadeEnd   =  700;
      t = Math.max(0, Math.min(1, (fadeStart - dist) / (fadeStart - fadeEnd)));
    }

    // Halo disabled

    // Emissive intensities scale with proximity — bloom is proportional to these,
    // so it also fades from far away (10% minimum keeps the sun visible as a star)
    const bloomScale = 0.35 + t * 0.4; // max 0.75 — close approach stays visible
    this._coreMat.emissiveIntensity    = (6   + pulse)        * bloomScale;
    this._corona1Mat.emissiveIntensity = (2.5 + pulse * 0.6)  * bloomScale;
    this._light1.intensity = 10 + pulse * 2; // light range kept constant
  }
}
