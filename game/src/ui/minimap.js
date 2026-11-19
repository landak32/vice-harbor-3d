// The minimap: a second canvas, north-up, showing the street grid around the player, the sea,
// police blips, the mission marker, a north indicator and the player as an arrow.
import { CFG } from '../config.js';
import { roadCoord, blockBounds } from '../world/cityGrid.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.size = canvas.width;
    this.scale = 1.32;
  }

  draw(s) {
    const g = this.g, S = this.size, half = S / 2;
    const k = this.scale;
    const toX = (x) => half + (x - s.px) * k;
    const toY = (z) => half + (z - s.pz) * k;
    g.save();
    g.beginPath(); g.arc(half, half, half - 1, 0, 7); g.clip();
    g.fillStyle = '#2b3542'; g.fillRect(0, 0, S, S);

    // blocks
    const i0 = Math.max(0, Math.floor((s.px - half / k + CFG.HALF) / CFG.PITCH) - 1);
    const i1 = Math.min(CFG.BLOCKS - 1, Math.ceil((s.px + half / k + CFG.HALF) / CFG.PITCH));
    const j0 = Math.max(0, Math.floor((s.pz - half / k + CFG.HALF) / CFG.PITCH) - 1);
    const j1 = Math.min(CFG.BLOCKS - 1, Math.ceil((s.pz + half / k + CFG.HALF) / CFG.PITCH));
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const b = blockBounds(i, j);
        const d = (i >= 2 && i <= 5 && j >= 1 && j <= 3) ? '#26303d' : '#1a2230';
        g.fillStyle = d;
        g.fillRect(toX(b.x0), toY(b.z0), (b.x1 - b.x0) * k, (b.z1 - b.z0) * k);
        g.strokeStyle = 'rgba(120,150,180,0.18)'; g.lineWidth = 1;
        g.strokeRect(toX(b.x0) + 0.5, toY(b.z0) + 0.5, (b.x1 - b.x0) * k, (b.z1 - b.z0) * k);
      }
    }
    // sea and sand
    g.fillStyle = '#2c4256';
    g.fillRect(0, toY(CFG.OCEAN_Z), S, S);
    g.fillStyle = '#3a4250';
    g.fillRect(0, toY(CFG.BEACH_Z), S, (CFG.OCEAN_Z - CFG.BEACH_Z) * k);

    // centre lines
    g.strokeStyle = 'rgba(220,200,120,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = toX(roadCoord(i));
      if (x < -20 || x > S + 20) continue;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke();
    }
    for (let j = 0; j < 9; j++) {
      const y = toY(roadCoord(j));
      if (y < -20 || y > S + 20) continue;
      g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
    }

    // mission marker
    if (s.marker) {
      const mx = toX(s.marker.x), my = toY(s.marker.z);
      const pulse = 4 + Math.sin(performance.now() * 0.005) * 1.6;
      g.fillStyle = '#ffd166';
      g.beginPath();
      g.moveTo(mx, my - pulse - 3); g.lineTo(mx + pulse, my); g.lineTo(mx, my + pulse + 3); g.lineTo(mx - pulse, my);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,209,102,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.arc(mx, my, pulse + 5, 0, 7); g.stroke();
    }

    // police blips
    for (const u of s.units ?? []) {
      const bx = toX(u.x), by = toY(u.z);
      if (bx < 0 || by < 0 || bx > S || by > S) continue;
      g.fillStyle = Math.floor(performance.now() / 250) % 2 ? '#4a7bff' : '#ff3b3b';
      g.beginPath(); g.arc(bx, by, 3.2, 0, 7); g.fill();
    }

    // player arrow
    const px = half, py = half;
    g.save();
    g.translate(px, py);
    g.rotate(-s.yaw + Math.PI);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(0, 3); g.lineTo(-5, 6); g.closePath(); g.fill();
    g.restore();

    // north indicator
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = 'bold 11px Helvetica, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText('N', half, 14);
    g.beginPath(); g.moveTo(half, 17); g.lineTo(half - 4, 24); g.lineTo(half + 4, 24); g.closePath(); g.fill();
    g.restore();
  }
}
