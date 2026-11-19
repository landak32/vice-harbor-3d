// Front end: title screen with the loading beat, pause menu and the wasted screen.
const $ = (id) => document.getElementById(id);

export class Menus {
  constructor() {
    this.title = $('title');
    this.pause = $('pause');
    this.over = $('over');
    this.loading = $('loading').firstElementChild;
    this.press = $('press');
    this.ready = false;
    this.p = 0;
  }

  setProgress(p) {
    this.p = Math.max(this.p, p);
    this.loading.style.width = `${Math.round(this.p * 100)}%`;
    if (this.p >= 1 && !this.ready) {
      this.ready = true;
      this.press.textContent = 'Press Enter';
    }
  }
  loadingBeat(dt) {
    if (!this.ready) this.setProgress(Math.min(0.95, this.p + dt * 0.9));
  }
  showTitle(on) { this.title.classList.toggle('hide', !on); }
  showPause(on) { this.pause.classList.toggle('show', on); }
  showOver(on, note) {
    this.over.classList.toggle('show', on);
    if (note) $('overnote').textContent = note;
  }
}
