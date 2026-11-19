// Runtime-painted textures. Nothing here is loaded from disk: asphalt, pavers, sand, water,
// neon shop signs and soft sprites are all drawn into a canvas at boot and uploaded once.
import * as THREE from '../../vendor/three.module.min.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function finish(c, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Asphalt: dark aggregate with tar patches and faint tyre polish.
export function asphaltTexture(rng) {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#2b2d33'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) {
    const v = 30 + rng.int(34);
    g.fillStyle = `rgba(${v},${v + 2},${v + 5},${0.5 + rng.next() * 0.5})`;
    g.fillRect(rng.int(256), rng.int(256), 1 + rng.int(2), 1 + rng.int(2));
  }
  for (let i = 0; i < 16; i++) {
    g.fillStyle = `rgba(20,21,25,${0.25 + rng.next() * 0.3})`;
    g.beginPath();
    g.ellipse(rng.int(256), rng.int(256), 10 + rng.int(40), 6 + rng.int(24), rng.next() * 3, 0, 7);
    g.fill();
  }
  g.strokeStyle = 'rgba(70,72,80,0.25)'; g.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    g.beginPath(); g.moveTo(0, rng.int(256)); g.lineTo(256, rng.int(256)); g.stroke();
  }
  return finish(c, 1);
}

// Sidewalk pavers: a 2 m grid of slabs with joints, plus grime.
export function paverTexture(rng) {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#9a9c9d'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const v = 138 + rng.int(28);
      g.fillStyle = `rgb(${v},${v},${v - 4})`;
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
  }
  for (let i = 0; i < 2200; i++) {
    const v = 90 + rng.int(70);
    g.fillStyle = `rgba(${v},${v},${v},0.28)`;
    g.fillRect(rng.int(256), rng.int(256), 1 + rng.int(2), 1 + rng.int(2));
  }
  g.strokeStyle = 'rgba(60,62,66,0.55)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
  }
  return finish(c, 1);
}

export function sandTexture(rng) {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#d9c193'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const v = rng.int(60);
    g.fillStyle = `rgba(${190 + v},${168 + v},${120 + v},0.5)`;
    g.fillRect(rng.int(256), rng.int(256), 1 + rng.int(2), 1 + rng.int(2));
  }
  for (let i = 0; i < 22; i++) {
    g.strokeStyle = 'rgba(180,155,110,0.35)'; g.lineWidth = 1 + rng.next() * 2;
    g.beginPath();
    const y = rng.int(256);
    g.moveTo(0, y);
    g.bezierCurveTo(80, y + rng.int(20) - 10, 170, y - rng.int(20) + 10, 256, y);
    g.stroke();
  }
  return finish(c, 1);
}

// Ocean: layered horizontal bands, scrolled at runtime for a cheap swell.
export function waterTexture(rng) {
  const c = canvas(256, 256), g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#1d5a72'); grd.addColorStop(0.5, '#164a63'); grd.addColorStop(1, '#123c55');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    const y = rng.int(256), w = 8 + rng.int(60);
    g.fillStyle = `rgba(${180 + rng.int(60)},${225 + rng.int(30)},255,${0.05 + rng.next() * 0.12})`;
    g.fillRect(rng.int(256), y, w, 1 + rng.int(2));
  }
  return finish(c, 1);
}

const SIGN_WORDS = ['LIQUOR', 'MOTEL', 'TIKI', 'DINER', 'ARCADE', 'PAWN', 'TATTOO', 'BAIT',
  'CHOP SHOP', 'NOODLE', 'SURF', 'HOTEL', 'CLUB', 'GARAGE', 'MARKET', 'PHARMACY',
  'LAUNDRY', 'DONUTS', 'PIZZA', 'VIDEO', 'GUNS', 'CASH', 'REPAIR', 'OYSTER',
  'SUSHI', 'BOWL', 'BOOKS', 'RECORDS', 'TAVERN', 'FISH', 'TACOS', 'CAFE'];
const SIGN_COLORS = ['#ff5f7e', '#ffd166', '#5ff2d0', '#7fb6ff', '#ff9d4d', '#e58cff', '#9dff6b', '#ff6b4a'];

// One atlas holds 32 shop signs: 4 columns x 8 rows of 256 x 64 cells.
export function signAtlas(rng) {
  const c = canvas(1024, 512), g = c.getContext('2d');
  g.fillStyle = '#05070b'; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < SIGN_WORDS.length; i++) {
    const x = (i % 4) * 256, y = Math.floor(i / 4) * 64;
    const col = SIGN_COLORS[i % SIGN_COLORS.length];
    g.save();
    g.translate(x, y);
    g.fillStyle = 'rgba(6,8,12,0.96)'; g.fillRect(0, 0, 256, 64);
    g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(4, 4, 248, 56);
    g.shadowColor = col; g.shadowBlur = 16;
    g.fillStyle = col;
    g.font = 'bold 34px Helvetica, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(SIGN_WORDS[i], 128, 34, 226);
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(10, 10, 236, 2);
    g.restore();
  }
  const t = finish(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Soft radial blob: used for glow sprites, headlight bloom, smoke and sparks.
export function glowSprite(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 64) {
  const c = canvas(size, size), g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner); grd.addColorStop(0.45, inner.replace(/[\d.]+\)$/, '0.45)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A puffy smoke sprite with a soft edge and a couple of internal lumps.
export function smokeSprite() {
  const c = canvas(64, 64), g = c.getContext('2d');
  for (let i = 0; i < 7; i++) {
    const r = 10 + (i % 3) * 5;
    const grd = g.createRadialGradient(32 + (i - 3) * 3, 32 + ((i * 7) % 9) - 4, 0, 32, 32, r + 14);
    grd.addColorStop(0, 'rgba(255,255,255,0.34)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(32, 32, r + 14, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function starField(count, rng) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2), e = Math.asin(rng.range(0.04, 1));
    const r = 900;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    pos[i * 3 + 1] = Math.sin(e) * r;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}
