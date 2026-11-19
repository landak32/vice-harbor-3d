// Geometry batching. The city is thousands of boxes; merging them into one buffer per
// district keeps draw calls in the dozens instead of the thousands, which is the only way
// software rendering can draw this place. Everything is flat-shaded and vertex-coloured.
import * as THREE from '../../vendor/three.module.min.js';

const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();

export class MeshBatch {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.uv = [];
    this.idx = [];
    this.n = 0;
    this.color = new THREE.Color();
  }
  vert(x, y, z, nx, ny, nz, c) {
    this.pos.push(x, y, z);
    this.nor.push(nx, ny, nz);
    this.col.push(c.r, c.g, c.b);
    return this.n++;
  }
  // A quad given in counter-clockwise order when seen from the front face. `uvRect` maps
  // the corners to an atlas cell; `uvScale` instead derives UVs from world XZ (ground tiles).
  quad(a, b, c, d, color, uvRect = null, uvScale = 0) {
    this.color.setHex(color);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    const base = this.n;
    this.vert(a[0], a[1], a[2], nx, ny, nz, this.color);
    this.vert(b[0], b[1], b[2], nx, ny, nz, this.color);
    this.vert(c[0], c[1], c[2], nx, ny, nz, this.color);
    this.vert(d[0], d[1], d[2], nx, ny, nz, this.color);
    if (uvScale) {
      const s = 1 / uvScale;
      this.uv.push(a[0] * s, a[2] * s, b[0] * s, b[2] * s, c[0] * s, c[2] * s, d[0] * s, d[2] * s);
    } else if (uvRect) {
      const [u0, v0, u1, v1] = uvRect;
      this.uv.push(u0, v1, u1, v1, u1, v0, u0, v0);
    } else this.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // Axis-aligned (or yaw-rotated) box, centre + full size. Returns nothing; chain calls.
  box(cx, cy, cz, sx, sy, sz, color, rotY = 0) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const cs = Math.cos(rotY), sn = Math.sin(rotY);
    const p = (x, y, z) => [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs];
    const x0 = -hx, x1 = hx, y0 = -hy, y1 = hy, z0 = -hz, z1 = hz;
    this.quad(p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0), p(x0, y1, z0), color); // top
    this.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1), color); // bottom
    this.quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), color); // +z
    this.quad(p(x1, y0, z0), p(x0, y0, z0), p(x0, y1, z0), p(x1, y1, z0), color); // -z
    this.quad(p(x1, y0, z1), p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), color); // +x
    this.quad(p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0), color); // -x
    return this;
  }
  // A box whose sides can differ in colour (a lit sign band, a window, a curb strip).
  boxSides(cx, cy, cz, sx, sy, sz, top, side, rotY = 0) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const cs = Math.cos(rotY), sn = Math.sin(rotY);
    const p = (x, y, z) => [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs];
    const x0 = -hx, x1 = hx, y0 = -hy, y1 = hy, z0 = -hz, z1 = hz;
    this.quad(p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0), p(x0, y1, z0), top);
    this.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1), side);
    this.quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), side);
    this.quad(p(x1, y0, z0), p(x0, y0, z0), p(x0, y1, z0), p(x1, y1, z0), side);
    this.quad(p(x1, y0, z1), p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), side);
    this.quad(p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0), side);
    return this;
  }
  cylinder(cx, cy, cz, r, h, color, seg = 8, rTop = r) {
    const y0 = cy, y1 = cy + h;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      this.quad(
        [cx + c0 * r, y0, cz + s0 * r], [cx + c1 * r, y0, cz + s1 * r],
        [cx + c1 * rTop, y1, cz + s1 * rTop], [cx + c0 * rTop, y1, cz + s0 * rTop], color);
      if (rTop > 0.01) {
        this.quad([cx, y1, cz], [cx + c0 * rTop, y1, cz + s0 * rTop], [cx + c1 * rTop, y1, cz + s1 * rTop], [cx, y1, cz], color);
      }
    }
    return this;
  }
  build(geometryFromArrays = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (this.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
  mesh(material) {
    const m = new THREE.Mesh(this.build(), material);
    m.matrixAutoUpdate = false;
    return m;
  }
  get triangles() { return this.idx.length / 3; }
}

// Vertex-coloured materials used across the world. Lambert is cheap and reads well under
// one directional light; the glow material is unlit so windows and neon stay bright.
export function worldMaterials() {
  return {
    solid: new THREE.MeshLambertMaterial({ vertexColors: true }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }),
  };
}

// Merge a list of geometries that share a material into one (position/normal/color/uv).
export function mergeGeoms(geoms) {
  const pos = [], nor = [], col = [], uv = [], idx = [];
  let off = 0;
  for (const g of geoms) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    const c = g.getAttribute('color'), u = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n ? n.getX(i) : 0, n ? n.getY(i) : 1, n ? n.getZ(i) : 0);
      col.push(c ? c.getX(i) : 1, c ? c.getY(i) : 1, c ? c.getZ(i) : 1);
      uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    }
    const ix = g.index;
    if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off);
    else for (let i = 0; i < p.count; i++) idx.push(i + off);
    off += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  out.computeBoundingSphere();
  return out;
}

export function tintGeometry(geom, hex) {
  const c = new THREE.Color(hex);
  const n = geom.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geom.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geom;
}
