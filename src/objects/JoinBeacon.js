import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Off to the left of spawn so it's visible sooner from the initial spawn view
export const BEACON_POSITION = new THREE.Vector3(-70, 5, -60);

const PROMPT_RADIUS  = 30; // show hint when this close
const INTERACT_RADIUS = 12; // "fly into" the beacon

export class JoinBeacon {
  constructor(scene) {
    this._scene = scene;
    this._time  = 0;

    /** Called when ship enters prompt range — show hint bar */
    this.onEnterPrompt = null;
    /** Called when ship leaves prompt range — hide hint bar */
    this.onLeavePrompt = null;
    /** Called when ship flies directly into beacon */
    this.onInteract    = null;

    this._inPromptRange    = false;
    this._interactFired    = false;

    // ── Core geometry: rotating ring + inner glow sphere ──────────────────────
    this.group = new THREE.Group();
    this.group.position.copy(BEACON_POSITION);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 4,
      transparent: true,
      opacity: 0.85,
    });

    // Outer ring
    this._ring1 = new THREE.Mesh(new THREE.TorusGeometry(4, 0.12, 8, 40), ringMat);
    this.group.add(this._ring1);

    // Inner ring (perpendicular)
    this._ring2 = new THREE.Mesh(new THREE.TorusGeometry(4, 0.08, 8, 40), ringMat.clone());
    this._ring2.rotation.x = Math.PI / 2;
    this.group.add(this._ring2);

    // Glow sphere
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._sphere = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 12), sphereMat);
    this.group.add(this._sphere);

    // Point light
    this._light = new THREE.PointLight(0x00ffcc, 6, 120);
    this.group.add(this._light);

    // ── CSS2D label ───────────────────────────────────────────────────────────
    const div = document.createElement('div');
    div.className = 'beacon-label';
    div.innerHTML =
      '<span class="beacon-title">MULTIPLAYER GAME</span>' +
      '<span class="beacon-hint">Optional · Press E · Ignore to explore</span>';
    this._labelObj = new CSS2DObject(div);
    this._labelObj.position.set(0, 7, 0);
    this.group.add(this._labelObj);

    scene.add(this.group);
  }

  update(delta, playerPos) {
    this._time += delta;

    // ── Animate ───────────────────────────────────────────────────────────────
    const pulse = (Math.sin(this._time * 2.4) * 0.5 + 0.5);
    this._ring1.rotation.y = this._time * 0.6;
    this._ring1.rotation.z = this._time * 0.3;
    this._ring2.rotation.y = -this._time * 0.4;
    this._ring2.rotation.x = Math.PI / 2 + this._time * 0.2;

    this._sphere.material.opacity = 0.08 + pulse * 0.22;
    this._sphere.material.emissiveIntensity = 0.6 + pulse * 1.8;
    this._light.intensity = 4 + pulse * 6;

    // Scale rings slightly for breathing effect
    const s = 1 + pulse * 0.06;
    this._ring1.scale.setScalar(s);
    this._ring2.scale.setScalar(s);

    // ── Proximity checks ──────────────────────────────────────────────────────
    const dist = playerPos.distanceTo(BEACON_POSITION);

    const inPrompt = dist < PROMPT_RADIUS;
    if (inPrompt && !this._inPromptRange) {
      this._inPromptRange = true;
      if (this.onEnterPrompt) this.onEnterPrompt();
    } else if (!inPrompt && this._inPromptRange) {
      this._inPromptRange = false;
      this._interactFired = false;
      if (this.onLeavePrompt) this.onLeavePrompt();
    }

    // Fly-into trigger (one-shot until re-entered)
    if (dist < INTERACT_RADIUS && !this._interactFired) {
      this._interactFired = true;
      if (this.onInteract) this.onInteract();
    }
  }

  hide() { this.group.visible = false; }
  show() { this.group.visible = true; }

  dispose() {
    this._scene.remove(this.group);
  }
}
