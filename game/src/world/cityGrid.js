// The grid the whole city is laid out on: 9 road lines each way, 8 blocks between them,
// plus the names of the four districts and the streets the HUD prints.
import { CFG, STREETS_X, STREETS_Z } from '../config.js';

export const roadCoord = (i) => -CFG.HALF + CFG.ROAD_W / 2 + i * CFG.PITCH;
export const blockCenter = (i) => roadCoord(i) + CFG.PITCH / 2;
export const blockBounds = (i, j) => ({
  x0: roadCoord(i) + CFG.ROAD_W / 2, x1: roadCoord(i + 1) - CFG.ROAD_W / 2,
  z0: roadCoord(j) + CFG.ROAD_W / 2, z1: roadCoord(j + 1) - CFG.ROAD_W / 2,
  cx: blockCenter(i), cz: blockCenter(j),
});

// Four districts, each with its own skyline, palette and street furniture.
export const DISTRICTS = {
  downtown: { name: 'Kessler Heights', key: 'downtown', floors: [7, 14], dense: 0.92, lot: [1, 2] },
  strand:   { name: 'Kumala Strand',   key: 'strand',   floors: [2, 4],  dense: 0.86, lot: [2, 3] },
  row:      { name: 'Marigold Row',    key: 'row',      floors: [2, 6],  dense: 0.9,  lot: [2, 3] },
  yards:    { name: 'Oru Yards',       key: 'yards',    floors: [2, 3],  dense: 0.72, lot: [1, 2] },
};

export function districtOf(i, j) {
  if (j >= 7) return 'strand';
  if (i >= 2 && i <= 5 && j >= 1 && j <= 3) return 'downtown';
  if (i >= 4 && j >= 4) return 'yards';
  return 'row';
}

export function districtAt(x, z) {
  const i = Math.max(0, Math.min(7, Math.floor((x + CFG.HALF) / CFG.PITCH)));
  const j = Math.max(0, Math.min(7, Math.floor((z + CFG.HALF) / CFG.PITCH)));
  return DISTRICTS[districtOf(i, j)];
}

// Which street is closest, for the little "HALCYON AVE" line under the minimap.
export function streetAt(x, z) {
  let best = null, bd = 1e9;
  for (let i = 0; i < 9; i++) {
    const d = Math.abs(x - roadCoord(i));
    if (d < bd) { bd = d; best = { axis: 'x', index: i, name: STREETS_X[i] }; }
  }
  for (let j = 0; j < 9; j++) {
    const d = Math.abs(z - roadCoord(j));
    if (d < bd) { bd = d; best = { axis: 'z', index: j, name: STREETS_Z[j] }; }
  }
  return best;
}

// Nearest point on the sidewalk ring of a block, used to keep pedestrians off the road.
export function isOnRoad(x, z) {
  const nearX = Math.abs(((x + CFG.HALF) % CFG.PITCH + CFG.PITCH) % CFG.PITCH - CFG.ROAD_W / 2);
  const nearZ = Math.abs(((z + CFG.HALF) % CFG.PITCH + CFG.PITCH) % CFG.PITCH - CFG.ROAD_W / 2);
  return nearX > 0 || nearZ > 0;
}

export function blockIndexAt(x, z) {
  const i = Math.floor((x + CFG.HALF - CFG.ROAD_W / 2) / CFG.PITCH);
  const j = Math.floor((z + CFG.HALF - CFG.ROAD_W / 2) / CFG.PITCH);
  return { i: Math.max(0, Math.min(7, i)), j: Math.max(0, Math.min(7, j)) };
}
