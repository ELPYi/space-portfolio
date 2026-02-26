import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * RemotePlayer — renders another player's ship in the world.
 * Uses the same geometry as the local Spaceship but with a color tint.
 * Smoothly interpolates toward received network positions.
 */
export class RemotePlayer {
  constructor(scene, { id, callsign, color, x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1 }) {
    this.id = id;
    this.callsign = callsign;
    this._scene = scene;

    this.group = new THREE.Group();
    this.mesh  = new THREE.Group();

    const tint     = new THREE.Color(color);
    const hullCol  = new THREE.Color(0xf0f4f8).lerp(tint, 0.25);
    const darkCol  = new THREE.Color(0x87ceeb).lerp(tint, 0.2);

    const hullMat = new THREE.MeshStandardMaterial({
      color: hullCol,
      metalness: 0.05,
      roughness: 0.85,
      emissive: tint,
      emissiveIntensity: 0.12,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: darkCol,
      metalness: 0.08,
      roughness: 0.8,
      emissive: tint,
      emissiveIntensity: 0.08,
    });

    // ── Fuselage ──────────────────────────────────────────────────────────────
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.5, 8), hullMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -2.0;
    this.mesh.add(nose);

    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 2.0, 8), hullMat);
    mid.rotation.x = Math.PI / 2;
    mid.position.z = -0.25;
    this.mesh.add(mid);

    const rear = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 1.8, 8), darkMat);
    rear.rotation.x = Math.PI / 2;
    rear.position.z = 1.4;
    this.mesh.add(rear);

    // ── Wings ─────────────────────────────────────────────────────────────────
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.8, -1.2);
    wingShape.lineTo(2.4, -0.6);
    wingShape.lineTo(1.6, -0.1);
    wingShape.lineTo(0, 0.5);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.04, bevelEnabled: false });

    const rightWing = new THREE.Mesh(wingGeo, hullMat);
    rightWing.rotation.x = -Math.PI / 2;
    rightWing.position.set(0.15, -0.08, 0.2);
    this.mesh.add(rightWing);

    const leftWing = new THREE.Mesh(wingGeo, hullMat);
    leftWing.rotation.x = -Math.PI / 2;
    leftWing.scale.x = -1;
    leftWing.position.set(-0.15, -0.08, 0.2);
    this.mesh.add(leftWing);

    // ── Thruster glow (tinted) ────────────────────────────────────────────────
    const glowMat = new THREE.MeshStandardMaterial({
      color: tint,
      emissive: tint,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.9,
    });
    const glowGeo = new THREE.CircleGeometry(0.13, 10);

    const glowL = new THREE.Mesh(glowGeo, glowMat);
    glowL.position.set(-0.3, -0.05, 2.56);
    this.mesh.add(glowL);

    const glowR = new THREE.Mesh(glowGeo, glowMat);
    glowR.position.set(0.3, -0.05, 2.56);
    this.mesh.add(glowR);

    // Thruster point light
    const light = new THREE.PointLight(tint, 1, 6);
    light.position.set(0, 0, 2.7);
    this.mesh.add(light);

    // ── Callsign CSS2D label ──────────────────────────────────────────────────
    const div = document.createElement('div');
    div.className = 'remote-player-label';
    div.textContent = callsign;
    div.style.color = '#' + tint.getHexString();
    div.style.textShadow = `0 0 8px #${tint.getHexString()}`;

    this._labelObj = new CSS2DObject(div);
    this._labelObj.position.set(0, 2.2, 0);
    this.group.add(this._labelObj);

    // ── Assemble ──────────────────────────────────────────────────────────────
    this.group.add(this.mesh);
    this.group.position.set(x, y, z);
    this.mesh.quaternion.set(qx, qy, qz, qw);

    this._targetPos  = new THREE.Vector3(x, y, z);
    this._targetQuat = new THREE.Quaternion(qx, qy, qz, qw);

    scene.add(this.group);
  }

  /** Called when a pos update arrives from the server. */
  updateTransform(x, y, z, qx, qy, qz, qw) {
    this._targetPos.set(x, y, z);
    this._targetQuat.set(qx, qy, qz, qw);
  }

  /** Smooth interpolation toward server position — call every frame. */
  update(delta) {
    const alpha = Math.min(delta * 15, 1);
    this.group.position.lerp(this._targetPos, alpha);
    this.mesh.quaternion.slerp(this._targetQuat, alpha);
  }

  /** Remove from scene and free GPU resources. */
  dispose() {
    this._scene.remove(this.group);
    this.mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    const el = this._labelObj.element;
    if (el.parentNode) el.parentNode.removeChild(el);
  }
}
