// Gradient sky dome with a sun, a moon, stars and the fog. The whole palette of the game
// is driven from here: pass an hour, and the dome, the fog, the windows and the streetlights
// all move together.
import * as THREE from '../../vendor/three.module.min.js';
import { TIMES } from '../config.js';
import { starField } from './textures.js';
import { lerp, mixHex, clamp } from '../core/math.js';

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const SKY_FRAG = `
uniform vec3 topColor;
uniform vec3 horizonColor;
uniform vec3 sunColor;
uniform vec3 sunDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y * 1.15 + 0.06, 0.0, 1.0);
  vec3 col = mix(horizonColor, topColor, pow(h, 0.62));
  float sd = max(dot(d, normalize(sunDir)), 0.0);
  col += sunColor * pow(sd, 6.0) * 0.30;
  col += sunColor * pow(sd, 90.0) * 0.85;
  col += sunColor * pow(max(1.0 - abs(d.y), 0.0), 7.0) * 0.06;
  gl_FragColor = vec4(col, 1.0);
}`;

const ORDER = ['dawn', 'morning', 'noon', 'sunset', 'dusk', 'night'];

export class Sky {
  constructor(scene, mats, rng) {
    this.scene = scene;
    this.mats = mats;
    this.pal = null;
    this.neon = 0;
    this.uniforms = {
      topColor: { value: new THREE.Color(0x4f8fd8) },
      horizonColor: { value: new THREE.Color(0xcfe4f0) },
      sunColor: { value: new THREE.Color(0xfff3dc) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
    };
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
        side: THREE.BackSide, depthWrite: false, fog: false }));
    dome.frustumCulled = false;
    dome.renderOrder = -10;
    scene.add(dome);
    this.dome = dome;

    const glowTex = mats.glowTex;
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe6b0, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.95 }));
    this.sun.scale.set(150, 150, 1);
    this.sun.renderOrder = -9;
    scene.add(this.sun);
    this.sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.95 }));
    this.sunCore.scale.set(46, 46, 1);
    scene.add(this.sunCore);

    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xdfe8ff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
    this.moon.scale.set(46, 46, 1);
    scene.add(this.moon);

    const starGeo = starField(520, rng);
    this.starMat = new THREE.PointsMaterial({ size: 2.2, color: 0xdfe9ff, transparent: true, opacity: 0,
      sizeAttenuation: false, depthWrite: false, fog: false });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    this.scene.fog = new THREE.Fog(0xc3d8e6, 55, 560);
    this.dir = new THREE.Vector3(0, 1, 0);
    this.hour = 12;
  }

  // Blend the six keyed times of day around the clock.
  static paletteAt(hour) {
    const h = ((hour % 24) + 24) % 24;
    let a = ORDER[0], b = ORDER[1], t = 0;
    for (let i = 0; i < ORDER.length; i++) {
      const cur = TIMES[ORDER[i]].hour;
      const nxt = TIMES[ORDER[(i + 1) % ORDER.length]].hour + (i === ORDER.length - 1 ? 24 : 0);
      const hh = h < TIMES[ORDER[0]].hour ? h + 24 : h;
      if (hh >= cur && hh < nxt) { a = ORDER[i]; b = ORDER[(i + 1) % ORDER.length]; t = (hh - cur) / (nxt - cur); break; }
    }
    const A = TIMES[a], B = TIMES[b];
    const s = t * t * (3 - 2 * t);
    return {
      top: mixHex(A.top, B.top, s), hor: mixHex(A.hor, B.hor, s), fog: mixHex(A.fog, B.fog, s),
      amb: lerp(A.amb, B.amb, s), neon: lerp(A.neon, B.neon, s), sunCol: mixHex(A.sunCol, B.sunCol, s),
      sun: lerp(A.sun, B.sun, s), az: lerp(A.az, B.az, s), hour: h,
    };
  }

  setHour(hour) {
    const p = Sky.paletteAt(hour);
    this.hour = hour;
    this.pal = p;
    this.neon = p.neon;
    const el = (p.sun * Math.PI) / 180;
    this.dir.set(Math.cos(el) * Math.cos(p.az), Math.sin(el), Math.cos(el) * Math.sin(p.az)).normalize();
    this.uniforms.topColor.value.setHex(p.top);
    this.uniforms.horizonColor.value.setHex(p.hor);
    this.uniforms.sunColor.value.setHex(p.sunCol);
    this.uniforms.sunDir.value.copy(this.dir);
    this.scene.fog.color.setHex(p.fog);
    this.scene.fog.near = lerp(40, 70, clamp(p.amb, 0, 1));
    this.scene.fog.far = lerp(300, 620, clamp(p.amb, 0, 1));

    const sunUp = clamp(p.sun / 12, 0, 1);
    this.sun.position.copy(this.dir).multiplyScalar(1150);
    this.sunCore.position.copy(this.dir).multiplyScalar(1140);
    this.sun.material.opacity = 0.85 * clamp((p.sun + 6) / 14, 0, 1);
    this.sunCore.material.opacity = 0.95 * sunUp;
    this.sunCore.visible = p.sun > -4;
    this.sun.material.color.setHex(p.sunCol);
    this.moon.position.copy(this.dir).multiplyScalar(-1100);
    this.moon.position.y = Math.abs(this.moon.position.y) + 120;
    this.moon.material.opacity = clamp((6 - p.sun) / 16, 0, 0.85);
    this.starMat.opacity = clamp((2 - p.sun) / 14, 0, 0.9);
    return p;
  }

  // Materials that should brighten as the sun goes down.
  applyToMaterials() {
    const n = this.neon;
    const g = lerp(0.26, 1.0, n);
    this.mats.glow.color.setRGB(g, g, g * 1.02);
    this.mats.markings.color.setRGB(lerp(0.95, 0.62, n), lerp(0.95, 0.64, n), lerp(0.95, 0.68, n));
    this.mats.cone.opacity = 0.012 + n * 0.075;
    this.mats.lamp.opacity = 0.3 + n * 0.7;
    this.mats.sign.color.setRGB(lerp(0.75, 1.15, n), lerp(0.75, 1.15, n), lerp(0.75, 1.18, n));
    if (this.mats.halo) this.mats.halo.opacity = n * 0.9;
    this.mats.sandMat.color.setRGB(lerp(0.95, 0.5, n), lerp(0.95, 0.5, n), lerp(0.95, 0.56, n));
    this.mats.waterMat.color.setRGB(lerp(0.85, 0.4, n), lerp(0.9, 0.44, n), lerp(1.0, 0.6, n));
  }

  update(dt, camera) {
    this.dome.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    this.moon.position.copy(camera.position).addScaledVector(this.dir, -1100);
    this.moon.position.y = Math.abs(this.moon.position.y - camera.position.y) + 160;
    this.sun.position.copy(camera.position).addScaledVector(this.dir, 1150);
    this.sunCore.position.copy(camera.position).addScaledVector(this.dir, 1140);
  }
}
