// Fixed timestep with an accumulator. Simulation always advances in exact 1/60 s slices so
// the same seed and the same number of steps produce the same frame, on any machine.
export class Timestep {
  constructor(step = 1 / 60, maxSteps = 5) {
    this.step = step;
    this.maxSteps = maxSteps;
    this.acc = 0;
    this.time = 0;
    this.frames = 0;
    this.simSeconds = 0;
  }
  // Returns how many fixed steps to run this frame.
  consume(dtReal) {
    this.acc += Math.min(dtReal, 0.25);
    let n = 0;
    while (this.acc >= this.step && n < this.maxSteps) { this.acc -= this.step; n++; }
    return n;
  }
  advance() {
    this.time += this.step;
    this.simSeconds += this.step;
    this.frames++;
  }
  // Screenshot mode: run a fixed number of steps regardless of wall clock.
  runFixed(steps, fn) { for (let i = 0; i < steps; i++) { fn(this.step); this.advance(); } }
}
