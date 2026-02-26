import * as THREE from 'three';

export class Spaceship {
  constructor(scene) {
    this.group = new THREE.Group();
    this.mesh = new THREE.Group();

    // --- Shared materials (white / skyblue matte) ---
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xf0f4f8,
      metalness: 0.05,
      roughness: 0.85,
      emissive: 0x87ceeb,
      emissiveIntensity: 0.08,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      metalness: 0.08,
      roughness: 0.8,
      emissive: 0x5ba3c9,
      emissiveIntensity: 0.1,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x4db8e8,
      metalness: 0.1,
      roughness: 0.75,
      emissive: 0x2a90c0,
      emissiveIntensity: 0.2,
    });

    // --- Fuselage: long tapered nose + cylindrical body ---
    // Nose cone — elongated, pointy
    const noseGeo = new THREE.ConeGeometry(0.35, 2.5, 8);
    const nose = new THREE.Mesh(noseGeo, hullMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -2.0;
    this.mesh.add(nose);

    // Mid fuselage
    const midGeo = new THREE.CylinderGeometry(0.4, 0.35, 2.0, 8);
    const mid = new THREE.Mesh(midGeo, hullMat);
    mid.rotation.x = Math.PI / 2;
    mid.position.z = -0.25;
    this.mesh.add(mid);

    // Rear fuselage — slightly wider
    const rearGeo = new THREE.CylinderGeometry(0.45, 0.4, 1.8, 8);
    const rear = new THREE.Mesh(rearGeo, darkMat);
    rear.rotation.x = Math.PI / 2;
    rear.position.z = 1.4;
    this.mesh.add(rear);

    // --- Cockpit canopy — elongated bubble ---
    const cockpitGeo = new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0xccf0ff,
      emissive: 0x55bbee,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.15,
      metalness: 0.1,
      roughness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.renderOrder = 999;
    cockpit.scale.set(1, 1, 2.5);
    cockpit.position.set(0, 0.18, -1.05);
    this.mesh.add(cockpit);

    // --- Pilot character on a plane mesh (rotates with ship) ---
    const pilotTexture = new THREE.TextureLoader().load('/pilot.png');
    pilotTexture.colorSpace = THREE.SRGBColorSpace;
    const pilotGeo = new THREE.PlaneGeometry(0.4, 0.4);
    const pilotMat = new THREE.MeshBasicMaterial({
      map: pilotTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const pilot = new THREE.Mesh(pilotGeo, pilotMat);
    pilot.renderOrder = 998;
    pilot.position.set(0, 0.55, -0.9);
    this.mesh.add(pilot);

    // --- Main swept wings (delta shape) ---
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

    // --- Horizontal stabilizers (small rear wings) ---
    const stabShape = new THREE.Shape();
    stabShape.moveTo(0, 0);
    stabShape.lineTo(1.0, -0.4);
    stabShape.lineTo(0.8, -0.1);
    stabShape.lineTo(0, 0.15);
    stabShape.closePath();

    const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.03, bevelEnabled: false });

    const rightStab = new THREE.Mesh(stabGeo, darkMat);
    rightStab.rotation.x = -Math.PI / 2;
    rightStab.position.set(0.1, 0, 2.0);
    this.mesh.add(rightStab);

    const leftStab = new THREE.Mesh(stabGeo, darkMat);
    leftStab.rotation.x = -Math.PI / 2;
    leftStab.scale.x = -1;
    leftStab.position.set(-0.1, 0, 2.0);
    this.mesh.add(leftStab);

    // --- Vertical tail fin ---
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 1.0);
    finShape.lineTo(0.5, 0.3);
    finShape.lineTo(0.4, 0);
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.04, bevelEnabled: false });
    const fin = new THREE.Mesh(finGeo, accentMat);
    fin.rotation.x = Math.PI / 2;
    fin.position.set(-0.02, 0.15, 1.5);
    this.mesh.add(fin);

    // --- Wing tip nav lights ---
    const tipGeo = new THREE.BoxGeometry(0.06, 0.04, 0.3);
    const tipGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00ddff,
      emissive: 0x00ddff,
      emissiveIntensity: 2,
    });

    const rightTip = new THREE.Mesh(tipGeo, tipGlowMat);
    rightTip.position.set(2.4, -0.1, 0.1);
    this.mesh.add(rightTip);

    const leftTip = new THREE.Mesh(tipGeo, tipGlowMat);
    leftTip.position.set(-2.4, -0.1, 0.1);
    this.mesh.add(leftTip);

    // --- Air intakes (under-wing scoops) ---
    const intakeGeo = new THREE.BoxGeometry(0.2, 0.12, 0.8);
    const rightIntake = new THREE.Mesh(intakeGeo, darkMat);
    rightIntake.position.set(0.55, -0.2, 0.6);
    this.mesh.add(rightIntake);

    const leftIntake = new THREE.Mesh(intakeGeo, darkMat);
    leftIntake.position.set(-0.55, -0.2, 0.6);
    this.mesh.add(leftIntake);

    // --- Engine nozzles ---
    const nozzleGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.4, 10);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0xc0dce8,
      metalness: 0.1,
      roughness: 0.7,
    });

    const nozzleL = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzleL.rotation.x = Math.PI / 2;
    nozzleL.position.set(-0.3, -0.05, 2.35);
    this.mesh.add(nozzleL);

    const nozzleR = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzleR.rotation.x = Math.PI / 2;
    nozzleR.position.set(0.3, -0.05, 2.35);
    this.mesh.add(nozzleR);

    // --- Thruster glow discs ---
    const glowGeo = new THREE.CircleGeometry(0.13, 10);
    this.thrusterMatL = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x00ccff,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 1,
    });
    this.thrusterMatR = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x00ccff,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 1,
    });

    const glowL = new THREE.Mesh(glowGeo, this.thrusterMatL);
    glowL.position.set(-0.3, -0.05, 2.56);
    this.mesh.add(glowL);

    const glowR = new THREE.Mesh(glowGeo, this.thrusterMatR);
    glowR.position.set(0.3, -0.05, 2.56);
    this.mesh.add(glowR);

    // Thruster point lights
    this.thrusterLightL = new THREE.PointLight(0x00ccff, 1, 5);
    this.thrusterLightL.position.set(-0.3, -0.05, 2.7);
    this.mesh.add(this.thrusterLightL);

    this.thrusterLightR = new THREE.PointLight(0x00ccff, 1, 5);
    this.thrusterLightR.position.set(0.3, -0.05, 2.7);
    this.mesh.add(this.thrusterLightR);

    // ── Gatling gun barrel mount (spins on z-axis when firing) ───────────────
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x888899, metalness: 0.9, roughness: 0.2,
    });
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x445566, metalness: 0.85, roughness: 0.3,
    });

    this.gatlingBarrels = new THREE.Group();
    this.gatlingBarrels.position.set(0, -0.15, -2.1);

    // Central housing sleeve
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.48, 8), housingMat);
    housing.rotation.x = Math.PI / 2;
    this.gatlingBarrels.add(housing);

    // 4 barrel tubes arranged in a + cross
    const barrelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.52, 6);
    for (const [bx, by] of [[0.065, 0], [-0.065, 0], [0, 0.065], [0, -0.065]]) {
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(bx, by, 0);
      this.gatlingBarrels.add(barrel);
    }

    // Muzzle flash point — tiny emissive disc that lights up when firing
    this._muzzleFlashMat = new THREE.MeshBasicMaterial({
      color: 0xff2200, transparent: true, opacity: 0,
    });
    const muzzle = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), this._muzzleFlashMat);
    muzzle.position.set(0, 0, -0.28);
    this.gatlingBarrels.add(muzzle);

    this.mesh.add(this.gatlingBarrels);

    this.group.add(this.mesh);
    this.time = 0;

    // Default thruster color (cyan)
    this._defaultColor = new THREE.Color(0x00ccff);
    this._boostColorYellow = new THREE.Color(0xffcc00);
    this._boostColorRed = new THREE.Color(0xff2200);
    this._currentColor = new THREE.Color(0x00ccff);

    // Sway smoothing
    this._swayRoll = 0;   // bank on A/D
    this._swayPitch = 0;  // nose tilt on W/S
    this._idleOffset = new THREE.Vector3();
    this._swayQ = new THREE.Quaternion();

    scene.add(this.group);
  }

  /**
   * Drive the gatling barrel spin and muzzle flash.
   * @param {number} spinAngle - accumulated angle from LaserSystem (radians)
   * @param {boolean} firing   - true this frame if a shot was fired
   */
  setGatlingState(spinAngle, firing) {
    this.gatlingBarrels.rotation.z = spinAngle;
    if (firing) {
      this._muzzleFlashMat.opacity = 0.9;
    } else {
      this._muzzleFlashMat.opacity *= 0.55; // quick fade
    }
  }

  update(delta, speed, boosting, input) {
    this.time += delta;

    // --- Idle animation: gentle hover bob ---
    const bobY = Math.sin(this.time * 1.2) * 0.04;
    const bobX = Math.sin(this.time * 0.7) * 0.02;
    const idleRoll = Math.sin(this.time * 0.9) * 0.015;
    this._idleOffset.set(bobX, bobY, 0);
    this.mesh.position.copy(this._idleOffset);

    // --- WASD sway: pitch based on forward/back thrust ---
    // Roll is handled entirely by ShipControls (yaw rate + strafe), so only pitch here.
    const targetPitch = input.z * 0.14;   // nose dips forward on W, lifts on S
    this._swayRoll  = THREE.MathUtils.lerp(this._swayRoll,  0,           0.08);
    this._swayPitch = THREE.MathUtils.lerp(this._swayPitch, targetPitch, 0.10);

    // Apply sway on top of the control quaternion (mesh.quaternion is set by ShipControls)
    const euler = new THREE.Euler(this._swayPitch, 0, this._swayRoll + idleRoll);
    this._swayQ.setFromEuler(euler);
    this.mesh.quaternion.multiply(this._swayQ);

    // --- Thruster visuals ---
    const basePulse = Math.sin(this.time * 8) * 0.5 + 0.5;
    const speedFactor = Math.min(speed / 0.5, 1);
    const intensity = 1.5 + basePulse * 1.5 + speedFactor * 4;
    const lightPower = 0.3 + basePulse * 0.5 + speedFactor * 2;

    // Thruster color: cyan → yellow → red based on boost speed
    let targetColor;
    if (boosting) {
      const boostT = Math.min(Math.max((speed - 1.2) / (3.0 - 1.2), 0), 1);
      targetColor = this._boostColorYellow.clone().lerp(this._boostColorRed, boostT);
    } else {
      targetColor = this._defaultColor;
    }
    this._currentColor.lerp(targetColor, 0.1);

    this.thrusterMatL.color.copy(this._currentColor);
    this.thrusterMatL.emissive.copy(this._currentColor);
    this.thrusterMatR.color.copy(this._currentColor);
    this.thrusterMatR.emissive.copy(this._currentColor);
    this.thrusterLightL.color.copy(this._currentColor);
    this.thrusterLightR.color.copy(this._currentColor);

    this.thrusterMatL.emissiveIntensity = intensity + (boosting ? 3 : 0);
    this.thrusterMatR.emissiveIntensity = intensity + (boosting ? 3 : 0);
    this.thrusterLightL.intensity = lightPower + (boosting ? 1.5 : 0);
    this.thrusterLightR.intensity = lightPower + (boosting ? 1.5 : 0);
  }
}
