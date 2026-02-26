import * as THREE from 'three';

export class Lighting {
  constructor(scene) {
    const ambient = new THREE.AmbientLight(0x6600aa, 0.4);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xeeeeff, 0.6);
    directional.position.set(5, 10, 7);
    scene.add(directional);
  }
}
