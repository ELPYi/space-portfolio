import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class Portal {
  constructor(project) {
    this.project = project;
    this.group = new THREE.Group();
    const s = project.scale || 1.0;
    this.scale = s;

    const accentColor = new THREE.Color(project.accentColor);

    // --- Procedural planet surface with variation ---
    const planetGeo = new THREE.SphereGeometry(15 * s, 64, 64);

    const count = planetGeo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const baseCol = new THREE.Color(project.planetColor);
    const temp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      temp.copy(baseCol);
      const variation = 0.8 + Math.random() * 0.4;
      temp.r *= variation;
      temp.g *= variation;
      temp.b *= variation;
      colors[i * 3] = temp.r;
      colors[i * 3 + 1] = temp.g;
      colors[i * 3 + 2] = temp.b;
    }
    planetGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const planetMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
      emissive: project.planetColor,
      emissiveIntensity: 0.08,
    });
    this.planet = new THREE.Mesh(planetGeo, planetMat);
    this.group.add(this.planet);

    // --- Atmosphere glow ---
    const atmosGeo = new THREE.SphereGeometry(17.4 * s, 64, 64);
    const atmosMat = new THREE.MeshStandardMaterial({
      color: project.atmosColor,
      emissive: project.atmosColor,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    });
    this.atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    this.group.add(this.atmosphere);

    // --- Flat planetary ring (only some planets) ---
    this.ring = null;
    if (project.hasRing) {
      // RingGeometry(innerRadius, outerRadius, segments)
      const ringGeo = new THREE.RingGeometry(19.5 * s, 30 * s, 80);
      // Tint ring a lighter/desaturated version of the planet color
      const ringColor = new THREE.Color(project.planetColor).lerp(new THREE.Color(0xcccccc), 0.4);
      const ringMat = new THREE.MeshStandardMaterial({
        color: ringColor,
        emissive: ringColor,
        emissiveIntensity: 0.15,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        roughness: 0.6,
        metalness: 0.1,
      });
      this.ring = new THREE.Mesh(ringGeo, ringMat);
      this.ring.rotation.x = Math.PI / 2.2;
      this.group.add(this.ring);
    }

    // Point light — soft, atmosphere-tinted
    const light = new THREE.PointLight(project.atmosColor, 2, 150 * s);
    this.group.add(light);

    // CSS2D label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'portal-label';
    labelDiv.textContent = project.name;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 22 * s, 0);
    this.group.add(label);
    this._labelDiv = labelDiv;

    // Position
    this.group.position.set(project.position.x, project.position.y, project.position.z);

    this.time = Math.random() * Math.PI * 2;
  }

  update(delta, distanceToShip) {
    this.time += delta;

    // Slow planet rotation
    this.planet.rotation.y += delta * 0.1;

    // Proximity — atmosphere glows brighter when closer
    let atmosIntensity = 1.2;
    let atmosOpacity = 0.1;
    if (distanceToShip < 120) {
      const proximity = 1 - (distanceToShip / 120);
      atmosIntensity = THREE.MathUtils.lerp(1.2, 2.8, proximity);
      atmosOpacity = THREE.MathUtils.lerp(0.1, 0.22, proximity);
    }

    // Subtle idle pulse
    const pulse = Math.sin(this.time * 1.5) * 0.1;
    atmosIntensity += pulse;

    this.atmosphere.material.emissiveIntensity = atmosIntensity;
    this.atmosphere.material.opacity = atmosOpacity;

  }
}
