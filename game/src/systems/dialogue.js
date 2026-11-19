// Radio chatter and mission dialogue: a queue of lines with a speaker, a painted portrait and
// a time on screen. The HUD reads `current` and draws it.
import { SPEAKERS } from '../ui/portraits.js';

export class Dialogue {
  constructor() {
    this.queue = [];
    this.current = null;
    this.timer = 0;
    this.log = [];
  }
  say(who, text, hold = 4.2) {
    this.queue.push({ who, text, hold });
    if (!this.current) this.next();
  }
  next() {
    const line = this.queue.shift() ?? null;
    this.current = line ? { ...line, speaker: SPEAKERS[line.who] ?? { name: line.who, face: 'vex' } } : null;
    this.timer = line ? line.hold : 0;
    if (line) this.log.push(line);
  }
  clear() { this.queue.length = 0; this.current = null; this.timer = 0; }
  update(dt) {
    if (!this.current) { if (this.queue.length) this.next(); return; }
    this.timer -= dt;
    if (this.timer <= 0) this.next();
  }
}
