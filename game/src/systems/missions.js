// Six staged missions with named characters, objectives, dialogue and rewards. A stage is
// either reach a marker, put a number of people down, or shake the police; the panel reads the
// current objective and the minimap draws the marker.
import { blockCenter } from '../world/cityGrid.js';

const at = (i, j) => ({ x: blockCenter(i), z: blockCenter(j) });

export const MISSIONS = [
  {
    name: 'Salt & Signal', giver: 'mira', reward: 1200, rep: 8,
    stages: [
      { obj: 'Meet Mira at the Oru Quay pier', ...at(6, 6), r: 7, type: 'goto', say: ['mira', 'You came. Good. The harbor eats people who are late.'] },
      { obj: 'Take the grey coupe parked on Sundara Way', ...at(3, 5), r: 6, type: 'goto', say: ['mira', 'Grey coupe, Sundara Way. Do not scratch it — it belongs to someone loud.'] },
      { obj: 'Drive the coupe to the Marigold drop', ...at(1, 4), r: 9, type: 'drive', say: ['mira', 'Drop it at Marigold and walk away. That is the whole job.'] },
    ],
  },
  {
    name: 'Marigold Shakedown', giver: 'oru', reward: 900, rep: 6,
    stages: [
      { obj: 'Collect from the noodle bar on Marigold St', ...at(1, 5), r: 6, type: 'goto', say: ['oru', 'Three shops owe me. You are the invoice.'] },
      { obj: 'Collect from the laundry on Bellamy St', ...at(2, 2), r: 6, type: 'goto', say: ['oru', 'Laundry next. They fold money better than shirts.'] },
      { obj: 'Collect from the tattoo parlour on Cinder Row', ...at(3, 2), r: 6, type: 'goto', say: ['oru', 'Last one. Try not to bleed on the carpet.'] },
      { obj: 'Bring the money back to Oru Yards', ...at(5, 5), r: 7, type: 'goto', say: ['oru', 'Now bring it home before the tide turns.'] },
    ],
  },
  {
    name: 'The Kumala Run', giver: 'mira', reward: 1800, rep: 12,
    stages: [
      { obj: 'Pick up the case on Kumala Strand', ...at(4, 7), r: 7, type: 'goto', say: ['mira', 'The case is under the third umbrella. Do not open it.'] },
      { obj: 'Lose the patrol cars', ...at(2, 5), r: 0, type: 'escape', say: ['mira', 'They made you. Lose them in the Heights and I will forget your face.'] },
      { obj: 'Deliver the case to the Tidewater marina', ...at(6, 6), r: 8, type: 'goto', say: ['mira', 'Clean. You might actually survive this city.'] },
    ],
  },
  {
    name: 'Kessler Rooftop', giver: 'oru', reward: 2400, rep: 16,
    stages: [
      { obj: 'Reach the Kessler Heights rooftop crew', ...at(4, 2), r: 7, type: 'goto', say: ['oru', 'Kessler rooftop. They took something that was mine.'] },
      { obj: 'Put down the crew — 5 left', ...at(4, 2), r: 40, type: 'kill', count: 5, say: ['oru', 'Five of them. Make it loud, make it quick.'] },
      { obj: 'Leave the Heights before the air unit arrives', ...at(2, 3), r: 9, type: 'escape', say: ['oru', 'Air unit is up. Move.'] },
    ],
  },
  {
    name: 'Tidewater Exchange', giver: 'sable', reward: 3000, rep: 20,
    stages: [
      { obj: 'Meet Sable at the Tidewater marina', ...at(6, 6), r: 7, type: 'goto', say: ['sable', 'The exchange happens at the marina. Bring nothing you love.'] },
      { obj: 'Survive the ambush', ...at(6, 6), r: 30, type: 'kill', count: 3, say: ['sable', 'Of course they brought friends. Of course.'] },
      { obj: 'Get the case to the Oru Yards', ...at(5, 5), r: 8, type: 'escape', say: ['sable', 'Case to the yards. I will find you.'] },
    ],
  },
  {
    name: 'Last Ferry', giver: 'oru', reward: 5000, rep: 30,
    stages: [
      { obj: 'Drive to the Shoreline Dr ferry slip', ...at(7, 7), r: 9, type: 'drive', say: ['oru', 'The last ferry leaves at midnight. Be on it, or be under it.'] },
      { obj: 'Hold the slip against the Kessler crew', ...at(7, 7), r: 34, type: 'kill', count: 4, say: ['oru', 'They want the case more than they want air. Hold the line.'] },
      { obj: 'Escape the harbor', ...at(7, 7), r: 0, type: 'escape', say: ['mira', 'Go. I will keep the harbor busy.'] },
    ],
  },
];

export class Missions {
  constructor(dialogue) {
    this.dialogue = dialogue;
    this.index = -1;
    this.stage = 0;
    this.kills = 0;
    this.active = false;
    this.completed = [];
    this.banner = null;
    this.bannerT = 0;
    this.toast = null;
    this.toastT = 0;
    this.rep = 0;
  }

  get def() { return this.index >= 0 ? MISSIONS[this.index] : null; }
  get current() { return this.def ? this.def.stages[this.stage] : null; }
  get marker() {
    const s = this.current;
    if (!s || s.type === 'escape') return null;
    return { x: s.x, z: s.z };
  }
  get progress() { return this.def ? (this.stage + (this.active ? 0.15 : 1)) / this.def.stages.length : 0; }

  start(i) {
    this.index = i;
    this.stage = 0;
    this.kills = 0;
    this.active = true;
    this.sayStage();
  }

  sayStage() {
    const s = this.current;
    if (!s || !s.say) return;
    this.dialogue.say(s.say[0], s.say[1], 5.2);
  }

  advance(money) {
    const def = this.def;
    if (!def) return;
    this.stage++;
    this.kills = 0;
    if (this.stage >= def.stages.length) {
      this.active = false;
      this.completed.push(def.name);
      this.rep += def.rep;
      this.banner = { title: 'MISSION COMPLETE', sub: `${def.name} · $${def.reward.toLocaleString('en-US')} · +${def.rep} REP` };
      this.bannerT = 4.2;
      this.toast = `+$${def.reward} · REP +${def.rep}`;
      this.toastT = 4;
      this.moneyGain = def.reward;
      this.stage = def.stages.length - 1;
      return def.reward;
    }
    this.sayStage();
    return 0;
  }

  // Called every fixed step. Returns money earned this step.
  update(dt, px, pz, ctx) {
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.banner = null; }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.toast = null; }
    if (!this.active) return 0;
    const s = this.current;
    if (!s) return 0;
    let done = false;
    if (s.type === 'goto' || s.type === 'drive') {
      done = Math.hypot(px - s.x, pz - s.z) < s.r;
    } else if (s.type === 'kill') {
      this.kills = ctx.kills ?? 0;
      done = this.kills >= s.count;
    } else if (s.type === 'escape') {
      done = (ctx.stars ?? 0) === 0 && (s.r === 0 || Math.hypot(px - s.x, pz - s.z) < s.r);
    }
    if (done) return this.advance();
    return 0;
  }

  objectiveText() {
    const s = this.current;
    if (!s) return this.active ? 'Mission complete.' : 'Explore Vice Harbor.';
    if (s.type === 'kill') return s.obj.replace(/\d+ left/, `${Math.max(0, s.count - this.kills)} left`);
    return s.obj;
  }
}
