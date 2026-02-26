import * as THREE from 'three';

export class Starfield {
  constructor(scene) {
    const count = 4500;
    const range = 800;
    this.range = range;
    this._fadeDuration = 0.9;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const fades = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * range * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * range * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * range * 2;
      fades[i] = 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('fade', new THREE.BufferAttribute(fades, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffffff) },
        uOpacity: { value: 0.85 },
        uSize: { value: 0.9 },
      },
      transparent: true,
      depthWrite: false,
      vertexShader: `
        uniform float uSize;
        attribute float fade;
        varying float vFade;
        void main() {
          vFade = fade;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vFade;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float falloff = smoothstep(0.5, 0.0, d);
          float alpha = vFade * uOpacity * falloff;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update(delta, cameraPosition) {
    // Wrap stars around camera for infinite parallax
    const positions = this.points.geometry.attributes.position.array;
    const fades = this.points.geometry.attributes.fade.array;
    const r = this.range;
    const fadeSpeed = this._fadeDuration > 0 ? (1 / this._fadeDuration) : 1;

    for (let i = 0; i < positions.length; i += 3) {
      const idx = i / 3;
      for (let axis = 0; axis < 3; axis++) {
        const camAxis = axis === 0 ? cameraPosition.x : axis === 1 ? cameraPosition.y : cameraPosition.z;
        const diff = positions[i + axis] - camAxis;
        if (diff > r) {
          positions[i + axis] -= r * 2;
          fades[idx] = 0;
        } else if (diff < -r) {
          positions[i + axis] += r * 2;
          fades[idx] = 0;
        }
      }
      if (fades[idx] < 1) {
        fades[idx] = Math.min(1, fades[idx] + delta * fadeSpeed);
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.fade.needsUpdate = true;
  }
}
