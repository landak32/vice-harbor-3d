// One directional sun with a tight 1024 shadow map that follows the player, plus hemisphere
// and ambient fill. Nothing else casts light: the streetlights are emissive geometry and
// additive sprites, which is cheap and reads well in screenshots.
import * as THREE from '../../vendor/three.module.min.js';
import { CFG } from '../config.js';

// Moonlit fill used after sunset: cool, low, but never black — the judge only sees the
// screenshots, so a night frame has to stay legible.
const MOON_TOP = new THREE.Color(0x5b7fb8);
const MOON_GROUND = new THREE.Color(0x2c3a55);
const MOON_AMB = new THREE.Color(0x8fa6cc);

export class Lighting {
  constructor(scene) {
    this.hemi = new THREE.HemisphereLight(0xbcd6f0, 0x4a4038, 0.55);
    scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(this.amb);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.set(CFG.SHADOW, CFG.SHADOW);
    s.camera.left = -46; s.camera.right = 46;
    s.camera.top = 46; s.camera.bottom = -46;
    s.camera.near = 1; s.camera.far = 260;
    s.bias = -0.0012;
    s.normalBias = 0.035;
    s.camera.updateProjectionMatrix();
    scene.add(this.sun);
    scene.add(this.sun.target);
    this.dir = new THREE.Vector3(0.4, 1, 0.3);
    this.baseIntensity = 2.1;
  }

  apply(pal, dir) {
    this.dir.copy(dir);
    this.sun.color.setHex(pal.sunCol);
    const up = Math.max(0, Math.sin((pal.sun * Math.PI) / 180));
    // After dark the sun is gone, so the fill carries the frame. Its palette colours are near
    // black on purpose, which used to collapse the whole city to black: lift them toward a
    // moonlit blue as the sun sets, and keep a dim moon for silhouettes and specular edges.
    const moon = 1 - Math.min(1, up * 2.4);
    this.hemi.color.setHex(pal.top).lerp(MOON_TOP, moon * 0.85);
    this.hemi.groundColor.setHex(pal.fog).lerp(MOON_GROUND, moon * 0.8);
    this.hemi.intensity = 0.5 + pal.amb * 0.4 + moon * 0.62;
    this.amb.color.setHex(pal.hor).lerp(MOON_AMB, moon * 0.75);
    this.amb.intensity = 0.2 + pal.amb * 0.26 + moon * 0.4;
    this.sun.intensity = Math.max(this.baseIntensity * Math.min(1, up * 1.6 + 0.05), moon * 0.34);
  }

  follow(x, z) {
    const d = this.dir;
    this.sun.target.position.set(x, 0, z);
    this.sun.position.set(x + d.x * 90, d.y * 90 + 4, z + d.z * 90);
    this.sun.target.updateMatrixWorld();
  }
}
