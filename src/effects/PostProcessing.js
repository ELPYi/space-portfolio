import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as THREE from 'three';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,   // strength
      0.4,   // radius
      0.85   // threshold
    );
    this.bloomPass = bloomPass;
    this.composer.addPass(bloomPass);

    window.addEventListener('resize', () => {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setBloomStrength(val) {
    this.bloomPass.strength = val;
  }

  resetBloom() {
    this.bloomPass.strength = 1.5;
  }

  render() {
    this.composer.render();
  }
}
