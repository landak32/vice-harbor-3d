// Hitscan weapons. A ray is marched through the collision grid to the first wall, then tested
// against targets; the caller applies damage. Also owns the ammo, magazine, reload and recoil
// state machine for the four weapons.
import { WEAPONS } from '../config.js';

// March a ray through the city. Returns the first wall hit or the end point.
export function raycast(world, ox, oy, oz, dx, dy, dz, range, targets = []) {
  let bestT = range, bestTarget = null;
  const step = 0.6;
  let t = 0;
  for (; t < range; t += step) {
    const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
    if (y < 0.02) break;
    const b = world.inside(x, z, 0);
    if (b && y < b.h) { bestT = Math.min(bestT, t); break; }
    if (y > 60) break;
  }
  for (const tg of targets) {
    // distance from the target's centre to the ray
    const vx = tg.x - ox, vy = (tg.y ?? 1) - oy, vz = tg.z - oz;
    const proj = vx * dx + vy * dy + vz * dz;
    if (proj < 0.4 || proj > bestT) continue;
    const px = ox + dx * proj, py = oy + dy * proj, pz = oz + dz * proj;
    const d = Math.hypot(tg.x - px, (tg.y ?? 1) - py, tg.z - pz);
    if (d < (tg.r ?? 0.55)) { bestT = proj; bestTarget = tg; }
  }
  return { x: ox + dx * bestT, y: oy + dy * bestT, z: oz + dz * bestT, dist: bestT, target: bestTarget, wall: !bestTarget };
}

export class WeaponState {
  constructor() {
    this.slots = ['fists', 'pistol', 'smg', 'shotgun'];
    this.index = 1;
    this.mag = { fists: 0, pistol: 12, smg: 30, shotgun: 6 };
    this.reserve = { fists: 0, pistol: 96, smg: 210, shotgun: 32 };
    this.cool = 0;
    this.reloadT = 0;
    this.recoil = 0;
  }
  get key() { return this.slots[this.index]; }
  get def() { return WEAPONS[this.key]; }
  select(i) { if (i >= 0 && i < this.slots.length && i !== this.index) { this.index = i; this.reloadT = 0; } }
  cycle(dir) { this.index = (this.index + dir + this.slots.length) % this.slots.length; this.reloadT = 0; }

  update(dt) {
    this.cool = Math.max(0, this.cool - dt);
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const d = this.def, need = d.mag - this.mag[this.key];
        const take = Math.min(need, this.reserve[this.key]);
        this.mag[this.key] += take;
        this.reserve[this.key] -= take;
      }
    }
    this.recoil = Math.max(0, this.recoil - dt * 7);
  }
  reload() {
    if (this.reloadT > 0 || this.mag[this.key] >= this.def.mag || this.reserve[this.key] <= 0) return false;
    this.reloadT = this.key === 'shotgun' ? 1.5 : this.key === 'smg' ? 1.7 : 1.25;
    return true;
  }
  canFire() { return this.cool <= 0 && this.reloadT <= 0 && (this.def.ammo < 0 || this.mag[this.key] > 0); }
  consume() {
    const d = this.def;
    this.cool = d.rate;
    this.recoil = Math.min(1.4, this.recoil + d.kick * 0.12);
    if (d.ammo < 0) return true;
    this.mag[this.key]--;
    return true;
  }
  get empty() { return this.def.ammo >= 0 && this.mag[this.key] <= 0; }
}
