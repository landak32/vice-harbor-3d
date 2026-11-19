// Collision against the city. Buildings are axis-aligned boxes bucketed into a coarse grid so
// a hundred pedestrians do not test a hundred thousand pairs. Also answers ground height, so
// characters step up onto pavements.
import { CFG } from '../config.js';

export class CollisionWorld {
  constructor(buildings) {
    this.buildings = buildings;
    this.cell = 50;
    this.grid = new Map();
    for (const b of buildings) {
      const key = this.key(b.x, b.z);
      let arr = this.grid.get(key);
      if (!arr) { arr = []; this.grid.set(key, arr); }
      arr.push(b);
    }
  }
  key(x, z) { return `${Math.floor((x + CFG.HALF) / this.cell)},${Math.floor((z + CFG.HALF) / this.cell)}`; }
  near(x, z) {
    const gx = Math.floor((x + CFG.HALF) / this.cell), gz = Math.floor((z + CFG.HALF) / this.cell);
    const out = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const arr = this.grid.get(`${gx + i},${gz + j}`);
      if (arr) out.push(...arr);
    }
    return out;
  }
  // Push a circle out of any building it overlaps. Returns {x, z, hit}.
  resolve(x, z, r) {
    let hit = false;
    for (const b of this.near(x, z)) {
      const hw = b.w / 2 + r, hd = b.d / 2 + r;
      const dx = x - b.x, dz = z - b.z;
      if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
        const px = hw - Math.abs(dx), pz = hd - Math.abs(dz);
        if (px < pz) x = b.x + Math.sign(dx || 1) * hw;
        else z = b.z + Math.sign(dz || 1) * hd;
        hit = true;
      }
    }
    return { x, z, hit };
  }
  inside(x, z, pad = 0) {
    for (const b of this.near(x, z)) {
      if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return b;
    }
    return null;
  }
  // Pavements are 0.18 m proud of the road; blocks are inset from the road centre by ROAD_W/2.
  groundHeight(x, z) {
    const rx = ((x + CFG.HALF) % CFG.PITCH + CFG.PITCH) % CFG.PITCH;
    const rz = ((z + CFG.HALF) % CFG.PITCH + CFG.PITCH) % CFG.PITCH;
    const onBlock = rx > CFG.ROAD_W / 2 && rz > CFG.ROAD_W / 2;
    return onBlock ? CFG.CURB_H : 0;
  }
  // Free spot near (x,z) for spawning, searching outward on the pavement.
  freeSpot(x, z, r = 0.4) {
    for (let ring = 0; ring < 8; ring++) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const px = x + Math.cos(ang) * ring * 2.5, pz = z + Math.sin(ang) * ring * 2.5;
        if (!this.inside(px, pz, r)) return { x: px, z: pz };
      }
    }
    return { x, z };
  }
}
