// Procedural portraits: every speaking character gets a painted face drawn into a canvas at
// runtime — layered skin gradients, brows, eyes, nose, mouth, hair and a rim light. Nothing is
// loaded from disk, and the same speaker always draws the same face.
const FACES = {
  mira:  { skin: '#c58a62', hair: '#1d1410', jacket: '#8a3a4a', shirt: '#e8dcc8', style: 'long', eye: '#3a2418' },
  oru:   { skin: '#8a5a3c', hair: '#2a2018', jacket: '#2f4a3c', shirt: '#c8c0a8', style: 'cap', eye: '#2a1a10' },
  vex:   { skin: '#d8a878', hair: '#c8b090', jacket: '#2a3340', shirt: '#8a9aa8', style: 'short', eye: '#4a6a8a' },
  sable: { skin: '#6b432c', hair: '#0d0b09', jacket: '#3a2a3a', shirt: '#d8c0c8', style: 'bun', eye: '#2a1a10' },
  rook:  { skin: '#b07a52', hair: '#3a2a1c', jacket: '#4a4a2a', shirt: '#d8d0b8', style: 'beard', eye: '#3a2a18' },
  dispatcher: { skin: '#c08a5e', hair: '#2a2a2a', jacket: '#1e2630', shirt: '#5a6a7a', style: 'short', eye: '#2a2a2a' },
};

export const SPEAKERS = {
  mira: { name: 'Mira Kesang', face: 'mira' },
  oru: { name: 'Oru', face: 'oru' },
  vex: { name: 'Vex Alder', face: 'vex' },
  sable: { name: 'Sable Ito', face: 'sable' },
  rook: { name: 'Rook Dae', face: 'rook' },
  dispatch: { name: 'Dispatch', face: 'dispatcher' },
};

export function drawPortrait(canvas, faceKey, accent = '#ffd166') {
  const f = FACES[faceKey] ?? FACES.mira;
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#141c28'); bg.addColorStop(0.55, '#0d141d'); bg.addColorStop(1, '#080c12');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // backdrop stripes, like a police sketch card
  g.globalAlpha = 0.12;
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? accent : '#4a5a70'; g.fillRect(0, i * H / 6, W, 2); }
  g.globalAlpha = 1;
  const cx = W * 0.5, cy = H * 0.52, rw = W * 0.23, rh = H * 0.27;
  // shoulders
  g.fillStyle = f.jacket;
  g.beginPath();
  g.moveTo(cx - W * 0.42, H);
  g.quadraticCurveTo(cx - W * 0.3, H * 0.74, cx - W * 0.14, H * 0.7);
  g.lineTo(cx + W * 0.14, H * 0.7);
  g.quadraticCurveTo(cx + W * 0.3, H * 0.74, cx + W * 0.42, H);
  g.closePath(); g.fill();
  // collar
  g.fillStyle = f.shirt;
  g.beginPath();
  g.moveTo(cx - W * 0.12, H * 0.7); g.lineTo(cx, H * 0.84); g.lineTo(cx + W * 0.12, H * 0.7);
  g.lineTo(cx + W * 0.06, H * 0.68); g.lineTo(cx - W * 0.06, H * 0.68);
  g.closePath(); g.fill();
  // neck
  g.fillStyle = shade(f.skin, 0.82);
  g.fillRect(cx - W * 0.075, cy + rh * 0.5, W * 0.15, H * 0.16);
  // head
  const skin = g.createLinearGradient(cx - rw, cy - rh, cx + rw, cy + rh);
  skin.addColorStop(0, shade(f.skin, 1.12));
  skin.addColorStop(0.55, f.skin);
  skin.addColorStop(1, shade(f.skin, 0.72));
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
  g.fill();
  // jaw
  g.fillStyle = shade(f.skin, 0.92);
  g.beginPath(); g.ellipse(cx, cy + rh * 0.55, rw * 0.72, rh * 0.5, 0, 0, Math.PI); g.fill();
  // hair
  g.fillStyle = f.hair;
  if (f.style === 'long') {
    g.beginPath();
    g.ellipse(cx, cy - rh * 0.34, rw * 1.08, rh * 0.78, 0, Math.PI, 0);
    g.lineTo(cx + rw * 1.05, cy + rh * 1.15);
    g.lineTo(cx + rw * 0.72, cy + rh * 0.2);
    g.lineTo(cx - rw * 0.72, cy + rh * 0.2);
    g.lineTo(cx - rw * 1.05, cy + rh * 1.15);
    g.closePath(); g.fill();
  } else if (f.style === 'bun') {
    g.beginPath(); g.arc(cx, cy - rh * 1.02, rw * 0.42, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx, cy - rh * 0.42, rw * 1.02, rh * 0.6, 0, Math.PI, 0); g.fill();
  } else if (f.style === 'cap') {
    g.beginPath(); g.ellipse(cx, cy - rh * 0.5, rw * 1.05, rh * 0.56, 0, Math.PI, 0); g.fill();
    g.fillStyle = shade(f.jacket, 1.15);
    g.beginPath(); g.ellipse(cx, cy - rh * 0.58, rw * 1.12, rh * 0.34, 0, Math.PI, 0); g.fill();
    g.fillRect(cx - rw * 1.25, cy - rh * 0.6, rw * 2.5, rh * 0.12);
  } else {
    g.beginPath(); g.ellipse(cx, cy - rh * 0.4, rw * 1.04, rh * 0.66, 0, Math.PI, 0); g.fill();
  }
  if (f.style === 'beard') {
    g.fillStyle = shade(f.hair, 0.9);
    g.beginPath(); g.ellipse(cx, cy + rh * 0.62, rw * 0.78, rh * 0.46, 0, 0, Math.PI); g.fill();
  }
  // brows
  g.strokeStyle = shade(f.hair, 1.4); g.lineWidth = Math.max(1.5, W * 0.016); g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - rw * 0.62, cy - rh * 0.2); g.lineTo(cx - rw * 0.16, cy - rh * 0.26); g.stroke();
  g.beginPath(); g.moveTo(cx + rw * 0.16, cy - rh * 0.26); g.lineTo(cx + rw * 0.62, cy - rh * 0.2); g.stroke();
  // eyes
  for (const s of [-1, 1]) {
    const ex = cx + s * rw * 0.38, ey = cy - rh * 0.02;
    g.fillStyle = '#f0ece4';
    g.beginPath(); g.ellipse(ex, ey, rw * 0.19, rh * 0.11, 0, 0, 7); g.fill();
    g.fillStyle = f.eye;
    g.beginPath(); g.arc(ex, ey, rw * 0.085, 0, 7); g.fill();
    g.fillStyle = '#120c08';
    g.beginPath(); g.arc(ex, ey, rw * 0.042, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.arc(ex - rw * 0.03, ey - rh * 0.03, rw * 0.022, 0, 7); g.fill();
    g.strokeStyle = 'rgba(20,12,8,0.55)'; g.lineWidth = W * 0.008;
    g.beginPath(); g.moveTo(ex - rw * 0.2, ey - rh * 0.11); g.lineTo(ex + rw * 0.2, ey - rh * 0.13); g.stroke();
  }
  // nose and mouth
  g.strokeStyle = 'rgba(60,32,20,0.45)'; g.lineWidth = W * 0.012;
  g.beginPath(); g.moveTo(cx + rw * 0.02, cy + rh * 0.04); g.lineTo(cx - rw * 0.06, cy + rh * 0.3); g.lineTo(cx + rw * 0.08, cy + rh * 0.33); g.stroke();
  g.strokeStyle = shade(f.skin, 0.55); g.lineWidth = W * 0.018;
  g.beginPath(); g.moveTo(cx - rw * 0.26, cy + rh * 0.56); g.quadraticCurveTo(cx, cy + rh * 0.64, cx + rw * 0.26, cy + rh * 0.54); g.stroke();
  // rim light from the left, shadow on the right
  const rim = g.createLinearGradient(cx - rw, 0, cx + rw, 0);
  rim.addColorStop(0, 'rgba(255,214,150,0.28)'); rim.addColorStop(0.35, 'rgba(255,214,150,0)');
  rim.addColorStop(0.8, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(0,0,0,0.38)');
  g.save();
  g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, 0, 7); g.clip();
  g.fillStyle = rim; g.fillRect(cx - rw, cy - rh, rw * 2, rh * 2);
  g.restore();
  // vignette
  const vg = g.createRadialGradient(cx, cy, W * 0.18, cx, cy, W * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.62)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

function shade(hex, f) {
  const c = hex.replace('#', '');
  const r = Math.min(255, parseInt(c.slice(0, 2), 16) * f) | 0;
  const g = Math.min(255, parseInt(c.slice(2, 4), 16) * f) | 0;
  const b = Math.min(255, parseInt(c.slice(4, 6), 16) * f) | 0;
  return `rgb(${r},${g},${b})`;
}
