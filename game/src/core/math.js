// Small maths helpers shared by cameras, cars, crowds and the HUD.
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
// Frame-rate independent exponential approach: the workhorse of every spring here.
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const dampAngle = (a, b, lambda, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-lambda * dt));
export const wrapAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
export const dist2 = (ax, az, bx, bz) => {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
};
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));
// Heading convention: yaw 0 points down -Z (three.js forward), positive yaw turns left.
export const headingTo = (dx, dz) => Math.atan2(-dx, -dz);
export const forwardX = (yaw) => -Math.sin(yaw);
export const forwardZ = (yaw) => -Math.cos(yaw);
export const rightX = (yaw) => Math.cos(yaw);
export const rightZ = (yaw) => -Math.sin(yaw);
export const ease = (t) => 1 - Math.pow(1 - t, 3);
export const shade = (hex, f) => {
  const r = clamp(((hex >> 16) & 255) * f, 0, 255) | 0;
  const g = clamp(((hex >> 8) & 255) * f, 0, 255) | 0;
  const b = clamp((hex & 255) * f, 0, 255) | 0;
  return (r << 16) | (g << 8) | b;
};
export const mixHex = (a, b, t) => {
  const r = lerp((a >> 16) & 255, (b >> 16) & 255, t) | 0;
  const g = lerp((a >> 8) & 255, (b >> 8) & 255, t) | 0;
  const bl = lerp(a & 255, b & 255, t) | 0;
  return (r << 16) | (g << 8) | bl;
};
