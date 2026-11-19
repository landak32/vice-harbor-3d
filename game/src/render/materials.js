// Shared materials, created once. Keeping them here lets the sky module dim the lit-window
// and neon materials at dawn without touching any geometry.
import * as THREE from '../../vendor/three.module.min.js';
import { asphaltTexture, paverTexture, sandTexture, waterTexture, signAtlas, glowSprite, smokeSprite } from './textures.js';

export function createMaterials(rng) {
  const asphalt = asphaltTexture(rng);
  asphalt.repeat.set(54, 54);
  const pavers = paverTexture(rng);
  const sand = sandTexture(rng);
  sand.repeat.set(70, 14);
  const water = waterTexture(rng);
  water.repeat.set(48, 30);

  const glow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
  const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  const markings = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
  const walk = new THREE.MeshLambertMaterial({ map: pavers, vertexColors: true });
  const ground = new THREE.MeshLambertMaterial({ map: asphalt, color: 0xbfc3c9 });
  const sandMat = new THREE.MeshLambertMaterial({ map: sand, color: 0xffffff });
  const waterMat = new THREE.MeshLambertMaterial({ map: water, color: 0x9fd4e2, transparent: true, opacity: 0.96 });
  const sign = new THREE.MeshBasicMaterial({ map: signAtlas(rng), transparent: true, fog: true, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.055, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.MeshBasicMaterial({ color: 0xdff0ff, transparent: true, opacity: 0.09, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
  return {
    solid, glow, markings, walk, ground, sandMat, waterMat, sign, cone, lamp, beam,
    glowTex: glowSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
    smokeTex: smokeSprite(),
    asphalt, water,
  };
}
