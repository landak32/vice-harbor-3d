// The air unit: a low-poly helicopter that orbits the player from three stars up, its rotor
// turning, its spotlight sweeping the ground and a searchlight beam picking the player out.
import * as THREE from '../../vendor/three.module.min.js';

export class Helicopter {
  constructor(scene, mats) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 4.6), new THREE.MeshLambertMaterial({ color: 0x3b4652 }));
    this.group.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.2, 1.3), new THREE.MeshLambertMaterial({ color: 0x4a5764 }));
    nose.position.set(0, -0.1, -2.7);
    this.group.add(nose);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.3), new THREE.MeshLambertMaterial({ color: 0x18242e }));
    glass.position.set(0, 0.15, -3.2);
    this.group.add(glass);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.6), new THREE.MeshLambertMaterial({ color: 0x3b4652 }));
    boom.position.set(0, 0.2, 3.9);
    this.group.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.7), new THREE.MeshLambertMaterial({ color: 0x4a5764 }));
    fin.position.set(0, 0.7, 5.6);
    this.group.add(fin);
    this.rotor = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.06, 0.42), new THREE.MeshLambertMaterial({ color: 0x14181d }));
    this.rotor.position.set(0, 1.15, 0);
    this.group.add(this.rotor);
    this.tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.9, 0.24), new THREE.MeshLambertMaterial({ color: 0x14181d }));
    this.tailRotor.position.set(0.18, 0.7, 5.6);
    this.group.add(this.tailRotor);
    for (const sx of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.2), new THREE.MeshLambertMaterial({ color: 0x3a424c }));
      skid.position.set(sx * 0.95, -1.15, 0);
      this.group.add(skid);
    }
    // Navigation lights: red to port, green to starboard, plus a white strobe on the tail. They
    // are what actually makes the aircraft readable against a night sky at distance.
    const navMat = (hex) => new THREE.MeshBasicMaterial({ color: hex, fog: false });
    this.navL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), navMat(0xff2b2b));
    this.navL.position.set(-1.35, 0.1, 0.4);
    this.group.add(this.navL);
    this.navR = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), navMat(0x2bff6a));
    this.navR.position.set(1.35, 0.1, 0.4);
    this.group.add(this.navR);
    this.strobe = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), navMat(0xffffff));
    this.strobe.position.set(0, 1.5, 5.4);
    this.group.add(this.strobe);
    // a soft halo sprite so the airframe reads as lit even in a dark frame
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: mats.glowTex, color: 0xbcd4f0, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.34 }));
    this.halo.scale.set(11, 11, 1);
    this.group.add(this.halo);
    // searchlight cone from the belly to the ground
    const coneGeo = new THREE.ConeGeometry(7, 42, 12, 1, true);
    this.beam = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xdfefff, transparent: true, opacity: 0.055,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true }));
    this.beam.position.y = -21;
    this.group.add(this.beam);
    this.spot = new THREE.Sprite(new THREE.SpriteMaterial({ map: mats.glowTex, color: 0xdff0ff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
    this.spot.scale.set(16, 16, 1);
    scene.add(this.spot);
    this.spot.visible = false;
    this.light = new THREE.PointLight(0xcfe4ff, 0, 60);
    this.group.add(this.light);
    this.angle = 0;
    this.active = false;
    this.pos = new THREE.Vector3();
    scene.add(this.group);
  }

  setActive(on) {
    this.active = on;
    this.group.visible = on;
    this.spot.visible = on;
    this.light.intensity = on ? 1.6 : 0;
  }

  update(dt, target, orbitR = 46, height = 44) {
    if (!this.active) return;
    // A staged screenshot parks the air unit where the camera can see it; holding keeps the
    // orbit from lifting it back out of frame before the shot is taken.
    if (this.hold) {
      this.rotor.rotation.y += dt * 26;
      this.tailRotor.rotation.x += dt * 40;
      this.strobe.visible = (performance.now() % 900) < 110;
      this.group.rotation.y = Math.atan2(-(target.x - this.group.position.x), -(target.z - this.group.position.z));
      return;
    }
    this.angle += dt * 0.22;
    const tx = target.x + Math.cos(this.angle) * orbitR;
    const tz = target.z + Math.sin(this.angle) * orbitR;
    this.group.position.x += (tx - this.group.position.x) * Math.min(1, dt * 1.4);
    this.group.position.z += (tz - this.group.position.z) * Math.min(1, dt * 1.4);
    this.group.position.y += (height - this.group.position.y) * Math.min(1, dt * 1.2);
    const dx = target.x - this.group.position.x, dz = target.z - this.group.position.z;
    this.group.rotation.y = Math.atan2(-dx, -dz);
    this.group.rotation.z = Math.sin(this.angle) * 0.08;
    this.rotor.rotation.y += dt * 26;
    this.tailRotor.rotation.x += dt * 40;
    this.strobe.visible = (performance.now() % 900) < 110;
    this.beam.position.y = -21;
    this.spot.position.set(target.x, 0.15, target.z);
    this.spot.material.opacity = 0.35 + Math.sin(performance.now() * 0.006) * 0.08;
    this.light.position.set(0, -2, 0);
  }
}
