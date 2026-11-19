// The HUD: mission panel, stars, money, clock, vitals, weapon, speedometer, radio, subtitles,
// toasts and the mission banner. Reads a plain state object; touches the DOM at 10 Hz for text
// and every frame for the minimap and bars.
import { drawPortrait } from './portraits.js';
import { Minimap } from './minimap.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.root = $('hud');
    this.el = {
      mname: $('mname'), mstage: $('mstage'), mobj: $('mobj'), mprog: $('mprog'),
      money: $('money'), clock: $('clock'), stars: [...$('stars').children],
      hp: $('hpbar').firstElementChild, ap: $('apbar').firstElementChild,
      district: $('district'), street: $('street'),
      wname: $('wname'), wammo: $('wammo'),
      kmh: $('kmh'), carname: $('carname'), cardmg: $('cardmg'), drive: $('drive'),
      subs: $('subs'), subtext: $('subtext'), portrait: $('portrait'),
      toast: $('toast'), banner: $('banner'),
    };
    this.map = new Minimap($('minimap'));
    this.acc = 0;
    this.lastPortrait = '';
    this.toastT = 0;
    this.bannerT = 0;
  }

  show(on) { this.root.classList.toggle('on', on); }

  update(dt, s) {
    this.map.draw(s);
    this.acc += dt;
    if (this.acc < 0.1) return;
    this.acc = 0;
    const e = this.el;
    e.money.textContent = `$${Math.round(s.money).toLocaleString('en-US')}`;
    e.clock.textContent = `${s.day ?? 'MON'} ${String(Math.floor(s.hour)).padStart(2, '0')}:${String(Math.floor((s.hour % 1) * 60)).padStart(2, '0')}`;
    for (let i = 0; i < 5; i++) e.stars[i].className = i < s.stars ? 'lit' : '';
    e.hp.style.width = `${Math.max(0, s.hp)}%`;
    e.ap.style.width = `${Math.max(0, s.ap)}%`;
    e.district.textContent = s.district;
    e.street.textContent = s.street;
    e.wname.textContent = s.weapon;
    e.wammo.textContent = s.ammoText;
    e.mname.textContent = s.missionName ?? 'Free roam';
    e.mstage.textContent = s.missionStage ?? 'No active mission';
    e.mobj.textContent = s.objective ?? 'Explore Vice Harbor.';
    e.mprog.style.width = `${Math.round((s.progress ?? 0) * 100)}%`;
    if (s.inCar) {
      e.kmh.innerHTML = `${Math.round(s.kmh)}<small>KM/H</small>`;
      e.carname.textContent = s.carName;
      e.cardmg.textContent = s.damage > 4 ? `DAMAGE ${Math.round(s.damage)}%` : '';
    } else {
      e.kmh.innerHTML = `${Math.round(s.kmh)}<small>KM/H</small>`;
      e.carname.textContent = 'ON FOOT';
      e.cardmg.textContent = '';
    }
    e.drive.style.opacity = s.inCar ? '1' : '0.55';
    // subtitle
    if (s.dialogue) {
      const d = s.dialogue;
      e.subs.classList.add('on');
      e.subtext.innerHTML = `<b>${d.speaker.name}</b>${d.text}`;
      if (this.lastPortrait !== d.speaker.face) {
        drawPortrait(e.portrait, d.speaker.face, '#ffd166');
        this.lastPortrait = d.speaker.face;
      }
    } else {
      e.subs.classList.remove('on');
    }
    if (s.toast) { e.toast.textContent = s.toast; e.toast.classList.add('on'); }
    else e.toast.classList.remove('on');
    if (s.banner) { e.banner.classList.add('on'); e.banner.querySelector('h2').textContent = s.banner.title; e.banner.querySelector('p').textContent = s.banner.sub; }
    else e.banner.classList.remove('on');
  }
}
