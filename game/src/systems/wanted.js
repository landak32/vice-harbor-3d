// Wanted level: crimes add heat, heat becomes stars, stars decay when the player breaks line
// of sight and stays out of the way. Also prints the status lines under the stars.
import { clamp } from '../core/math.js';

export class Wanted {
  constructor() {
    this.heat = 0;
    this.stars = 0;
    this.hiddenT = 0;
    this.visible = false;
    this.status = '';
    this.statusT = 0;
  }
  crime(amount) {
    this.heat = clamp(this.heat + amount, 0, 100);
    const s = this.starsFor(this.heat);
    if (s > this.stars) { this.stars = s; this.visible = true; }
    this.hiddenT = 0;
  }
  starsFor(h) {
    if (h <= 0) return 0;
    if (h < 12) return 1;
    if (h < 26) return 2;
    if (h < 44) return 3;
    if (h < 66) return 4;
    return 5;
  }
  clear() { this.heat = 0; this.stars = 0; this.hiddenT = 0; this.visible = false; }
  setStatus(text, t = 3) { this.status = text; this.statusT = t; }

  update(dt, seen, units) {
    if (seen) { this.hiddenT = 0; this.visible = true; }
    else this.hiddenT += dt;
    if (this.stars > 0 && this.hiddenT > 7) {
      this.heat = Math.max(0, this.heat - dt * 9);
      if (this.starsFor(this.heat) < this.stars) {
        this.stars = this.starsFor(this.heat);
        if (this.stars === 0) this.visible = false;
      }
    }
    if (this.statusT > 0) this.statusT -= dt;
    if (units > 0 && this.stars >= 3 && this.statusT <= 0) this.setStatus(`${units} UNITS · AIR SUPPORT`, 2.5);
  }
  label() {
    if (this.stars === 0) return '';
    if (this.stars >= 5) return 'ALL UNITS · LETHAL';
    if (this.stars === 4) return 'AIR UNIT DEPLOYED';
    if (this.stars === 3) return 'AIR UNIT INBOUND';
    return `${this.stars + 1} UNITS RESPONDING`;
  }
}
