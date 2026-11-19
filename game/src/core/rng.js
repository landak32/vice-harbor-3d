// Seeded randomness. Every decision the city, the traffic, the crowds and the missions make
// comes from one of these generators, so a seed always rebuilds the same harbor.
export class Rng {
  constructor(seed = 1) { this.s = (seed >>> 0) || 1; this.seed = this.s; }
  next() {
    let t = (this.s += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(n) { return Math.floor(this.next() * n); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length) % arr.length]; }
  chance(p) { return this.next() < p; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  // A child generator keeps streams independent: crowds do not shift because a building
  // happened to ask for one more random number.
  fork() { return new Rng((this.next() * 4294967295) >>> 0); }
}

export const rand = new Rng(7);
